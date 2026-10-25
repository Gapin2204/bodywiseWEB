const pool = require("../config/database");
const { asyncHandler } = require("../middleware/async.middleware");
const { badRequest, notFoundError, isDate } = require("../middleware/validate.middleware");

const levels = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725
};
const sexes = new Set(["male", "female", "other", "prefer_not_to_say"]);

async function getProfile(req, res) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.health_focus, p.birth_date, p.sex, p.height_cm, p.activity_level
     FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?`,
    [req.user.id]
  );
  if (!rows[0]) throw notFoundError("Profil tidak ditemukan.");
  const [assessments] = await pool.execute(
    `SELECT id, assessed_at, age_years, sex, height_cm, weight_kg, activity_level, bmi, bmr_kcal, tdee_kcal
     FROM body_assessments WHERE user_id = ? ORDER BY assessed_at DESC, id DESC LIMIT 1`,
    [req.user.id]
  );
  return res.json({ success: true, data: { profile: { ...rows[0], latestAssessment: assessments[0] || null } } });
}

async function updateProfile(req, res) {
  const { name, healthFocus, birthDate, sex, heightCm, activityLevel } = req.body;
  if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 100)) throw badRequest("Nama profil tidak valid.");
  if (healthFocus !== undefined && !["energy", "weight", "strength", "consistency"].includes(healthFocus)) throw badRequest("Fokus kesehatan tidak valid.");
  if (birthDate !== undefined && birthDate !== null && !isDate(birthDate)) throw badRequest("Tanggal lahir tidak valid.");
  if (sex !== undefined && sex !== null && !sexes.has(sex)) throw badRequest("Pilihan jenis kelamin tidak valid.");
  if (heightCm !== undefined && heightCm !== null && (!Number.isFinite(Number(heightCm)) || Number(heightCm) < 100 || Number(heightCm) > 250)) throw badRequest("Tinggi badan harus 100–250 cm.");
  if (activityLevel !== undefined && activityLevel !== null && !Object.hasOwn(levels, activityLevel)) throw badRequest("Tingkat aktivitas tidak valid.");
  if (![name, healthFocus, birthDate, sex, heightCm, activityLevel].some(value => value !== undefined)) throw badRequest("Tidak ada perubahan profil.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE users SET name = COALESCE(?, name), health_focus = COALESCE(?, health_focus) WHERE id = ?`,
      [name === undefined ? null : name.trim(), healthFocus || null, req.user.id]
    );
    await connection.execute(
      `UPDATE user_profiles SET birth_date = COALESCE(?, birth_date), sex = COALESCE(?, sex),
        height_cm = COALESCE(?, height_cm), activity_level = COALESCE(?, activity_level) WHERE user_id = ?`,
      [birthDate === undefined ? null : birthDate, sex === undefined ? null : sex, heightCm === undefined ? null : Number(heightCm), activityLevel || null, req.user.id]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getProfile(req, res);
}

async function createAssessment(req, res) {
  const { ageYears, sex, heightCm, weightKg, activityLevel, assessedAt } = req.body;
  if (!Number.isInteger(Number(ageYears)) || Number(ageYears) < 13 || Number(ageYears) > 100) throw badRequest("Usia harus antara 13 dan 100 tahun.");
  if (!sexes.has(sex)) throw badRequest("Pilihan jenis kelamin tidak valid.");
  if (!Number.isFinite(Number(heightCm)) || Number(heightCm) < 100 || Number(heightCm) > 250) throw badRequest("Tinggi badan harus 100–250 cm.");
  if (!Number.isFinite(Number(weightKg)) || Number(weightKg) < 30 || Number(weightKg) > 300) throw badRequest("Berat badan harus 30–300 kg.");
  if (!Object.hasOwn(levels, activityLevel)) throw badRequest("Tingkat aktivitas tidak valid.");
  if (assessedAt && Number.isNaN(Date.parse(assessedAt))) throw badRequest("Waktu asesmen tidak valid.");

  const age = Number(ageYears);
  const height = Number(heightCm);
  const weight = Number(weightKg);
  const bmi = weight / ((height / 100) ** 2);
  const bmr = sex === "male" ? 10 * weight + 6.25 * height - 5 * age + 5 :
    sex === "female" ? 10 * weight + 6.25 * height - 5 * age - 161 : null;
  const tdee = bmr === null ? null : bmr * levels[activityLevel];
  const connection = await pool.getConnection();
  let result;
  try {
    await connection.beginTransaction();
    [result] = await connection.execute(
      `INSERT INTO body_assessments (user_id, assessed_at, age_years, sex, height_cm, weight_kg, activity_level, bmi, bmr_kcal, tdee_kcal)
       VALUES (?, COALESCE(?, UTC_TIMESTAMP()), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, assessedAt || null, age, sex, height, weight, activityLevel, bmi, bmr, tdee]
    );
    await connection.execute(
      `UPDATE user_profiles SET sex = ?, height_cm = ?, activity_level = ? WHERE user_id = ?`,
      [sex, height, activityLevel, req.user.id]
    );
    await connection.execute(
      `INSERT INTO weight_logs (user_id, weight_kg, logged_on) VALUES (?, ?, DATE(COALESCE(?, UTC_TIMESTAMP())))`,
      [req.user.id, weight, assessedAt || null]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return res.status(201).json({
    success: true,
    data: { assessment: { id: result.insertId, bmi: Number(bmi.toFixed(2)), bmrKcal: bmr === null ? null : Number(bmr.toFixed(2)), tdeeKcal: tdee === null ? null : Number(tdee.toFixed(2)), note: "BMR/TDEE menggunakan estimasi Mifflin–St Jeor dan bukan diagnosis medis." } }
  });
}

async function listAssessments(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const [rows] = await pool.execute(
    `SELECT id, assessed_at, age_years, sex, height_cm, weight_kg, activity_level, bmi, bmr_kcal, tdee_kcal
     FROM body_assessments WHERE user_id = ? ORDER BY assessed_at DESC, id DESC LIMIT ?`,
    [req.user.id, limit]
  );
  return res.json({ success: true, data: { assessments: rows } });
}

module.exports = { getProfile: asyncHandler(getProfile), updateProfile: asyncHandler(updateProfile), createAssessment: asyncHandler(createAssessment), listAssessments: asyncHandler(listAssessments) };
