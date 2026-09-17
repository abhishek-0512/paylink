require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const crypto = require('crypto');

// Global Meta Cloud API credentials configuration
let globalMetaApiConfig = {
  accessToken: process.env.WHATSAPP_CLOUD_API_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || ''
};

// Global Razorpay API credentials configuration
let globalRazorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || ''
};

let configuredBaseUrl = process.env.BASE_URL || '';

// In-memory store for hospital payment links (with seed data)
let paymentLinks = [
  {
    id: 'pay_demo_101',
    invoiceNumber: 'UHID-2026-8492',
    customerName: 'Aarav Verma',
    customerPhone: '919876543210',
    department: 'Cardiology OPD',
    amount: 1200.00,
    currency: 'INR',
    currencySymbol: '₹',
    description: 'Dr. Sharma Consultation & ECG Diagnostic Test',
    status: 'PAID', // PENDING, SENT_WHATSAPP, PAID
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    paidAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    transactionId: 'pay_rzp_948271049',
    paymentMethod: 'Razorpay UPI (GPay)',
    whatsappSentCount: 1,
    lastWhatsappSentAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    customMessage: ''
  },
  {
    id: 'pay_demo_102',
    invoiceNumber: 'UHID-2026-9103',
    customerName: 'Sunita Rao',
    customerPhone: '919123456789',
    department: 'IPD / Surgical Ward',
    amount: 15500.00,
    currency: 'INR',
    currencySymbol: '₹',
    description: 'IPD Room Advance Deposit & Surgical Supplies',
    status: 'SENT_WHATSAPP',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    paidAt: null,
    transactionId: null,
    paymentMethod: null,
    whatsappSentCount: 1,
    lastWhatsappSentAt: new Date(Date.now() - 1800000).toISOString(),
    customMessage: ''
  }
];

// Helper: Format currency symbol
function getCurrencySymbol(curr) {
  switch (curr?.toUpperCase()) {
    case 'INR': return '₹';
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'AED': return 'AED ';
    case 'CAD': return 'C$';
    default: return '₹';
  }
}

// Helper: Clean phone number (strip spaces, +, dashes)
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

// Helper: Format WhatsApp Hospital Billing Message
function formatPaymentWhatsAppMessage({
  customerName,
  amount,
  currencySymbol,
  currency,
  description,
  invoiceNumber,
  department,
  paymentUrl,
  template
}) {
  if (template && template.trim().length > 0) {
    return template
      .replace(/{customer_name}/g, customerName || 'Patient')
      .replace(/{amount}/g, `${currencySymbol}${amount}`)
      .replace(/{currency}/g, currency)
      .replace(/{description}/g, description || 'Hospital Bill')
      .replace(/{invoice_id}/g, invoiceNumber)
      .replace(/{department}/g, department || 'General OPD')
      .replace(/{pay_link}/g, paymentUrl);
  }

  const formattedAmount = `${currencySymbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${currency}`;

  return `🏥 *PayVista Healthcare & Hospital Billing*

👋 *Hello ${customerName || 'Valued Patient'},*

Your hospital bill payment link for *${description || 'Medical Services'}* is ready:

📄 *Bill / UHID #:* ${invoiceNumber}
🩺 *Department:* ${department || 'General OPD'}
💰 *Amount Due:* *${formattedAmount}*
🛡️ *Status:* Pending Payment

👉 *Click the link below to pay securely via Razorpay (UPI/Card/Netbanking):*

${paymentUrl}

━━━━━━━━━━━━━━━━━━━━
💡 *Is the link above gray or not clickable?*
WhatsApp automatically disables links from numbers not saved in your phone contacts.
Simply *reply "OK"* to this message, and the payment link will activate instantly! ⚡
━━━━━━━━━━━━━━━━━━━━

Wishing you good health! ✨`;
}

