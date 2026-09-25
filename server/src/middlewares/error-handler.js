const config = require("../config");
const AppError = require("../utils/AppError");

const isUniqueViolationError = (err) => {
  return (
    err?.code === "23505" ||
    err?.message?.includes("duplicate key") ||
    err?.message?.includes("unique constraint")
  );
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (!err.isOperational) {
    console.error(err);
  }

  if (isUniqueViolationError(err)) {
    return res.status(409).json({ error: "Email atau username sudah terdaftar" });
  }

  if (err instanceof AppError) {
    return res.status(statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  if (config.isProd) {
    return res.status(500).json({ error: "Internal server error" });
  }

  res.status(statusCode).json({
    error: err.message,
    ...(err.stack && { stack: err.stack }),
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ error: "Route not found" });
};

module.exports = { errorHandler, notFoundHandler, isUniqueViolationError };