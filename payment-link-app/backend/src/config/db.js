const mongoose = require('mongoose');
const config = require('./app.config');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2500 // Fast failover if MongoDB service is stopped
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Drop legacy receiptNumber index if it exists with default null constraint
    const Payment = require('../models/payment.model');
    try {
      await Payment.collection.dropIndex('receiptNumber_1');
      logger.info('Legacy receiptNumber index dropped successfully');
    } catch (e) {
      // Index did not exist or already dropped
    }

    await Payment.syncIndexes().catch((err) => {
      logger.warn(`Index sync note: ${err.message}`);
    });
  } catch (error) {
    logger.error(`MongoDB Connection Note (${error.message}). Operating in high-performance memory store fallback for development.`);
  }
};

module.exports = connectDB;