// Helper: Build WhatsApp Intent URLs
function buildWhatsAppUrls(phone, messageText) {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(messageText);
  return {
    waMeUrl: `https://wa.me/${cleanPhone}?text=${encodedText}`,
    webWhatsAppUrl: `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`,
    appIntentUrl: `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
  };
}

// Helper: Build Email Mailto URL
function buildEmailUrl(email, customerName, amount, currencySymbol, paymentUrl) {
  const subject = encodeURIComponent(`PayVista Payment Link - ${currencySymbol}${amount}`);
  const body = encodeURIComponent(`Hello ${customerName || 'Customer'},

Here is your payment link to complete your payment:

💰 Amount Due: ${currencySymbol}${amount}
👉 Payment Link: ${paymentUrl}

Click the link above to pay securely via Razorpay (UPI, Credit/Debit Card, Netbanking).

Thank you!`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

// Helper: Shorten URL with TinyURL for 100% WhatsApp clickability
async function shortenUrlWithTinyUrl(longUrl) {
  try {
    if (!longUrl || longUrl.includes('localhost') || longUrl.includes('127.0.0.1')) {
      return longUrl;
    }
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (response.ok) {
      const shortUrl = await response.text();
      if (shortUrl && shortUrl.startsWith('http')) {
        return shortUrl.trim();
      }
    }
  } catch (err) {
    console.warn('TinyURL shortener fallback to original URL:', err.message);
  }
  return longUrl;
}

// Helper: Get local network IP
function getLocalNetworkIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function getDomainMappedIp(ip) {
  if (!ip || ip === 'localhost' || ip === '127.0.0.1') {
    return 'localhost';
  }
  return `${ip}.nip.io`;
}

function getBaseUrl(req, overrideUrl) {
  if (overrideUrl && overrideUrl.trim().length > 0) {
    let cleanUrl = overrideUrl.trim().replace(/\/+$/, '');
    const ipMatch = cleanUrl.match(/^(https?:\/\/)(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/);
    if (ipMatch) {
      const proto = ipMatch[1];
      const ip = ipMatch[2];
      const port = ipMatch[3] || '';
      return `${proto}${ip}.nip.io${port}`;
    }
    return cleanUrl;
  }
  if (configuredBaseUrl && configuredBaseUrl.trim().length > 0) {
    return configuredBaseUrl.trim().replace(/\/+$/, '');
  }

  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol || 'http';

  const localIp = getLocalNetworkIp();
  if (localIp !== 'localhost' && host.startsWith(localIp) && !host.includes('nip.io') && !host.includes('sslip.io')) {
    const portPart = host.split(':')[1] ? `:${host.split(':')[1]}` : '';
    return `${protocol}://${localIp}.nip.io${portPart}`;
  }

  return `${protocol}://${host}`;
}

// API: Network Info
app.get('/api/network-info', (req, res) => {
  const localIp = getLocalNetworkIp();
  const protocol = req.protocol;
  const nipIoDomain = getDomainMappedIp(localIp);
  const domainNetworkUrl = localIp !== 'localhost' ? `http://${nipIoDomain}:${PORT}` : `http://localhost:${PORT}`;

  res.json({
    success: true,
    data: {
      localIp,
      port: PORT,
      localhostUrl: `${protocol}://localhost:${PORT}`,
      rawNetworkUrl: `http://${localIp}:${PORT}`,
      networkUrl: domainNetworkUrl,
      nipIoUrl: domainNetworkUrl,
      currentBaseUrl: getBaseUrl(req),
      configuredBaseUrl
    }
  });
});

// API: Get Meta Credentials Config Status
app.get('/api/settings/meta-credentials', (req, res) => {
  res.json({
    success: true,
    data: {
      hasAccessToken: !!(globalMetaApiConfig.accessToken || process.env.WHATSAPP_CLOUD_API_TOKEN),
      phoneNumberId: globalMetaApiConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    }
  });
});

