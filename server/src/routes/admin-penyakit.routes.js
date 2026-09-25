const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  handleAdminListPenyakit,
  handleAdminCreatePenyakit,
  handleAdminUpdatePenyakit,
} = require("../controllers/admin-penyakit.controller");

const router = express.Router();

router.get("/penyakit", authMiddleware, requireRole("admin"), asyncHandler(handleAdminListPenyakit));
router.post("/penyakit", authMiddleware, requireRole("admin"), asyncHandler(handleAdminCreatePenyakit));
router.put("/penyakit/:idPenyakit", authMiddleware, requireRole("admin"), asyncHandler(handleAdminUpdatePenyakit));

module.exports = router;