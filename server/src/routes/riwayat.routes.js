const express = require("express");
const multer = require("multer");
const path = require("path");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware } = require("../middlewares/auth");
const config = require("../config");
const {
  handleCreateRiwayat,
  handleGetRiwayat,
  handleGetRiwayatDetail,
  handleRunAnalisis,
} = require("../controllers/riwayat.controller");

const router = express.Router();

const storage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base || "gambar"}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const uploadImage = (req, res, next) => {
  upload.single("gambar")(req, res, (err) => {
    if (err) {
      const isTooLarge =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      return res
        .status(400)
        .json({ error: isTooLarge ? "Ukuran file maksimal 10 MB" : "Gagal mengunggah gambar" });
    }
    next();
  });
};

router.post("/riwayat", authMiddleware, uploadImage, asyncHandler(handleCreateRiwayat));
router.post("/riwayat/:id/analisis", authMiddleware, asyncHandler(handleRunAnalisis));
router.get("/riwayat", authMiddleware, asyncHandler(handleGetRiwayat));
router.get("/riwayat/:id", authMiddleware, asyncHandler(handleGetRiwayatDetail));

module.exports = router;