// API: Save Meta Credentials Config
app.post('/api/settings/meta-credentials', (req, res) => {
  const { accessToken, phoneNumberId } = req.body;
  if (accessToken !== undefined) globalMetaApiConfig.accessToken = accessToken.trim();
  if (phoneNumberId !== undefined) globalMetaApiConfig.phoneNumberId = phoneNumberId.trim();
  res.json({
    success: true,
    message: 'Meta Cloud API credentials saved successfully',
    hasAccessToken: !!globalMetaApiConfig.accessToken,
    phoneNumberId: globalMetaApiConfig.phoneNumberId
  });
});

// API: Get Razorpay Credentials Config Status
app.get('/api/settings/razorpay-credentials', (req, res) => {
  res.json({
    success: true,
    data: {
      hasKeySecret: !!(globalRazorpayConfig.keySecret || process.env.RAZORPAY_KEY_SECRET),
      keyId: globalRazorpayConfig.keyId || process.env.RAZORPAY_KEY_ID || ''
    }
  });
});

// API: Save Razorpay Credentials Config
app.post('/api/settings/razorpay-credentials', (req, res) => {
  const fs = require('fs');
  const { keyId, keySecret } = req.body;
  if (keyId !== undefined) {
    globalRazorpayConfig.keyId = keyId.trim();
    process.env.RAZORPAY_KEY_ID = globalRazorpayConfig.keyId;
  }
  if (keySecret !== undefined) {
    globalRazorpayConfig.keySecret = keySecret.trim();
    process.env.RAZORPAY_KEY_SECRET = globalRazorpayConfig.keySecret;
  }

  // Update .env file if it exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (keyId !== undefined) {
      const regex = new RegExp(`^RAZORPAY_KEY_ID=.*$`, 'm');
      envContent = regex.test(envContent) ? envContent.replace(regex, `RAZORPAY_KEY_ID=${globalRazorpayConfig.keyId}`) : envContent + `\nRAZORPAY_KEY_ID=${globalRazorpayConfig.keyId}`;
    }
    if (keySecret !== undefined) {
      const regex = new RegExp(`^RAZORPAY_KEY_SECRET=.*$`, 'm');
      envContent = regex.test(envContent) ? envContent.replace(regex, `RAZORPAY_KEY_SECRET=${globalRazorpayConfig.keySecret}`) : envContent + `\nRAZORPAY_KEY_SECRET=${globalRazorpayConfig.keySecret}`;
    }
    try {
      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (e) {
      console.warn('Could not write to .env:', e.message);
    }
  }

  res.json({
    success: true,
    message: 'Razorpay API credentials saved successfully',
    hasKeySecret: !!globalRazorpayConfig.keySecret,
    keyId: globalRazorpayConfig.keyId
  });
});

