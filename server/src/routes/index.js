const express = require("express");
const authRoutes = require("./auth.routes");
const riwayatRoutes = require("./riwayat.routes");
const penyakitRoutes = require("./penyakit.routes");
const artikelRoutes = require("./artikel.routes");
const sistemTubuhRoutes = require("./sistem-tubuh.routes");
const patogenRoutes = require("./patogen.routes");
const jenisAnalisisRoutes = require("./jenis-analisis.routes");
const adminPenyakitRoutes = require("./admin-penyakit.routes");
const ragRoutes = require("./rag.routes");
const { handleGetDashboard } = require("../controllers/dashboard.controller");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const asyncHandler = require("../middlewares/async-handler");

const router = express.Router();

router.use(authRoutes);
router.use(riwayatRoutes);
router.use(penyakitRoutes);
router.use(artikelRoutes);
router.use(sistemTubuhRoutes);
router.use(patogenRoutes);
router.use(jenisAnalisisRoutes);
router.use(adminPenyakitRoutes);
router.use(ragRoutes);

router.get(
  "/dashboard",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleGetDashboard),
);

module.exports = router;