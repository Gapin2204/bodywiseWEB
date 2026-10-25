const pool = require("../config/database");
const { answerMessage } = require("../services/chatbot.service");
const { asyncHandler } = require("../middleware/async.middleware");
const { badRequest, notFoundError, positiveId } = require("../middleware/validate.middleware");

async function sendMessage(req, res) {
  const { message, conversationId } = req.body;
  if (typeof message !== "string" || !message.trim() || message.trim().length > 1000) throw badRequest("Pesan wajib diisi dan maksimal 1.000 karakter.");
  const cleanMessage = message.trim();
  const connection = await pool.getConnection();
  let id = conversationId;
  try {
    await connection.beginTransaction();
    if (id !== undefined) {
      if (!positiveId(id)) throw badRequest("ID percakapan tidak valid.");
      const [owned] = await connection.execute("SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?", [id, req.user.id]);
      if (!owned.length) throw notFoundError("Percakapan tidak ditemukan.");
    } else {
      const title = cleanMessage.slice(0, 100);
      const [created] = await connection.execute(
        "INSERT INTO chat_conversations (user_id, title) VALUES (?, ?)",
        [req.user.id, title]
      );
      id = created.insertId;
    }
    await connection.execute(
      "INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, 'user', ?)",
      [id, cleanMessage]
    );
    await connection.execute("UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const answer = (await answerMessage(req.user.id, cleanMessage)).slice(0, 1800);
  const [result] = await pool.execute(
    "INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, 'assistant', ?)",
    [id, answer]
  );
  return res.status(201).json({ success: true, data: { conversationId: id, message: { id: result.insertId, role: "assistant", content: answer } } });
}

async function listConversations(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const [rows] = await pool.execute(
    `SELECT id, title, created_at, updated_at FROM chat_conversations
     WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?`,
    [req.user.id, limit]
  );
  return res.json({ success: true, data: { conversations: rows } });
}

async function listMessages(req, res) {
  if (!positiveId(req.params.id)) throw badRequest("ID percakapan tidak valid.");
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const [rows] = await pool.execute(
    `SELECT m.id, m.role, m.content, m.created_at FROM chat_messages m
     JOIN chat_conversations c ON c.id = m.conversation_id
     WHERE c.id = ? AND c.user_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
    [req.params.id, req.user.id, limit]
  );
  const [owner] = await pool.execute("SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
  if (!owner.length) throw notFoundError("Percakapan tidak ditemukan.");
  return res.json({ success: true, data: { messages: rows.reverse() } });
}

module.exports = { sendMessage: asyncHandler(sendMessage), listConversations: asyncHandler(listConversations), listMessages: asyncHandler(listMessages) };
