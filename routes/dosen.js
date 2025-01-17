const express = require("express");
const router = express.Router();
const connection = require("../config/database");

// Middleware untuk memastikan user sudah login
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/portalnilai"); // Redirect ke halaman login jika belum login
  }
  next();
};

// Halaman dashboard dosen
router.get("/", isAuthenticated, (req, res) => {
  const user = req.session.user;

  connection.query("SELECT * FROM matakuliah", (err, matkulRows) => {
    if (err) {
      console.error("Error fetching matakuliah:", err);
      return res.status(500).send("Error fetching matakuliah");
    }

    connection.query("SELECT * FROM mahasiswa", (err, mahasiswaRows) => {
      if (err) {
        console.error("Error fetching mahasiswa:", err);
        return res.status(500).send("Error fetching mahasiswa");
      }

      res.render("dosen", {
        title: "Dashboard Dosen",
        matkulList: matkulRows,
        mahasiswaList: mahasiswaRows,
        user: user,
      });
    });
  });
});

// Tampilkan daftar nilai berdasarkan mata kuliah
router.get("/nilai/:idMk", isAuthenticated, (req, res) => {
  const { idMk } = req.params;

  connection.query(
    `SELECT 
        n.idMk, 
        n.idMahasiswa, 
        n.nilai, 
        n.predikat, 
        n.keterangan, 
        m.namaMk, 
        mh.namaMahasiswa
     FROM nilai n
     JOIN matakuliah m ON n.idMk = m.idMk
     JOIN mahasiswa mh ON n.idMahasiswa = mh.idMahasiswa
     WHERE n.idMk = ?`,
    [idMk],
    (err, nilaiRows) => {
      if (err) {
        console.error("Error fetching nilai:", err);
        return res.status(500).send("Error fetching nilai");
      }

      connection.query("SELECT * FROM mahasiswa", (err, mahasiswaRows) => {
        if (err) {
          console.error("Error fetching mahasiswa:", err);
          return res.status(500).send("Error fetching mahasiswa");
        }

        res.render("nilai", {
          title: "Kelola Nilai Mahasiswa",
          nilaiList: nilaiRows,
          mahasiswaList: mahasiswaRows,
          idMk: idMk,
        });
      });
    }
  );
});

// Tambah atau update nilai mahasiswa
router.post("/nilai/tambah", isAuthenticated, (req, res) => {
  const { idMk, idMahasiswa, nilai } = req.body;

  if (!idMk || !idMahasiswa || nilai === undefined) {
    return res.status(400).send("Data tidak lengkap. Pastikan semua kolom terisi.");
  }

  const predikat = nilai >= 80 ? "A" : nilai >= 70 ? "B" : nilai >= 60 ? "C" : "D";
  const keterangan = nilai >= 60 ? "Lulus" : "Tidak Lulus";

  const query =
    `INSERT INTO nilai (idMk, idMahasiswa, nilai, predikat, keterangan) 
     VALUES (?, ?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE nilai = ?, predikat = ?, keterangan = ?`;
  const values = [idMk, idMahasiswa, nilai, predikat, keterangan, nilai, predikat, keterangan];

  connection.query(query, values, (err) => {
    if (err) {
      console.error("Error inserting/updating nilai:", err);
      return res.status(500).send("Error inserting/updating nilai");
    }
    res.redirect(`/portalnilai/dosen/nilai/${idMk}`);
  });
});

// Hapus nilai mahasiswa
router.post("/nilai/hapus", isAuthenticated, (req, res) => {
  const { idMk, idMahasiswa } = req.body;

  connection.query(
    "DELETE FROM nilai WHERE idMk = ? AND idMahasiswa = ?",
    [idMk, idMahasiswa],
    (err) => {
      if (err) {
        console.error("Error deleting nilai:", err);
        return res.status(500).send("Error deleting nilai");
      }
      res.redirect(`/portalnilai/dosen/nilai/${idMk}`);
    }
  );
});

module.exports = router;
