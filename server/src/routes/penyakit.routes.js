const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const {
  handleGetBagianTubuh,
  handleGetSistemTubuhByBody,
  handleGetPenyakitBySystemAndBody,
  handleSearchPenyakit,
  handleGetArtikelKonten,
  handleGetPenyakitDetail,
  handleGetPenyakitBySlug,
} = require("../controllers/penyakit.controller");
const { handleGetModels } = require("../controllers/model.controller");

const router = express.Router();

router.get("/bagian-tubuh", asyncHandler(handleGetBagianTubuh));
router.get("/sistem-tubuh/byBody/:idBody", asyncHandler(handleGetSistemTubuhByBody));
router.get(
  "/penyakit/bySystemAndBody/:idBody/:idSystem",
  asyncHandler(handleGetPenyakitBySystemAndBody),
);
router.get("/penyakit/cari", asyncHandler(handleSearchPenyakit));
router.get("/penyakit/:idPenyakit/konten", asyncHandler(handleGetArtikelKonten));
router.get("/penyakit/:idOrSlug", asyncHandler(handleGetPenyakitDetail));
router.get("/penyakit/slug/:slug", asyncHandler(handleGetPenyakitBySlug));
router.get("/model", asyncHandler(handleGetModels));

module.exports = router;