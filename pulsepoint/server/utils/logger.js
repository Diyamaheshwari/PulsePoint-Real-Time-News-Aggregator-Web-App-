const winston = require('winston');
const { format } = winston;
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Simple log format
const simpleFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    simpleFormat
  ),
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    // Write all logs to `combined.log`
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  ]
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Helper function to format log messages
const formatLogMessage = (action, userId, details = {}) => {
  const user = userId || 'anonymous';
  const detailsStr = Object.keys(details).length > 0 
    ? ' - ' + Object.entries(details)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ')
    : '';
  
  return `${action} [user:${user}]${detailsStr}`;
};

// Helper function to log actions
const logAction = (level, action, userId, ip, details = {}) => {
  const logData = formatLogMessage(action, userId, { ...details, ip });
  
  if (level === 'error') {
    logger.error(logData);
  } else if (level === 'warn') {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }
};

module.exports = {
  logger,
  logAction,
  info: (action, userId, ip, details) => logAction('info', action, userId, ip, details),
  error: (action, userId, ip, details) => logAction('error', action, userId, ip, details),
  warn: (action, userId, ip, details) => logAction('warn', action, userId, ip, details),
  logError: (action, userId, ip, details) => logAction('error', action, userId, ip, details)
};
