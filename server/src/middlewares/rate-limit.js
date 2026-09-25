const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Terlalu banyak percobaan, coba lagi nanti" },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: { error: "Terlalu banyak permintaan, coba lagi nanti" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, globalLimiter };