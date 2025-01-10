const express = require("express");
const router = express.Router();

const connection = require("../config/database");

router.get("/", (req, res) => {
    connection.query("SELECT * FROM nilai ORDER by idMk DESC", "SELECT * FROM ", (err, rows) => {
        if (err) {
            return res.status(500).send("Error Ambil data dari database");
        }

        res.render("mahasiswa", {
            title: "Portal Akademik",
            message: "Welcome to Portal Akademik Prodi Teknik Rekayasa Agama",
            data: rows,
        });
    });
});

  module.exports = router;