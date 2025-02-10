// logger.json
const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info", // Nivel de log (info, warn, error, etc.)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ""
      }`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.json(),
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      format: winston.format.json(),
    }),
  ],
});

module.exports = logger;
