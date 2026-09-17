const fs = require('fs');
const path = require('path');
const config = require('../config/app.config');
const logger = require('../utils/logger');

/**
 * Get current API Keys configuration status
 * GET /api/settings
 */
const getSettings = async (req, res) => {
  const isRazorpayConfigured = !!(
    config.razorpay.keyId &&
    config.razorpay.keySecret &&
    !config.razorpay.keyId.includes('sample') &&
    !config.razorpay.keyId.includes('mock')
  );

  const isWhatsAppConfigured = !!(
    config.whatsapp.accessToken &&
    config.whatsapp.phoneNumberId &&
    !config.whatsapp.accessToken.startsWith('EAAG_sample')
  );

  return res.status(200).json({
    success: true,
    data: {
      razorpay: {
        isConfigured: isRazorpayConfigured,
        keyId: config.razorpay.keyId || '',
        maskedKeyId: config.razorpay.keyId ? `${config.razorpay.keyId.substring(0, 8)}...` : '',
        mode: config.razorpay.keyId?.startsWith('rzp_live') ? 'LIVE' : 'TEST'
      },
      whatsapp: {
        isConfigured: isWhatsAppConfigured,
        phoneNumberId: config.whatsapp.phoneNumberId || '',
        businessAccountId: config.whatsapp.businessAccountId || '',
        hasToken: !!config.whatsapp.accessToken,
        templateName: config.whatsapp.templateName
      },
      urls: {
        frontend: config.urls.frontend,
        backend: config.urls.backend
      }
    }
  });
};

/**
 * Update API Keys in .env and live config
 * POST /api/settings
 */
const updateSettings = async (req, res) => {
  try {
    const { razorpayKeyId, razorpayKeySecret, whatsappToken, whatsappPhoneNumberId, whatsappBusinessAccountId } = req.body;

    const envPaths = [
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../../../.env'),
      path.resolve(process.cwd(), '.env')
    ];

    const uniquePaths = [...new Set(envPaths)];

    for (const envPath of uniquePaths) {
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (razorpayKeyId !== undefined) {
        config.razorpay.keyId = razorpayKeyId.trim();
        process.env.RAZORPAY_KEY_ID = config.razorpay.keyId;
        envContent = updateEnvVar(envContent, 'RAZORPAY_KEY_ID', config.razorpay.keyId);
      }
      if (razorpayKeySecret !== undefined && razorpayKeySecret.trim()) {
        config.razorpay.keySecret = razorpayKeySecret.trim();
        process.env.RAZORPAY_KEY_SECRET = config.razorpay.keySecret;
        envContent = updateEnvVar(envContent, 'RAZORPAY_KEY_SECRET', config.razorpay.keySecret);
      }
      if (whatsappToken !== undefined && whatsappToken.trim()) {
        config.whatsapp.accessToken = whatsappToken.trim();
        process.env.WHATSAPP_ACCESS_TOKEN = config.whatsapp.accessToken;
        process.env.WHATSAPP_CLOUD_API_TOKEN = config.whatsapp.accessToken;
        envContent = updateEnvVar(envContent, 'WHATSAPP_ACCESS_TOKEN', config.whatsapp.accessToken);
        envContent = updateEnvVar(envContent, 'WHATSAPP_CLOUD_API_TOKEN', config.whatsapp.accessToken);
      }
      if (whatsappPhoneNumberId !== undefined) {
        config.whatsapp.phoneNumberId = whatsappPhoneNumberId.trim();
        process.env.WHATSAPP_PHONE_NUMBER_ID = config.whatsapp.phoneNumberId;
        envContent = updateEnvVar(envContent, 'WHATSAPP_PHONE_NUMBER_ID', config.whatsapp.phoneNumberId);
      }
      if (whatsappBusinessAccountId !== undefined) {
        config.whatsapp.businessAccountId = whatsappBusinessAccountId.trim();
        process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = config.whatsapp.businessAccountId;
        envContent = updateEnvVar(envContent, 'WHATSAPP_BUSINESS_ACCOUNT_ID', config.whatsapp.businessAccountId);
      }

      try {
        fs.writeFileSync(envPath, envContent, 'utf8');
      } catch (writeErr) {
        logger.warn(`Could not write to ${envPath}: ${writeErr.message}`);
      }
    }

    logger.info('API Credentials updated in live config and .env');

    return res.status(200).json({
      success: true,
      message: 'API credentials saved successfully'
    });
  } catch (error) {
    logger.error('Failed to update settings:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save settings'
    });
  }
};

function updateEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  return content + `\n${key}=${value}`;
}

module.exports = {
  getSettings,
  updateSettings
};
