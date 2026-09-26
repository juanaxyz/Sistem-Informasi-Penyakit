const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { handleGetJenisAnalisisByBody } = require("../controllers/jenis-analisis.controller");

const router = express.Router();

router.get(
  "/jenis-analisis/byBody/:idBody",
  asyncHandler(handleGetJenisAnalisisByBody),
);

module.exports = router;