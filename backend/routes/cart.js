// routes/cart.js
const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  getCart,
  clearCart,
  addToCart,
  removeFromCart,
} = require("../controllers/cartController");

const router = express.Router();

router.get("/", authenticateToken, getCart);
router.post("/add", authenticateToken, addToCart);
router.delete("/remove", authenticateToken, removeFromCart);
router.delete("/clear", authenticateToken, clearCart);

module.exports = router;
