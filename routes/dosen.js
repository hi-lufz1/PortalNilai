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

// Route untuk menampilkan laporan berdasarkan mata kuliah
router.get("/laporan", (req, res) => {
  const { idMk } = req.query;

  // Query untuk mengambil daftar mata kuliah
  connection.query("SELECT idMk, namaMk FROM matakuliah", (err, mataKuliahRows) => {
    if (err) {
      console.error("Error fetching mata kuliah:", err);
      return res.status(500).send("Error fetching mata kuliah");
    }

    if (idMk) {
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
    
          res.render("laporan", {
            mataKuliahList: mataKuliahRows,  // Daftar mata kuliah
            laporanList: laporanRows || [], // Default ke array kosong jika tidak ada data
          });
        }
      );
    } else {
      // Jika tidak ada idMk, hanya tampilkan daftar mata kuliah
      res.render("laporan", { 
        mataKuliahList: mataKuliahRows, 
        laporanList: [] // Default ke array kosong
      });
    }    
  });
});

// Route untuk mengunduh laporan
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

      if (!laporanRows.length) {
        return res.status(404).send("Tidak ada data untuk mata kuliah ini.");
      }

      // Render HTML ke PDF
      res.render(
        "printLaporan",
        { title: `Laporan Nilai Mata Kuliah ${idMk}`, laporanList: laporanRows },
        async (err, htmlContent) => {
          if (err) {
            console.error("Error rendering HTML:", err);
            return res.status(500).send("Error rendering HTML");
          }

          try {
            const browser = await puppeteer.launch({
              headless: false,
              args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });
            const page = await browser.newPage();

            // Menunggu halaman selesai dimuat
            await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

            // Ambil screenshot untuk verifikasi
            await page.screenshot({ path: "screenshot.png" });
            console.log("Screenshot saved for debugging.");

            // Generate PDF
            const pdfBuffer = await page.pdf({
              format: "A4",
              printBackground: true,
              margin: { top: "20px", bottom: "20px", left: "10px", right: "10px" },
            });
            await browser.close();

            const fs = require('fs');
fs.writeFileSync('laporan_output.pdf', pdfBuffer);  // Menyimpan PDF ke disk untuk pemeriksaan
console.log('PDF saved.');

            // Kirimkan PDF ke pengguna
            res.set({
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="laporan_${idMk}.pdf"`,
            });
            res.send(pdfBuffer);
          } catch (pdfErr) {
            console.error("Error generating PDF:", pdfErr);
            res.status(500).send("Error generating PDF");
          }
        }
      );
    }
  );
});




module.exports = router