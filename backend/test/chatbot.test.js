process.env.DB_HOST = "127.0.0.1";
process.env.DB_USER = "test";
process.env.DB_NAME = "bodywise_test";

const test = require("node:test");
const assert = require("node:assert/strict");
const { answerMessage } = require("../src/services/chatbot.service");

test("declines requests outside BODYWISE scope", async () => {
  const answer = await answerMessage(1, "Explain international politics.");
  assert.match(answer, /hanya dapat membantu/i);
});

test("provides in-scope general dashboard guidance", async () => {
  const answer = await answerMessage(1, "Apa fungsi dashboard BODYWISE?");
  assert.match(answer, /dashboard BODYWISE/i);
});

test("does not expose personal activity for a generic first-person question", async () => {
  const answer = await answerMessage(1, "Saya ingin tahu cara menggunakan fitur workout.");
  assert.match(answer, /mencatat sesi latihan/i);
  assert.doesNotMatch(answer, /Ringkasan BODYWISE hari ini/);
});

test("directs urgent symptoms to emergency care", async () => {
  const answer = await answerMessage(1, "Saya mengalami sesak napas.");
  assert.match(answer, /layanan darurat/i);
});
