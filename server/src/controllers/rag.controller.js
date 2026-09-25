const config = require("../config");
const AppError = require("../utils/AppError");

const handleRagChat = async (req, res) => {
  const question = String(req.body?.question ?? "").trim();
  if (!question) throw new AppError("question wajib diisi", 400);
  const payload = { question };
  if (typeof req.body?.session_id === "string") {
    payload.session_id = req.body.session_id;
  }
  if (Array.isArray(req.body?.history)) {
    payload.history = req.body.history;
  }
  const ragRes = await fetch(`${config.ragApiUrl}/api/rag/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await ragRes.json().catch(() => null);
  if (!ragRes.ok) {
    throw new AppError(data?.detail ?? data?.error ?? "RAG API error", 500);
  }
  res.json(data);
};

module.exports = {
  handleRagChat,
};