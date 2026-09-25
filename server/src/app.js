const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config");
const { globalLimiter, authLimiter } = require("./middlewares/rate-limit");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middlewares/error-handler");

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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