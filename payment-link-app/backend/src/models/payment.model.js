const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    orderId: {
      type: String,
      index: true
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone number is required'],
      trim: true
    },
    customerEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least ₹1']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    paymentGateway: {
      type: String,
      default: 'razorpay'
    },
    gatewayPaymentId: {
      type: String,
      default: null
    },
    gatewaySignature: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'],
      default: 'CREATED'
    },
    paymentLink: {
      type: String,
      required: true
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    whatsappMessageId: {
      type: String,
      default: null
    },
    whatsappStatus: {
      type: String,
      enum: ['NOT_SENT', 'SENT', 'FAILED'],
      default: 'NOT_SENT'
    },
    whatsappSentAt: {
      type: Date,
      default: null
    },
    processedWebhookEvents: [{
      type: String
    }],
    paidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
