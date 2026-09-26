const { query } = require("../db/pg");

const handleGetDashboard = async (_req, res) => {
  const [counts, urgensi, perSistem, artikelCoverage, usersRole, riwayatStatus, prediksiPenyakit] = await Promise.all([
    query(`
      SELECT
        (SELECT COUNT(*)::int FROM penyakit) AS penyakit,
        (SELECT COUNT(*)::int FROM sistem_tubuh) AS sistem_tubuh,
        (SELECT COUNT(*)::int FROM bagian_tubuh) AS bagian_tubuh,
        (SELECT COUNT(*)::int FROM artikel) AS artikel,
        (SELECT COUNT(*)::int FROM artikel_bagian) AS artikel_bagian,
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM riwayat) AS riwayat,
        (SELECT COUNT(*)::int FROM prediksi) AS prediksi
    `),
    query(`
      SELECT tingkat_urgensi, COUNT(*)::int AS jumlah
      FROM penyakit
      GROUP BY tingkat_urgensi
      ORDER BY tingkat_urgensi
    `),
    query(`
      SELECT st.id, st.nama, COUNT(p.id)::int AS jumlah_penyakit
      FROM sistem_tubuh st
      LEFT JOIN penyakit p ON p.id_sistem_tubuh = st.id
      GROUP BY st.id, st.nama
      ORDER BY jumlah_penyakit DESC, st.nama
    `),
    query(`
      SELECT
        COUNT(p.id)::int AS total,
        COUNT(a.id)::int AS punya_artikel
      FROM penyakit p
      LEFT JOIN artikel a ON a.id_penyakit = p.id
    `),
    query(`
      SELECT role, COUNT(*)::int AS jumlah
      FROM users
      GROUP BY role
      ORDER BY role
    `),
    query(`
      SELECT status, COUNT(*)::int AS jumlah
      FROM riwayat
      GROUP BY status
      ORDER BY status
    `),
    query(`
      SELECT py.nama, COUNT(pr.id)::int AS jumlah
      FROM prediksi pr
      JOIN penyakit py ON py.id = pr.id_penyakit
      GROUP BY py.nama
      ORDER BY jumlah DESC
      LIMIT 8
    `),
  ]);

  res.json({
    dashboard: {
      counts: counts.rows[0],
      urgensi: urgensi.rows,
      per_sistem: perSistem.rows,
      artikel_coverage: artikelCoverage.rows[0],
      users_role: usersRole.rows,
      riwayat_status: riwayatStatus.rows,
      prediksi_penyakit: prediksiPenyakit.rows,
    },
  });
};

module.exports = { handleGetDashboard };