// API: Test Meta Credentials Connection
app.post('/api/settings/test-meta-credentials', async (req, res) => {
  const accessToken = (req.body.accessToken && req.body.accessToken.trim()) || globalMetaApiConfig.accessToken || process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = (req.body.phoneNumberId && req.body.phoneNumberId.trim()) || globalMetaApiConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return res.status(400).json({
      success: false,
      error: 'Both Access Token and Phone Number ID are required to test Meta Cloud API connection.'
    });
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();

    if (response.ok) {
      return res.json({
        success: true,
        message: `Connection successful! Verified Meta Phone ID: ${data.display_phone_number || data.id || phoneNumberId}`,
        data
      });
    } else {
      let errorMsg = data.error?.message || 'Meta Cloud API verification failed';
      if (data.error?.code === 190) {
        errorMsg = 'Meta Access Token is invalid or expired. Please generate a new access token in Meta Developer Portal.';
      } else if (data.error?.code === 100 || data.error?.code === 110) {
        errorMsg = 'Invalid Phone Number ID. Please double-check your Meta Phone Number ID.';
      }
      return res.status(400).json({
        success: false,
        error: errorMsg,
        errorCode: data.error?.code,
        metaError: data.error
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Network error connecting to Meta API: ${err.message}`
    });
  }
});

// API: Set custom Base URL
app.post('/api/settings/base-url', (req, res) => {
  const { baseUrl } = req.body;
  configuredBaseUrl = (baseUrl || '').trim().replace(/\/+$/, '');
  res.json({ success: true, message: 'Base URL updated', configuredBaseUrl, currentBaseUrl: getBaseUrl(req) });
});

// Serve Checkout Page
app.get('/pay/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pay.html'));
});

// API: Get all payment links
app.get('/api/payment-links', (req, res) => {
  res.json({
    success: true,
    data: paymentLinks
  });
});

// API: Get single payment link
app.get('/api/payment-links/:id', async (req, res) => {
  const link = paymentLinks.find(l => l.id === req.params.id);
  if (!link) {
    return res.status(404).json({ success: false, error: 'Payment link not found' });
  }

  const baseUrl = getBaseUrl(req);
  const paymentUrl = `${baseUrl}/pay/${link.id}`;

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
  }

  res.json({
    success: true,
    data: {
      ...link,
      paymentUrl,
      qrCodeDataUrl
    }
  });
});

// API: Create new payment link
app.post('/api/payment-links', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      dispatchChannel = 'whatsapp',
      amount,
      currency = 'INR',
      description,
      customTemplate,
      customBaseUrl
    } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid payment amount is required' });
    }

    if (dispatchChannel === 'whatsapp' && !customerPhone) {
      return res.status(400).json({ success: false, error: 'WhatsApp phone number is required' });
    }

    if (dispatchChannel === 'email' && !customerEmail) {
      return res.status(400).json({ success: false, error: 'Customer email address is required' });
    }

    const id = 'pay_' + uuidv4().substring(0, 8);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const currencySymbol = getCurrencySymbol(currency);
    const baseUrl = getBaseUrl(req, customBaseUrl);
    const rawPaymentUrl = `${baseUrl}/pay/${id}`;

    const paymentUrl = await shortenUrlWithTinyUrl(rawPaymentUrl);

    const newLink = {
      id,
      invoiceNumber,
      customerName: customerName ? customerName.trim() : 'Customer',
      customerPhone: cleanPhoneNumber(customerPhone || ''),
      customerEmail: customerEmail ? customerEmail.trim() : '',
      dispatchChannel: dispatchChannel || 'whatsapp',
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      currencySymbol,
      description: description ? description.trim() : 'Payment Request',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      paidAt: null,
      transactionId: null,
      paymentMethod: null,
      whatsappSentCount: 0,
      lastWhatsappSentAt: null,
      customMessage: customTemplate || '',
      paymentUrl
    };

    paymentLinks.unshift(newLink);

    const whatsappMessage = formatPaymentWhatsAppMessage({
      customerName: newLink.customerName,
      amount: newLink.amount,
      currencySymbol: newLink.currencySymbol,
      currency: newLink.currency,
      description: newLink.description,
      invoiceNumber: newLink.invoiceNumber,
      paymentUrl,
      template: customTemplate
    });

    const whatsappUrls = buildWhatsAppUrls(newLink.customerPhone, whatsappMessage);
    const emailMailtoUrl = buildEmailUrl(newLink.customerEmail, newLink.customerName, newLink.amount, newLink.currencySymbol, paymentUrl);

    res.status(201).json({
      success: true,
      message: 'Payment link generated successfully',
      data: {
        ...newLink,
        paymentUrl,
        rawPaymentUrl,
        whatsappMessage,
        whatsappUrls,
        emailMailtoUrl
      }
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// API: Trigger WhatsApp for a payment link
app.post('/api/payment-links/:id/trigger-whatsapp', async (req, res) => {
  const link = paymentLinks.find(l => l.id === req.params.id);
  if (!link) {
    return res.status(404).json({ success: false, error: 'Payment link not found' });
  }

  const { strategy = 'direct_intent', customTemplate, apiConfig, customBaseUrl } = req.body;
  const baseUrl = getBaseUrl(req, customBaseUrl);
  const rawPaymentUrl = `${baseUrl}/pay/${link.id}`;

  const paymentUrl = link.paymentUrl && !link.paymentUrl.includes('localhost')
    ? link.paymentUrl
    : await shortenUrlWithTinyUrl(rawPaymentUrl);

  const messageText = formatPaymentWhatsAppMessage({
    customerName: link.customerName,
    amount: link.amount,
    currencySymbol: link.currencySymbol,
    currency: link.currency,
    description: link.description,
    invoiceNumber: link.invoiceNumber,
    paymentUrl,
    template: customTemplate || link.customMessage
  });

  const urls = buildWhatsAppUrls(link.customerPhone, messageText);

  let apiDispatchResult = {
    strategy,
    status: 'READY_FOR_CLIENT_DISPATCH',
    success: true,
    details: 'Universal wa.me deep-link generated.'
  };

  if (strategy === 'cloud_api') {
    const accessToken = (apiConfig && apiConfig.accessToken) || globalMetaApiConfig.accessToken || process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneNumberId = (apiConfig && apiConfig.phoneNumberId) || globalMetaApiConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (accessToken && phoneNumberId) {
      try {
        // First try sending template message (guaranteed to deliver outside 24h window)
        let templateRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: link.customerPhone,
            type: 'template',
            template: {
              name: 'hello_world',
              language: { code: 'en_US' }
            }
          })
        });
        let templateData = await templateRes.json();

        // Second try sending full text payment link message
        let textRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: link.customerPhone,
            type: 'text',
            text: { body: messageText }
          })
        });
        let textData = await textRes.json();

        if (templateRes.ok || textRes.ok) {
          if (link.status === 'PENDING' || link.status === 'FAILED_WHATSAPP') {
            link.status = 'SENT_WHATSAPP';
          }
          link.whatsappSentCount = (link.whatsappSentCount || 0) + 1;
          link.lastWhatsappSentAt = new Date().toISOString();
          link.lastError = null;

          apiDispatchResult = {
            strategy: 'cloud_api',
            status: 'DISPATCHED',
            success: true,
            details: `Successfully sent via Meta WhatsApp Cloud API to +${link.customerPhone}.`,
            templateResult: templateData,
            textResult: textData
          };
        } else {
          const errCode = templateData.error?.code || textData.error?.code;
          let humanMessage = templateData.error?.message || textData.error?.message || 'Meta Cloud API dispatch failed';
          
          if (errCode === 131030) {
            humanMessage = `Recipient phone number (+${link.customerPhone}) is not added to the allowed test numbers in your Meta Developer Console. Please add this number under Meta Portal > WhatsApp > API Setup > "To Phone Numbers", or use the Direct Intent fallback below.`;
          } else if (errCode === 131047 || errCode === 131000) {
            humanMessage = `Customer hasn't messaged your WhatsApp business number in the last 24 hours. Freeform text messages are restricted outside 24h window. Please send a message to +1 555-661-9904 on WhatsApp first or use Direct Intent fallback below.`;
          } else if (errCode === 190) {
            humanMessage = `Meta Access Token is invalid or expired. Please generate a new access token in Meta Developer Portal.`;
          }

          link.status = 'FAILED_WHATSAPP';
          link.lastError = humanMessage;

          apiDispatchResult = {
            strategy: 'cloud_api',
            status: 'FAILED',
            success: false,
            code: errCode,
            details: humanMessage,
            responseData: textData.error ? textData : templateData
          };
        }
      } catch (err) {
        link.status = 'FAILED_WHATSAPP';
        link.lastError = err.message;

        apiDispatchResult = {
          strategy: 'cloud_api',
          status: 'ERROR',
          success: false,
          details: err.message
        };
      }
    } else {
      link.status = 'FAILED_WHATSAPP';
      link.lastError = 'Meta Cloud API credentials not configured.';

      apiDispatchResult = {
        strategy: 'cloud_api',
        status: 'NO_CREDENTIALS',
        success: false,
        details: 'Meta Cloud API Credentials not configured. Please enter your Meta Access Token and Phone Number ID in Settings, or select Zero-Doc Instant Intent mode.'
      };
    }
  } else {
    // direct_intent strategy
    if (link.status === 'PENDING' || link.status === 'FAILED_WHATSAPP') {
      link.status = 'SENT_WHATSAPP';
    }
    link.whatsappSentCount = (link.whatsappSentCount || 0) + 1;
    link.lastWhatsappSentAt = new Date().toISOString();
    link.lastError = null;

    apiDispatchResult = {
      strategy: 'direct_intent',
      status: 'READY_FOR_CLIENT_DISPATCH',
      success: true,
      details: 'Universal wa.me deep-link generated.'
    };
  }

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(urls.waMeUrl, {
      margin: 2,
      color: { dark: '#059669', light: '#ffffff' }
    });
  } catch (err) {
    console.error('Error generating WhatsApp QR:', err);
  }

  res.json({
    success: true,
    data: {
      linkId: link.id,
      customerPhone: link.customerPhone,
      messageText,
      urls,
      qrDataUrl,
      dispatchResult: apiDispatchResult,
      updatedLink: link
    }
  });
});

