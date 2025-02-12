const db = require("../config/database");
const { cloudinary } = require("../config/cloudinary");
const logger = require("../utils/logger");

const getOrInsert = (table, column, value, callback) => {
  const normalizedValue = value.trim().toLowerCase();
  db.get(
    `SELECT id FROM ${table} WHERE LOWER(${column}) = ?`,
    [normalizedValue],
    (err, existing) => {
      if (err) return callback(err);
      if (existing) {
        return callback(null, existing.id);
      }

      db.run(
        `INSERT INTO ${table} (${column}) VALUES (?)`,
        [normalizedValue],
        function (err) {
          if (err) return callback(err);
          callback(null, this.lastID);
        }
      );
    }
  );
};

exports.addBook = (req, res, next) => {
  logger.info("📥 Recibiendo solicitud para agregar un libro:", req.body);

  const {
    title,
    authors,
    categories,
    isbn,
    price,
    publisher = "Autoeditado",
    publication_year,
    stock,
    description,
    pages,
  } = req.body;

  if (!title || !authors || !categories || !isbn || !price) {
    logger.error("❌ Falta un campo obligatorio.");
    return res
      .status(400)
      .json({ error: "Todos los campos obligatorios deben estar completos." });
  }

  const numericPrice = parseFloat(price);
  const numericYear = parseInt(publication_year);
  const numericStock = parseInt(stock);
  const numericPages = parseInt(pages);

  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res
      .status(400)
      .json({ error: "El precio debe ser un número válido y mayor a 0." });
  }
  if (isNaN(numericYear) || numericYear > new Date().getFullYear()) {
    return res
      .status(400)
      .json({ error: "El año de publicación no puede ser mayor al actual." });
  }
  if (isNaN(numericStock) || numericStock < 0) {
    return res
      .status(400)
      .json({ error: "El stock debe ser un número entero mayor o igual a 0." });
  }
  if (isNaN(numericPages) || numericPages <= 0) {
    return res
      .status(400)
      .json({ error: "El número de páginas debe ser un entero positivo." });
  }
  if (description && description.length > 1000) {
    return res
      .status(400)
      .json({ error: "La descripción no puede exceder los 1000 caracteres." });
  }

  const authorList = Array.isArray(authors)
    ? authors
    : authors.split(",").map((a) => a.trim());
  const categoryList = Array.isArray(categories)
    ? categories
    : categories.split(",").map((c) => c.trim());

  // Verificar si el ISBN ya existe
  db.get("SELECT id FROM books WHERE isbn = ?", [isbn], (err, existingBook) => {
    if (err) return next(err);
    if (existingBook) {
      logger.warn(`⚠️ ISBN duplicado detectado: ${isbn}`);
      return res.status(400).json({ error: "El ISBN ya está registrado." });
    }

    db.run("BEGIN TRANSACTION", (err) => {
      if (err) return next(err);

      getOrInsert("publishers", "name", publisher, (err, publisherId) => {
        if (err) {
          db.run("ROLLBACK");
          return next(err);
        }

        db.run(
          `INSERT INTO books (title, isbn, price, publisher_id, publication_year, stock, description, pages, image_url) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            title,
            isbn,
            numericPrice,
            publisherId,
            numericYear,
            numericStock,
            description,
            numericPages,
            null,
          ],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              return next(err);
            }

            const bookId = this.lastID;
            logger.info(`✅ Libro agregado con ID: ${bookId}`);

            let pendingTasks = authorList.length + categoryList.length;
            if (pendingTasks === 0) return finalizeTransaction();

            // Insertar autores
            authorList.forEach((author) => {
              getOrInsert("authors", "name", author, (err, authorId) => {
                if (err) {
                  db.run("ROLLBACK");
                  return next(err);
                }

                db.run(
                  "INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)",
                  [bookId, authorId],
                  (err) => {
                    if (err) {
                      db.run("ROLLBACK");
                      return next(err);
                    }
                    if (--pendingTasks === 0) finalizeTransaction();
                  }
                );
              });
            });

            // Insertar categorías
            categoryList.forEach((category) => {
              getOrInsert("categories", "name", category, (err, categoryId) => {
                if (err) {
                  db.run("ROLLBACK");
                  return next(err);
                }

                db.run(
                  "INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)",
                  [bookId, categoryId],
                  (err) => {
                    if (err) {
                      db.run("ROLLBACK");
                      return next(err);
                    }
                    if (--pendingTasks === 0) finalizeTransaction();
                  }
                );
              });
            });

            function finalizeTransaction() {
              db.run("COMMIT", (err) => {
                if (err) return next(err);
                logger.info("✅ Transacción completada con éxito.");

                if (req.file) {
                  logger.info("📤 Subiendo imagen a Cloudinary...");
                  cloudinary.uploader.upload(
                    req.file.path,
                    { folder: "book_images" },
                    (err, uploadedImage) => {
                      if (err) {
                        logger.error(
                          "⚠️ Imagen no pudo subirse, pero el libro sí se guardó."
                        );
                        return res.json({
                          message: "Libro agregado correctamente.",
                          bookId,
                        });
                      }

                      db.run(
                        "UPDATE books SET image_url = ? WHERE id = ?",
                        [uploadedImage.secure_url, bookId],
                        (err) => {
                          if (err) return next(err);
                          logger.info(
                            `✅ Imagen subida con éxito: ${uploadedImage.secure_url}`
                          );
                          res.json({
                            message: "Libro agregado correctamente.",
                            bookId,
                          });
                        }
                      );
                    }
                  );
                } else {
                  res.json({
                    message: "Libro agregado correctamente.",
                    bookId,
                  });
                }
              });
            }
          }
        );
      });
    });
  });
};

// Actualizar libro
exports.updateBook = (req, res, next) => {
  logger.info("📥 Recibiendo solicitud para actualizar un libro:", req.body);

  const { id } = req.params;
  const {
    title,
    authors,
    categories,
    isbn,
    price,
    publisher,
    publication_year,
    stock,
    description,
    pages,
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: "El ID del libro es obligatorio." });
  }

  if (
    !title &&
    !authors &&
    !categories &&
    !isbn &&
    !price &&
    !publisher &&
    !publication_year &&
    !stock &&
    !description &&
    !pages &&
    !req.file
  ) {
    return res
      .status(400)
      .json({ error: "Debe enviar al menos un campo para actualizar." });
  }

  // Validaciones de datos numéricos
  const numericPrice = price ? parseFloat(price) : null;
  const numericYear = publication_year ? parseInt(publication_year) : null;
  const numericStock = stock ? parseInt(stock) : null;
  const numericPages = pages ? parseInt(pages) : null;

  if (numericPrice !== null && (isNaN(numericPrice) || numericPrice <= 0)) {
    return res
      .status(400)
      .json({ error: "El precio debe ser un número válido y mayor a 0." });
  }
  if (
    numericYear !== null &&
    (isNaN(numericYear) || numericYear > new Date().getFullYear())
  ) {
    return res
      .status(400)
      .json({ error: "El año de publicación no puede ser mayor al actual." });
  }
  if (numericStock !== null && (isNaN(numericStock) || numericStock < 0)) {
    return res
      .status(400)
      .json({ error: "El stock debe ser un número entero mayor o igual a 0." });
  }
  if (numericPages !== null && (isNaN(numericPages) || numericPages <= 0)) {
    return res
      .status(400)
      .json({ error: "El número de páginas debe ser un entero positivo." });
  }
  if (description && description.length > 1000) {
    return res
      .status(400)
      .json({ error: "La descripción no puede exceder los 1000 caracteres." });
  }

  // Verificar si el libro existe y obtener su imagen actual
  db.get("SELECT * FROM books WHERE id = ?", [id], (err, book) => {
    if (err) return next(err);
    if (!book) {
      return res.status(404).json({ error: "El libro no existe." });
    }

    const oldImageUrl = book.image_url;

    // Verificar si el ISBN ya está registrado en otro libro
    if (isbn && isbn !== book.isbn) {
      db.get(
        "SELECT id FROM books WHERE isbn = ?",
        [isbn],
        (err, existingBook) => {
          if (err) return next(err);
          if (existingBook) {
            return res
              .status(400)
              .json({ error: "El ISBN ya está registrado en otro libro." });
          }
          proceedWithUpdate();
        }
      );
    } else {
      proceedWithUpdate();
    }

    function proceedWithUpdate() {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) return next(err);

        let query = "UPDATE books SET ";
        let params = [];
        let updates = [];

        if (title) {
          updates.push("title = ?");
          params.push(title);
        }
        if (isbn) {
          updates.push("isbn = ?");
          params.push(isbn);
        }
        if (numericPrice !== null) {
          updates.push("price = ?");
          params.push(numericPrice);
        }
        if (numericYear !== null) {
          updates.push("publication_year = ?");
          params.push(numericYear);
        }
        if (numericStock !== null) {
          updates.push("stock = ?");
          params.push(numericStock);
        }
        if (numericPages !== null) {
          updates.push("pages = ?");
          params.push(numericPages);
        }
        if (description) {
          updates.push("description = ?");
          params.push(description);
        }

        if (publisher) {
          getOrInsert("publishers", "name", publisher, (err, publisherId) => {
            if (err) {
              db.run("ROLLBACK");
              return next(err);
            }
            updates.push("publisher_id = ?");
            params.push(publisherId);
            executeBookUpdate();
          });
        } else {
          executeBookUpdate();
        }

        function executeBookUpdate() {
          if (updates.length === 0) return checkRelations();

          query += updates.join(", ") + " WHERE id = ?";
          params.push(id);

          db.run(query, params, (err) => {
            if (err) {
              db.run("ROLLBACK");
              return next(err);
            }
            checkRelations();
          });
        }

        function checkRelations() {
          let pendingTasks = 0;

          // Actualizar autores
          if (authors) {
            pendingTasks++;
            db.run(
              "DELETE FROM book_authors WHERE book_id = ?",
              [id],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  return next(err);
                }
                let authorsInserted = 0;
                const authorList = authors.split(",").map((a) => a.trim());

                authorList.forEach((author) => {
                  getOrInsert("authors", "name", author, (err, authorId) => {
                    if (err) {
                      db.run("ROLLBACK");
                      return next(err);
                    }
                    db.run(
                      "INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)",
                      [id, authorId],
                      (err) => {
                        if (err) {
                          db.run("ROLLBACK");
                          return next(err);
                        }
                        authorsInserted++;
                        if (authorsInserted === authorList.length) {
                          if (--pendingTasks === 0) finalizeTransaction();
                        }
                      }
                    );
                  });
                });
              }
            );
          }

          // Actualizar categorías
          if (categories) {
            pendingTasks++;
            db.run(
              "DELETE FROM book_categories WHERE book_id = ?",
              [id],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  return next(err);
                }
                let categoriesInserted = 0;
                const categoryList = categories.split(",").map((c) => c.trim());

                categoryList.forEach((category) => {
                  getOrInsert(
                    "categories",
                    "name",
                    category,
                    (err, categoryId) => {
                      if (err) {
                        db.run("ROLLBACK");
                        return next(err);
                      }
                      db.run(
                        "INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)",
                        [id, categoryId],
                        (err) => {
                          if (err) {
                            db.run("ROLLBACK");
                            return next(err);
                          }
                          categoriesInserted++;
                          if (categoriesInserted === categoryList.length) {
                            if (--pendingTasks === 0) finalizeTransaction();
                          }
                        }
                      );
                    }
                  );
                });
              }
            );
          }

          if (pendingTasks === 0) finalizeTransaction();
        }

        function finalizeTransaction() {
          db.run("COMMIT", (err) => {
            if (err) return next(err);
            if (req.file) {
              cloudinary.uploader.upload(
                req.file.path,
                { folder: "book_images" },
                (err, uploadedImage) => {
                  if (err)
                    return res.json({
                      message:
                        "Libro actualizado, pero la imagen no se pudo subir.",
                    });
                  db.run("UPDATE books SET image_url = ? WHERE id = ?", [
                    uploadedImage.secure_url,
                    id,
                  ]);
                  if (oldImageUrl)
                    cloudinary.uploader.destroy(
                      oldImageUrl.split("/").pop().split(".")[0]
                    );
                }
              );
            }
            res.json({ message: "Libro actualizado correctamente." });
          });
        }
      });
    }
  });
};

// Eliminar libro
exports.deleteBook = (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "El ID del libro es obligatorio." });
  }

  db.get("SELECT image_url FROM books WHERE id = ?", [id], (err, book) => {
    if (err) return next(err);
    if (!book) {
      return res.status(404).json({ error: "El libro no existe." });
    }

    db.run("BEGIN TRANSACTION", (err) => {
      if (err) return next(err);

      // Eliminar relaciones en book_authors y book_categories
      db.run("DELETE FROM book_authors WHERE book_id = ?", [id], (err) => {
        if (err) return rollbackAndExit(err);
        db.run("DELETE FROM book_categories WHERE book_id = ?", [id], (err) => {
          if (err) return rollbackAndExit(err);

          // Eliminar libro
          db.run("DELETE FROM books WHERE id = ?", [id], (err) => {
            if (err) return rollbackAndExit(err);

            db.run("COMMIT", (err) => {
              if (err) return next(err);

              // Si tiene imagen, eliminarla de Cloudinary
              if (book.image_url) {
                const publicId = book.image_url.split("/").pop().split(".")[0];
                cloudinary.uploader.destroy(publicId, (err) => {
                  if (err) {
                    return res.json({
                      message:
                        "Libro eliminado, pero la imagen no pudo ser borrada.",
                    });
                  }
                  res.json({ message: "Libro eliminado correctamente." });
                });
              } else {
                res.json({ message: "Libro eliminado correctamente." });
              }
            });
          });
        });
      });
    });

    function rollbackAndExit(error) {
      db.run("ROLLBACK", () => next(error));
    }
  });
};

exports.getBookById = (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "El ID del libro es obligatorio." });
  }

  const query = `
    SELECT 
      books.*, 
      publishers.name AS publisher,
      COALESCE(GROUP_CONCAT(DISTINCT authors.name), '') AS authors,
      COALESCE(GROUP_CONCAT(DISTINCT categories.name), '') AS categories
    FROM books
    LEFT JOIN publishers ON books.publisher_id = publishers.id
    LEFT JOIN book_authors ON books.id = book_authors.book_id
    LEFT JOIN authors ON book_authors.author_id = authors.id
    LEFT JOIN book_categories ON books.id = book_categories.book_id
    LEFT JOIN categories ON book_categories.category_id = categories.id
    WHERE books.id = ?
    GROUP BY books.id
  `;

  db.get(query, [id], (err, book) => {
    if (err) return next(err);
    if (!book) {
      return res.status(404).json({ error: "Libro no encontrado." });
    }

    res.json({
      id: book.id,
      title: book.title,
      publisher: book.publisher,
      isbn: book.isbn,
      price: book.price,
      stock: book.stock,
      description: book.description,
      pages: book.pages,
      image_url: book.image_url,
      rating: book.rating,
      authors: book.authors ? book.authors.split(",") : [],
      categories: book.categories ? book.categories.split(",") : [],
    });
  });
};

// Obtener libros con filtros, paginación y ordenamiento
exports.getBooks = (req, res, next) => {
  const {
    page = 1,
    limit = 9,
    category,
    author,
    publisher,
    minPrice,
    maxPrice,
    title,
    sort = "default",
  } = req.query;

  const offset = (page - 1) * limit;
  let params = [];
  let countParams = [];

  let baseQuery = `
    SELECT books.*, 
      publishers.name AS publisher,
      COALESCE(GROUP_CONCAT(DISTINCT authors.name), '') AS authors,
      COALESCE(GROUP_CONCAT(DISTINCT categories.name), '') AS categories
    FROM books
    LEFT JOIN publishers ON books.publisher_id = publishers.id
    LEFT JOIN book_authors ON books.id = book_authors.book_id
    LEFT JOIN authors ON book_authors.author_id = authors.id
    LEFT JOIN book_categories ON books.id = book_categories.book_id
    LEFT JOIN categories ON book_categories.category_id = categories.id
    WHERE 1=1
  `;

  let countQuery = `SELECT COUNT(DISTINCT books.id) as total FROM books WHERE 1=1`;

  if (category) {
    const categoryList = Array.isArray(category) ? category : [category];
    const placeholders = categoryList.map(() => "?").join(", ");
    baseQuery += ` AND books.id IN (
      SELECT book_id FROM book_categories WHERE category_id IN (
        SELECT id FROM categories WHERE LOWER(name) IN (${placeholders})
      )
    )`;
    countQuery += ` AND books.id IN (
      SELECT book_id FROM book_categories WHERE category_id IN (
        SELECT id FROM categories WHERE LOWER(name) IN (${placeholders})
      )
    )`;
    params.push(...categoryList.map((c) => c.toLowerCase()));
    countParams.push(...categoryList.map((c) => c.toLowerCase()));
  }

  if (author) {
    baseQuery += " AND LOWER(authors.name) LIKE LOWER(?)";
    countQuery +=
      " AND books.id IN (SELECT book_id FROM book_authors WHERE author_id IN (SELECT id FROM authors WHERE LOWER(name) LIKE LOWER(?)))";
    params.push(`%${author}%`);
    countParams.push(`%${author}%`);
  }

  if (publisher) {
    baseQuery += " AND LOWER(publishers.name) LIKE LOWER(?)";
    countQuery +=
      " AND books.publisher_id IN (SELECT id FROM publishers WHERE LOWER(name) LIKE LOWER(?))";
    params.push(`%${publisher}%`);
    countParams.push(`%${publisher}%`);
  }

  if (title) {
    baseQuery += " AND LOWER(books.title) LIKE LOWER(?)";
    countQuery += " AND LOWER(books.title) LIKE LOWER(?)";
    params.push(`%${title}%`);
    countParams.push(`%${title}%`);
  }

  if (minPrice) {
    baseQuery += " AND books.price >= ?";
    countQuery += " AND books.price >= ?";
    params.push(Number(minPrice));
    countParams.push(Number(minPrice));
  }

  if (maxPrice) {
    baseQuery += " AND books.price <= ?";
    countQuery += " AND books.price <= ?";
    params.push(Number(maxPrice));
    countParams.push(Number(maxPrice));
  }

  const sortOptions = {
    "title-asc": "books.title ASC",
    "title-desc": "books.title DESC",
    "price-asc": "books.price ASC",
    "price-desc": "books.price DESC",
    default: "books.title ASC",
  };
  baseQuery += ` GROUP BY books.id ORDER BY ${
    sortOptions[sort] || sortOptions["default"]
  }`;

  baseQuery += " LIMIT ? OFFSET ?";
  params.push(Number(limit), Number(offset));

  // Obtener total de libros
  db.get(countQuery, countParams, (err, result) => {
    if (err) return next(err);
    const total = result ? result.total : 0;

    db.all(baseQuery, params, (err, rows) => {
      if (err) return next(err);

      const books = rows.map((row) => ({
        id: row.id,
        title: row.title,
        publisher: row.publisher,
        isbn: row.isbn,
        price: row.price,
        stock: row.stock,
        description: row.description,
        pages: row.pages,
        image_url: row.image_url,
        rating: row.rating,
        authors: row.authors
          ? row.authors.replace(/,\s*/g, "|").split("|")
          : [],
        categories: row.categories
          ? row.categories.replace(/,\s*/g, "|").split("|")
          : [],
      }));

      res.json({ books, total });
    });
  });
};

// Obtener todos los libros con autores, categorías y editorial
exports.getAllBooks = (req, res, next) => {
  let booksQuery = `
    SELECT books.*, publishers.name AS publisher
    FROM books
    LEFT JOIN publishers ON books.publisher_id = publishers.id
    ORDER BY books.title ASC
  `;

  db.all(booksQuery, [], (err, books) => {
    if (err) return next(err);

    if (books.length === 0) {
      return res.json({ books: [], total: 0 });
    }

    const bookIds = books.map((book) => book.id);

    let authorsQuery = `
      SELECT book_authors.book_id, authors.name
      FROM book_authors
      INNER JOIN authors ON book_authors.author_id = authors.id
      WHERE book_authors.book_id IN (${bookIds.join(",")})
    `;

    db.all(authorsQuery, [], (err, authorRows) => {
      if (err) return next(err);

      let categoriesQuery = `
        SELECT book_categories.book_id, categories.name
        FROM book_categories
        INNER JOIN categories ON book_categories.category_id = categories.id
        WHERE book_categories.book_id IN (${bookIds.join(",")})
      `;

      db.all(categoriesQuery, [], (err, categoryRows) => {
        if (err) return next(err);

        const bookMap = {};
        books.forEach((book) => {
          bookMap[book.id] = {
            id: book.id,
            title: book.title,
            publisher: book.publisher,
            isbn: book.isbn,
            price: book.price,
            stock: book.stock,
            description: book.description,
            pages: book.pages,
            image_url: book.image_url,
            rating: book.rating,
            authors: [],
            categories: [],
          };
        });

        authorRows.forEach((row) => {
          if (bookMap[row.book_id]) {
            bookMap[row.book_id].authors.push(row.name);
          }
        });

        categoryRows.forEach((row) => {
          if (bookMap[row.book_id]) {
            bookMap[row.book_id].categories.push(row.name);
          }
        });

        const booksArray = Object.values(bookMap);
        res.json({ books: booksArray, total: booksArray.length });
      });
    });
  });
};

// Eliminar todos los libros
exports.deleteBooks = (req, res, next) => {
  db.run("DELETE FROM books", (err) => {
    if (err) return next(err);
    res.json({ message: "Todos los libros eliminados" });
  });
};
