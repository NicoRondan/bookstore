const express = require("express");
const {
  addLike,
  getLikedBooks,
  checkLikeStatus,
  removeLike,
} = require("../controllers/likesController");

const router = express.Router();

router.post("/", addLike);
router.get("/:user_id", getLikedBooks);
router.get("/:user_id/:book_id", checkLikeStatus);
router.delete("/", removeLike);
module.exports = router;
