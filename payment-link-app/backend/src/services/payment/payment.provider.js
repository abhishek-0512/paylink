/**
 * Interface / Base Class for Payment Gateway Providers
 */
class PaymentProvider {
  /**
   * Create an order with the payment gateway
   * @param {Object} options - { amount, currency, receipt, notes }
   * @returns {Promise<Object>} Order details (orderId, amount, currency, etc.)
   */
  async createOrder(options) {
    throw new Error('createOrder method must be implemented by subclass');
  }

  /**
   * Verify checkout completion signature
   * @param {Object} payload - { orderId, paymentId, signature }
   * @returns {boolean} True if signature is valid
   */
  verifyPayment(payload) {
    throw new Error('verifyPayment method must be implemented by subclass');
  }

  /**
   * Verify webhook request signature
   * @param {string|Buffer} body 
   * @param {string} signature 
   * @param {string} secret 
   * @returns {boolean} True if webhook signature is valid
   */
  verifyWebhookSignature(body, signature, secret) {
    throw new Error('verifyWebhookSignature method must be implemented by subclass');
  }
}

module.exports = PaymentProvider;
