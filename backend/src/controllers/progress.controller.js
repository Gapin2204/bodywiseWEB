const pool = require("../config/database");
const { asyncHandler } = require("../middleware/async.middleware");
const { badRequest, isDate } = require("../middleware/validate.middleware");

async function listWeightLogs(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
  const before = req.query.before;
  if (before && !isDate(before)) throw badRequest("Parameter before harus berformat YYYY-MM-DD.");
  const [rows] = await pool.execute(
    `SELECT id, weight_kg, logged_on, notes, created_at FROM weight_logs
     WHERE user_id = ? AND (? IS NULL OR logged_on <= ?)
     ORDER BY logged_on DESC, id DESC LIMIT ?`,
    [req.user.id, before || null, before || null, limit]
  );
  return res.json({ success: true, data: { weightLogs: rows } });
}

async function createWeightLog(req, res) {
  const { weightKg, loggedOn, notes } = req.body;
  if (!Number.isFinite(Number(weightKg)) || Number(weightKg) < 30 || Number(weightKg) > 300) throw badRequest("Berat badan harus 30–300 kg.");
  if (!isDate(loggedOn)) throw badRequest("Tanggal harus berformat YYYY-MM-DD.");
  if (notes !== undefined && (typeof notes !== "string" || notes.length > 255)) throw badRequest("Catatan terlalu panjang.");
  const [result] = await pool.execute(
    "INSERT INTO weight_logs (user_id, weight_kg, logged_on, notes) VALUES (?, ?, ?, ?)",
    [req.user.id, Number(weightKg), loggedOn, notes || null]
  );
  return res.status(201).json({ success: true, data: { id: result.insertId, weightKg: Number(weightKg), loggedOn } });
}

async function getSummary(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isDate(date)) throw badRequest("Tanggal harus berformat YYYY-MM-DD.");
  const [rows] = await pool.execute(
    `SELECT logged_on, weight_kg FROM weight_logs
     WHERE user_id = ? AND logged_on <= ? ORDER BY logged_on DESC, id DESC LIMIT 2`,
    [req.user.id, date]
  );
  const latest = rows[0];
  const previous = rows[1];
  const [goalRows] = await pool.execute(
    `SELECT id, goal_type, target_weight_kg, start_weight_kg, start_date, target_date
     FROM weight_goals WHERE user_id = ? AND status = 'active' AND start_date <= ? AND target_date >= ?
     ORDER BY created_at DESC LIMIT 1`,
    [req.user.id, date, date]
  );
  return res.json({
    success: true,
    data: {
      date,
      latest: latest ? { weightKg: Number(latest.weight_kg), loggedOn: latest.logged_on } : null,
      previous: previous ? { weightKg: Number(previous.weight_kg), loggedOn: previous.logged_on } : null,
      changeKg: latest && previous ? Number((Number(latest.weight_kg) - Number(previous.weight_kg)).toFixed(2)) : null,
      activeGoal: goalRows[0] || null
    }
  });
}

module.exports = { listWeightLogs: asyncHandler(listWeightLogs), createWeightLog: asyncHandler(createWeightLog), getSummary: asyncHandler(getSummary) };
