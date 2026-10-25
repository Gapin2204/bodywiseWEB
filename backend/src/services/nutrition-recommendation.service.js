const mealGroups = [
  {
    mealType: "breakfast",
    label: "Sarapan",
    groups: [
      { label: "Karbohidrat", categories: ["Makanan Pokok", "Umbi-umbian"] },
      { label: "Protein", categories: ["Ikan & Seafood", "Lauk Hewani", "Lauk Nabati", "Tahu", "Tempe", "Telur"] },
      { label: "Sayuran atau buah", categories: ["Sayuran", "Buah"] }
    ]
  },
  {
    mealType: "lunch",
    label: "Makan siang",
    groups: [
      { label: "Karbohidrat", categories: ["Makanan Pokok", "Umbi-umbian"] },
      { label: "Protein", categories: ["Ikan & Seafood", "Lauk Hewani", "Lauk Nabati", "Tahu", "Tempe", "Telur"] },
      { label: "Sayuran", categories: ["Sayuran"] }
    ]
  },
  {
    mealType: "dinner",
    label: "Makan malam",
    groups: [
      { label: "Karbohidrat", categories: ["Makanan Pokok", "Umbi-umbian"] },
      { label: "Protein", categories: ["Ikan & Seafood", "Lauk Hewani", "Lauk Nabati", "Tahu", "Tempe", "Telur"] },
      { label: "Sayuran", categories: ["Sayuran"] }
    ]
  },
  {
    mealType: "snack",
    label: "Camilan",
    groups: [{ label: "Buah utuh", categories: ["Buah"] }]
  }
];

function buildRecommendations(foods) {
  const byCategory = new Map();
  for (const food of foods) {
    if (!byCategory.has(food.category)) byCategory.set(food.category, []);
    byCategory.get(food.category).push(food);
  }
  return mealGroups.map(meal => ({
    mealType: meal.mealType,
    label: meal.label,
    groups: meal.groups.map(group => ({
      label: group.label,
      foods: group.categories.flatMap(category => byCategory.get(category) || []).slice(0, 3)
    }))
  }));
}

async function getNutritionRecommendations(userId, date) {
  const pool = require("../config/database");
  const { getDashboard } = require("./dashboard.service");
  const { badRequest, isDate } = require("../middleware/validate.middleware");
  const selectedDate = date || new Date().toISOString().slice(0, 10);
  if (!isDate(selectedDate)) throw badRequest("Tanggal harus berformat YYYY-MM-DD.");
  const dashboard = await getDashboard(userId, selectedDate);
  const categories = [...new Set(mealGroups.flatMap(meal => meal.groups.flatMap(group => group.categories)))];
  const placeholders = categories.map(() => "?").join(", ");
  const [foods] = await pool.execute(
    `SELECT f.id, f.name, f.category, f.calories_per_100g, f.protein_g_per_100g,
      f.carbs_g_per_100g, f.fat_g_per_100g, f.fiber_g_per_100g, f.nutrition_verified,
      f.source_note, p.serving_name, p.serving_grams
     FROM food_catalog f
     LEFT JOIN food_portions p ON p.food_id = f.id AND p.is_default = TRUE
     WHERE f.category IN (${placeholders})
       AND f.fat_g_per_100g <= 10
       AND (f.category <> 'Buah' OR f.carbs_g_per_100g <= 15)
       AND f.calories_per_100g BETWEEN 0 AND 1000
     ORDER BY f.fat_g_per_100g, f.nutrition_verified DESC, f.name`,
    categories
  );
  return {
    date: selectedDate,
    calorieTarget: dashboard.nutrition.calorieTarget,
    calorieTargetNote: dashboard.nutrition.calorieTargetNote,
    meals: buildRecommendations(foods),
    selectionNote: "Pilihan disaring ke makanan dengan lemak maksimal 10 g per 100 g; buah juga dibatasi ke karbohidrat total maksimal 15 g per 100 g. Minuman, camilan olahan, dan jajanan tidak disertakan. Dataset tidak mengukur gula atau minyak tambahan secara terpisah, jadi periksa label dan cara memasak; nilai katalog dapat berupa perkiraan."
  };
}

module.exports = { getNutritionRecommendations, buildRecommendations };
