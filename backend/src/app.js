const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pool = require("./config/database");
const { verifySchema } = require("./config/schema");
const { verifyRequestOrigin } = require("./middleware/auth.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin) ? origin || true : false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(verifyRequestOrigin);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

app.get("/api/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");
    await verifySchema(pool);
    return res.json({ success: true, data: { status: "ok", database: "connected" } });
  } catch (error) {
    return next(error);
  }
});
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api", require("./routes/profile.routes"));
app.use("/api", require("./routes/dashboard.routes"));
app.use("/api", require("./routes/food.routes"));
app.use("/api", require("./routes/workout.routes"));
app.use("/api", require("./routes/progress.routes"));
app.use("/api", require("./routes/chatbot.routes"));

if (process.env.SERVE_FRONTEND !== "false") {
  app.use(express.static(path.resolve(__dirname, "../..")));
}
app.use(notFound);
app.use(errorHandler);

module.exports = app;
