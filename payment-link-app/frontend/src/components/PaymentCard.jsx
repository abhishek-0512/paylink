import React from 'react';
import { User, Phone, Mail, FileText, Tag, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function PaymentCard({ payment }) {
  if (!payment) return null;

  const statusColors = {
    SUCCESS: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    CREATED: 'bg-blue-100 text-blue-800 border-blue-300',
    FAILED: 'bg-red-100 text-red-800 border-red-300',
    EXPIRED: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  const statusIcons = {
    SUCCESS: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    PENDING: <Clock className="w-4 h-4 text-amber-600" />,
    CREATED: <Clock className="w-4 h-4 text-blue-600" />,
    FAILED: <XCircle className="w-4 h-4 text-red-600" />,
    EXPIRED: <XCircle className="w-4 h-4 text-gray-600" />
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">Payment Request</span>
          <h3 className="text-lg font-bold text-gray-900">{payment.paymentId}</h3>
        </div>
        <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[payment.status] || 'bg-gray-100'}`}>
          {statusIcons[payment.status]}
          <span>{payment.status}</span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between p-4 bg-blue-50/60 rounded-lg border border-blue-100">
          <span className="text-sm font-medium text-gray-600">Total Amount</span>
          <span className="text-2xl font-extrabold text-brand-600">₹{payment.amount?.toLocaleString('en-IN')}</span>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center space-x-3">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-500 w-24">Customer:</span>
            <span className="font-semibold text-gray-900">{payment.customerName}</span>
          </div>

          <div className="flex items-center space-x-3">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-500 w-24">WhatsApp:</span>
            <span className="text-gray-900 font-mono">{payment.customerPhone}</span>
          </div>

          {payment.description && (
            <div className="flex items-start space-x-3">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="font-medium text-gray-500 w-24">Description:</span>
              <span className="text-gray-800 flex-1">{payment.description}</span>
            </div>
          )}

          {payment.receiptNumber && (
            <div className="flex items-center space-x-3">
              <Tag className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="font-medium text-gray-500 w-24">Receipt No:</span>
              <span className="font-mono font-bold text-emerald-700">{payment.receiptNumber}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
