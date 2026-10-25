const pool = require("../config/database");
const { asyncHandler } = require("../middleware/async.middleware");
const { badRequest, notFoundError, isDate, positiveId } = require("../middleware/validate.middleware");

function validateSession(body) {
  const { name, startedAt, durationMinutes, status, sets, notes } = body;
  if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 120)) throw badRequest("Nama sesi wajib diisi (maksimal 120 karakter).");
  if (startedAt !== undefined && Number.isNaN(Date.parse(startedAt))) throw badRequest("Tanggal latihan tidak valid.");
  if (durationMinutes !== undefined && durationMinutes !== null && (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1 || Number(durationMinutes) > 1440)) throw badRequest("Durasi harus 1–1.440 menit.");
  if (status !== undefined && !["planned", "completed", "cancelled"].includes(status)) throw badRequest("Status sesi tidak valid.");
  if (notes !== undefined && notes !== null && (typeof notes !== "string" || notes.length > 1000)) throw badRequest("Catatan terlalu panjang.");
  if (sets !== undefined && (!Array.isArray(sets) || sets.length > 100)) throw badRequest("Set latihan harus berupa daftar maksimal 100 item.");
  for (const set of sets || []) {
    if (!set || !positiveId(set.exerciseId)) throw badRequest("Setiap latihan harus memiliki ID latihan yang valid.");
    if (set.setNumber !== undefined && (!Number.isInteger(Number(set.setNumber)) || Number(set.setNumber) < 1 || Number(set.setNumber) > 1000)) throw badRequest("Nomor set tidak valid.");
    if (set.notes !== undefined && (typeof set.notes !== "string" || set.notes.length > 255)) throw badRequest("Catatan set terlalu panjang.");
    for (const key of ["reps", "durationSeconds", "distanceM", "weightKg"]) {
      if (set[key] !== undefined && set[key] !== null && (!Number.isFinite(Number(set[key])) || Number(set[key]) < 0)) throw badRequest(`Nilai ${key} tidak valid.`);
    }
    if (set.reps !== undefined && set.reps !== null && (!Number.isInteger(Number(set.reps)) || Number(set.reps) < 1 || Number(set.reps) > 1000)) throw badRequest("Repetisi harus berupa angka 1–1.000.");
    if (set.weightKg !== undefined && set.weightKg !== null && Number(set.weightKg) > 2000) throw badRequest("Beban maksimal 2.000 kg.");
    if (set.durationSeconds !== undefined && set.durationSeconds !== null && (!Number.isInteger(Number(set.durationSeconds)) || Number(set.durationSeconds) > 86400)) throw badRequest("Durasi set maksimal 24 jam.");
    if (set.distanceM !== undefined && set.distanceM !== null && Number(set.distanceM) > 1000000) throw badRequest("Jarak latihan terlalu besar.");
  }
}

