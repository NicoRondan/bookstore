const db = require("../config/database");

// Obtener libros con filtros, paginación y ordenamiento
exports.getBooks = (req, res, next) => {
  const {
    page = 1,
    limit = 9,
    genre,
    author,
    minPrice,
    maxPrice,
    title,
    sort = "default",
  } = req.query;
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM books WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as total FROM books WHERE 1=1";
  let params = [];
  let countParams = [];

  if (genre) {
    query += " AND genre = ?";
    countQuery += " AND genre = ?";
    params.push(genre);
    countParams.push(genre);
  }
  if (author) {
    query += " AND LOWER(author) LIKE LOWER(?)";
    countQuery += " AND LOWER(author) LIKE LOWER(?)";
    params.push(`%${author}%`);
    countParams.push(`%${author}%`);
  }
  if (title) {
    query += " AND LOWER(title) LIKE LOWER(?)";
    countQuery += " AND LOWER(title) LIKE LOWER(?)";
    params.push(`%${title}%`);
    countParams.push(`%${title}%`);
  }
  if (minPrice) {
    query += " AND price >= ?";
    countQuery += " AND price >= ?";
    params.push(Number(minPrice));
    countParams.push(Number(minPrice));
  }
  if (maxPrice) {
    query += " AND price <= ?";
    countQuery += " AND price <= ?";
    params.push(Number(maxPrice));
    countParams.push(Number(maxPrice));
  }

  // Aplicar ordenamiento basado en `sort`
  switch (sort) {
    case "title-asc":
      query += " ORDER BY title ASC";
      break;
    case "title-desc":
      query += " ORDER BY title DESC";
      break;
    case "price-asc":
      query += " ORDER BY price ASC";
      break;
    case "price-desc":
      query += " ORDER BY price DESC";
      break;
    default:
      query += " ORDER BY title ASC, author ASC";
  }

  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);
  if (!isNaN(parsedLimit) && !isNaN(parsedOffset)) {
    query += " LIMIT ? OFFSET ?";
    params.push(parsedLimit, parsedOffset);
  }

  db.get(countQuery, countParams, (err, result) => {
    if (err) return next(err);

    const total = result ? result.total : 0;

    db.all(query, params, (err, rows) => {
      if (err) return next(err);
      res.json({ books: rows, total });
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
