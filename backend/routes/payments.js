const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  createPayment,
  paymentWebhook,
  paymentSuccess,
  paymentFailure,
  paymentPending,
} = require("../controllers/paymentsController");

const router = express.Router();

router.post("/", authenticateToken, createPayment);
router.post("/:order_id/webhook", paymentWebhook);
router.get("/success", paymentSuccess);
router.get("/failure", paymentFailure);
router.get("/pending", paymentPending);

module.exports = router;
