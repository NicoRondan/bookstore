const db = require("../config/database");
const logger = require("../utils/logger");

// Agregar un "me gusta" a un libro
exports.addLike = (req, res, next) => {
  const user_id = req.user.id;
  const { book_id } = req.body;

  if (!book_id) {
    return res.status(400).json({ error: "El ID del libro es obligatorio." });
  }

  logger.info(`👍 Agregando like: user ${user_id} -> book ${book_id}`);

  // Verificar si ya existe el like
  db.get(
    "SELECT * FROM likes WHERE user_id = ? AND book_id = ?",
    [user_id, book_id],
    (err, row) => {
      if (err) return next(err);
      if (row) {
        logger.warn("⚠️ El usuario ya había dado like a este libro.");
        return res
          .status(409)
          .json({ error: "Ya has dado like a este libro." });
      }

      // Insertar el nuevo like
      db.run(
        "INSERT INTO likes (user_id, book_id) VALUES (?, ?)",
        [user_id, book_id],
        function (err) {
          if (err) return next(err);
          logger.info(`✅ Like agregado con éxito: ID ${this.lastID}`);
          res.json({ message: "Like agregado con éxito", id: this.lastID });
        }
      );
    }
  );
};

// Obtener los libros que le han gustado al usuario autenticado
exports.getLikedBooks = (req, res, next) => {
  const user_id = req.user.id;

  logger.info(`📖 Obteniendo libros con like del usuario ${user_id}...`);

  const query = `
    SELECT books.* 
    FROM likes 
    JOIN books ON likes.book_id = books.id 
    WHERE likes.user_id = ?`;

  db.all(query, [user_id], (err, rows) => {
    if (err) return next(err);
    logger.info(`✅ Libros obtenidos (${rows.length}):`, rows);
    res.json(rows);
  });
};

// Eliminar un "me gusta" de un libro
exports.removeLike = (req, res, next) => {
  const user_id = req.user.id;
  const { book_id } = req.body;

  if (!book_id) {
    return res.status(400).json({ error: "El ID del libro es obligatorio." });
  }

  logger.info(`❌ Eliminando like: user ${user_id} -> book ${book_id}`);

  db.run(
    "DELETE FROM likes WHERE user_id = ? AND book_id = ?",
    [user_id, book_id],
    function (err) {
      if (err) return next(err);
      if (this.changes === 0) {
        logger.warn("⚠️ No había like registrado.");
        return res
          .status(404)
          .json({ error: "No habías dado like a este libro." });
      }
      logger.info("✅ Like eliminado con éxito.");
      res.json({ message: "Like eliminado con éxito" });
    }
  );
};

// Verificar si el usuario autenticado ya dio like a un libro
exports.checkLikeStatus = (req, res, next) => {
  const user_id = req.user.id;
  const { book_id } = req.params;

  logger.info(`🔍 Verificando like: user ${user_id} -> book ${book_id}`);

  db.get(
    "SELECT * FROM likes WHERE user_id = ? AND book_id = ?",
    [user_id, book_id],
    (err, row) => {
      if (err) return next(err);
      logger.info(`✅ Estado del like: ${row ? "LIKED" : "NOT LIKED"}`);
      res.json({ liked: !!row });
    }
  );
};
