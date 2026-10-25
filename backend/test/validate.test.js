const test = require("node:test");
const assert = require("node:assert/strict");
const { isDate, positiveId, badRequest } = require("../src/middleware/validate.middleware");

test("accepts real ISO calendar dates and rejects malformed dates", () => {
  assert.equal(isDate("2026-10-25"), true);
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("25-10-2026"), false);
  assert.equal(isDate(""), false);
});

test("accepts positive integer identifiers only", () => {
  assert.equal(positiveId("12"), true);
  assert.equal(positiveId("0"), false);
  assert.equal(positiveId("1.2"), false);
  assert.equal(positiveId("1 OR 1=1"), false);
});

test("creates safe client validation errors", () => {
  const error = badRequest("Invalid value.");
  assert.equal(error.status, 400);
  assert.equal(error.codeName, "VALIDATION_ERROR");
});
