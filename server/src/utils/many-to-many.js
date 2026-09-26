const { query } = require("../db/pg");

/**
 * Simpan ulang seluruh relasi many-to-many untuk satu baris induk.
 * Relasi lama dihapus, lalu disisipkan ulang sesuai `childIds`.
 *
 * Dipakai untuk pivot: `penyakit_bagian_tubuh` dan `penyakit_patogen`.
 *
 * PENTING: `table`, `parentColumn`, dan `childColumn` wajib berupa konstanta
 * internal dari kode (bukan input user) untuk menghindari SQL injection.
 */
async function replaceManyToMany({
  table,
  parentColumn,
  childColumn,
  parentId,
  childIds,
}) {
  await query(`DELETE FROM ${table} WHERE ${parentColumn} = $1`, [parentId]);

  if (Array.isArray(childIds) && childIds.length > 0) {
    const params = [];
    const values = [];
    childIds.forEach((childId, i) => {
      params.push(`($1, $${i + 2})`);
      values.push(childId);
    });
    await query(
      `INSERT INTO ${table} (${parentColumn}, ${childColumn})
       VALUES ${params.join(", ")}`,
      [parentId, ...values],
    );
  }
}

module.exports = { replaceManyToMany };