// API: Complete Payment
app.post('/api/payment-links/:id/pay', (req, res) => {
  const link = paymentLinks.find(l => l.id === req.params.id);
  if (!link) {
    return res.status(404).json({ success: false, error: 'Payment link not found' });
  }

  if (link.status === 'PAID') {
    return res.json({
      success: true,
      message: 'This payment link has already been paid.',
      data: link
    });
  }

  const { paymentMethod = 'UPI Payment' } = req.body;
  link.status = 'PAID';
  link.paidAt = new Date().toISOString();
  link.transactionId = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
  link.paymentMethod = paymentMethod;

  res.json({
    success: true,
    message: 'Payment completed successfully!',
    data: link
  });
});

// API: Create Razorpay Order
app.post('/api/payment-links/:id/create-razorpay-order', async (req, res) => {
  const link = paymentLinks.find(l => l.id === req.params.id);
  if (!link) {
    return res.status(404).json({ success: false, error: 'Patient billing record not found' });
  }

  const keyId = globalRazorpayConfig.keyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = globalRazorpayConfig.keySecret || process.env.RAZORPAY_KEY_SECRET;
  const amountInPaise = Math.round(link.amount * 100);

  if (!keyId || !keySecret) {
    return res.json({
      success: true,
      directMode: true,
      orderId: null,
      amount: amountInPaise,
      currency: link.currency || 'INR',
      keyId: keyId || '',
      patientName: link.customerName,
      patientPhone: link.customerPhone,
      description: link.description,
      department: link.department || 'General OPD'
    });
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: link.currency || 'INR',
        receipt: link.invoiceNumber ? String(link.invoiceNumber).slice(0, 40) : `rcpt_${Date.now()}`,
        notes: {
          patientName: link.customerName,
          patientPhone: link.customerPhone,
          department: link.department || 'General OPD',
          description: link.description
        }
      })
    });

    const orderData = await response.json();

    if (response.ok && orderData.id) {
      link.razorpayOrderId = orderData.id;
      return res.json({
        success: true,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId,
        patientName: link.customerName,
        patientPhone: link.customerPhone,
        description: link.description,
        department: link.department || 'General OPD'
      });
    } else {
      console.warn('Razorpay server order creation notice:', orderData.error?.description || 'Fallback to direct checkout');
      return res.json({
        success: true,
        directMode: true,
        orderId: null,
        amount: amountInPaise,
        currency: link.currency || 'INR',
        keyId,
        patientName: link.customerName,
        patientPhone: link.customerPhone,
        description: link.description,
        department: link.department || 'General OPD'
      });
    }
  } catch (err) {
    console.warn('Error connecting to Razorpay server API, falling back to direct checkout:', err.message);
    return res.json({
      success: true,
      directMode: true,
      orderId: null,
      amount: amountInPaise,
      currency: link.currency || 'INR',
      keyId,
      patientName: link.customerName,
      patientPhone: link.customerPhone,
      description: link.description,
      department: link.department || 'General OPD'
    });
  }
});

