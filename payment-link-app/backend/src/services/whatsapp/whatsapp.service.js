const axios = require('axios');
const config = require('../../config/app.config');
const logger = require('../../utils/logger');
const { formatPhoneNumber, formatCurrency } = require('../../utils/helpers');

class WhatsAppService {
  getCredentials() {
    return {
      accessToken: config.whatsapp.accessToken || process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: config.whatsapp.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      templateName: config.whatsapp.templateName || process.env.WHATSAPP_TEMPLATE_NAME || 'hello_world',
      apiVersion: config.whatsapp.apiVersion || 'v21.0'
    };
  }

  /**
   * Send payment link to customer via official Meta WhatsApp Cloud API
   * @param {Object} options - { phone, customerName, amount, description, paymentLink }
   */
  async sendPaymentLink({ phone, customerName, amount, description, paymentLink }) {
    const recipientPhone = formatPhoneNumber(phone);
    const formattedAmount = formatCurrency(amount);

    if (!recipientPhone) {
      throw new Error('Invalid or missing recipient phone number');
    }

    const { accessToken, phoneNumberId, apiVersion } = this.getCredentials();

    if (!accessToken || !phoneNumberId || accessToken.startsWith('EAAG_sample')) {
      throw new Error('Meta WhatsApp Cloud API credentials are not configured. Please enter your Meta Access Token in Settings.');
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const messageText = 
`Hello ${customerName || 'Customer'},

Your payment request for ${formattedAmount} is ready.
${description ? `\nDescription: ${description}\n` : ''}
👉 Pay securely using the link below:
${paymentLink}

Thank you!`;

    let errors = [];

    // Method 1: Send formatted text message with payment link
    try {
      const textResponse = await axios.post(url, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'text',
        text: { preview_url: false, body: messageText }
      }, { headers });

      const messageId = textResponse.data?.messages?.[0]?.id || `wamid.${Date.now()}`;
      logger.info(`Meta WhatsApp API text message dispatched to ${recipientPhone} (ID: ${messageId})`);
      return {
        success: true,
        messageId,
        recipientPhone,
        sentVia: 'Meta WhatsApp Cloud API (Text Message)'
      };
    } catch (textErr) {
      const textMetaError = textErr.response?.data?.error;
      const textErrCode = textMetaError?.code;
      const textDetail = textMetaError?.message || textErr.message;
      errors.push(`Text message: ${textDetail}`);

      if (textErrCode === 131030) {
        throw new Error(`Recipient phone number (+${recipientPhone}) is not in your Meta allowed recipient test list. Add this number under Meta Developer Portal > WhatsApp > API Setup > "To Phone Numbers".`);
      }
      if (textErrCode === 190) {
        throw new Error(`Meta Access Token is invalid or expired. Please generate a fresh token in Meta Developer Portal.`);
      }
    }

    // Method 2: Fallback to approved template message
    try {
      const tplRes = await this.sendTemplateMessage({ recipientPhone, customerName, formattedAmount, description, paymentLink });
      return tplRes;
    } catch (tplErr) {
      errors.push(`Template message: ${tplErr.message}`);
      if (tplErr.message.includes('not in your Meta allowed recipient test list') || tplErr.message.includes('invalid or expired')) {
        throw tplErr;
      }
    }

    // Method 3: Interactive CTA URL Button fallback
    try {
      const ctaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          header: { type: 'text', text: '💳 Secure Payment Request' },
          body: { text: `Hello ${customerName || 'Customer'},\n\nPayment request of ${formattedAmount}.\n${description ? `\nDescription: ${description}` : ''}\n\nClick below to pay:` },
          footer: { text: 'Powered by PayLink Express' },
          action: { name: 'cta_url', parameters: { display_text: `Pay ${formattedAmount} Now`, url: paymentLink } }
        }
      };

      const ctaRes = await axios.post(url, ctaPayload, { headers });
      const messageId = ctaRes.data?.messages?.[0]?.id || `wamid.${Date.now()}`;
      return {
        success: true,
        messageId,
        recipientPhone,
        sentVia: 'Meta WhatsApp Cloud API (Interactive Button)'
      };
    } catch (ctaErr) {
      errors.push(`Interactive button: ${ctaErr.response?.data?.error?.message || ctaErr.message}`);
    }

    throw new Error(`Meta Cloud API could not deliver to +${recipientPhone}. Details: ${errors.join(' | ')}`);
  }

  /**
   * Send template message according to Meta WhatsApp messaging policies
   */
  async sendTemplateMessage({ recipientPhone, customerName, formattedAmount, description, paymentLink }) {
    const { accessToken, phoneNumberId, templateName, apiVersion } = this.getCredentials();
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Try sending custom template first, fallback to default 'hello_world' template provided by Meta Test accounts
    const templatesToTry = [templateName, 'hello_world'];

    for (const tName of templatesToTry) {
      try {
        const templatePayload = {
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'template',
          template: {
            name: tName,
            language: { code: 'en_US' }
          }
        };

        // If custom template, include body parameter components
        if (tName !== 'hello_world') {
          templatePayload.template.components = [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName || 'Customer' },
                { type: 'text', text: formattedAmount },
                { type: 'text', text: description || 'Payment Request' },
                { type: 'text', text: paymentLink }
              ]
            }
          ];
        }

        const response = await axios.post(url, templatePayload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        const messageId = response.data?.messages?.[0]?.id || `wamid.template_${Date.now()}`;
        logger.info(`WhatsApp template message '${tName}' sent successfully to ${recipientPhone} (ID: ${messageId})`);

        return {
          success: true,
          messageId,
          recipientPhone,
          sentVia: `Meta WhatsApp Cloud API (Template: ${tName})`
        };
      } catch (err) {
        const metaError = err.response?.data?.error;
        const errCode = metaError?.code;
        let detail = metaError?.message || err.message;

        if (errCode === 131030) {
          detail = `Recipient phone (+${recipientPhone}) is not in your Meta allowed recipient test list. Please add this number under Meta Developer Portal > WhatsApp > API Setup > "To Phone Numbers".`;
        } else if (errCode === 190) {
          detail = `Meta Access Token is invalid or expired. Please generate a new access token in Meta Developer Portal.`;
        } else if (errCode === 131047 || errCode === 131000) {
          detail = `Outside 24-hour customer window. The customer must message your Meta number (+1 555-661-9904) first to receive freeform messages.`;
        }

        logger.warn(`Template '${tName}' send attempt notice: ${detail}`);
        if (tName === templatesToTry[templatesToTry.length - 1]) {
          throw new Error(detail);
        }
      }
    }
  }
}

module.exports = new WhatsAppService();
