import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../services/api';
import { X, Key, ShieldCheck, Check, AlertCircle, Save } from 'lucide-react';
import Alert from './Alert';

export default function SettingsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const [formData, setFormData] = useState({
    razorpayKeyId: '',
    razorpayKeySecret: '',
    whatsappToken: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: ''
  });

  const [status, setStatus] = useState({
    razorpayConfigured: false,
    whatsappConfigured: false
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getSettings();
      if (res.success && res.data) {
        setFormData({
          razorpayKeyId: res.data.razorpay?.keyId || '',
          razorpayKeySecret: '',
          whatsappToken: '',
          whatsappPhoneNumberId: res.data.whatsapp?.phoneNumberId || '',
          whatsappBusinessAccountId: res.data.whatsapp?.businessAccountId || ''
        });
        setStatus({
          razorpayConfigured: res.data.razorpay?.isConfigured,
          whatsappConfigured: res.data.whatsapp?.isConfigured
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setAlert(null);
      const res = await updateSettings(formData);
      if (res.success) {
        setAlert({ type: 'success', message: 'API Credentials saved and applied successfully!' });
        loadSettings();
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to save settings' });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update credentials'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">API Credentials & Keys</h3>
              <p className="text-xs text-gray-500">Configure your live Razorpay and Meta WhatsApp Cloud API keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

          {/* Razorpay Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700">1. Razorpay Test / Live Keys</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                status.razorpayConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {status.razorpayConfigured ? '✓ Live Key Active' : 'Simulation Mode'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Razorpay Key ID</label>
                <input
                  type="text"
                  name="razorpayKeyId"
                  value={formData.razorpayKeyId}
                  onChange={handleChange}
                  placeholder="rzp_test_..."
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Razorpay Key Secret</label>
                <input
                  type="password"
                  name="razorpayKeySecret"
                  value={formData.razorpayKeySecret}
                  onChange={handleChange}
                  placeholder="Enter secret to update"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* WhatsApp Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-whatsapp-700">2. Meta WhatsApp Cloud API</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                status.whatsappConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {status.whatsappConfigured ? '✓ Meta Cloud Active' : 'Simulation Mode'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Meta Access Token (Bearer Token)</label>
                <input
                  type="password"
                  name="whatsappToken"
                  value={formData.whatsappToken}
                  onChange={handleChange}
                  placeholder="EAAG..."
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-gray-300 focus:ring-2 focus:ring-whatsapp-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    name="whatsappPhoneNumberId"
                    value={formData.whatsappPhoneNumberId}
                    onChange={handleChange}
                    placeholder="e.g. 1330521036802982"
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-gray-300 focus:ring-2 focus:ring-whatsapp-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">WABA Account ID</label>
                  <input
                    type="text"
                    name="whatsappBusinessAccountId"
                    value={formData.whatsappBusinessAccountId}
                    onChange={handleChange}
                    placeholder="e.g. 1573568204228937"
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-gray-300 focus:ring-2 focus:ring-whatsapp-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save API Credentials'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
