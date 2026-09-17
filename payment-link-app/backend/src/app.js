const express = require('express');
const cors = require('cors');
const config = require('./config/app.config');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const paymentRoutes = require('./routes/payment.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const webhookRoutes = require('./routes/webhook.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

// CORS configuration (allow all localhost origins and frontend urls)
app.use(cors({
  origin: true,
  credentials: true
}));

// Capture raw body for webhook HMAC signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Apply general API rate limiter
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment Link Backend Service is running cleanly',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/settings', settingsRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