async function insertSets(connection, sessionId, sets) {
  if (sets.length) {
    const exerciseIds = [...new Set(sets.map(set => Number(set.exerciseId)))];
    const placeholders = exerciseIds.map(() => "?").join(", ");
    const [exerciseRows] = await connection.execute(
      `SELECT id, tracking_type FROM exercises WHERE id IN (${placeholders})`,
      exerciseIds
    );
    const trackingTypes = new Map(exerciseRows.map(exercise => [Number(exercise.id), exercise.tracking_type]));
    if (trackingTypes.size !== exerciseIds.length) throw badRequest("Satu atau lebih latihan tidak ditemukan.");
    for (const set of sets) {
      const type = trackingTypes.get(Number(set.exerciseId));
      if (type === "sets_reps" && (set.reps === undefined || set.reps === null)) throw badRequest("Latihan kekuatan harus memiliki jumlah repetisi.");
      if (type === "duration" && (set.durationSeconds === undefined || set.durationSeconds === null)) throw badRequest("Latihan berdurasi harus memiliki durasi.");
      if (type === "distance" && (set.distanceM === undefined || set.distanceM === null)) throw badRequest("Latihan jarak harus memiliki jarak.");
      if (type === "mixed" && set.durationSeconds == null && set.distanceM == null) throw badRequest("Latihan kardio harus memiliki durasi atau jarak.");
    }
  }
  for (let i = 0; i < sets.length; i += 1) {
    const set = sets[i];
    await connection.execute(
      `INSERT INTO workout_sets (workout_session_id, exercise_id, set_number, reps, weight_kg, duration_seconds, distance_m, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, set.exerciseId, set.setNumber === undefined ? i + 1 : set.setNumber, set.reps ?? null, set.weightKg ?? null, set.durationSeconds ?? null, set.distanceM ?? null, set.notes || null]
    );
  }
}

async function listExercises(req, res) {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 80) : "";
  const category = req.query.category;
  const validCategories = ["strength", "cardio", "mobility", "bodyweight"];
  if (category && !validCategories.includes(category)) throw badRequest("Kategori latihan tidak valid.");
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const [rows] = await pool.execute(
    `SELECT id, name, category, tracking_type, description FROM exercises
     WHERE name LIKE ? AND (? IS NULL OR category = ?) ORDER BY name LIMIT ?`,
    [`%${search}%`, category || null, category || null, limit]
  );
  return res.json({ success: true, data: { exercises: rows } });
}

async function listSessions(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isDate(date)) throw badRequest("Tanggal harus berformat YYYY-MM-DD.");
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const [rows] = await pool.execute(
    `SELECT id, name, started_at, duration_minutes, status, notes FROM workout_sessions
     WHERE user_id = ? AND started_at >= ? AND started_at < DATE_ADD(?, INTERVAL 1 DAY)
     ORDER BY started_at DESC LIMIT ?`,
    [req.user.id, date, date, limit]
  );
  return res.json({ success: true, data: { workoutSessions: rows, date } });
}

async function getSession(req, res) {
  if (!positiveId(req.params.id)) throw badRequest("ID sesi tidak valid.");
  const [sessions] = await pool.execute(
    "SELECT id, name, started_at, duration_minutes, status, notes FROM workout_sessions WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );
  if (!sessions[0]) throw notFoundError("Sesi latihan tidak ditemukan.");
  const [sets] = await pool.execute(
    `SELECT ws.id, ws.exercise_id, e.name AS exercise_name, e.category, e.tracking_type,
      ws.set_number, ws.reps, ws.weight_kg, ws.duration_seconds, ws.distance_m, ws.notes
     FROM workout_sets ws JOIN exercises e ON e.id = ws.exercise_id
     WHERE ws.workout_session_id = ? ORDER BY ws.set_number, ws.id`,
    [req.params.id]
  );
  return res.json({ success: true, data: { workoutSession: { ...sessions[0], sets } } });
}

async function createSession(req, res) {
  validateSession(req.body);
  const { name = "Latihan", startedAt = new Date().toISOString(), durationMinutes = null, status = "completed", notes = null, sets = [] } = req.body;
  const connection = await pool.getConnection();
  let result;
  try {
    await connection.beginTransaction();
    [result] = await connection.execute(
      `INSERT INTO workout_sessions (user_id, name, started_at, duration_minutes, status, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, name.trim(), startedAt, durationMinutes, status, notes]
    );
    await insertSets(connection, result.insertId, sets);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updateSession(req, res) {
  if (!positiveId(req.params.id)) throw badRequest("ID sesi tidak valid.");
  validateSession(req.body);
  const { name, startedAt, durationMinutes, status, notes, sets } = req.body;
  if (![name, startedAt, durationMinutes, status, notes, sets].some(value => value !== undefined)) throw badRequest("Tidak ada perubahan sesi.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `UPDATE workout_sessions SET name = COALESCE(?, name), started_at = COALESCE(?, started_at),
        duration_minutes = COALESCE(?, duration_minutes), status = COALESCE(?, status), notes = COALESCE(?, notes)
       WHERE id = ? AND user_id = ?`,
      [name === undefined ? null : name.trim(), startedAt || null, durationMinutes ?? null, status || null, notes ?? null, req.params.id, req.user.id]
    );
    if (!result.affectedRows) throw notFoundError("Sesi latihan tidak ditemukan.");
    if (sets !== undefined) {
      await connection.execute("DELETE FROM workout_sets WHERE workout_session_id = ?", [req.params.id]);
      await insertSets(connection, req.params.id, sets);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return res.json({ success: true, data: { updated: true } });
}

async function deleteSession(req, res) {
  if (!positiveId(req.params.id)) throw badRequest("ID sesi tidak valid.");
  const [result] = await pool.execute("DELETE FROM workout_sessions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
  if (!result.affectedRows) throw notFoundError("Sesi latihan tidak ditemukan.");
  return res.json({ success: true, data: { deleted: true } });
}

module.exports = {
  listExercises: asyncHandler(listExercises), listSessions: asyncHandler(listSessions),
  getSession: asyncHandler(getSession), createSession: asyncHandler(createSession),
  updateSession: asyncHandler(updateSession), deleteSession: asyncHandler(deleteSession)
};
