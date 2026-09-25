const express = require("express");
const authRoutes = require("./auth.routes");
const riwayatRoutes = require("./riwayat.routes");
const penyakitRoutes = require("./penyakit.routes");
const artikelRoutes = require("./artikel.routes");
const sistemTubuhRoutes = require("./sistem-tubuh.routes");
const adminPenyakitRoutes = require("./admin-penyakit.routes");
const ragRoutes = require("./rag.routes");

const router = express.Router();

router.use(authRoutes);
router.use(riwayatRoutes);
router.use(penyakitRoutes);
router.use(artikelRoutes);
router.use(sistemTubuhRoutes);
router.use(adminPenyakitRoutes);
router.use(ragRoutes);

module.exports = router;