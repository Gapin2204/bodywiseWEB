const pool = require("../config/database");
const { asyncHandler } = require("../middleware/async.middleware");
const { badRequest, isDate } = require("../middleware/validate.middleware");

const programSlug = "program-latihan-pemula-4-minggu";

function mondayOf(date) {
  const monday = new Date(`${date}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function getProgramWeek(startDate, date) {
  const elapsed = Math.max(0, Date.parse(`${date}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`));
  return (Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) % 4) + 1;
}

async function loadProgram(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isDate(date)) throw badRequest("Tanggal harus berformat YYYY-MM-DD.");
  const [programRows] = await pool.execute(
    `SELECT id, name, level, duration_weeks, session_duration, frequency, safety_notes
     FROM workout_programs WHERE slug = ? LIMIT 1`,
    [programSlug]
  );
  const program = programRows[0];
  if (!program) {
    const error = new Error("Program latihan belum diimpor. Jalankan migrasi 004 lalu impor dataset program latihan.");
    error.status = 503;
    throw error;
  }

  await pool.execute(
    `INSERT IGNORE INTO user_workout_preferences (user_id, program_id, location, start_date)
     VALUES (?, ?, 'rumah', ?)`,
    [req.user.id, program.id, mondayOf(date)]
  );
  const [preferenceRows] = await pool.execute(
    "SELECT location, start_date FROM user_workout_preferences WHERE user_id = ?",
    [req.user.id]
  );
  const preference = preferenceRows[0];
  const [dayRows] = await pool.execute(
    `SELECT id, day_number, day_name, focus, duration_min, duration_max, notes, is_rest
     FROM workout_program_days WHERE program_id = ? ORDER BY day_number`,
    [program.id]
  );
  const dayIds = dayRows.map(day => day.id);
  const movementMap = new Map(dayIds.map(id => [Number(id), []]));
  if (dayIds.length) {
    const placeholders = dayIds.map(() => "?").join(", ");
    const [movementRows] = await pool.execute(
      `SELECT m.program_day_id, m.exercise_id, e.name AS exercise_name, m.sequence_number,
        m.muscle_group, m.supporting_muscles, m.equipment, m.sets, m.reps, m.rep_unit,
        m.rest_seconds, m.tips, m.home_alternative
       FROM workout_program_movements m JOIN exercises e ON e.id = m.exercise_id
       WHERE m.program_day_id IN (${placeholders}) AND m.location = ?
       ORDER BY m.program_day_id, m.sequence_number`,
      [...dayIds, preference.location]
    );
    for (const movement of movementRows) movementMap.get(Number(movement.program_day_id)).push(movement);
  }
  const [progressionRows] = await pool.execute(
    `SELECT week_number, focus, guidance FROM workout_program_progression
     WHERE program_id = ? ORDER BY week_number`,
    [program.id]
  );
  const [warmupRows] = await pool.execute(
    `SELECT phase, sequence_number, name, duration FROM workout_program_warmups
     WHERE program_id = ? ORDER BY phase, sequence_number`,
    [program.id]
  );
  const weekNumber = getProgramWeek(preference.start_date, date);
  const progression = progressionRows.find(week => Number(week.week_number) === weekNumber) || null;
  const days = dayRows.map(day => ({
    ...day,
    movements: movementMap.get(Number(day.id)) || []
  }));

  const [goalRows] = await pool.execute(
    `SELECT goal_type, target_weight_kg FROM weight_goals
     WHERE user_id = ? AND status = 'active' AND start_date <= ? AND target_date >= ?
     ORDER BY created_at DESC LIMIT 1`,
    [req.user.id, date, date]
  );
  return res.json({
    success: true,
    data: {
      program,
      date,
      preference,
      weekNumber,
      progression,
      days,
      selectedDay: days.find(day => Number(day.day_number) === ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1) || null,
      warmups: {
        pemanasan: warmupRows.filter(item => item.phase === "pemanasan"),
        pendinginan: warmupRows.filter(item => item.phase === "pendinginan")
      },
      activeGoal: goalRows[0] || null
    }
  });
}

async function updatePreference(req, res) {
  const { location } = req.body;
  if (!["gym", "rumah"].includes(location)) throw badRequest("Lokasi latihan harus gym atau rumah.");
  const [programRows] = await pool.execute(
    "SELECT id FROM workout_programs WHERE slug = ? LIMIT 1",
    [programSlug]
  );
  if (!programRows[0]) {
    const error = new Error("Program latihan belum diimpor. Jalankan migrasi 004 lalu impor dataset program latihan.");
    error.status = 503;
    throw error;
  }
  const startDate = mondayOf(new Date().toISOString().slice(0, 10));
  await pool.execute(
    `INSERT INTO user_workout_preferences (user_id, program_id, location, start_date)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE location = VALUES(location)`,
    [req.user.id, programRows[0].id, location, startDate]
  );
  return res.json({ success: true, data: { preference: { location } } });
}

module.exports = {
  loadProgram: asyncHandler(loadProgram),
  updatePreference: asyncHandler(updatePreference)
};
