const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const fs = require("fs");
const config = require("./config");
const { globalLimiter, authLimiter } = require("./middlewares/rate-limit");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middlewares/error-handler");

const app = express();

if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static(config.uploadsDir));
app.use(globalLimiter);
app.use("/api/auth", authLimiter);

app.get("/", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;