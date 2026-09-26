const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const { handleGetSistemTubuh } = require("../controllers/sistem-tubuh.controller");

const router = express.Router();

router.get("/sistem-tubuh", asyncHandler(handleGetSistemTubuh));

module.exports = router;