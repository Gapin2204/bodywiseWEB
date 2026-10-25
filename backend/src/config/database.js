const mysql = require("mysql2/promise");

const required = ["DB_HOST", "DB_USER", "DB_NAME"];
const missing = required.filter(name => !process.env[name]);

if (missing.length) {
  throw new Error(`Missing required database environment variables: ${missing.join(", ")}`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  timezone: "Z",
  dateStrings: true,
  decimalNumbers: true
});

module.exports = pool;
