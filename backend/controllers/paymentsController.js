const { MercadoPagoConfig, Payment, Preference } = require("mercadopago");
const db = require("../config/database");

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
    idempotencyKey: "0d5020ed-1af6-469c-ae06-c3bec19954bb",
  },
});

exports.createPayment = async (req, res, next) => {
  try {
    console.log("🛒 Recibiendo solicitud de pago...");
    console.log("📦 Datos recibidos:", req.body);

    const { order_id } = req.body;

    if (!order_id) {
      console.log("❌ Error: ID de orden faltante.");
      return res
        .status(400)
        .json({ error: "El ID de la orden es obligatorio." });
    }

    console.log(`🔍 Buscando orden en la base de datos con ID: ${order_id}`);

    db.get("SELECT * FROM orders WHERE id = ?", [order_id], (err, order) => {
      if (err) {
        console.error("❌ Error en la consulta de la orden:", err);
        return next(err);
      }
      if (!order) {
        console.log("❌ Error: Orden no encontrada.");
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      if (order.status !== "pending") {
        console.log(`⚠️ Pedido ${order_id} ya fue procesado.`);
        return res.status(400).json({ error: "El pedido ya fue procesado" });
      }

      console.log("✅ Orden encontrada:", order);
      console.log("🔄 Recuperando ítems de la orden...");

      db.all(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order_id],
        async (err, items) => {
          if (err) {
            console.error("❌ Error al obtener los ítems de la orden:", err);
            return next(err);
          }

          if (items.length === 0) {
            console.log("⚠️ La orden no tiene ítems asociados.");
            return res
              .status(400)
              .json({ error: "La orden no tiene ítems asociados." });
          }

          console.log(`📦 Ítems recuperados (${items.length}):`, items);

          const mappedItems = items.map((item, index) => ({
            id: item.book_id.toString(),
            title: `Libro ${item.book_id}`,
            quantity: item.quantity,
            unit_price: item.price,
            currency_id: "ARS",
          }));

          console.log("🛒 Ítems mapeados para MercadoPago:", mappedItems);

          const body = {
            items: mappedItems,
            payer: {
              email: req.user.email,
            },
            back_urls: {
              // TODO: reemplazar por links del frontend
              success: `https://4h2dk6-4000.csb.app/api/payments/success?order_id=${order_id}`,
              failure: `https://4h2dk6-4000.csb.app/api/payments/failure?order_id=${order_id}`,
              pending: `https://4h2dk6-4000.csb.app/api/payments/pending?order_id=${order_id}`,
            },
            auto_return: "approved",
            notification_url: `https://4h2dk6-4000.csb.app/api/payments/${order_id}/webhook`,
          };

          console.log("📤 Enviando preferencia a MercadoPago...");

          try {
            const preference = new Preference(client);
            const response = await preference.create({ body });
            console.log(
              "✅ Preferencia creada con éxito:",
              response.sandbox_init_point
            );
            res.json({ url: response.sandbox_init_point });
          } catch (mpError) {
            console.error(
              "❌ Error al crear la preferencia en MercadoPago:",
              mpError
            );
            next(mpError);
          }
        }
      );
    });
  } catch (error) {
    console.error("❌ Error en `createPayment`:", error);
    next(error);
  }
};

// Confirmar pago (Webhook de MercadoPago)
exports.paymentWebhook = async (req, res, next) => {
  try {
    const { order_id } = req.params;
    if (req.query.type === "payment") {
      const payment = new Payment(client);
      const data = await payment.get({
        id: req.query["data.id"],
      });
      const { status } = data;

      if (status === "approved") {
        db.run("UPDATE orders SET status = 'paid' WHERE id = ?", [order_id]);
        console.log(`✅ Pedido ${order_id} pagado con éxito.`);
      } else {
        console.log(`⚠️ Pedido ${order_id} no fue aprobado. Estado: ${status}`);
      }

      res.sendStatus(200);
    }
  } catch (error) {
    next(error);
  }
};

// Simular éxito de pago (para pruebas)
exports.paymentSuccess = (req, res) => {
  const { order_id } = req.query;
  res.json({ message: `Pedido #${order_id} pagado con éxito!` });
};

// Simular fallo de pago (para pruebas)
exports.paymentFailure = (req, res) => {
  res.json({ message: "Pago fallido. Intenta nuevamente." });
};

// Simular pago pendiente (para pruebas)
exports.paymentPending = (req, res) => {
  res.json({ message: "Pago pendiente. En revisión por MercadoPago." });
};
