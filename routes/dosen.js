const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("dosen", { title: "Dashboard Dosen" });
});

module.exports = router;
