const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const config = require("../config");
const {
  handleGetArtikelList,
  handleCreateArtikel,
  handleUpdateArtikel,
  handleGetArtikelBagian,
  handleSaveArtikelBagian,
  handleUploadBagianGambar,
} = require("../controllers/artikel.controller");

const router = express.Router();

// Unggahan gambar untuk konten artikel. Nama file diganti UUID agar bebas
// benturan nama; MIME dibatasi supaya `uploads/` tidak jadi tempat file acak.
const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

const imageStorage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const uploadGambar = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_IMAGE_TYPES.includes(file.mimetype));
  },
});

router.get("/artikel", authMiddleware, requireRole("admin"), asyncHandler(handleGetArtikelList));
router.post("/artikel", authMiddleware, requireRole("admin"), asyncHandler(handleCreateArtikel));
router.post(
  "/artikel/gambar",
  authMiddleware,
  requireRole("admin"),
  uploadGambar.single("gambar"),
  asyncHandler(handleUploadBagianGambar),
);
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