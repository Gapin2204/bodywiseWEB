const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { cookieOptions, getJwtSecret } = require("../middleware/auth.middleware");
const { badRequest } = require("../middleware/validate.middleware");

const focuses = new Set(["energy", "weight", "strength", "consistency"]);

async function register(req, res) {
  const { name, email, healthFocus, password, confirmPassword } = req.body;
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) throw badRequest("Nama wajib diisi (maksimal 100 karakter).");
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw badRequest("Alamat email tidak valid.");
  if (!focuses.has(healthFocus)) throw badRequest("Fokus kesehatan tidak valid.");
  if (typeof password !== "string" || password.length < 8 || password.length > 72) throw badRequest("Password harus terdiri dari 8 hingga 72 karakter.");
  if (password !== confirmPassword) throw badRequest("Konfirmasi password tidak cocok.");

  const passwordHash = await bcrypt.hash(password, 12);
  const connection = await pool.getConnection();
  let user;
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      "INSERT INTO users (name, email, health_focus, password_hash) VALUES (?, ?, ?, ?)",
      [name.trim(), email.trim().toLowerCase(), healthFocus, passwordHash]
    );
    user = { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), healthFocus };
    await connection.execute("INSERT INTO user_profiles (user_id) VALUES (?)", [user.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      const duplicate = new Error("Email tersebut sudah terdaftar.");
      duplicate.status = 409;
      duplicate.codeName = "EMAIL_EXISTS";
      throw duplicate;
    }
    throw error;
  } finally {
    connection.release();
  }

  setSession(res, user.id);
  return res.status(201).json({ success: true, data: { user } });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") throw badRequest("Email dan password wajib diisi.");
  const [rows] = await pool.execute(
    "SELECT id, name, email, health_focus, password_hash FROM users WHERE email = ? LIMIT 1",
    [email.trim().toLowerCase()]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error("Email atau password tidak sesuai.");
    error.status = 401;
    error.codeName = "INVALID_CREDENTIALS";
    throw error;
  }

  setSession(res, user.id);
  return res.json({ success: true, data: { user: publicUser(user) } });
}

async function me(req, res) {
  const [rows] = await pool.execute(
    "SELECT id, name, email, health_focus FROM users WHERE id = ? LIMIT 1",
    [req.user.id]
  );
  if (!rows[0]) {
    const error = new Error("Pengguna tidak ditemukan.");
    error.status = 404;
    throw error;
  }
  return res.json({ success: true, data: { user: publicUser(rows[0]) } });
}

function logout(req, res) {
  res.clearCookie("bodywise_session", { ...cookieOptions(), maxAge: undefined });
  return res.json({ success: true, data: { message: "Sesi telah berakhir." } });
}

function setSession(res, id) {
  const token = jwt.sign({}, getJwtSecret(), { subject: String(id), expiresIn: "8h" });
  res.cookie("bodywise_session", token, cookieOptions());
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, healthFocus: user.health_focus || user.healthFocus };
}

module.exports = { register, login, me, logout };