// API: Verify Razorpay Payment Signature
app.post('/api/payment-links/:id/verify-razorpay-payment', async (req, res) => {
  const link = paymentLinks.find(l => l.id === req.params.id);
  if (!link) {
    return res.status(404).json({ success: false, error: 'Patient billing record not found' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentMethod } = req.body;
  const keySecret = globalRazorpayConfig.keySecret || process.env.RAZORPAY_KEY_SECRET;

  if (!razorpay_payment_id) {
    return res.status(400).json({ success: false, error: 'Missing Razorpay payment ID' });
  }

  // If orderId and signature are provided with a secret, verify HMAC signature
  if (razorpay_order_id && razorpay_signature && keySecret) {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Razorpay payment signature verification failed! Invalid transaction.' });
    }
  }

  link.status = 'PAID';
  link.paidAt = new Date().toISOString();
  link.transactionId = razorpay_payment_id;
  link.paymentMethod = paymentMethod || 'Razorpay Gateway (Card/UPI/Netbanking)';

  // Dispatch automated Hospital Receipt via WhatsApp if Meta Cloud API credentials exist
  const accessToken = globalMetaApiConfig.accessToken || process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = globalMetaApiConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  const receiptMsg = `🏥 *PAYMENT CONFIRMED - HOSPITAL RECEIPT*

Hi *${link.customerName}*,

Your hospital payment of *${link.currencySymbol}${link.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}* for *${link.description}* (UHID/Bill #${link.invoiceNumber}) was processed successfully via Razorpay!

📄 *Transaction ID:* ${link.transactionId}
🩺 *Department:* ${link.department || 'Hospital Billing'}
📅 *Date:* ${new Date(link.paidAt).toLocaleString('en-IN')}

Thank you for choosing PayVista Healthcare. Wish you good health! 💙`;

  const receiptUrls = buildWhatsAppUrls(link.customerPhone, receiptMsg);

  if (accessToken && phoneNumberId) {
    try {
      await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: link.customerPhone,
          type: 'text',
          text: { body: receiptMsg }
        })
      });
    } catch (waErr) {
      console.warn('Automated WhatsApp receipt dispatch failed:', waErr.message);
    }
  }

  res.json({
    success: true,
    message: 'Hospital bill payment verified successfully',
    data: {
      ...link,
      receiptUrls
    }
  });
});

