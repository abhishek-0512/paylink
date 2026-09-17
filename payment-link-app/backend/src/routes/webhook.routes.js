const express = require('express');
const router = express.Router();
const { handleRazorpayWebhook } = require('../controllers/webhook.controller');

router.post('/razorpay', handleRazorpayWebhook);

module.exports = router;
