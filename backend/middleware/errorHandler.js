const multer = require("multer");

module.exports = (err, req, res, next) => {
  console.error("🔥 Error inesperado en el servidor:", err);

  if (err.code === "SQLITE_CONSTRAINT") {
    return res.status(400).json({
      error: "Error en la base de datos: Restricción de clave única violada.",
      details: err.message,
    });
  }

  if (err instanceof multer.MulterError) {
    logger.error("❌ Error al subir la imagen:", err.message);
    return res.status(400).json({ error: `Error de subida: ${err.message}` });
  }

  res.status(500).json({
    error: "Ocurrió un error en el servidor. Inténtalo más tarde.",
  });
};
