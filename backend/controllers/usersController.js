const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { cloudinary } = require("../config/cloudinary");

const SECRET_KEY = process.env.SECRET_KEY;

// Crear usuario
exports.createUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    console.log("🔍 Recibiendo datos de registro:");
    console.log({ username, email, password });

    if (!username || !email || !password) {
      console.log("❌ Error: Campos vacíos");
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    // Validación de email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Error: Email inválido");
      return res.status(400).json({ error: "Formato de email inválido" });
    }

    // Verificar si el email o username ya está en uso
    db.get(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email, username],
      async (err, user) => {
        if (err) {
          console.error("❌ Error en la consulta de usuario:", err);
          return next(err);
        }
        if (user) {
          if (user.email === email) {
            console.log("❌ Error: Email ya registrado");
            return res
              .status(409)
              .json({ error: "El email ya está registrado" });
          }
          if (user.username === username) {
            console.log("❌ Error: Nombre de usuario ya registrado");
            return res
              .status(409)
              .json({ error: "El nombre de usuario ya está en uso" });
          }
        }

        console.log("🔒 Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar nuevo usuario
        const query =
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        db.run(query, [username, email, hashedPassword], function (err) {
          if (err) {
            console.error("❌ Error insertando usuario:", err);
            return next(err);
          }

          console.log("✅ Usuario creado correctamente con ID:", this.lastID);
          res.json({ id: this.lastID, username, email });
        });
      }
    );
  } catch (error) {
    console.error("❌ Error en `createUser`:", error);
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

    console.log("🔍 Recibiendo datos para actualizar usuario:");
    console.log("➡️ user_id:", user_id);
    console.log("➡️ username:", username);
    console.log("➡️ phone:", phone);
    console.log("➡️ address:", address);
    console.log("➡️ profile_image (antes de subir):", profile_image);

    // Validar si el nuevo username ya existe en otro usuario
    db.get(
      "SELECT * FROM users WHERE username = ? AND id != ?",
      [username, user_id],
      (err, existingUser) => {
        if (err) {
          console.error("❌ Error consultando username:", err);
          return next(err);
        }
        if (existingUser) {
          console.log("❌ Error: El nombre de usuario ya está en uso");
          return res
            .status(409)
            .json({ error: "El nombre de usuario ya está en uso" });
        }

        if (req.file) {
          console.log("📤 Subiendo imagen a Cloudinary...");
          cloudinary.uploader
            .upload(req.file.path, {
              folder: "profile_pictures",
            })
            .then(async (result) => {
              profile_image = result.secure_url;
              console.log("✅ Imagen subida con éxito:", profile_image);

              // Obtener imagen anterior y eliminarla si existe
              db.get(
                "SELECT profile_image FROM users WHERE id = ?",
                [user_id],
                async (err, row) => {
                  if (err) {
                    console.error("❌ Error obteniendo imagen anterior:", err);
                    return next(err);
                  }

                  if (row && row.profile_image) {
                    console.log(
                      "🗑 Eliminando imagen anterior:",
                      row.profile_image
                    );
                    const oldImage = row.profile_image;
                    const publicId = oldImage.split("/").pop().split(".")[0]; // Obtener el public_id de Cloudinary
                    await cloudinary.uploader.destroy(
                      `profile_pictures/${publicId}`
                    );
                    console.log("✅ Imagen anterior eliminada");
                  }
                }
              );

              // Ejecutar actualización con la nueva imagen
              putUser();
            })
            .catch((error) => {
              console.error("❌ Error subiendo imagen a Cloudinary:", error);
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

      console.log(
        "📄 Ejecutando query de actualización en la base de datos..."
      );
      db.run(
        query,
        [username, phone, address, profile_image, user_id],
        function (err) {
          if (err) {
            console.error("❌ Error actualizando usuario en DB:", err);
            return next(err);
          }
          console.log("✅ Usuario actualizado en DB con éxito");

          res.json({
            message: "Usuario actualizado correctamente",
            profile_image,
          });
        }
      );
    };
  } catch (error) {
    console.error("❌ Error en `updateUser`:", error);
    next(error);
  }
};

// Obtener datos del usuario autenticado
exports.getMe = (req, res, next) => {
  try {
    // Extraer token del header de la petición
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    // Obtener datos del usuario desde la base de datos
    db.get("SELECT * FROM users WHERE id = ?", [decoded.id], (err, user) => {
      if (err) return next(err);
      if (!user)
        return res.status(404).json({ error: "Usuario no encontrado" });

      res.json(user);
    });
  } catch (error) {
    console.error("❌ Error en `getMe`:", error);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};
