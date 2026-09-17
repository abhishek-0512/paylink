require('dotenv').config();
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_CLOUD_API_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

console.log('Testing Meta Cloud API with:');
console.log('Phone ID:', phoneId);
console.log('Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');

async function testPayloads() {
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Test 1: hello_world template
  console.log('\n--- 1. Testing hello_world Template Payload ---');
  try {
    const res = await axios.post(url, {
      messaging_product: 'whatsapp',
      to: '919876543210', // Sample test recipient
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' }
      }
    }, { headers });
    console.log('✓ Success:', res.data);
  } catch (err) {
    console.log('Meta Error Response:', JSON.stringify(err.response?.data || err.message, null, 2));
  }

  // Test 2: Text payload
  console.log('\n--- 2. Testing Text Payload ---');
  try {
    const res = await axios.post(url, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '919876543210',
      type: 'text',
      text: {
        preview_url: false,
        body: 'Test payment link: http://localhost:5180/pay/test'
      }
    }, { headers });
    console.log('✓ Success:', res.data);
  } catch (err) {
    console.log('Meta Error Response:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

testPayloads();
