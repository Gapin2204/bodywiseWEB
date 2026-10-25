function requireBody(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, error: { code: "INVALID_BODY", message: "Body JSON diperlukan." } });
  }
  return next();
}

function validateDateQuery(req, res, next) {
  const date = req.query.date;
  if (date && !isDate(date)) {
    return res.status(400).json({ success: false, error: { code: "INVALID_DATE", message: "Tanggal harus berformat YYYY-MM-DD." } });
  }
  return next();
}

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function positiveId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function badRequest(message, codeName = "VALIDATION_ERROR") {
  const error = new Error(message);
  error.status = 400;
  error.codeName = codeName;
  return error;
}

function notFoundError(message = "Data tidak ditemukan.") {
  const error = new Error(message);
  error.status = 404;
  error.codeName = "NOT_FOUND";
  return error;
}

module.exports = { requireBody, validateDateQuery, isDate, positiveId, badRequest, notFoundError };
