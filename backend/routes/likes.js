const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  addLike,
  getLikedBooks,
  checkLikeStatus,
  removeLike,
} = require("../controllers/likesController");

const router = express.Router();

router.post("/", authenticateToken, addLike);
router.get("/", authenticateToken, getLikedBooks);
router.get("/:book_id", authenticateToken, checkLikeStatus);
router.delete("/", authenticateToken, removeLike);

module.exports = router;
