const paymentService = require('../services/payment/payment.service');
const PaymentFactory = require('../services/payment/payment.factory');
const config = require('../config/app.config');
const logger = require('../utils/logger');

/**
 * Handle Razorpay Webhook Callbacks
 * POST /api/webhooks/razorpay
 */
const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] || req.headers['razorpay-signature'];
    const webhookSecret = config.razorpay.webhookSecret;

    const provider = PaymentFactory.getProvider('razorpay');

    // If webhook secret is configured, verify HMAC signature
    if (webhookSecret && signature) {
      const isValid = provider.verifyWebhookSignature(req.rawBody || req.body, signature, webhookSecret);
      if (!isValid) {
        logger.warn('Razorpay Webhook signature verification failed');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    } else {
      logger.warn('Received Razorpay webhook without signature check (webhook secret not set)');
    }

    const payload = req.body;
    const eventType = payload.event;
    const eventId = payload.contains?.includes('payment') 
      ? payload.payload?.payment?.entity?.id 
      : payload.event_id || `evt_${Date.now()}`;

    let orderId = null;
    let gatewayPaymentId = null;

    if (payload.payload?.payment?.entity) {
      const entity = payload.payload.payment.entity;
      gatewayPaymentId = entity.id;
      orderId = entity.order_id;
    } else if (payload.payload?.order?.entity) {
      orderId = payload.payload.order.entity.id;
    }

    logger.info(`Received Razorpay webhook: Event=${eventType}, OrderId=${orderId}, PaymentId=${gatewayPaymentId}`);

    const updatedPayment = await paymentService.processWebhookEvent({
      eventId,
      eventType,
      orderId,
      gatewayPaymentId,
      rawPayload: payload
    });

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      processedStatus: updatedPayment ? updatedPayment.status : 'ignored'
    });
  } catch (error) {
    logger.error('Error processing Razorpay webhook:', error);
    // Always return 200/400 cleanly to avoid webhook retry loops on non-recoverable errors
    return res.status(200).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  handleRazorpayWebhook
};
