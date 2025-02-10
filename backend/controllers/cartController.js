// cartController.js
const db = require("../config/database");
const logger = require("../utils/logger");

// Obtener carrito del user
exports.getCart = (req, res, next) => {
  const user_id = req.user.id;

  db.get("SELECT * FROM cart WHERE user_id = ?", [user_id], (err, cart) => {
    if (err) {
      logger.error("Error al obtener carrito: ", err);
      return next(err);
    }

    if (!cart) {
      logger.info("Carrito no encontrado, creando uno nuevo...");

      db.run(
        "INSERT INTO cart (user_id) VALUES (?)",
        [user_id],
        function (err) {
          if (err) {
            logger.error("Error al crear el carrito:", err);
            return next(err);
          }

          logger.info("✅ Carrito creado con éxito:", this.lastID);
          return res.json({ id: this.lastID, items: [] });
        }
      );
    } else {
      db.all(
        "SELECT ci.id, ci.book_id, b.title, ci.quantity, b.price FROM cart_items ci JOIN books b ON ci.book_id = b.id WHERE ci.cart_id = ?",
        [cart.id],
        (err, items) => {
          if (err) {
            logger.error("Error al obtener items del carrito: ", err);
            return next(err);
          }
          res.json({ id: cart.id, items });
        }
      );
    }
  });
};

exports.addToCart = (req, res, next) => {
  const user_id = req.user.id;
  const { book_id, quantity } = req.body;

  if (!book_id || !quantity || quantity <= 0) {
    return res
      .status(400)
      .json({ error: "Cantidad inválida para agregar al carrito." });
  }

  // Comprobar el stock disponible antes de agregar
  db.get("SELECT stock FROM books WHERE id = ?", [book_id], (err, book) => {
    if (err) return next(err);
    if (!book) return res.status(404).json({ error: "Libro no encontrado." });

    if (book.stock < quantity) {
      return res
        .status(400)
        .json({ error: `Stock insuficiente para el libro ${book_id}` });
    }

    // Encontrar el carrito del user en la DB
    db.get("SELECT * FROM cart WHERE user_id = ?", [user_id], (err, cart) => {
      if (err) return next(err);

      if (!cart) {
        logger.info("Carrito no encontrado, creando uno nuevo...");
        db.run(
          "INSERT INTO cart (user_id) VALUES (?)",
          [user_id],
          function (err) {
            if (err) return next(err);
            db.run(
              "INSERT INTO cart (user_id) VALUES (?)",
              [user_id],
              function (err) {
                if (err) return next(err);
                addItemToCart(this.lastID, book_id, quantity, res, next);
              }
            );
          }
        );
      } else {
        addItemToCart(cart.id, book_id, quantity, res, next);
      }
    });
  });
};

const addItemToCart = (cart_id, book_id, quantity, res, next) => {
  db.get(
    "SELECT * FROM cart_items WHERE cart_id = ? AND book_id = ?",
    [cart_id, book_id],
    (err, item) => {
      if (err) return next(err);

      if (item) {
        db.run(
          "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?",
          [quantity, item.id],
          function (err) {
            if (err) return next(err);
            res.json({ message: "Cantidad actualizada en el carrito." });
          }
        );
      } else {
        db.run(
          "INSERT INTO cart_items (cart_id, book_id, quantity) VALUES (?, ?, ?)",
          [cart_id, book_id, quantity],
          function (err) {
            if (err) return next(err);
            res.json({ message: "Libro agregado al carrito." });
          }
        );
      }
    }
  );
};

// Eliminar un libro del carrito
exports.removeFromCart = (req, res, next) => {
  const user_id = req.user.id;
  const { book_id } = req.body;

  if (!book_id) {
    return res
      .status(400)
      .json({ error: "Faltan datos para eliminar del carrito." });
  }

  logger.info(`Eliminando libro ${book_id} del carrito del usuario ${user_id}`);

  db.get("SELECT * FROM cart WHERE user_id = ?", [user_id], (err, cart) => {
    if (err) return next(err);
    if (!cart) return res.status(404).json({ error: "Carrito no encontrado." });

    db.run(
      "DELETE FROM cart_items WHERE cart_id = ? AND book_id = ?",
      [cart.id, book_id],
      function (err) {
        if (err) return next(err);
        if (this.changes === 0) {
          return res
            .status(404)
            .json({ error: "Libro no encontrado en el carrito." });
        }
        res.json({ message: "Libro eliminado del carrito" });
      }
    );
  });
};

// Vaciar carrito
exports.clearCart = (req, res, next) => {
  const user_id = req.user.id;

  logger.info(`Vaciando carrito del usuario ${user_id}`);

  db.get("SELECT * FROM cart WHERE user_id = ?", [user_id], (err, cart) => {
    if (err) return next(err);
    if (!cart) return res.status(404).json({ error: "Carrito no encontrado" });

    db.run(
      "DELETE FROM cart_items WHERE cart_id = ?",
      [cart.id],
      function (err) {
        if (err) return next(err);
        res.json({ message: "Carrito vaciado con éxito." });
      }
    );
  });
};
