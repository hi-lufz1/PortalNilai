const express = require("express");
const router = express.Router();
const connection = require("../config/database");
const puppeteer = require("puppeteer");

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

    connection.query("SELECT * FROM nilai ORDER by idMk DESC", (err, rows) => {
      if (err) {
        return res.status(500).send("Error Ambil data dari database");
      }

      res.render("dosen", {
        title: "Dashboard Dosen",
        data: rows,
        user: user,
      });
    });
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

router.get("/laporan/nilai", (req, res) => {
  console.log("Rute laporan/nilai dipanggil");
  console.log("Parameter idMk:", req.query.idMk);
  const idMk = req.query.idMk;

  // Query untuk mendapatkan daftar mata kuliah
  connection.query("SELECT idMk, namaMk FROM matakuliah", (err, mataKuliahRows) => {
    if (err) {
      console.error("Error fetching mata kuliah:", err);
      return res.status(500).send("Error fetching mata kuliah");
    }

    if (!idMk) {
      // Jika belum memilih mata kuliah, kirim halaman tanpa data nilai
      return res.render("laporan", {
        matakuliahList: mataKuliahRows,
        laporanList: null,
        namaMk: null,
      });
    }

    // Query untuk mendapatkan data nilai mata kuliah
    connection.query(
      `SELECT 
          n.idMk, 
          n.idMahasiswa, 
          n.nilai, 
          n.predikat, 
          n.keterangan, 
          m.namaMk, 
          mh.nama AS namaMahasiswa
       FROM nilai n
       JOIN matakuliah m ON n.idMk = m.idMk
       JOIN mahasiswa mh ON n.idMahasiswa = mh.idMahasiswa
       WHERE n.idMk = ?`,
      [idMk],
      (err, laporanRows) => {
        if (err) {
          console.error("Error fetching laporan:", err);
          return res.status(500).send("Error fetching laporan");
        }

        const namaMk = laporanRows.length > 0 ? laporanRows[0].namaMk : null;

        res.render("laporan", {
          matakuliahList: mataKuliahRows,
          laporanList: laporanRows,
          namaMk,
        });
      }
    );
  });
});

router.get("/laporan/unduh", (req, res) => {
  const { idMk } = req.query;

  connection.query(
    `SELECT 
        n.idMk, 
        n.idMahasiswa, 
        n.nilai, 
        n.predikat, 
        n.keterangan, 
        m.namaMk, 
        mh.nama AS namaMahasiswa
     FROM nilai n
     JOIN matakuliah m ON n.idMk = m.idMk
     JOIN mahasiswa mh ON n.idMahasiswa = mh.idMahasiswa
     WHERE n.idMk = ?`,
    [idMk],
    async (err, laporanRows) => {
      if (err) {
        console.error("Error fetching laporan:", err);
        return res.status(500).send("Error fetching laporan");
      }

      res.render(
        "printLaporan",
        { title: `Laporan Nilai Mata Kuliah ${idMk}`, laporanList: laporanRows },
        async (err, htmlContent) => {
          if (err) {
            console.error("Error rendering HTML:", err);
            return res.status(500).send("Error rendering HTML");
          }

          try {
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.setContent(htmlContent);
            const pdfBuffer = await page.pdf({
              format: "A4",
              printBackground: true,
            });
            await browser.close();

            res.set({
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="laporan_${idMk}.pdf"`,
            });
            res.send(pdfBuffer);
          } catch (err) {
            console.error("Error generating PDF:", err);
            res.status(500).send("Error generating PDF");
          }
        }
      );
    }
  );
});


module.exports = router