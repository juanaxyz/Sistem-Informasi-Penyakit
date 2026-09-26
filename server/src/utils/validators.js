const validateId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const escapeLike = (input) => input.replace(/[\\*?%_]/g, "\\$&");

/**
 * Normalisasi URL referensi menjadi bentuk kanonik, atau `null` bila tidak valid.
 * Hanya `http:` dan `https:` yang diterima supaya halaman publik tidak pernah
 * menampilkan tautan `javascript:` atau `data:`.
 */
const normalizeUrl = (raw, maxLength = 2000) => {
  const value = raw == null ? "" : String(raw).trim();
  if (value.length === 0 || value.length > maxLength) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.toString();
};

module.exports = { validateId, escapeLike, normalizeUrl };