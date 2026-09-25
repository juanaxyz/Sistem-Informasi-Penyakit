const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  handleGetArtikelList,
  handleUpdateArtikel,
  handleGetArtikelBagian,
  handleSaveArtikelBagian,
} = require("../controllers/artikel.controller");

const router = express.Router();

router.get("/artikel", authMiddleware, requireRole("admin"), asyncHandler(handleGetArtikelList));
router.put(
  "/artikel/:idArtikel",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleUpdateArtikel),
);
router.get(
  "/artikel/:idArtikel/bagian",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleGetArtikelBagian),
);
router.put(
  "/artikel/:idArtikel/bagian",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleSaveArtikelBagian),
);

module.exports = router;