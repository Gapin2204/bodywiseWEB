const express = require("express");
const food = require("../controllers/food.controller");
const nutritionRecommendations = require("../controllers/nutrition-recommendation.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireBody } = require("../middleware/validate.middleware");

const router = express.Router();
router.get("/foods", authenticate, food.listFoods);
router.get("/nutrition-recommendations", authenticate, nutritionRecommendations.listRecommendations);
router.get("/food-logs", authenticate, food.listFoodLogs);
router.post("/food-logs", authenticate, requireBody, food.createFoodLog);
router.delete("/food-logs/:id", authenticate, food.deleteFoodLog);

module.exports = router;
