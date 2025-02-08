const express = require("express");
const router = express.Router();

router.use("/users", require("./users"));
router.use("/books", require("./books"));
router.use("/likes", require("./likes"));
router.use("/cart", require("./cart"));
router.use("/orders", require("./orders"));
router.use("/payments", require("./payments"));
router.use("/database", require("./database"));

module.exports = router;
