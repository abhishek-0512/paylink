const express = require('express');
const router = express.Router();
const {
  createPaymentLink,
  getPaymentDetails,
  getPaymentStatus,
  verifyPayment,
  downloadReceipt,
  getPaymentHistory
} = require('../controllers/payment.controller');
const {
  validateCreatePayment,
  validateVerifyPayment
} = require('../middleware/validation.middleware');
const { strictLimiter } = require('../middleware/rateLimiter.middleware');

// Merchant Routes
router.post('/create', strictLimiter, validateCreatePayment, createPaymentLink);
router.get('/', getPaymentHistory);

// Verification & Details
router.post('/verify', validateVerifyPayment, verifyPayment);
router.get('/:id', getPaymentDetails);
router.get('/:id/status', getPaymentStatus);
router.get('/:id/receipt', downloadReceipt);

module.exports = router;
