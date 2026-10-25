const jwt = require("jsonwebtoken");
const { positiveId } = require("./validate.middleware");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  return secret;
}

function authenticate(req, res, next) {
  const token = req.cookies?.bodywise_session;
  if (!token) {
    return res.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan masuk untuk melanjutkan." } });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (!positiveId(payload.sub)) throw new Error("Invalid subject");
    req.user = { id: Number(payload.sub) };
    return next();
  } catch {
    res.clearCookie("bodywise_session", cookieOptions());
    return res.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sesi tidak valid atau telah berakhir." } });
  }
}

function cookieOptions() {
  const sameSite = (process.env.COOKIE_SAME_SITE || "Lax").toLowerCase();
  const secure = process.env.NODE_ENV === "production";
  if (!["lax", "strict", "none"].includes(sameSite)) throw new Error("COOKIE_SAME_SITE must be Lax, Strict, or None.");
  if (sameSite === "none" && !secure) throw new Error("SameSite=None cookies require production HTTPS.");
  return { httpOnly: true, secure, sameSite, path: "/", maxAge: 8 * 60 * 60 * 1000 };
}

function verifyRequestOrigin(req, res, next) {
  const origin = req.get("origin");
  const allowed = (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  if (origin && !allowed.includes(origin)) {
    return res.status(403).json({ success: false, error: { code: "ORIGIN_FORBIDDEN", message: "Asal permintaan tidak diizinkan." } });
  }
  return next();
}

module.exports = { authenticate, cookieOptions, getJwtSecret, verifyRequestOrigin };
