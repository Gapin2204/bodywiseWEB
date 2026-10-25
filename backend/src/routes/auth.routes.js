const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireBody } = require("../middleware/validate.middleware");
const { asyncHandler } = require("../middleware/async.middleware");

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Terlalu banyak percobaan. Coba lagi nanti." } } });

router.post("/register", authLimiter, requireBody, asyncHandler(auth.register));
router.post("/login", authLimiter, requireBody, asyncHandler(auth.login));
router.get("/me", authenticate, asyncHandler(auth.me));
router.post("/logout", auth.logout);

module.exports = router;
