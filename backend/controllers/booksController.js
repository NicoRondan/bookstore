const db = require("../config/database");

// Normalizar nombres (eliminar espacios extra y puntos)
const normalizeName = (name) => {
  return name.trim().toLowerCase().replace(/\s+/g, " ").replace(/\./g, "");
};

const getOrInsertAuthor = async (authorName) => {
  const normalizedAuthor = normalizeName(authorName);
  let existingAuthor = await db.get(
    "SELECT id FROM authors WHERE normalized_name = ?",
    [normalizedAuthor]
  );

  if (!existingAuthor) {
    let result = await db.run("INSERT INTO authors (name) VALUES (?)", [
      authorName.trim(),
    ]);
    return result.lastID;
  } else {
    return existingAuthor.id;
  }
};

const getOrInsertCategory = async (categoryName) => {
  const normalizedCategory = normalizeName(categoryName);
  let existingCategory = await db.get(
    "SELECT id FROM categories WHERE LOWER(name) = ?",
    [normalizedCategory]
  );

  if (!existingCategory) {
    let result = await db.run("INSERT INTO categories (name) VALUES (?)", [
      categoryName.trim(),
    ]);
    return result.lastID;
  } else {
    return existingCategory.id;
  }
};

const getOrInsertPublisher = async (publisherName) => {
  const normalizedPublisher = normalizeName(publisherName);
  let existingPublisher = await db.get(
    "SELECT id FROM publishers WHERE LOWER(name) = ?",
    [normalizedPublisher]
  );

  if (!existingPublisher) {
    let result = await db.run("INSERT INTO publishers (name) VALUES (?)", [
      publisherName.trim(),
    ]);
    return result.lastID;
  } else {
    return existingPublisher.id;
  }
};

// Agregar un libro
exports.addBook = async (req, res, next) => {
  try {
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
    if (!title || !authors || !categories || !isbn || !price || !publisher) {
      return res.status(400).json({
        error: "Todos los campos obligatorios deben estar completos.",
      });
    }

    const authorList = Array.isArray(authors)
      ? authors
      : authors.split(",").map((a) => a.trim());
    const categoryList = Array.isArray(categories)
      ? categories
      : categories.split(",").map((c) => c.trim());

    const publisherId = await getOrInsertPublisher(publisher);

    // Subir imagen si hay un archivo adjunto
    let imageUrl = null;
    if (req.file) {
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "book_images",
      });
      imageUrl = uploadedImage.secure_url;
    }

    // Insertar libro
    const result = await db.run(
      `INSERT INTO books (title, isbn, price, publisher_id, publication_year, stock, description, pages, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        isbn,
        price,
        publisherId,
        publication_year,
        stock,
        description,
        pages,
        imageUrl,
      ]
    );
    const bookId = result.lastID;

    for (const author of authorList) {
      const authorId = await getOrInsertAuthor(author);
      await db.run(
        "INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)",
        [bookId, authorId]
      );
    }

    for (const category of categoryList) {
      const categoryId = await getOrInsertCategory(category);
      await db.run(
        "INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)",
        [bookId, categoryId]
      );
    }

    res.json({ message: "Libro agregado correctamente.", bookId });
  } catch (error) {
    next(error);
  }
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
