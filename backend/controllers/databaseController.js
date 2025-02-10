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
    DROP TABLE IF EXISTS book_authors;
    DROP TABLE IF EXISTS book_categories;
    DROP TABLE IF EXISTS authors;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS books;
    DROP TABLE IF EXISTS publishers;
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
        isbn TEXT UNIQUE NOT NULL,
        publisher_id INTEGER,
        publication_year INTEGER,
        stock INTEGER DEFAULT 0,
        description TEXT,
        pages INTEGER,
        price REAL NOT NULL,
        image_url TEXT,
        rating REAL DEFAULT NULL,
        FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS publishers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS authors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS book_authors (
        book_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        FOREIGN KEY (book_id) REFERENCES books(id),
        FOREIGN KEY (author_id) REFERENCES authors(id)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS book_categories (
        book_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        FOREIGN KEY (book_id) REFERENCES books(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
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

  const booksData = fs.readFileSync(
    path.join(__dirname, "../books.json"),
    "utf8"
  );
  const data = JSON.parse(booksData);

  console.log("📂 JSON Cargado Correctamente:", Object.keys(data));

  // Insertar publishers y obtener sus IDs
  const publisherMap = new Map();
  await Promise.all(
    [...new Set(data.books.map((b) => b.publisher))].map(async (publisher) => {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO publishers (name) VALUES (?) ON CONFLICT(name) DO NOTHING`,
          [publisher],
          function (err) {
            if (err) return reject(err);
            publisherMap.set(publisher, this.lastID);
            resolve();
          }
        );
      });
    })
  );

  console.log("✅ Editoriales insertadas correctamente.");

  // Insertar libros y mapear sus IDs
  const bookMap = new Map();
  await Promise.all(
    data.books.map(async (book) => {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO books (title, isbn, publisher_id, publication_year, stock, description, pages, price, image_url) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
          [
            book.title,
            book.isbn,
            publisherMap.get(book.publisher),
            book.publication_year,
            book.stock,
            book.description,
            book.pages,
            book.price,
            book.image_url,
          ],
          function (err) {
            if (err) return reject(err);
            bookMap.set(book.title, this.lastID);
            resolve();
          }
        );
      });
    })
  );

  console.log("✅ Libros insertados correctamente.");

  // Insertar authors y obtener sus IDs
  const authorMap = new Map();
  await Promise.all(
    [...new Set(data.book_authors.map((ba) => ba.author))].map(
      async (author) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO authors (name) VALUES (?) ON CONFLICT(name) DO NOTHING`,
            [author],
            function (err) {
              if (err) return reject(err);
              authorMap.set(author, this.lastID);
              resolve();
            }
          );
        });
      }
    )
  );

  console.log("✅ Autores insertados correctamente.");

  // Insertar relaciones libro-autor
  await Promise.all(
    data.book_authors.map(async ({ book, author }) => {
      return new Promise((resolve, reject) => {
        const bookId = bookMap.get(book);
        const authorId = authorMap.get(author);
        if (!bookId || !authorId) {
          console.error(`❌ Error asignando autor: ${book} -> ${author}`);
          return resolve();
        }
        db.run(
          `INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)`,
          [bookId, authorId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    })
  );

  console.log("✅ Relaciones libro-autor insertadas correctamente.");

  // Insertar categories y obtener sus IDs
  const categoryMap = new Map();
  await Promise.all(
    [...new Set(data.book_categories.map((bc) => bc.category))].map(
      async (category) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO categories (name) VALUES (?) ON CONFLICT(name) DO NOTHING`,
            [category],
            function (err) {
              if (err) return reject(err);
              categoryMap.set(category, this.lastID);
              resolve();
            }
          );
        });
      }
    )
  );

  console.log("✅ Categorías insertadas correctamente.");

  // Insertar relaciones libro-categoría
  await Promise.all(
    data.book_categories.map(async ({ book, category }) => {
      return new Promise((resolve, reject) => {
        const bookId = bookMap.get(book);
        const categoryId = categoryMap.get(category);
        if (!bookId || !categoryId) {
          console.error(`❌ Error asignando categoría: ${book} -> ${category}`);
          return resolve();
        }
        db.run(
          `INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)`,
          [bookId, categoryId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    })
  );

  console.log("✅ Relaciones libro-categoría insertadas correctamente.");

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

  console.log("✅ Usuarios insertados correctamente.");

  console.log("✅ Poblamiento de base de datos completado.");
};
