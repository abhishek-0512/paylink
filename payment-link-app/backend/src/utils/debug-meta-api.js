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

console.log('=== Meta API Diagnostic ===');
console.log('Phone Number ID:', phoneId);
console.log('Token Length:', token ? token.length : 0);
console.log('Token Prefix:', token ? token.substring(0, 15) : 'NONE');

async function testMeta() {
  // 1. Check Phone ID details
  try {
    console.log('\n1. Checking Phone ID verification against Meta...');
    const verifyRes = await axios.get(`https://graph.facebook.com/v21.0/${phoneId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✓ Verified Meta Phone Details:', verifyRes.data);
  } catch (err) {
    console.error('❌ Phone ID Verification Error:', err.response?.data || err.message);
  }

  // 2. Test sending hello_world template
  try {
    console.log('\n2. Testing Template Message (hello_world)...');
    // Test recipient from .env or test phone
    const testTo = '919876543210'; 
    const templatePayload = {
      messaging_product: 'whatsapp',
      to: testTo,
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' }
      }
    };

    const res = await axios.post(`https://graph.facebook.com/v21.0/${phoneId}/messages`, templatePayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✓ Template Message Response:', res.data);
  } catch (err) {
    console.error('❌ Template Message Error:', err.response?.data || err.message);
  }
}

testMeta();
