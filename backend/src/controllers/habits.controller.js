const pool = require("../config/database");
const { asyncHandler } = require("../middleware/async.middleware");
const { badRequest, isDate } = require("../middleware/validate.middleware");

const fields = ["waterCompleted", "workoutCompleted", "foodLogged", "sleepCompleted"];

async function saveHabits(req, res) {
  const { date } = req.params;
  if (!isDate(date)) throw badRequest("Tanggal harus berformat YYYY-MM-DD.");
  const entries = Object.entries(req.body);
  if (!entries.length || entries.some(([key, value]) => !fields.includes(key) || typeof value !== "boolean")) {
    throw badRequest("Kebiasaan harus berisi nilai boolean yang valid.");
  }
  const fieldMap = {
    waterCompleted: "water_completed",
    workoutCompleted: "workout_completed",
    foodLogged: "food_logged",
    sleepCompleted: "sleep_completed"
  };
  const columns = entries.map(([key]) => fieldMap[key]);
  const values = entries.map(([, value]) => value);
  const updates = columns.map(column => `${column} = VALUES(${column})`).join(", ");
  await pool.execute(
    `INSERT INTO daily_habits (user_id, habit_date, ${columns.join(", ")})
     VALUES (?, ?, ${columns.map(() => "?").join(", ")})
     ON DUPLICATE KEY UPDATE ${updates}`,
    [req.user.id, date, ...values]
  );
  const [rows] = await pool.execute(
    "SELECT water_completed, workout_completed, food_logged, sleep_completed FROM daily_habits WHERE user_id = ? AND habit_date = ?",
    [req.user.id, date]
  );
  return res.json({ success: true, data: { date, habits: rows[0] } });
}

module.exports = { saveHabits: asyncHandler(saveHabits) };
