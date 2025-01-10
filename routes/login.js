const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const connection = require("../config/database");

router.get("/", (req, res) => {
  res.render("login", {title: "Login", error: null })
})

router.post("/", (req, res) => {
  const{ username, password } = req.body;

  if (!username || !password){
    return res.status(400).send(" Masukkan Username dan Password yang benar.");
  }

  const query = "SELECT * FROM user WHERE username = ?";
  connection.query(query, [username], async (err, result) => {
      if(err){
        return res.status(500).send("Database Error");
      }

      if (result.length === 0) {
        return res.render("login", {
          title: "Login",
          error: "Username Tidak Ditemukan"
        });
      }

      const user = result[0];

      // Cek Password
      if(password !== user.password) {
        return res.render("login",{
          title: "Login",
          error: "Password Salah",
        });
      }

      // Redirect berdasarkan Role
      let userPath = user.role === 3 ? "mahasiswa" : "dosen";
    return res.redirect(`/portalnilai/${userPath}`);
    
    })
  });

  module.exports = router;