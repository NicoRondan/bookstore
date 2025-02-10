// routes/orders
const express = require("express");
const {
  createOrder,
  getOrderById,
  getOrdersByUser,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/ordersController");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, createOrder);
router.get("/:id", authenticateToken, getOrderById);
router.get("/user/:user_id", authenticateToken, getOrdersByUser);
router.put("/cancel/:id", authenticateToken, cancelOrder);
router.get("/", authenticateToken, authenticateAdmin, getAllOrders);
router.put(
  "/:id/status",
  authenticateToken,
  authenticateAdmin,
  updateOrderStatus
);

module.exports = router;
