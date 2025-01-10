const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const connection = require("../config/database");

router.get("/", (req, res) => {
  res.render("login", {title: "Login", error: null })
})

router.post("/", (req, res) => {
  const{ username, password } = req.body;

  const query = "SELECT * FROM user WHERE username = ?";
  connection.query(query, [username], async (err, result) => {
      if(err){
        return res.status(500).send("Database Error");
      }

      if (results.length === 0) {
        return res.render("login", {
          title: "Login",
          error: "Username Tidak Ditemukan"
        });
      }

      const user = result[0];

      // Cek Password
      const isPasswordMatch = await bcrypt.compare[password, user.password];
      if(!isPasswordMatch) {
        return res.render("login",{
          title: "Login",
          error: "Password Salah",
        });
      }

      // Redirect berdasarkan Role
      if (user.role === 1 && 2){
        return res.redirect("/dosen");
      }else if (user.role === 3){
        return res.redirect("/mahasiswa");
      }else {
        return res.render("login",{
          title: "Login",
          error: "LOGIN TIDAK VALID"
        })
      }
    
    })
  });

  module.exports = router;