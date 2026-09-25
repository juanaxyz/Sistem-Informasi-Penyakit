const { query } = require("../db/pg");

const handleGetModels = async (_req, res) => {
  const { rows } = await query(
    `SELECT id, nama_model, versi FROM model WHERE is_active = TRUE ORDER BY id`,
  );
  res.json({ models: rows });
};

module.exports = {
  handleGetModels,
};