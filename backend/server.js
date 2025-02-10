// server.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
require("./config/passport");

const app = express();

app.set("trust proxy", 1); // Confía en el primer proxy

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret_super_secure", // Clave para firmar la cookie de sesión
    resave: false, // Evita guardar la sesión en cada request si no ha cambiado
    saveUninitialized: false, // No guarda sesiones vacías
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 2 }, // 2 horas de duración
  })
);

const limiter = rateLimit({
  windowMs: 20 * 60 * 1000, // 20 minutos
  max: 200, // Máximo 200 requests por IP en 20 min
  message: "Demasiadas solicitudes desde esta IP, inténtalo más tarde.",
});

app.use(limiter);

app.use(helmet());

const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(morgan("combined"));
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

app.use("/api", routes);
app.use(errorHandler);

// captura errores globales antes de iniciar el servidor
process.on("uncaughtException", (err) => {
  logger.error(`❌ Error no controlado: ${err.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`⚠️ Promesa rechazada sin manejar: ${reason}`);
});

app.listen(PORT, () => {
  logger.info(`Servidor corriendo en http://localhost:${PORT}`);
});
