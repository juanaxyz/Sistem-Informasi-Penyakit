const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware } = require("../middlewares/auth");
const {
  handleCreateRiwayat,
  handleGetRiwayat,
  handleGetRiwayatDetail,
  handleRunAnalisis,
} = require("../controllers/riwayat.controller");

const router = express.Router();

router.post("/riwayat", authMiddleware, asyncHandler(handleCreateRiwayat));
router.post("/riwayat/:id/analisis", authMiddleware, asyncHandler(handleRunAnalisis));
router.get("/riwayat", authMiddleware, asyncHandler(handleGetRiwayat));
router.get("/riwayat/:id", authMiddleware, asyncHandler(handleGetRiwayatDetail));

module.exports = router;