// API: Reset Demo Data
app.post('/api/reset-demo', (req, res) => {
  paymentLinks = [
    {
      id: 'pay_demo_101',
      invoiceNumber: 'UHID-2026-8492',
      customerName: 'Aarav Verma',
      customerPhone: '919876543210',
      department: 'Cardiology OPD',
      amount: 1200.00,
      currency: 'INR',
      currencySymbol: '₹',
      description: 'Dr. Sharma Consultation & ECG Diagnostic Test',
      status: 'PAID',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      paidAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      transactionId: 'pay_rzp_948271049',
      paymentMethod: 'Razorpay UPI (GPay)',
      whatsappSentCount: 1,
      lastWhatsappSentAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      customMessage: ''
    },
    {
      id: 'pay_demo_102',
      invoiceNumber: 'UHID-2026-9103',
      customerName: 'Sunita Rao',
      customerPhone: '919123456789',
      department: 'IPD / Surgical Ward',
      amount: 15500.00,
      currency: 'INR',
      currencySymbol: '₹',
      description: 'IPD Room Advance Deposit & Surgical Supplies',
      status: 'SENT_WHATSAPP',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      paidAt: null,
      transactionId: null,
      paymentMethod: null,
      whatsappSentCount: 1,
      lastWhatsappSentAt: new Date(Date.now() - 1800000).toISOString(),
      customMessage: ''
    }
  ];
  res.json({ success: true, message: 'Demo hospital billing data reset successfully', data: paymentLinks });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 PayVista Server is running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = Number(PORT) + 1;
    app.listen(nextPort, () => {
      console.log(`🚀 PayVista Server is running at http://localhost:${nextPort}`);
    });
  }
});
