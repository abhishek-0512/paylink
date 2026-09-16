const mongoose = require('mongoose');
const Payment = require('../../models/payment.model');
const PaymentFactory = require('./payment.factory');
const { generatePaymentId, generateReceiptNumber, formatPhoneNumber } = require('../../utils/helpers');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const config = require('../../config/app.config');
const logger = require('../../utils/logger');

// In-memory repository fallback for local testing when MongoDB daemon is offline
const inMemoryPayments = new Map();

class PaymentService {
  isDbConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Create a new payment record and gateway order
   */
  async createPayment({
    customerName,
    customerPhone,
    customerEmail,
    amount,
    description = '',
    gateway = 'razorpay'
  }) {
    const paymentId = generatePaymentId();
    const formattedPhone = formatPhoneNumber(customerPhone);
    const paymentLink = `${config.urls.frontend}/pay/${paymentId}`;

    const provider = PaymentFactory.getProvider(gateway);

    // Create order with payment provider
    const order = await provider.createOrder({
      amount,
      currency: 'INR',
      receipt: paymentId,
      notes: { customerName, customerPhone: formattedPhone, paymentId }
    });

    const paymentData = {
      paymentId,
      orderId: order.orderId,
      customerName,
      customerPhone: formattedPhone,
      customerEmail,
      amount,
      currency: 'INR',
      description,
      paymentGateway: gateway,
      status: 'PENDING',
      paymentLink,
      processedWebhookEvents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let payment;
    if (this.isDbConnected()) {
      payment = new Payment(paymentData);
      await payment.save();
    } else {
      logger.warn(`MongoDB not connected. Saving payment ${paymentId} to in-memory store.`);
      paymentData.save = async function() {
        this.updatedAt = new Date();
        inMemoryPayments.set(this.paymentId, this);
        return this;
      };
      payment = paymentData;
      inMemoryPayments.set(paymentId, payment);
    }

    logger.info(`Payment record created: ${paymentId} (Order: ${order.orderId})`);

    return {
      payment,
      keyId: order.keyId || config.razorpay.keyId
    };
  }

  /**
   * Get payment by internal paymentId
   */
  async getPaymentById(paymentId) {
    let payment = null;
    if (this.isDbConnected()) {
      payment = await Payment.findOne({ paymentId });
    } else {
      payment = inMemoryPayments.get(paymentId) || null;
    }

    if (!payment) {
      throw new NotFoundError(`Payment link '${paymentId}' not found`);
    }
    return payment;
  }

  /**
   * Get paginated payment history for merchant
   */
  async getAllPayments({ page = 1, limit = 10, status }) {
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (this.isDbConnected()) {
      const query = {};
      if (status) {
        query.status = status.toUpperCase();
      }
      const skip = (pageNum - 1) * limitNum;
      const [payments, total] = await Promise.all([
        Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        Payment.countDocuments(query)
      ]);
      return {
        payments,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      };
    } else {
      let list = Array.from(inMemoryPayments.values());
      if (status) {
        list = list.filter((p) => p.status === status.toUpperCase());
      }
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const total = list.length;
      const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      return {
        payments: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      };
    }
  }

  /**
   * Verify signature and complete payment
   */
  async verifyAndMarkPaymentSuccess({ paymentId, orderId, gatewayPaymentId, signature }) {
    const payment = await this.getPaymentById(paymentId);

    if (payment.status === 'SUCCESS') {
      logger.info(`Payment ${paymentId} is already marked SUCCESS`);
      return payment;
    }

    const provider = PaymentFactory.getProvider(payment.paymentGateway);
    const isValid = provider.verifyPayment({
      orderId: orderId || payment.orderId,
      paymentId: gatewayPaymentId,
      signature
    });

    if (!isValid) {
      payment.status = 'FAILED';
      await payment.save();
      throw new BadRequestError('Invalid payment verification signature');
    }

    payment.status = 'SUCCESS';
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.gatewaySignature = signature;
    payment.paidAt = new Date();

    if (!payment.receiptNumber) {
      let count = 0;
      if (this.isDbConnected()) {
        count = await Payment.countDocuments({ status: 'SUCCESS' });
      } else {
        count = Array.from(inMemoryPayments.values()).filter((p) => p.status === 'SUCCESS').length;
      }
      payment.receiptNumber = generateReceiptNumber(count + 1);
    }

    await payment.save();
    logger.info(`Payment ${paymentId} verified and marked SUCCESS (Receipt: ${payment.receiptNumber})`);
    return payment;
  }

  /**
   * Handle Webhook processing idempotently
   */
  async processWebhookEvent({ eventId, eventType, orderId, gatewayPaymentId, rawPayload }) {
    logger.info(`Processing Webhook event ${eventId} of type ${eventType}`);

    let payment = null;
    if (this.isDbConnected()) {
      if (orderId) {
        payment = await Payment.findOne({ orderId });
      } else if (gatewayPaymentId) {
        payment = await Payment.findOne({ gatewayPaymentId });
      }
    } else {
      const list = Array.from(inMemoryPayments.values());
      payment = list.find((p) => (orderId && p.orderId === orderId) || (gatewayPaymentId && p.gatewayPaymentId === gatewayPaymentId)) || null;
    }

    if (!payment) {
      logger.warn(`No payment matching order ${orderId} or payment ${gatewayPaymentId}`);
      return null;
    }

    // Idempotency check: event already processed?
    if (!payment.processedWebhookEvents) payment.processedWebhookEvents = [];
    if (eventId && payment.processedWebhookEvents.includes(eventId)) {
      logger.info(`Webhook event ${eventId} already processed for payment ${payment.paymentId}. Skipping.`);
      return payment;
    }

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (payment.status !== 'SUCCESS') {
        payment.status = 'SUCCESS';
        payment.gatewayPaymentId = gatewayPaymentId || payment.gatewayPaymentId;
        payment.paidAt = new Date();

        if (!payment.receiptNumber) {
          let count = 0;
          if (this.isDbConnected()) {
            count = await Payment.countDocuments({ status: 'SUCCESS' });
          } else {
            count = Array.from(inMemoryPayments.values()).filter((p) => p.status === 'SUCCESS').length;
          }
          payment.receiptNumber = generateReceiptNumber(count + 1);
        }
      }
    } else if (eventType === 'payment.failed') {
      if (payment.status !== 'SUCCESS') {
        payment.status = 'FAILED';
      }
    }

    if (eventId) {
      payment.processedWebhookEvents.push(eventId);
    }

    await payment.save();
    logger.info(`Webhook processed for payment ${payment.paymentId}, updated status: ${payment.status}`);
    return payment;
  }
}

module.exports = new PaymentService();
