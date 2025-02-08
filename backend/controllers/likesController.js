const db = require("../config/database");

// Agregar un "me gusta" a un libro
exports.addLike = (req, res, next) => {
  const { user_id, book_id } = req.body;
  const query = "INSERT INTO likes (user_id, book_id) VALUES (?, ?)";

  db.run(query, [user_id, book_id], function (err) {
    if (err) return next(err);
    res.json({ id: this.lastID });
  });
};

// Obtener los libros que le han gustado a un usuario
exports.getLikedBooks = (req, res, next) => {
  const user_id = req.params.user_id;
  const query = `
    SELECT books.* 
    FROM likes 
    JOIN books ON likes.book_id = books.id 
    WHERE likes.user_id = ?`;

  db.all(query, [user_id], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
};

// Eliminar un "me gusta" de un libro
exports.removeLike = (req, res, next) => {
  const { user_id, book_id } = req.body;
  const query = "DELETE FROM likes WHERE user_id = ? AND book_id = ?";

  db.run(query, [user_id, book_id], function (err) {
    if (err) return next(err);
    res.json({ message: "Like eliminado" });
  });
};

// Verificar si un usuario ya dio like a un libro
exports.checkLikeStatus = (req, res, next) => {
  const { user_id, book_id } = req.params;
  const query = "SELECT * FROM likes WHERE user_id = ? AND book_id = ?";

  db.get(query, [user_id, book_id], (err, row) => {
    if (err) return next(err);
    res.json({ liked: !!row }); // Retorna true si hay like, false si no
  });
};
