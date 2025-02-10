const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { cloudinary } = require("../config/cloudinary");
const logger = require("../utils/logger");

const SECRET_KEY = process.env.SECRET_KEY;

// Crear usuario
exports.createUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    logger.info("🔍 Recibiendo datos de registro: ", {
      username,
      email,
      password,
    });

    if (!username || !email || !password) {
      logger.info("❌ Error: Campos vacíos");
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    // Validación de email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.info("❌ Error: Email inválido");
      return res.status(400).json({ error: "Formato de email inválido" });
    }

    // Verificar si el email o username ya está en uso
    db.get(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email, username],
      async (err, user) => {
        if (err) {
          logger.error("❌ Error en la consulta de usuario:", err);
          return next(err);
        }
        if (user) {
          if (user.email === email) {
            logger.info("❌ Error: Email ya registrado");
            return res
              .status(409)
              .json({ error: "El email ya está registrado" });
          }
          if (user.username === username) {
            logger.info("❌ Error: Nombre de usuario ya registrado");
            return res
              .status(409)
              .json({ error: "El nombre de usuario ya está en uso" });
          }
        }

        logger.info("🔒 Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar nuevo usuario
        const query =
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        db.run(query, [username, email, hashedPassword], function (err) {
          if (err) {
            logger.error("❌ Error insertando usuario:", err);
            return next(err);
          }

          logger.info("✅ Usuario creado correctamente con ID:", this.lastID);
          res.json({ id: this.lastID, username, email });
        });
      }
    );
  } catch (error) {
    logger.error("❌ Error en `createUser`:", error);
    next(error);
  }
};

// Iniciar sesión
exports.loginUser = (req, res, next) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM users WHERE email = ?";

  db.get(query, [email], async (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: "8h",
    });
    res.json({
      token,
      user,
    });
  });
};

// Obtener todos los usuarios
exports.getUsers = (req, res, next) => {
  db.all("SELECT id, username, email FROM users", [], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
};

exports.updateUser = async (req, res, next) => {
  try {
    const user_id = req.params.id;
    const { username, phone, address } = req.body;
    let profile_image = req.body.profile_image;

    logger.info("🔍 Recibiendo datos para actualizar usuario:");
    logger.info("➡️ ", { user_id, username, phone, address, profile_image });

    // Validar si el nuevo username ya existe en otro usuario
    db.get(
      "SELECT * FROM users WHERE username = ? AND id != ?",
      [username, user_id],
      (err, existingUser) => {
        if (err) {
          logger.error("❌ Error consultando username:", err);
          return next(err);
        }
        if (existingUser) {
          logger.info("❌ Error: El nombre de usuario ya está en uso");
          return res
            .status(409)
            .json({ error: "El nombre de usuario ya está en uso" });
        }

        if (req.file) {
          logger.info("📤 Subiendo imagen a Cloudinary...");
          cloudinary.uploader
            .upload(req.file.path, {
              folder: "profile_pictures",
            })
            .then(async (result) => {
              profile_image = result.secure_url;
              logger.info("✅ Imagen subida con éxito:", profile_image);

              // Obtener imagen anterior y eliminarla si existe
              db.get(
                "SELECT profile_image FROM users WHERE id = ?",
                [user_id],
                async (err, row) => {
                  if (err) {
                    logger.error("❌ Error obteniendo imagen anterior:", err);
                    return next(err);
                  }

                  if (row && row.profile_image) {
                    logger.info(
                      "🗑 Eliminando imagen anterior:",
                      row.profile_image
                    );
                    const oldImage = row.profile_image;
                    const publicId = oldImage.split("/").pop().split(".")[0]; // Obtener el public_id de Cloudinary
                    await cloudinary.uploader.destroy(
                      `profile_pictures/${publicId}`
                    );
                    logger.info("✅ Imagen anterior eliminada");
                  }
                }
              );

              // Ejecutar actualización con la nueva imagen
              putUser();
            })
            .catch((error) => {
              logger.error("❌ Error subiendo imagen a Cloudinary:", error);
              return next(error);
            });
        } else {
          putUser();
        }
      }
    );

    const putUser = () => {
      const query = `
        UPDATE users 
        SET username = ?, phone = ?, address = ?, profile_image = ?
        WHERE id = ?`;

      logger.info(
        "📄 Ejecutando query de actualización en la base de datos..."
      );
      db.run(
        query,
        [username, phone, address, profile_image, user_id],
        function (err) {
          if (err) {
            logger.error("❌ Error actualizando usuario en DB:", err);
            return next(err);
          }
          logger.info("✅ Usuario actualizado en DB con éxito");

          res.json({
            message: "Usuario actualizado correctamente",
            profile_image,
          });
        }
      );
    };
  } catch (error) {
    logger.error("❌ Error en `updateUser`:", error);
    next(error);
  }
};

// Obtener datos del usuario autenticado
exports.getMe = (req, res, next) => {
  try {
    const user_id = req.user.id;

    // Obtener datos del usuario desde la base de datos
    db.get("SELECT * FROM users WHERE id = ?", [user_id], (err, user) => {
      if (err) return next(err);
      if (!user)
        return res.status(404).json({ error: "Usuario no encontrado" });

      res.json(user);
    });
  } catch (error) {
    logger.error("❌ Error en `getMe`:", error);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};
