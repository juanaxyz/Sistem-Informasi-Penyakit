const express = require("express");
const multer = require("multer");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  handleGetArtikelList,
  handleCreateArtikel,
  handleGetArtikelByPenyakit,
  handleUpdateArtikelByPenyakit,
  handleUploadGambar,
} = require("../controllers/artikel.controller");

const router = express.Router();

// Gambar sisipan artikel: maksimum 2 MB, konten tetap di memori sampai magic
// bytes terverifikasi di controller. Nama file diganti UUID.
const uploadGambar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get(
  "/artikel",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleGetArtikelList),
);
router.post(
  "/artikel",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleCreateArtikel),
);
router.post(
  "/artikel/upload-gambar",
  authMiddleware,
  requireRole("admin"),
  (req, res, next) => uploadGambar.single("gambar")(req, res, next),
  asyncHandler(handleUploadGambar),
);

// GET/PUT satu artikel per penyakit (GET publik — dipakai halaman penyakit).
router.get("/artikel/:idPenyakit", asyncHandler(handleGetArtikelByPenyakit));
router.put(
  "/artikel/:idPenyakit",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleUpdateArtikelByPenyakit),
);

// Ukuran di atas 2 MB -> 413, bukan 500.
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "ukuran gambar melebihi 2 MB" });
  }
  next(err);
});

module.exports = router;
