const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { authMiddleware, requireRole } = require("../middlewares/auth");
const { handleRagChat, handleLoadKnowledge } = require("../controllers/rag.controller");

const router = express.Router();

router.post("/rag/chat", asyncHandler(handleRagChat));

// Memodifikasi knowledge_embeddings => hanya admin, bukan pengguna biasa.
router.post(
  "/admin/rag/load-knowledge",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(handleLoadKnowledge),
);

module.exports = router;
