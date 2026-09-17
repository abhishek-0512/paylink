const app = require('../payment-link-app/backend/src/app');
const connectDB = require('../payment-link-app/backend/src/config/db');

let isDbConnected = false;

module.exports = async (req, res) => {
  if (!isDbConnected) {
    try {
      await connectDB();
      isDbConnected = true;
    } catch (e) {
      console.warn('MongoDB connection note on serverless:', e.message);
    }
  }
  return app(req, res);
};
