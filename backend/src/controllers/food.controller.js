const pool = require("../config/database");
const { asyncHandler } = require("../middleware/async.middleware");
const { badRequest, notFoundError, isDate, positiveId } = require("../middleware/validate.middleware");

const meals = new Set(["breakfast", "lunch", "snack", "dinner", "other"]);

async function listFoods(req, res) {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 80) : "";
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
  const [rows] = await pool.execute(
    `SELECT f.id, f.name, f.brand, f.category, f.calories_per_100g, f.protein_g_per_100g,
      f.carbs_g_per_100g, f.fat_g_per_100g, f.fiber_g_per_100g, f.nutrition_verified, f.source_note,
      p.serving_name, p.serving_grams,
      (SELECT GROUP_CONCAT(a.alias SEPARATOR ',') FROM food_aliases a WHERE a.food_id = f.id) AS aliases
     FROM food_catalog f
     LEFT JOIN food_portions p ON p.food_id = f.id AND p.is_default = TRUE
     WHERE (? = '' OR f.name LIKE ? OR f.category LIKE ? OR EXISTS (
       SELECT 1 FROM food_aliases a WHERE a.food_id = f.id AND a.alias LIKE ?
     ))
     ORDER BY CASE
       WHEN LOWER(f.name) = LOWER(?) THEN 0
       WHEN EXISTS (SELECT 1 FROM food_aliases a WHERE a.food_id = f.id AND LOWER(a.alias) = LOWER(?)) THEN 1
       ELSE 2
     END, f.name LIMIT ?`,
    [search, `%${search}%`, `%${search}%`, `%${search}%`, search, search, limit]
  );
  return res.json({ success: true, data: { foods: rows } });
}

async function listFoodLogs(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isDate(date)) throw badRequest("Tanggal harus berformat YYYY-MM-DD.");
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
  const [rows] = await pool.execute(
    `SELECT id, food_id, food_name, meal_type, quantity_g, calories, protein_g, carbs_g, fat_g, fiber_g, logged_at
     FROM food_logs WHERE user_id = ? AND logged_at >= ? AND logged_at < DATE_ADD(?, INTERVAL 1 DAY)
     ORDER BY logged_at DESC LIMIT ?`,
    [req.user.id, date, date, limit]
  );
  return res.json({ success: true, data: { foodLogs: rows, date } });
}

async function createFoodLog(req, res) {
  const { foodId, foodName, mealType, quantityG, loggedAt, caloriesPer100g, proteinGPer100g, carbsGPer100g, fatGPer100g, fiberGPer100g } = req.body;
  const quantity = Number(quantityG);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 5000) throw badRequest("Jumlah makanan harus 1–5.000 gram.");
  if (!meals.has(mealType)) throw badRequest("Jenis waktu makan tidak valid.");
  if (loggedAt && Number.isNaN(Date.parse(loggedAt))) throw badRequest("Waktu pencatatan tidak valid.");

  let name = typeof foodName === "string" ? foodName.trim() : "";
  let food = null;
  if (foodId !== undefined && foodId !== null) {
    if (!positiveId(foodId)) throw badRequest("ID makanan tidak valid.");
    const [rows] = await pool.execute(
      "SELECT id, name, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fiber_g_per_100g FROM food_catalog WHERE id = ?",
      [foodId]
    );
    food = rows[0];
    if (!food) throw badRequest("Makanan katalog tidak ditemukan.");
    name = food.name;
  }
  if (!name || name.length > 120) throw badRequest("Nama makanan wajib diisi (maksimal 120 karakter).");
  const nutrients = food || {
    calories_per_100g: caloriesPer100g,
    protein_g_per_100g: proteinGPer100g,
    carbs_g_per_100g: carbsGPer100g,
    fat_g_per_100g: fatGPer100g,
    fiber_g_per_100g: fiberGPer100g ?? 0
  };
  const rawValues = ["calories_per_100g", "protein_g_per_100g", "carbs_g_per_100g", "fat_g_per_100g", "fiber_g_per_100g"].map(key => nutrients[key]);
  if (!food && rawValues.slice(0, 4).some(value => value === undefined || value === null || value === "")) {
    throw badRequest("Nilai kalori, protein, karbohidrat, dan lemak per 100 gram wajib diisi.");
  }
  const values = rawValues.map(Number);
  if (values.some((value, index) => !Number.isFinite(value) || value < 0 || value > (index === 0 ? 1000 : 100))) {
    throw badRequest("Nilai nutrisi per 100 gram harus diisi dan berada dalam rentang yang valid.");
  }
  const totals = values.map(value => Number((value * quantity / 100).toFixed(2)));
  const [result] = await pool.execute(
    `INSERT INTO food_logs (user_id, food_id, food_name, meal_type, quantity_g, calories, protein_g, carbs_g, fat_g, fiber_g, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, UTC_TIMESTAMP()))`,
    [req.user.id, food?.id || null, name, mealType, quantity, ...totals, loggedAt || null]
  );
  return res.status(201).json({ success: true, data: { id: result.insertId, foodName: name, quantityG: quantity, calories: totals[0], proteinG: totals[1], carbsG: totals[2], fatG: totals[3], fiberG: totals[4] } });
}

async function deleteFoodLog(req, res) {
  if (!positiveId(req.params.id)) throw badRequest("ID catatan tidak valid.");
  const [result] = await pool.execute("DELETE FROM food_logs WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
  if (!result.affectedRows) throw notFoundError("Catatan makanan tidak ditemukan.");
  return res.json({ success: true, data: { deleted: true } });
}

module.exports = { listFoods: asyncHandler(listFoods), listFoodLogs: asyncHandler(listFoodLogs), createFoodLog: asyncHandler(createFoodLog), deleteFoodLog: asyncHandler(deleteFoodLog) };
