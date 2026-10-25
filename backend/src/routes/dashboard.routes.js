const express = require("express");
const { getDailyDashboard } = require("../controllers/dashboard.controller");
const { saveHabits } = require("../controllers/habits.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireBody } = require("../middleware/validate.middleware");

const router = express.Router();
router.get("/dashboard", authenticate, getDailyDashboard);
router.put("/habits/:date", authenticate, requireBody, saveHabits);

module.exports = router;
