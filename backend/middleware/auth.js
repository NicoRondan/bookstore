const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

exports.authenticateToken = (req, res, next) => {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso no autorizado" });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }

    req.user = user;
    next();
  });
};

exports.authenticateAdmin = (req, res, next) => {
  db.get("SELECT role FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Error en la base de datos" });
    }
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Acceso denegado, solo para administradores" });
    }
    next();
  });
};
