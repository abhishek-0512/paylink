import React, { useState } from 'react';
import { createPaymentLink, sendWhatsAppLink } from '../services/api';
import Alert from '../components/Alert';
import { Copy, Check, Send, ExternalLink, RefreshCw } from 'lucide-react';

export default function CreatePayment() {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    amount: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [createdPayment, setCreatedPayment] = useState(null);
  const [copied, setCopied] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!formData.customerName || !formData.customerPhone || !formData.amount) {
      setAlert({ type: 'error', message: 'Please enter Name, WhatsApp Number, and Amount.' });
      return;
    }

    try {
      setLoading(true);
      const res = await createPaymentLink({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        amount: Number(formData.amount),
        description: formData.description,
        triggerWhatsApp: true
      });

      if (res.success) {
        setCreatedPayment(res.data);
        setAlert({
          type: 'success',
          message: 'Payment link created and sent to customer WhatsApp!'
        });
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to create payment link' });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Error generating payment link'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdPayment?.paymentLink) {
      navigator.clipboard.writeText(createdPayment.paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResendWhatsApp = async () => {
    if (!createdPayment) return;
    try {
      setWaLoading(true);
      const res = await sendWhatsAppLink(createdPayment.paymentId, createdPayment.customerPhone);
      if (res.success) {
        setAlert({ type: 'success', message: 'WhatsApp payment notification sent!' });
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to send WhatsApp message' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to send WhatsApp message' });
    } finally {
      setWaLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Create Payment Link</h1>
          <p className="text-sm text-gray-500">
            Generate a payment link and send it instantly to customer's WhatsApp
          </p>
        </div>

        <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

        {!createdPayment ? (
          /* Simple Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="text"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Amount (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="500"
                  min="1"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description / Note (Optional)
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g. Order #101"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Generating & Sending...' : 'Send Payment Link on WhatsApp'}</span>
            </button>
          </form>
        ) : (
          /* Result View */
          <div className="space-y-5 pt-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-900">Payment Link Generated</span>
                <span className={`px-2 py-0.5 rounded-full ${createdPayment.whatsappStatus === 'SENT' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-800'}`}>
                  {createdPayment.whatsappStatus === 'SENT' ? '✓ Meta API Sent' : (createdPayment.whatsappStatus || 'Meta API Pending')}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-300 text-xs font-mono break-all text-gray-800 flex items-center justify-between gap-2">
                <span className="truncate">{createdPayment.paymentLink}</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-sans font-medium flex items-center space-x-1 shrink-0 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-semibold text-gray-900">{createdPayment.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recipient Phone:</span>
                <span className="font-mono text-gray-800">{createdPayment.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-gray-900">₹{createdPayment.amount?.toLocaleString('en-IN')}</span>
              </div>
              {createdPayment.whatsappResult?.sentVia && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Dispatch Method:</span>
                  <span className="font-medium text-emerald-700">{createdPayment.whatsappResult.sentVia}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleResendWhatsApp}
                disabled={waLoading}
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${waLoading ? 'animate-spin' : ''}`} />
                <span>{waLoading ? 'Sending...' : 'Resend via Meta API'}</span>
              </button>

              <a
                href={createdPayment.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition"
              >
                <span>Open Checkout</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <button
              onClick={() => {
                setCreatedPayment(null);
                setFormData({ customerName: '', customerPhone: '', amount: '', description: '' });
              }}
              className="w-full py-2 text-xs text-blue-600 hover:text-blue-800 font-medium text-center block"
            >
              + Create Another Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

