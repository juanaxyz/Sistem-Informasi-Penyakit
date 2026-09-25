const { query } = require("../db/pg");

const handleGetSistemTubuh = async (_req, res) => {
  const { rows } = await query(
    `SELECT id, nama FROM sistem_tubuh ORDER BY nama`,
  );
  res.json({ sistem_tubuh: rows });
};

module.exports = {
  handleGetSistemTubuh,
};