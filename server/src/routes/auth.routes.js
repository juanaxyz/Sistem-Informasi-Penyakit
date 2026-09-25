const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  handleRegister,
  handleLogin,
  handleGetMe,
  handleLogout,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/auth/register", asyncHandler(handleRegister));
router.post("/auth/login", asyncHandler(handleLogin));
router.post("/auth/logout", asyncHandler(handleLogout));
router.get("/auth/me", authMiddleware, asyncHandler(handleGetMe));

module.exports = router;