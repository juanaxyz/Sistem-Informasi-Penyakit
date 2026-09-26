const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  handleAdminListPenyakit,
  handleAdminCreatePenyakit,
  handleAdminUpdatePenyakit,
  handleAdminUpdateReferensi,
} = require("../controllers/admin-penyakit.controller");

const router = express.Router();

router.get("/penyakit", authMiddleware, requireRole("admin"), asyncHandler(handleAdminListPenyakit));
router.post("/penyakit", authMiddleware, requireRole("admin"), asyncHandler(handleAdminCreatePenyakit));
router.put("/penyakit/:idPenyakit", authMiddleware, requireRole("admin"), asyncHandler(handleAdminUpdatePenyakit));
// Referensi dikelola dari editor artikel, jadi butuh endpoint sendiri yang
// tidak mensyaratkan field penyakit.
router.put(
  "/penyakit/:idPenyakit/referensi",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleAdminUpdateReferensi),
);

module.exports = router;