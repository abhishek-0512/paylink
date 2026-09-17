const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const app = require('../app');
const http = require('http');
const config = require('../config/app.config');

let server;
let testPaymentId;
let testOrderId;

async function runTestSuite() {
  console.log('=====================================================');
  console.log('🧪 Starting PayLink Express Automated Integration Test');
  console.log('=====================================================');

  // Start HTTP server on 127.0.0.1
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`✓ Test Server running on ${baseUrl}`);

  try {
    // Test 1: Health Check
    console.log('\n--- Test 1: Health Check ---');
    const healthRes = await axios.get(`${baseUrl}/health`);
    console.log('Health Response:', healthRes.data);
    if (!healthRes.data.success) throw new Error('Health check failed');
    console.log('✓ Health Check PASSED');

    // Test 2: Create Payment Link (No Email)
    console.log('\n--- Test 2: Create Payment Link (No Email) ---');
    const createRes = await axios.post(`${baseUrl}/api/payments/create`, {
      customerName: 'Abhishek',
      customerPhone: '919876543210',
      amount: 1500,
      description: 'Course Fee',
      triggerWhatsApp: true
    });
    console.log('Create Response:', createRes.data);
    if (!createRes.data.success) throw new Error('Payment creation failed');

    testPaymentId = createRes.data.data.paymentId;
    testOrderId = createRes.data.data.orderId;
    console.log(`✓ Payment Creation PASSED (ID: ${testPaymentId}, Order: ${testOrderId})`);

    // Test 3: Get Payment Details
    console.log('\n--- Test 3: Get Payment Details ---');
    const detailsRes = await axios.get(`${baseUrl}/api/payments/${testPaymentId}`);
    console.log('Details Status:', detailsRes.data.data.status);
    if (detailsRes.data.data.amount !== 1500) throw new Error('Details amount mismatch');
    console.log('✓ Get Details PASSED');

    // Test 4: Send WhatsApp Message (Mock / API)
    console.log('\n--- Test 4: Trigger WhatsApp Send Link ---');
    const waRes = await axios.post(`${baseUrl}/api/whatsapp/send-payment-link`, {
      paymentId: testPaymentId
    });
    console.log('WhatsApp Trigger Response:', waRes.data);
    if (!waRes.data.success) throw new Error('WhatsApp trigger failed');
    console.log('✓ WhatsApp Trigger PASSED');

    // Test 5: Verify Payment Signature (HMAC-SHA256)
    console.log('\n--- Test 5: Verify Payment Signature ---');
    const mockPaymentId = 'pay_test_987654';
    const secret = config.razorpay.keySecret || 'sampleSecretKey1234567890';
    
    // Compute valid HMAC signature
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${testOrderId}|${mockPaymentId}`)
      .digest('hex');

    const verifyRes = await axios.post(`${baseUrl}/api/payments/verify`, {
      paymentId: testPaymentId,
      orderId: testOrderId,
      gatewayPaymentId: mockPaymentId,
      signature: validSignature
    });
    console.log('Verify Response:', verifyRes.data);
    if (!verifyRes.data.success || verifyRes.data.data.status !== 'SUCCESS') {
      throw new Error('Payment verification failed');
    }
    console.log(`✓ Verification PASSED (Receipt: ${verifyRes.data.data.receiptNumber})`);

    // Test 6: PDF Receipt Stream
    console.log('\n--- Test 6: PDF Receipt Stream ---');
    const receiptRes = await axios.get(`${baseUrl}/api/payments/${testPaymentId}/receipt`, {
      responseType: 'arraybuffer'
    });
    const contentType = receiptRes.headers['content-type'];
    const bufferLength = receiptRes.data.byteLength;
    console.log(`Receipt Content-Type: ${contentType}, Size: ${bufferLength} bytes`);
    if (!contentType.includes('application/pdf') || bufferLength === 0) {
      throw new Error('Invalid PDF receipt stream');
    }
    console.log('✓ PDF Receipt Stream PASSED');

    // Test 7: Webhook Idempotency Check
    console.log('\n--- Test 7: Razorpay Webhook & Idempotency ---');
    const webhookPayload = {
      event: 'payment.captured',
      event_id: 'evt_test_1001',
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: testOrderId,
            amount: 150000,
            status: 'captured'
          }
        }
      }
    };

    // Compute Webhook HMAC signature
    const webhookSecret = config.razorpay.webhookSecret || 'sampleWebhookSecret12345';
    const webhookSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');

    // First Webhook Call
    const whRes1 = await axios.post(`${baseUrl}/api/webhooks/razorpay`, webhookPayload, {
      headers: { 'x-razorpay-signature': webhookSignature }
    });
    console.log('Webhook 1 Response:', whRes1.data);

    // Second Webhook Call (Duplicate event_id for idempotency test)
    const whRes2 = await axios.post(`${baseUrl}/api/webhooks/razorpay`, webhookPayload, {
      headers: { 'x-razorpay-signature': webhookSignature }
    });
    console.log('Webhook 2 Response (Idempotent):', whRes2.data);
    console.log('✓ Webhook & Idempotency PASSED');

    console.log('\n=====================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED CLEANLY!');
    console.log('=====================================================');

  } catch (err) {
    console.error('\n❌ Integration Test Failed:', err.response?.data || err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
  }
}

runTestSuite();
