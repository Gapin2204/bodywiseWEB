const express = require("express");
const progress = require("../controllers/progress.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireBody } = require("../middleware/validate.middleware");

const router = express.Router();
router.get("/progress/weight", authenticate, progress.listWeightLogs);
router.post("/progress/weight", authenticate, requireBody, progress.createWeightLog);
router.get("/progress/summary", authenticate, progress.getSummary);

module.exports = router;
