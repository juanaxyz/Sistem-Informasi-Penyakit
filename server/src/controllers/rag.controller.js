const config = require("../config");
const AppError = require("../utils/AppError");

// Sinkronisasi embedding membebani CPU (model lokal) dan butuh beberapa detik,
// jadi diberi timeout yang jauh lebih besar dari endpoint chat biasa.
const SYNC_TIMEOUT_MS = 120_000;

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

/** Teruskan permintaan sinkronisasi embedding ke service Python.
 *
 * Route ini sudah dilindungi `authMiddleware` + `requireRole("admin")` di
 * routes/rag.routes.js. Lapisan kedua ada di service Python (header
 * `X-Rag-Admin-Token`), jadi service tetap aman meskipun diakses langsung.
 */
const handleLoadKnowledge = async (req, res) => {
  if (!config.ragAdminToken) {
    throw new AppError(
      "RAG_ADMIN_TOKEN belum diatur di server/.env, sinkronisasi dinonaktifkan",
      503,
    );
  }
  const ragRes = await fetch(`${config.ragApiUrl}/api/load-knowledge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Rag-Admin-Token": config.ragAdminToken,
    },
    signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
  }).catch((err) => {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new AppError("Sinkronisasi-knowledge basis terlalu lama", 504);
    }
    throw new AppError(`Tidak dapat menghubungi service RAG: ${err.message}`, 502);
  });

  const data = await ragRes.json().catch(() => null);
  if (!ragRes.ok) {
    // Teruskan status dari service (400/401/500) supaya pesan error ke admin tetap berarti.
    throw new AppError(
      data?.detail ?? data?.error ?? "Gagal sinkronisasi basis pengetahuan",
      ragRes.status >= 400 && ragRes.status < 600 ? ragRes.status : 500,
    );
  }
  res.json(data);
};

module.exports = {
  handleRagChat,
  handleLoadKnowledge,
};
