 const path = require("path");
require("dotenv").config({ path: process.env.ENV_FILE || path.join(__dirname, "../.env") });

const pool = require("./config/database");
const { verifySchema } = require("./config/schema");
const { getJwtSecret } = require("./middleware/auth.middleware");
const app = require("./app");

async function start() {
  getJwtSecret();
  await pool.query("SELECT 1");
  await verifySchema(pool);
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => console.log(`BODYWISE API listening on port ${port}`));

  const shutdown = signal => {
    console.log(`${signal} received; closing server.`);
    server.close(async error => {
      try {
        await pool.end();
      } catch (closeError) {
        console.error("Could not close database pool:", closeError.message);
      }
      if (error) {
        console.error("Could not close HTTP server:", error.message);
        process.exitCode = 1;
      }
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch(async error => {
  console.error("BODYWISE startup failed:", error.message);
  await pool.end();
  process.exitCode = 1;
});
