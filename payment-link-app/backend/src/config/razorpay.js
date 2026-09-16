const Razorpay = require('razorpay');
const config = require('./app.config');
const logger = require('../utils/logger');

function getRazorpayInstance() {
  if (
    config.razorpay.keyId &&
    config.razorpay.keySecret &&
    !config.razorpay.keyId.includes('sample') &&
    !config.razorpay.keyId.includes('mock')
  ) {
    try {
      return new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret
      });
    } catch (err) {
      logger.error('Failed to initialize Razorpay SDK:', err.message);
      return null;
    }
  }
  return null;
}

module.exports = getRazorpayInstance;
