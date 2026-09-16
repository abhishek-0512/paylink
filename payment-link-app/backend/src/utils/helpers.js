const crypto = require('crypto');

/**
 * Generate a unique payment ID (e.g. pay_8f73a91c)
 */
const generatePaymentId = () => {
  const randomHex = crypto.randomBytes(4).toString('hex');
  return `pay_${randomHex}`;
};

/**
 * Generate a unique receipt number (e.g. REC-2026-000001)
 * @param {number} sequenceNumber 
 */
const generateReceiptNumber = (sequenceNumber) => {
  const year = new Date().getFullYear();
  const paddedSeq = String(sequenceNumber).padStart(6, '0');
  return `REC-${year}-${paddedSeq}`;
};

const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Strip all non-digit characters
  let cleaned = String(phone).replace(/\D/g, '');
  // Remove leading zeros if present
  if (cleaned.startsWith('091') && cleaned.length === 13) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = `91${cleaned.substring(1)}`;
  } else if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
};

/**
 * Format INR currency string
 */
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2
  }).format(amount);
};

module.exports = {
  generatePaymentId,
  generateReceiptNumber,
  formatPhoneNumber,
  formatCurrency
};
