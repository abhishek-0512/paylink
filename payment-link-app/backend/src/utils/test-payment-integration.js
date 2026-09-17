const assert = require('assert');
const crypto = require('crypto');
const config = require('../config/app.config');
const paymentService = require('../services/payment/payment.service');
const PaymentFactory = require('../services/payment/payment.factory');
const RazorpayService = require('../services/payment/razorpay.service');

async function testPaymentGateway() {
  console.log('--- Testing Payment Gateway Integration ---');

  // Test 1: Config loading
  console.log('1. Checking config loading...');
  assert(config.razorpay, 'Config should contain razorpay object');
  console.log('   Razorpay Key ID present:', Boolean(config.razorpay.keyId));
  console.log('   Razorpay Key Secret present:', Boolean(config.razorpay.keySecret));
  console.log('✓ Config loading test passed');

  // Test 2: Razorpay Service Order Creation (Graceful fallback / mock)
  console.log('\n2. Testing Razorpay order creation...');
  const razorpayProvider = PaymentFactory.getProvider('razorpay');
  assert(razorpayProvider instanceof RazorpayService, 'Factory must return RazorpayService');

  const orderResult = await razorpayProvider.createOrder({
    amount: 500,
    currency: 'INR',
    receipt: 'test_rcpt_001',
    notes: { test: true }
  });
  console.log('   Order creation result:', orderResult);
  assert.strictEqual(orderResult.amount, 50000, 'Amount in paise must be 50000');
  assert.strictEqual(orderResult.currency, 'INR', 'Currency must be INR');
  console.log('✓ Order creation test passed');

  // Test 3: Payment Creation via Service
  console.log('\n3. Testing PaymentService.createPayment...');
  const paymentCreation = await paymentService.createPayment({
    customerName: 'Test Customer',
    customerPhone: '9876543210',
    customerEmail: 'test@example.com',
    amount: 1200,
    description: 'Test Consultation',
    gateway: 'razorpay'
  });
  const payment = paymentCreation.payment;
  assert(payment.paymentId, 'Payment ID must be generated');
  assert.strictEqual(payment.amount, 1200, 'Amount must match');
  assert.strictEqual(payment.status, 'PENDING', 'Status must be PENDING initially');
  console.log(`   Created Payment ID: ${payment.paymentId}, Link: ${payment.paymentLink}`);
  console.log('✓ Payment creation test passed');

  // Test 4: Signature Verification (HMAC-SHA256)
  console.log('\n4. Testing Signature Verification (HMAC-SHA256)...');
  const secretKey = config.razorpay.keySecret || 'testSecretKey';
  const testOrderId = payment.orderId || 'order_test_12345';
  const testPaymentId = 'pay_test_abcdef123';
  const validSignature = crypto
    .createHmac('sha256', secretKey)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const verifiedPayment = await paymentService.verifyAndMarkPaymentSuccess({
    paymentId: payment.paymentId,
    orderId: testOrderId,
    gatewayPaymentId: testPaymentId,
    signature: validSignature
  });
  assert.strictEqual(verifiedPayment.status, 'SUCCESS', 'Payment status must be SUCCESS');
  assert(verifiedPayment.receiptNumber, 'Receipt number must be generated');
  console.log(`   Verified Payment Receipt: ${verifiedPayment.receiptNumber}`);
  console.log('✓ Signature verification test passed');

  // Test 5: Direct Checkout Mode Verification
  console.log('\n5. Testing Direct Checkout Mode Verification...');
  const directPaymentRes = await paymentService.createPayment({
    customerName: 'Direct Customer',
    customerPhone: '9876543211',
    amount: 800,
    description: 'Direct Payment',
    gateway: 'razorpay'
  });
  const directPayment = directPaymentRes.payment;
  const verifiedDirectPayment = await paymentService.verifyAndMarkPaymentSuccess({
    paymentId: directPayment.paymentId,
    orderId: null,
    gatewayPaymentId: 'pay_direct_789012',
    signature: null
  });
  assert.strictEqual(verifiedDirectPayment.status, 'SUCCESS', 'Direct payment status must be SUCCESS');
  console.log(`   Verified Direct Payment Receipt: ${verifiedDirectPayment.receiptNumber}`);
  console.log('✓ Direct checkout mode test passed');

  // Test 6: Webhook Processing & Idempotency
  console.log('\n6. Testing Webhook Idempotency...');
  const webhookPaymentRes = await paymentService.createPayment({
    customerName: 'Webhook Customer',
    customerPhone: '9876543212',
    amount: 1500,
    description: 'Webhook Order',
    gateway: 'razorpay'
  });
  const whPayment = webhookPaymentRes.payment;
  const whOrderId = whPayment.orderId || `order_wh_${Date.now()}`;
  whPayment.orderId = whOrderId;
  await whPayment.save();

  const webhookResult1 = await paymentService.processWebhookEvent({
    eventId: 'evt_test_001',
    eventType: 'payment.captured',
    orderId: whOrderId,
    gatewayPaymentId: 'pay_webhook_9999',
    rawPayload: { test: true }
  });
  assert.strictEqual(webhookResult1.status, 'SUCCESS', 'Webhook payment must be SUCCESS');

  // Duplicate webhook event
  const webhookResult2 = await paymentService.processWebhookEvent({
    eventId: 'evt_test_001',
    eventType: 'payment.captured',
    orderId: whOrderId,
    gatewayPaymentId: 'pay_webhook_9999',
    rawPayload: { test: true }
  });
  assert.strictEqual(webhookResult2.status, 'SUCCESS', 'Duplicate webhook must be handled idempotently');
  console.log('✓ Webhook processing & idempotency test passed');

  console.log('\n🎉 ALL PAYMENT GATEWAY INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
}

testPaymentGateway().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
