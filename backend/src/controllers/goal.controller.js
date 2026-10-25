const pool = require("../config/database");
const { asyncHandler } = require("../middleware/async.middleware");
const { badRequest, notFoundError, isDate, positiveId } = require("../middleware/validate.middleware");

async function createGoal(req, res) {
  const { goalType, targetWeightKg, startWeightKg, startDate, targetDate } = req.body;
  if (!["lose", "maintain", "gain"].includes(goalType)) throw badRequest("Jenis tujuan tidak valid.");
  if (!Number.isFinite(Number(targetWeightKg)) || Number(targetWeightKg) < 30 || Number(targetWeightKg) > 300) throw badRequest("Target berat harus 30–300 kg.");
  if (startWeightKg !== undefined && (!Number.isFinite(Number(startWeightKg)) || Number(startWeightKg) < 30 || Number(startWeightKg) > 300)) throw badRequest("Berat awal harus 30–300 kg.");
  if (!isDate(startDate) || !isDate(targetDate) || targetDate < startDate) throw badRequest("Rentang tanggal tujuan tidak valid.");
  const connection = await pool.getConnection();
  let result;
  try {
    await connection.beginTransaction();
    await connection.execute("UPDATE weight_goals SET status = 'cancelled' WHERE user_id = ? AND status = 'active'", [req.user.id]);
    [result] = await connection.execute(
      `INSERT INTO weight_goals (user_id, goal_type, target_weight_kg, start_weight_kg, start_date, target_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, goalType, Number(targetWeightKg), startWeightKg === undefined ? null : Number(startWeightKg), startDate, targetDate]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function listGoals(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const [rows] = await pool.execute(
    `SELECT id, goal_type, target_weight_kg, start_weight_kg, start_date, target_date, status, created_at
     FROM weight_goals WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [req.user.id, limit]
  );
  return res.json({ success: true, data: { goals: rows } });
}

async function updateGoal(req, res) {
  const { id } = req.params;
  const { status, targetWeightKg, targetDate } = req.body;
  if (!positiveId(id)) throw badRequest("ID tujuan tidak valid.");
  if (status !== undefined && !["active", "completed", "cancelled"].includes(status)) throw badRequest("Status tujuan tidak valid.");
  if (targetWeightKg !== undefined && (!Number.isFinite(Number(targetWeightKg)) || Number(targetWeightKg) < 30 || Number(targetWeightKg) > 300)) throw badRequest("Target berat harus 30–300 kg.");
  if (targetDate !== undefined && !isDate(targetDate)) throw badRequest("Tanggal target tidak valid.");
  if (status === undefined && targetWeightKg === undefined && targetDate === undefined) throw badRequest("Tidak ada perubahan tujuan.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute("SELECT start_date FROM weight_goals WHERE id = ? AND user_id = ? FOR UPDATE", [id, req.user.id]);
    if (!existing[0]) throw notFoundError("Tujuan tidak ditemukan.");
    if (targetDate && targetDate < existing[0].start_date) throw badRequest("Tanggal target tidak boleh sebelum tanggal mulai.");
    if (status === "active") {
      await connection.execute("UPDATE weight_goals SET status = 'cancelled' WHERE user_id = ? AND status = 'active' AND id <> ?", [req.user.id, id]);
    }
    await connection.execute(
      `UPDATE weight_goals SET status = COALESCE(?, status),
        target_weight_kg = COALESCE(?, target_weight_kg),
        target_date = COALESCE(?, target_date)
       WHERE id = ? AND user_id = ?`,
      [status || null, targetWeightKg === undefined ? null : Number(targetWeightKg), targetDate || null, id, req.user.id]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return res.json({ success: true, data: { updated: true } });
}

module.exports = { createGoal: asyncHandler(createGoal), listGoals: asyncHandler(listGoals), updateGoal: asyncHandler(updateGoal) };
