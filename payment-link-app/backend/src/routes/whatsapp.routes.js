const express = require('express');
const router = express.Router();
const { sendPaymentLinkWhatsApp } = require('../controllers/whatsapp.controller');
const { validateSendWhatsApp } = require('../middleware/validation.middleware');
const { strictLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/send-payment-link', strictLimiter, validateSendWhatsApp, sendPaymentLinkWhatsApp);

module.exports = router;
