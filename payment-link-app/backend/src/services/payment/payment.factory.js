const RazorpayService = require('./razorpay.service');

class PaymentFactory {
  /**
   * Get payment provider instance based on gateway name
   * @param {string} gatewayName - e.g. 'razorpay'
   * @returns {PaymentProvider} Concrete provider instance
   */
  static getProvider(gatewayName = 'razorpay') {
    switch (gatewayName.toLowerCase()) {
      case 'razorpay':
        return new RazorpayService();
      default:
        throw new Error(`Unsupported payment gateway provider: ${gatewayName}`);
    }
  }
}

module.exports = PaymentFactory;
