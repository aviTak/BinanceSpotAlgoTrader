const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");

// Define the log directory and file paths
const logDir = path.join(__dirname, "..", "log-files");

// Create the logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Create the initial logger
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
        // Transport for general logs (info and above)
        new DailyRotateFile({
            filename: path.join(logDir, "combined-%DATE%.log"),
            datePattern: "YYYY-MM-DD-HH",
            zippedArchive: true,
            maxFiles: "3d"
        }),
        // Separate transport for error logs
        new DailyRotateFile({
            filename: path.join(logDir, "error-%DATE%.log"),
            datePattern: "YYYY-MM-DD-HH",
            level: "error",
            zippedArchive: true,
            maxFiles: "3d"
        })
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
