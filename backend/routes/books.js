// routes/books.js
const express = require("express");
const {
  getBooks,
  getAllBooks,
  deleteBooks,
  addBook,
  //updateBook
} = require("../controllers/booksController");
const { uploadBooks } = require("../config/cloudinary");

const router = express.Router();

router.post("/", uploadBooks.single("book_image"), addBook);
//router.put("/:id", uploadBooks.single("book_image"), updateBook);
router.get("/", getBooks);
router.get("/all", getAllBooks);
router.delete("/", deleteBooks);

module.exports = router;
