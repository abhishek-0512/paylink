import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPaymentDetails, getReceiptDownloadUrl } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { CheckCircle2, Download, ArrowLeft } from 'lucide-react';

export default function PaymentSuccess() {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const res = await getPaymentDetails(paymentId);
      if (res.success) {
        setPayment(res.data);
      }
    } catch (err) {
      console.error('Error fetching success payment details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading confirmation..." />;
  }

  const receiptUrl = getReceiptDownloadUrl(paymentId);

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-6">
        <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Successful</h1>
          <p className="text-xs text-gray-500 mt-1">Receipt #{payment?.receiptNumber || payment?.paymentId}</p>
        </div>

        <div className="py-3 bg-gray-50 rounded-xl border border-gray-100">
          <span className="text-xs text-gray-500 block">Amount Paid</span>
          <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
            ₹{payment?.amount?.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="text-xs text-left bg-gray-50/70 p-4 rounded-xl border border-gray-200/60 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Customer:</span>
            <span className="font-semibold text-gray-900">{payment?.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone:</span>
            <span className="font-mono text-gray-800">{payment?.customerPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status:</span>
            <span className="font-bold text-emerald-600">PAID ✓</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow transition flex items-center justify-center space-x-2 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Receipt (PDF)</span>
          </a>

          <Link
            to="/create-payment"
            className="w-full inline-flex items-center justify-center space-x-1 py-2 text-xs text-gray-500 hover:text-gray-800 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Create Another Payment</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
