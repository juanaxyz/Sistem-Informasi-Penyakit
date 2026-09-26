const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  handleListPatogen,
  handleGetPatogenDetail,
  handleCreatePatogen,
  handleUpdatePatogen,
  handleDeletePatogen,
} = require("../controllers/patogen.controller");

const router = express.Router();

router.get("/patogen", asyncHandler(handleListPatogen));
router.get("/patogen/:idPatogen", asyncHandler(handleGetPatogenDetail));
router.post(
  "/patogen",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleCreatePatogen),
);
router.put(
  "/patogen/:idPatogen",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleUpdatePatogen),
);
router.delete(
  "/patogen/:idPatogen",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleDeletePatogen),
);

module.exports = router;