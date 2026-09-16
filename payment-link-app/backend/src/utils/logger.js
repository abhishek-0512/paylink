/**
 * Simple Logger utility
 */
const logger = {
  info: (message, meta = '') => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message, meta = '') => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message, meta = '') => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  debug: (message, meta = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

module.exports = logger;
