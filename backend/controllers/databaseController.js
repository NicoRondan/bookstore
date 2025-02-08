// databaseController.js
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("../config/database");

exports.resetDatabase = (req, res, next) => {
  console.log("⚠️ Restableciendo base de datos...");

  const dropTables = `
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS cart_items;
    DROP TABLE IF EXISTS cart;
    DROP TABLE IF EXISTS likes;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS books;
  `;

  db.exec(dropTables, (err) => {
    if (err) {
      console.error("❌ Error al eliminar tablas:", err);
      return next(err);
    }
    console.log("✅ Tablas eliminadas correctamente.");

    const createTables = `
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        genre TEXT NOT NULL,
        isbn TEXT UNIQUE NOT NULL,
        publisher TEXT,
        publication_year INTEGER,
        stock INTEGER DEFAULT 0,
        description TEXT,
        pages INTEGER,
        price REAL NOT NULL,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT DEFAULT NULL,
        address TEXT DEFAULT NULL,
        profile_image TEXT DEFAULT NULL,
        role TEXT CHECK(role IN ('admin', 'client')) NOT NULL DEFAULT 'client'
      );

      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_price REAL NOT NULL,
        status TEXT CHECK(status IN ('pending', 'paid', 'shipped', 'delivered', 'canceled')) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );
    `;

    db.exec(createTables, async (err) => {
      if (err) {
        console.error("❌ Error al crear tablas:", err);
        return next(err);
      }
      console.log("✅ Tablas creadas correctamente.");

      try {
        await seedData();
        res.json({
          message: "Base de datos restablecida y poblada correctamente.",
        });
      } catch (error) {
        console.error("❌ Error al poblar la base de datos:", error);
        next(error);
      }
    });
  });
};

const seedData = async () => {
  console.log("🌱 Poblando base de datos...");

  // Insertar libros desde books.json
  const booksData = fs.readFileSync(
    path.join(__dirname, "../books.json"),
    "utf8"
  );
  const books = JSON.parse(booksData);
  const bookQuery = `
    INSERT INTO books (title, author, genre, isbn, publisher, publication_year, stock, description, pages, price, image_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  books.forEach((book) => {
    db.run(bookQuery, [
      book.title,
      book.author,
      book.genre,
      book.isbn,
      book.publisher,
      book.publication_year,
      book.stock,
      book.description,
      book.pages,
      book.price,
      book.image_url,
    ]);
  });
  console.log("📚 Libros insertados correctamente.");

  // Insertar usuarios
  const users = [
    {
      username: "admin",
      email: "admin@example.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    },
    {
      username: "user1",
      email: "user1@example.com",
      password: await bcrypt.hash("user123", 10),
      role: "client",
    },
  ];

  const userQuery = `
    INSERT INTO users (username, email, password, role) 
    VALUES (?, ?, ?, ?)
  `;

  users.forEach((user) => {
    db.run(userQuery, [user.username, user.email, user.password, user.role]);
  });
  console.log("👤 Usuarios insertados correctamente.");

  // Insertar órdenes
  db.run(
    "INSERT INTO orders (user_id, total_price, status) VALUES (1, 30.5, 'paid')"
  );
  console.log("🛒 Orden de prueba insertada.");

  // Insertar reviews
  db.run(
    "INSERT INTO reviews (user_id, book_id, rating, comment) VALUES (2, 1, 5, 'Excelente libro!')"
  );
  console.log("⭐ Review de prueba insertada.");

  console.log("✅ Poblamiento de base de datos completado.");
};
