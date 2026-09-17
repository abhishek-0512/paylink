import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Create Payment Link
 */
export const createPaymentLink = async (paymentData) => {
  const response = await api.post('/payments/create', paymentData);
  return response.data;
};

/**
 * Get Payment Details by Payment ID
 */
export const getPaymentDetails = async (paymentId) => {
  const response = await api.get(`/payments/${paymentId}`);
  return response.data;
};

/**
 * Get Payment Status
 */
export const getPaymentStatus = async (paymentId) => {
  const response = await api.get(`/payments/${paymentId}/status`);
  return response.data;
};

/**
 * Verify Razorpay Payment Signature
 */
export const verifyPaymentSignature = async (verificationData) => {
  const response = await api.post('/payments/verify', verificationData);
  return response.data;
};

/**
 * Send Payment Link via WhatsApp
 */
export const sendWhatsAppLink = async (paymentId, phone) => {
  const response = await api.post('/whatsapp/send-payment-link', { paymentId, phone });
  return response.data;
};

/**
 * Fetch Payment History (Merchant Dashboard)
 */
export const getPaymentHistory = async (params = {}) => {
  const response = await api.get('/payments', { params });
  return response.data;
};

/**
 * Helper to download Receipt PDF URL
 */
export const getReceiptDownloadUrl = (paymentId) => {
  return `${API_BASE_URL}/payments/${paymentId}/receipt`;
};

/**
 * Get API credentials and status
 */
export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

/**
 * Update API credentials in backend/.env
 */
export const updateSettings = async (settingsData) => {
  const response = await api.post('/settings', settingsData);
  return response.data;
};

export default api;
