const express = require("express");
const profile = require("../controllers/profile.controller");
const goal = require("../controllers/goal.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireBody } = require("../middleware/validate.middleware");

const router = express.Router();
router.get("/profile", authenticate, profile.getProfile);
router.put("/profile", authenticate, requireBody, profile.updateProfile);
router.post("/assessments", authenticate, requireBody, profile.createAssessment);
router.get("/assessments", authenticate, profile.listAssessments);
router.post("/goals", authenticate, requireBody, goal.createGoal);
router.get("/goals", authenticate, goal.listGoals);
router.patch("/goals/:id", authenticate, requireBody, goal.updateGoal);

module.exports = router;
