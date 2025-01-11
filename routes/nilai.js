// routes/nilai.js
const express = require("express");
const router = express.Router();
const connection = require("../config/database");

// Halaman dashboard dosen untuk mengelola nilai
router.get("/", (req, res) => {
  connection.query("SELECT * FROM matakuliah", (err, matkulRows) => {
    if (err) {
      return res.status(500).send("Error fetching matakuliah");
    }
    res.render("dosen", { title: "Dashboard Dosen", matkulList: matkulRows });
  });
});

// Tampilkan daftar mahasiswa berdasarkan mata kuliah yang dipilih
router.post("/nilai", (req, res) => {
  const { idMk } = req.body;

  connection.query(
    `SELECT n.*, m.namaMk FROM nilai n JOIN matakuliah m ON n.idMk = m.idMk WHERE n.idMk = ?`,
    [idMk],
    (err, nilaiRows) => {
      if (err) {
        return res.status(500).send("Error fetching nilai");
      }
      connection.query("SELECT * FROM mahasiswa", (err, mahasiswaRows) => {
        if (err) {
          return res.status(500).send("Error fetching mahasiswa");
        }
        res.render("dosen_nilai", {
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
router.post("/nilai/tambah", (req, res) => {
  const { idMk, idMahasiswa, nilai } = req.body;
  const predikat = nilai >= 80 ? "A" : nilai >= 70 ? "B" : nilai >= 60 ? "C" : "D";
  const keterangan = nilai >= 60 ? "Lulus" : "Tidak Lulus";

  const query =
    "INSERT INTO nilai (idMk, idMahasiswa, nilai, predikat, keterangan) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nilai = ?, predikat = ?, keterangan = ?";
  const values = [idMk, idMahasiswa, nilai, predikat, keterangan, nilai, predikat, keterangan];

  connection.query(query, values, (err) => {
    if (err) {
      return res.status(500).send("Error inserting/updating nilai");
    }
    res.redirect("/portalnilai/dosen/nilai");
  });
});

// Hapus nilai mahasiswa
router.post("/nilai/hapus", (req, res) => {
  const { idMk, idMahasiswa } = req.body;

  connection.query(
    "DELETE FROM nilai WHERE idMk = ? AND idMahasiswa = ?",
    [idMk, idMahasiswa],
    (err) => {
      if (err) {
        return res.status(500).send("Error deleting nilai");
      }
      res.redirect("/portalnilai/dosen/nilai");
    }
  );
});

module.exports = router;
