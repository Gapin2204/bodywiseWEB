const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRecommendations } = require("../src/services/nutrition-recommendation.service");

test("builds four meal suggestions from matching food categories", () => {
  const meals = buildRecommendations([
    { id: 1, name: "Nasi", category: "Makanan Pokok" },
    { id: 2, name: "Ikan", category: "Ikan & Seafood" },
    { id: 3, name: "Bayam", category: "Sayuran" },
    { id: 4, name: "Pepaya", category: "Buah" },
    { id: 5, name: "Minuman manis", category: "Minuman" }
  ]);
  assert.deepEqual(meals.map(meal => meal.mealType), ["breakfast", "lunch", "dinner", "snack"]);
  assert.deepEqual(meals[0].groups.map(group => group.foods.map(food => food.id)), [[1], [2], [3, 4]]);
  assert.deepEqual(meals[3].groups[0].foods.map(food => food.id), [4]);
  assert.equal(meals.flatMap(meal => meal.groups).some(group =>
    group.foods.some(food => food.category === "Minuman")
  ), false);
});

test("limits each meal group to three choices", () => {
  const meals = buildRecommendations(Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    name: `Rice ${index + 1}`,
    category: "Makanan Pokok"
  })));
  assert.equal(meals[0].groups[0].foods.length, 3);
});
