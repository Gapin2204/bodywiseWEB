process.env.DB_HOST = "127.0.0.1";
process.env.DB_USER = "bodywise_test";
process.env.DB_NAME = "bodywise_test";
process.env.FRONTEND_ORIGIN = "http://bodywise.test";
process.env.JWT_SECRET = "test-only-secret-with-at-least-32-characters";
process.env.SERVE_FRONTEND = "true";

const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const pool = require("../src/config/database");

let server;
let baseUrl;

test("starts the API and serves protected endpoints safely", async t => {
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  await t.test("serves the original login page with CSP", async () => {
    const response = await fetch(`${baseUrl}/login.html`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);
    assert.match(await response.text(), /loginForm/);
  });

  await t.test("serves the frontend API client", async () => {
    const response = await fetch(`${baseUrl}/js/api.js`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /credentials: "include"/);
  });

  await t.test("requires authentication for private data", async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "UNAUTHENTICATED");
  });

  await t.test("rejects untrusted request origins", async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" },
      body: JSON.stringify({})
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "ORIGIN_FORBIDDEN");
  });

  await t.test("returns the consistent JSON error for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "NOT_FOUND");
  });
});

test.after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await pool.end();
});
