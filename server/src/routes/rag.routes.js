const express = require("express");
const asyncHandler = require("../middlewares/async-handler");
const { handleRagChat } = require("../controllers/rag.controller");

const router = express.Router();

router.post("/rag/chat", asyncHandler(handleRagChat));

module.exports = router;