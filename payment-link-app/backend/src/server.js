const app = require('./app');
const config = require('./config/app.config');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  let PORT = Number(config.port);
  const server = app.listen(PORT, () => {
    logger.info(`====================================================`);
    logger.info(`🚀 Server running in ${config.env} mode on port ${PORT}`);
    logger.info(`🔗 Backend Base URL: ${config.urls.backend}`);
    logger.info(`🔗 Frontend Base URL: ${config.urls.frontend}`);
    logger.info(`====================================================`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.warn(`Port ${PORT} is already in use (e.g. by AirPlay/ControlCenter on macOS). Trying fallback port ${PORT + 1}...`);
      PORT = PORT + 1;
      server.listen(PORT);
    } else {
      logger.error('Server error:', error);
    }
  });
};

startServer();
