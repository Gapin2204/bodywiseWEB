const { asyncHandler } = require("../middleware/async.middleware");
const { getNutritionRecommendations } = require("../services/nutrition-recommendation.service");

const listRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await getNutritionRecommendations(req.user.id, req.query.date);
  return res.json({ success: true, data: { recommendations } });
});

module.exports = { listRecommendations };
