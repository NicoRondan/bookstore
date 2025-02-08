const db = require("../config/database");

// Crear una nueva orden
exports.createOrder = (req, res, next) => {
  console.log("🛒 Recibiendo solicitud para crear orden...");
  console.log("📦 Datos recibidos:", req.body);

  const { user_id, items, total_price } = req.body;

  if (!user_id || !items || !total_price) {
    console.log("❌ Error: Datos incompletos para la orden.");
    return res.status(400).json({ error: "Faltan datos para crear la orden." });
  }

  console.log("✅ Datos validados. Verificando stock...");

  const checkStockPromises = items.map((item) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT stock FROM books WHERE id = ?",
        [item.book_id],
        (err, book) => {
          if (err) return reject(err);
          if (!book)
            return reject(new Error(`Libro ID ${item.book_id} no encontrado`));
          if (book.stock < item.quantity)
            return reject(
              new Error(`Stock insuficiente para el libro ID ${item.book_id}`)
            );
          resolve();
        }
      );
    });
  });

  Promise.all(checkStockPromises)
    .then(() => {
      console.log("✅ Stock validado. Creando orden en la base de datos...");

      db.run(
        "INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, 'pending')",
        [user_id, total_price],
        function (err) {
          if (err) {
            console.error("❌ Error al insertar la orden:", err);
            return next(err);
          }

          const order_id = this.lastID;
          console.log(`🆕 Orden creada con ID: ${order_id}`);

          const insertItems = items.map((item, index) => {
            console.log(`🔹 Procesando ítem #${index + 1}:`, item);

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
                      console.log(
                        `✅ Stock actualizado para libro ID ${item.book_id}`
                      );
                      resolve();
                    }
                  );
                }
              );
            });
          });

          Promise.all(insertItems)
            .then(() => {
              console.log(
                "✅ Todos los ítems se insertaron correctamente y stock actualizado."
              );
              res.json({ message: "Orden creada con éxito", order_id });
            })
            .catch((err) => {
              console.error(
                "❌ Error al insertar ítems o actualizar stock:",
                err
              );
              next(err);
            });
        }
      );
    })
    .catch((err) => {
      console.error("❌ Error de stock antes de crear la orden:", err);
      res.status(400).json({ error: err.message });
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
