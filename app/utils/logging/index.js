const log4js = require("log4js");
const fs = require('fs');

log4js.configure({
  appenders: {
    stdout: { type: "stdout" },
    file: {
      type: "file",
      filename: "logs/log",
      maxLogSize: 10 * 1024 * 1024, // 10MB
      backups: 3, // keep three backup files
      compress: true // compress the backups
    }
  },
  categories: {
    default: { appenders: ['stdout', 'file'], level: 'info' }
  }
});

const logger = log4js.getLogger();

const readLog = () => {
  let log;
  try {
    log = fs.readFileSync('logs/log', 'utf8');
  } catch (error) {
    logger.error(error);
    return error;
  }
  return log;
};

exports.logger = logger;
exports.readLog = readLog;
