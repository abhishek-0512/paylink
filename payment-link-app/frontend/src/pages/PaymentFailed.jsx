import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function PaymentFailed() {
  const { paymentId } = useParams();

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-red-200 shadow-xl overflow-hidden text-center">
        <div className="bg-red-600 p-8 text-white space-y-2">
          <div className="inline-flex p-3 bg-white/20 rounded-full mb-1">
            <XCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold">Payment Failed ✕</h2>
          <p className="text-red-100 text-sm">Transaction could not be completed</p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600">
            The payment attempt was declined or cancelled. No charges were made to your account.
          </p>

          <div className="space-y-3">
            <Link
              to={`/pay/${paymentId}`}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-xl shadow transition flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Retry Payment</span>
            </Link>

            <Link
              to="/dashboard"
              className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 text-xs text-gray-500 hover:text-gray-700 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
