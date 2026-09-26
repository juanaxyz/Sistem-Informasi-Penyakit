const { query } = require("../db/pg");
const { validateId } = require("../utils/validators");
const AppError = require("../utils/AppError");

const handleGetJenisAnalisisByBody = async (req, res) => {
  const idBody = validateId(req.params.idBody);
  if (idBody === null) throw new AppError("id bagian tubuh tidak valid", 400);

  const { rows } = await query(
    `SELECT ja.id, ja.nama, ja.slug, ja.deskripsi, ja.tipe_input, ja.icon
     FROM jenis_analisis ja
     JOIN jenis_analisis_bagian_tubuh jabt ON jabt.id_jenis_analisis = ja.id
     WHERE jabt.id_bagian_tubuh = $1 AND ja.is_active = TRUE
     ORDER BY ja.id`,
    [idBody],
  );
  res.json({ jenis_analisis: rows });
};

module.exports = { handleGetJenisAnalisisByBody };