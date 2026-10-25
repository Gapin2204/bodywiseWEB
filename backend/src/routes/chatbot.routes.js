const express = require("express");
const rateLimit = require("express-rate-limit");
const chatbot = require("../controllers/chatbot.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireBody } = require("../middleware/validate.middleware");

const router = express.Router();
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Tunggu sebentar sebelum mengirim pesan lagi." } } });
router.post("/chatbot/message", authenticate, chatLimiter, requireBody, chatbot.sendMessage);
router.get("/chatbot/conversations", authenticate, chatbot.listConversations);
router.get("/chatbot/conversations/:id/messages", authenticate, chatbot.listMessages);

module.exports = router;
