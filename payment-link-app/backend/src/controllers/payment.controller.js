const paymentService = require('../services/payment/payment.service');
const receiptService = require('../services/receipt/receipt.service');
const whatsappService = require('../services/whatsapp/whatsapp.service');
const logger = require('../utils/logger');

/**
 * Create Payment Link Controller (and optionally trigger WhatsApp API)
 * POST /api/payments/create
 */
const createPaymentLink = async (req, res, next) => {
  try {
    const { customerName, customerPhone, customerEmail = '', amount, description, gateway, triggerWhatsApp = true } = req.body;

    const { payment, keyId } = await paymentService.createPayment({
      customerName,
      customerPhone,
      customerEmail,
      amount: Number(amount),
      description,
      gateway
    });

    let whatsappResult = null;
    if (triggerWhatsApp) {
      try {
        const waRes = await whatsappService.sendPaymentLink({
          phone: payment.customerPhone,
          customerName: payment.customerName,
          amount: payment.amount,
          description: payment.description,
          paymentLink: payment.paymentLink
        });

        payment.whatsappMessageId = waRes.messageId;
        payment.whatsappSentAt = new Date();
        payment.whatsappStatus = 'SENT';
        await payment.save();

        whatsappResult = {
          sent: true,
          messageId: waRes.messageId,
          sentVia: waRes.sentVia,
          recipientPhone: waRes.recipientPhone
        };
      } catch (waErr) {
        logger.warn(`WhatsApp auto-dispatch error for payment ${payment.paymentId}:`, waErr.message);
        payment.whatsappStatus = 'FAILED';
        await payment.save().catch(() => {});
        whatsappResult = {
          sent: false,
          error: waErr.message
        };
      }
    }

    return res.status(201).json({
      success: true,
      message: whatsappResult?.sent 
        ? `Payment link created and sent to customer WhatsApp via Meta Cloud API (${whatsappResult.recipientPhone})` 
        : (whatsappResult?.error ? `Payment link created, but Meta WhatsApp API returned: ${whatsappResult.error}` : 'Payment link created successfully'),
      data: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        customerName: payment.customerName,
        customerPhone: payment.customerPhone,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        status: payment.status,
        paymentLink: payment.paymentLink,
        whatsappStatus: payment.whatsappStatus,
        whatsappResult,
        keyId,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);
    const config = require('../config/app.config');

    // If payment has a mock orderId or missing orderId, create real order
    if (payment.status === 'PENDING' && (!payment.orderId || payment.orderId.startsWith('order_mock'))) {
      try {
        const PaymentFactory = require('../services/payment/payment.factory');
        const provider = PaymentFactory.getProvider(payment.paymentGateway || 'RAZORPAY');
        const orderRes = await provider.createOrder({
          amount: payment.amount,
          currency: payment.currency || 'INR',
          receipt: payment.paymentId,
          notes: { customerName: payment.customerName, paymentId: payment.paymentId }
        });
        payment.orderId = orderRes.orderId;
        await payment.save();
        logger.info(`Auto-upgraded payment ${payment.paymentId} with real Razorpay order ${orderRes.orderId}`);
      } catch (e) {
        logger.warn('Failed to upgrade order to Razorpay order:', e.message);
      }
    }

    const paymentObj = payment.toObject ? payment.toObject() : { ...payment };
    paymentObj.keyId = config.razorpay.keyId;

    return res.status(200).json({
      success: true,
      message: 'Payment details retrieved',
      data: paymentObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Payment Status
 * GET /api/payments/:id/status
 */
const getPaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);

    return res.status(200).json({
      success: true,
      data: {
        paymentId: payment.paymentId,
        status: payment.status,
        receiptNumber: payment.receiptNumber,
        paidAt: payment.paidAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Payment Signature
 * POST /api/payments/verify
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, orderId, gatewayPaymentId, signature } = req.body;

    const updatedPayment = await paymentService.verifyAndMarkPaymentSuccess({
      paymentId,
      orderId,
      gatewayPaymentId,
      signature
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: updatedPayment.paymentId,
        status: updatedPayment.status,
        receiptNumber: updatedPayment.receiptNumber,
        paidAt: updatedPayment.paidAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download Receipt PDF
 * GET /api/payments/:id/receipt
 */
const downloadReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Receipt_${payment.receiptNumber || payment.paymentId}.pdf"`
    );

    receiptService.generatePDFReceipt(payment, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Payment History
 * GET /api/payments
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const result = await paymentService.getAllPayments({ page, limit, status });

    return res.status(200).json({
      success: true,
      message: 'Payment history retrieved',
      data: result.payments,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentLink,
  getPaymentDetails,
  getPaymentStatus,
  verifyPayment,
  downloadReceipt,
  getPaymentHistory
};
