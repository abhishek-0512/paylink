import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPaymentHistory, sendWhatsAppLink, getReceiptDownloadUrl } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { Copy, Send, Download, ExternalLink, ChevronLeft, ChevronRight, Check, RefreshCw } from 'lucide-react';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [copiedId, setCopiedId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [waSendingId, setWaSendingId] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await getPaymentHistory({ page, limit: 10, status: statusFilter });
      if (res.success) {
        setPayments(res.data || []);
        setPagination(res.pagination || { totalPages: 1, total: 0 });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to fetch payment history' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (link, id) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = async (paymentId, phone) => {
    try {
      setWaSendingId(paymentId);
      const res = await sendWhatsAppLink(paymentId, phone);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || `WhatsApp message sent to ${phone}!` });
        fetchPayments(); // Refresh list to update WhatsApp status
      } else {
        setAlert({ type: 'error', message: res.message || 'WhatsApp sending failed' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to send WhatsApp message' });
    } finally {
      setWaSendingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Transactions History</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all payment links and Meta WhatsApp delivery statuses</p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="CREATED">CREATED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading payment transactions..." />
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No payments found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">WhatsApp</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {payments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900">{p.customerName}</div>
                      <div className="text-xs text-gray-500 font-medium">WhatsApp: {p.customerPhone}</div>
                      <div className="text-[11px] font-mono text-gray-400 mt-0.5">ID: {p.paymentId}</div>
                    </td>

                    <td className="py-4 px-6 font-extrabold text-gray-900">
                      ₹{p.amount?.toLocaleString('en-IN')}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'PENDING' || p.status === 'CREATED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.whatsappStatus === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : p.whatsappStatus === 'FAILED'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {p.whatsappStatus || 'NOT_SENT'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Copy Link */}
                        <button
                          onClick={() => handleCopyLink(p.paymentLink, p.paymentId)}
                          title="Copy Link"
                          className="p-2 text-gray-600 hover:text-brand-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          {copiedId === p.paymentId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Send via Meta WhatsApp Cloud API */}
                        <button
                          onClick={() => handleSendWhatsApp(p.paymentId, p.customerPhone)}
                          disabled={waSendingId === p.paymentId}
                          title="Send via Meta WhatsApp Cloud API"
                          className="p-2 text-[#25D366] hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                        >
                          <Send className={`w-4 h-4 ${waSendingId === p.paymentId ? 'animate-pulse' : ''}`} />
                        </button>

                        {/* View Checkout Page */}
                        <Link
                          to={`/pay/${p.paymentId}`}
                          title="View Payment Page"
                          className="p-2 text-gray-600 hover:text-brand-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        {/* Download Receipt if SUCCESS */}
                        {p.status === 'SUCCESS' && (
                          <a
                            href={getReceiptDownloadUrl(p.paymentId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF Receipt"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition font-semibold text-xs inline-flex items-center space-x-1"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing Page <span className="font-semibold text-gray-900">{page}</span> of{' '}
              <span className="font-semibold text-gray-900">{pagination.totalPages}</span>
            </span>

            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-40 transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-40 transition flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
