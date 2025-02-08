const express = require("express");
const router = express.Router();
const { resetDatabase } = require("../controllers/databaseController");

// Endpoint para resetear la base de datos
router.delete("/reset", resetDatabase);

module.exports = router;
