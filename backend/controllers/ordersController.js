const db = require("../config/database");
const logger = require("../utils/logger");

// Crear una orden desde el carrito o por compra directa
exports.createOrder = (req, res, next) => {
  const user_id = req.user.id;
  const { book_id, quantity } = req.body;

  logger.info("🛒 Iniciando creación de orden...");

  // Compra directa (sin carrito)
  if (book_id && quantity) {
    logger.info(`📌 Compra directa detectada para libro ID ${book_id}.`);

    db.get(
      "SELECT price, stock FROM books WHERE id = ?",
      [book_id],
      (err, book) => {
        if (err) return next(err);
        if (!book)
          return res.status(404).json({ error: "Libro no encontrado." });

        if (book.stock < quantity) {
          return res.status(400).json({
            error: `Stock insuficiente para el libro ID ${book_id}.`,
          });
        }

        const total_price = book.price * quantity;

        db.run(
          "INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, 'pending')",
          [user_id, total_price],
          function (err) {
            if (err) return next(err);
            const order_id = this.lastID;
            logger.info(`🆕 Orden creada con ID: ${order_id}`);

            db.run(
              "INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)",
              [order_id, book_id, quantity, book.price],
              function (err) {
                if (err) return next(err);

                db.run(
                  "UPDATE books SET stock = stock - ? WHERE id = ?",
                  [quantity, book_id],
                  function (err) {
                    if (err) return next(err);
                    logger.info(
                      `✅ Stock actualizado para libro ID ${book_id}.`
                    );
                  }
                );

                res.json({ message: "Orden creada con éxito", order_id });
              }
            );
          }
        );
      }
    );

    return;
  }

  // Compra desde el carrito
  logger.info("🛒 Intentando crear orden desde el carrito...");

  db.get("SELECT * FROM cart WHERE user_id = ?", [user_id], (err, cart) => {
    if (err) return next(err);
    if (!cart) {
      return res.status(400).json({ error: "El carrito está vacío." });
    }

    db.all(
      `SELECT ci.book_id, ci.quantity, b.price, b.stock 
       FROM cart_items ci 
       JOIN books b ON ci.book_id = b.id 
       WHERE ci.cart_id = ?`,
      [cart.id],
      (err, cartItems) => {
        if (err) return next(err);
        if (cartItems.length === 0) {
          return res.status(400).json({ error: "El carrito está vacío." });
        }

        for (const item of cartItems) {
          if (item.quantity > item.stock) {
            return res.status(400).json({
              error: `Stock insuficiente para el libro ID ${item.book_id}.`,
            });
          }
        }

        const total_price = cartItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        db.run(
          "INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, 'pending')",
          [user_id, total_price],
          function (err) {
            if (err) return next(err);
            const order_id = this.lastID;
            logger.info(`🆕 Orden creada con ID: ${order_id}`);

            const insertItemsPromises = cartItems.map((item) => {
              return new Promise((resolve, reject) => {
                db.run(
                  "INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)",
                  [order_id, item.book_id, item.quantity, item.price],
                  function (err) {
                    if (err) return reject(err);

                    db.run(
                      "UPDATE books SET stock = stock - ? WHERE id = ?",
                      [item.quantity, item.book_id],
                      function (err) {
                        if (err) return reject(err);
                        resolve();
                      }
                    );
                  }
                );
              });
            });

            Promise.all(insertItemsPromises)
              .then(() => {
                db.run(
                  "DELETE FROM cart_items WHERE cart_id = ?",
                  [cart.id],
                  function (err) {
                    if (err) return next(err);
                    logger.info("🛒 Carrito vaciado tras crear la orden.");
                  }
                );

                res.json({ message: "Orden creada con éxito", order_id });
              })
              .catch((err) => {
                logger.error(
                  "❌ Error al insertar ítems o actualizar stock:",
                  err
                );
                next(err);
              });
          }
        );
      }
    );
  });
};

// Obtener una orden por ID
exports.getOrderById = (req, res, next) => {
  const order_id = req.params.id;

  db.get("SELECT * FROM orders WHERE id = ?", [order_id], (err, order) => {
    if (err) return next(err);
    if (!order) return res.status(404).json({ error: "Orden no encontrada" });

    // Obtener los ítems de la orden
    db.all(
      "SELECT * FROM order_items WHERE order_id = ?",
      [order_id],
      (err, items) => {
        if (err) return next(err);
        res.json({ ...order, items });
      }
    );
  });
};

// Obtener todas las órdenes de un usuario
exports.getOrdersByUser = (req, res, next) => {
  const user_id = req.params.user_id;

  db.all("SELECT * FROM orders WHERE user_id = ?", [user_id], (err, orders) => {
    if (err) return next(err);
    res.json(orders);
  });
};

// Cancelar una orden (solo si está pendiente)
exports.cancelOrder = (req, res, next) => {
  const order_id = req.params.id;

  db.run(
    "UPDATE orders SET status = 'canceled' WHERE id = ? AND status = 'pending'",
    [order_id],
    function (err) {
      if (err) return next(err);
      if (this.changes === 0) {
        return res
          .status(400)
          .json({ error: "No se puede cancelar una orden ya procesada." });
      }
      res.json({ message: "Orden cancelada con éxito" });
    }
  );
};

// Obtener TODAS las órdenes (ADMIN)
exports.getAllOrders = (req, res, next) => {
  db.all("SELECT * FROM orders", [], (err, orders) => {
    if (err) return next(err);
    res.json(orders);
  });
};

// Actualizar estado de una orden (ADMIN)
exports.updateOrderStatus = (req, res, next) => {
  const order_id = req.params.id;
  const { status } = req.body;

  const validStatuses = ["pending", "paid", "shipped", "delivered", "canceled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado de orden inválido" });
  }

  db.run(
    "UPDATE orders SET status = ? WHERE id = ?",
    [status, order_id],
    function (err) {
      if (err) return next(err);
      if (this.changes === 0) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      res.json({ message: `Orden actualizada a estado: ${status}` });
    }
  );
};
