const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

// Define the log directory and file paths
const logDir = path.join(__dirname, "..", "log-files"),
    errorLogPath = path.join(logDir, "error.log"),
    combinedLogPath = path.join(logDir, "combined.log");

// Create the logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = createLogger({
    level: "info",
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss"
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: "app" },
    transports: [
        new transports.File({ filename: errorLogPath, level: "error" }),
        new transports.File({ filename: combinedLogPath })
    ]
});

// Log to the console/terminal as well
logger.add(new transports.Console({
    format: format.combine(
        format.colorize(),
        format.simple()
    )
}));

module.exports = logger;
