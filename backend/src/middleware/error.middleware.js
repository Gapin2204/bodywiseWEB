function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan." } });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ success: false, error: { code: "CONFLICT", message: "Data tersebut sudah digunakan." } });
  }
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ success: false, error: { code: "INVALID_REFERENCE", message: "Referensi data tidak valid." } });
  }

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status >= 500) console.error("Request failed:", error.message);
  return res.status(status).json({
    success: false,
    error: {
      code: error.codeName || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
      message: status === 500 ? "Terjadi kesalahan pada server." : error.message
    }
  });
}

module.exports = { notFound, errorHandler };
