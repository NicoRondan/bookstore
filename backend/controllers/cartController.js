const db = require("../config/database");

// Obtener carrito del user
exports.getCart = (req, res, next) => {
  const user_id = req.user.id;

  db.get("SELECT * FROM cart WHERE user_id = ?", [user_id], (err, cart) => {
    if (err) {
      console.log("Error al obtener carrito: ", err);
      return next(err);
    }

    if (!cart) {
      console.log("Carrito no encontrado, creando uno nuevo...");

      db.run(
        "INSERT INTO cart (user_id) VALUES (?)",
        [user_id],
        function (err) {
          if (err) {
            console.log("Error al crear el carrito:", err);
            return next(err);
          }

          console.log("✅ Carrito creado con éxito:", this.lastID);
          return res.json({ id: this.lastID, items: [] });
        }
      );
    } else {
      db.all(
        "SELECT ci.id, ci.book_id, b.title, ci.quantity, b.price FROM cart_items ci JOIN books b ON ci.book_id = b.id WHERE ci.cart_id = ?",
        [cart.id],
        (err, items) => {
          if (err) {
            console.error("Error al obtener items del carrito: ", err);
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
      if (err) return enxt(err);

      if (!cart) {
        console.log("Carrito no encontrado, creando uno nuevo...");
        db.run(
          "INSERT INTO cart (user_id) VALUES (?)",
          [user_id],
          function (err) {
            if (err) return next(err);

            const cart_id = this.lastID;

            db.run(
              "INSERT INTO cart_items (cart_id, book_id, quantity) VALUES (?, ?, ?)",
              [cart_id, book_id, quantity],
              function (err) {
                if (err) return next(err);
                res.json({ message: "Libro agregado al carrito ", cart_id });
              }
            );
          }
        );
      } else {
        db.get(
          "SELECT * FROM cart_items WHERE cart_id = ? AND book_id = ?",
          [cart.id, book_id],
          (err, item) => {
            if (err) return next(err);

            if (item) {
              if (book.stock < item.quantity + quantity) {
                console.log("⚠️ Stock insuficiente para el carrito.");
                return res
                  .status(400)
                  .json({ error: "Stock insuficiente para este libro " });
              }

              db.run(
                "UPDATE cart_item SET quantity = quantity + ? WHERE id = ?",
                [quantity, item.id],
                function (err) {
                  if (err) return next(err);
                  res.json({ message: "Cantidad actualizada al carrito." });
                }
              );
            } else {
              db.run(
                "INSERT INTO cart_items (cart_id, book_id, quantity) VALUES (?, ?, ?)",
                [cart.id, book_id, quantity],
                function (err) {
                  if (err) return next(err);
                  res.json({ message: "Libro agregado al carrito" });
                }
              );
            }
          }
        );
      }
    });
  });
};

// Eliminar un libro del carrito
exports.removeFromCart = (req, res, next) => {
  const user_id = req.user.id;
  const { book_id } = req.body;

  console.log(`Eliminando libro ${book_id} del carrito del usuario ${user_id}`);

  if (!book_id) {
    return res
      .status(400)
      .json({ error: "Faltan datos para eliminar del carrito." });
  }

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

  console.log(`Vaciando carrito del usuario ${user_id}`);

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
