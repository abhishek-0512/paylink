const paymentService = require('../services/payment/payment.service');
const whatsappService = require('../services/whatsapp/whatsapp.service');
const logger = require('../utils/logger');

/**
 * Send Payment Link via WhatsApp Controller
 * POST /api/whatsapp/send-payment-link
 */
const sendPaymentLinkWhatsApp = async (req, res, next) => {
  let payment = null;
  try {
    const { paymentId, phone } = req.body;

    payment = await paymentService.getPaymentById(paymentId);
    const targetPhone = phone || payment.customerPhone;

    const result = await whatsappService.sendPaymentLink({
      phone: targetPhone,
      customerName: payment.customerName,
      amount: payment.amount,
      description: payment.description,
      paymentLink: payment.paymentLink
    });

    // Update payment record on successful message accept by Meta Cloud API
    payment.whatsappMessageId = result.messageId;
    payment.whatsappSentAt = new Date();
    payment.whatsappStatus = 'SENT';
    await payment.save();

    return res.status(200).json({
      success: true,
      message: `✓ WhatsApp message dispatched via Meta Cloud API to ${result.recipientPhone}`,
      data: {
        paymentId: payment.paymentId,
        whatsappMessageId: result.messageId,
        whatsappStatus: payment.whatsappStatus,
        whatsappSentAt: payment.whatsappSentAt,
        recipientPhone: result.recipientPhone,
        sentVia: result.sentVia
      }
    });
  } catch (error) {
    if (payment) {
      payment.whatsappStatus = 'FAILED';
      await payment.save().catch(() => {});
    }

    logger.error('WhatsApp Controller Error:', error.message);
    return res.status(400).json({
      success: false,
      message: `Meta WhatsApp Cloud API error: ${error.message}`
    });
  }
};

module.exports = {
  sendPaymentLinkWhatsApp
};
