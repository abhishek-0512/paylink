const path = require('path');
const fs = require('fs');

// Attempt to load .env from current directory, backend root, and workspace root
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
  }
}
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5001,
  env: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payment_link_db',
  
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
  },
  
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_CLOUD_API_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'payment_link_notification',
    apiVersion: 'v21.0'
  },
  
  urls: {
    frontend: process.env.FRONTEND_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5180')),
    backend: process.env.BACKEND_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5001'))
  }
};
