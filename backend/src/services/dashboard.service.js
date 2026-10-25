const pool = require("../config/database");
const { isDate } = require("../middleware/validate.middleware");

async function getDashboard(userId, date) {
  const selectedDate = date || new Date().toISOString().slice(0, 10);
  if (!isDate(selectedDate)) {
    const error = new Error("Tanggal harus berformat YYYY-MM-DD.");
    error.status = 400;
    throw error;
  }

  const [food, workouts, habits, weights, assessment, goals] = await Promise.all([
    pool.execute(
      `SELECT COUNT(*) AS entries, COALESCE(SUM(calories), 0) AS calories,
        COALESCE(SUM(protein_g), 0) AS proteinG, COALESCE(SUM(carbs_g), 0) AS carbsG,
        COALESCE(SUM(fat_g), 0) AS fatG, COALESCE(SUM(fiber_g), 0) AS fiberG
       FROM food_logs WHERE user_id = ? AND logged_at >= ? AND logged_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      [userId, selectedDate, selectedDate]
    ),
    pool.execute(
      `SELECT COUNT(*) AS sessions, COALESCE(SUM(duration_minutes), 0) AS durationMinutes
       FROM workout_sessions WHERE user_id = ? AND status = 'completed'
       AND started_at >= ? AND started_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      [userId, selectedDate, selectedDate]
    ),
    pool.execute(
      `SELECT water_completed, workout_completed, food_logged, sleep_completed
       FROM daily_habits WHERE user_id = ? AND habit_date = ?`,
      [userId, selectedDate]
    ),
    pool.execute(
      `SELECT logged_on, weight_kg FROM weight_logs
       WHERE user_id = ? AND logged_on <= ? ORDER BY logged_on DESC, id DESC LIMIT 2`,
      [userId, selectedDate]
    ),
    pool.execute(
      `SELECT tdee_kcal FROM body_assessments
       WHERE user_id = ? AND assessed_at < DATE_ADD(?, INTERVAL 1 DAY)
       ORDER BY assessed_at DESC, id DESC LIMIT 1`,
      [userId, selectedDate]
    ),
    pool.execute(
      `SELECT id, goal_type, target_weight_kg, start_weight_kg, start_date, target_date
       FROM weight_goals WHERE user_id = ? AND status = 'active' AND start_date <= ? AND target_date >= ?
       ORDER BY created_at DESC LIMIT 1`,
      [userId, selectedDate, selectedDate]
    )
  ]);

  const totals = food[0][0];
  const completed = habits[0][0] ? Object.values(habits[0][0]).filter(Boolean).length : 0;
  const latest = weights[0][0];
  const previous = weights[0][1];
  const maintenanceCalories = assessment[0][0]?.tdee_kcal == null ? null : Number(assessment[0][0].tdee_kcal);
  const goalType = goals[0][0]?.goal_type;
  const calorieTarget = maintenanceCalories === null ? null :
    Math.round(maintenanceCalories + (goalType === "lose" ? -300 : goalType === "gain" ? 200 : 0));
  return {
    date: selectedDate,
    nutrition: {
      entries: totals.entries,
      calories: Number(totals.calories),
      proteinG: Number(totals.proteinG),
      carbsG: Number(totals.carbsG),
      fatG: Number(totals.fatG),
      fiberG: Number(totals.fiberG),
      calorieTarget,
      maintenanceCalories,
      calorieTargetNote: goalType === "lose" ? "Estimasi awal defisit sekitar 300 kkal dari TDEE." :
        goalType === "gain" ? "Estimasi awal surplus sekitar 200 kkal dari TDEE." :
          goalType === "maintain" ? "Estimasi pemeliharaan berdasarkan TDEE." :
            "Estimasi TDEE; atur tujuan untuk mendapatkan target yang disesuaikan."
    },
    workout: { completedSessions: Number(workouts[0][0].sessions), durationMinutes: Number(workouts[0][0].durationMinutes) },
    habits: habits[0][0] ? { ...habits[0][0], completedCount: completed, total: 4 } : { water_completed: false, workout_completed: false, food_logged: false, sleep_completed: false, completedCount: 0, total: 4 },
    weight: latest ? {
      latestKg: Number(latest.weight_kg),
      loggedOn: latest.logged_on,
      previousKg: previous ? Number(previous.weight_kg) : null,
      previousLoggedOn: previous?.logged_on || null,
      changeKg: previous ? Number((Number(latest.weight_kg) - Number(previous.weight_kg)).toFixed(2)) : null
    } : { latestKg: null, loggedOn: null, previousKg: null, previousLoggedOn: null, changeKg: null },
    activeGoal: goals[0][0] || null
  };
}

module.exports = { getDashboard };
