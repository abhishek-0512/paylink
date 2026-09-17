import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPaymentDetails, verifyPaymentSignature } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { ShieldCheck, CreditCard, CheckCircle2, ExternalLink } from 'lucide-react';

export default function PaymentPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchPayment();
    loadRazorpaySDK();
  }, [paymentId]);

  const loadRazorpaySDK = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const existing = document.getElementById('razorpay-checkout-script');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const res = await getPaymentDetails(paymentId);
      if (res.success) {
        setPayment(res.data);
      } else {
        setAlert({ type: 'error', message: res.message || 'Payment details not found' });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Invalid or expired payment link'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Launch official Razorpay Checkout Modal
   */
  const handlePayWithRazorpay = async () => {
    if (!payment) return;

    setPaying(true);
    setAlert(null);

    const isLoaded = await loadRazorpaySDK();
    if (!isLoaded || !window.Razorpay) {
      setAlert({
        type: 'error',
        message: 'Could not load Razorpay Checkout SDK. Please check your internet connection or disable ad blockers and try again.'
      });
      setPaying(false);
      return;
    }

    const keyId = payment.keyId || 'rzp_test_T6jltyMEKVBito';
    const amountInPaise = Math.round(Number(payment.amount) * 100);

    const options = {
      key: keyId,
      amount: amountInPaise,
      currency: payment.currency || 'INR',
      name: 'PayLink Express',
      description: payment.description || `Payment #${payment.paymentId}`,
      prefill: {
        name: payment.customerName || '',
        contact: payment.customerPhone || '',
        email: payment.customerEmail || ''
      },
      theme: {
        color: '#2563EB'
      },
      modal: {
        backdropclose: false,
        escape: true,
        ondismiss: function () {
          setPaying(false);
        }
      },
      handler: async function (response) {
        try {
          setAlert(null);
          const verification = await verifyPaymentSignature({
            paymentId: payment.paymentId,
            orderId: response.razorpay_order_id || payment.orderId || undefined,
            gatewayPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature || undefined
          });

          if (verification.success) {
            navigate(`/payment-success/${payment.paymentId}`);
          } else {
            navigate(`/payment-failed/${payment.paymentId}`);
          }
        } catch (err) {
          setAlert({
            type: 'error',
            message: err.response?.data?.message || 'Payment verification failed'
          });
          setPaying(false);
        }
      }
    };

    if (payment.orderId && !payment.orderId.startsWith('order_mock')) {
      options.order_id = payment.orderId;
    }

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setAlert({
          type: 'error',
          message: `Payment Declined: ${response.error?.description || response.error?.reason || 'Transaction declined'}`
        });
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.warn('Razorpay checkout modal initialization issue, attempting direct mode:', err.message);
      // Fallback: If order_id caused mismatch, retry in direct gateway mode
      if (options.order_id) {
        try {
          delete options.order_id;
          const fallbackRzp = new window.Razorpay(options);
          fallbackRzp.open();
          return;
        } catch (fallbackErr) {
          setAlert({
            type: 'error',
            message: `Failed to launch payment gateway: ${fallbackErr.message}`
          });
          setPaying(false);
          return;
        }
      }
      setAlert({
        type: 'error',
        message: `Failed to launch payment gateway: ${err.message}`
      });
      setPaying(false);
    }
  };

  /**
   * Complete Simulated Demo Payment (works without live Razorpay keys)
   */
  const handleSimulatePayment = async () => {
    if (!payment) return;
    try {
      setPaying(true);
      setAlert(null);
      const mockPaymentId = `pay_sim_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const verification = await verifyPaymentSignature({
        paymentId: payment.paymentId,
        orderId: payment.orderId || undefined,
        gatewayPaymentId: mockPaymentId,
        signature: undefined
      });

      if (verification.success) {
        navigate(`/payment-success/${payment.paymentId}`);
      } else {
        navigate(`/payment-failed/${payment.paymentId}`);
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Payment simulation failed'
      });
      setPaying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading payment details..." />;
  }

  if (!payment) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <Alert type="error" message={alert?.message || 'Payment link not found.'} />
      </div>
    );
  }

  const isAlreadyPaid = payment.status === 'SUCCESS';

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Simple Header */}
        <div className="p-6 pb-4 border-b border-gray-100 text-center">
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-600 mb-1">Payment Request</p>
          <h1 className="text-xl font-bold text-gray-900">PayLink Express</h1>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

          {/* Amount Box */}
          <div className="text-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block mb-1">Amount to Pay</span>
            <div className="text-3xl font-extrabold text-gray-900">
              ₹{payment.amount?.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-xs bg-gray-50/60 p-4 rounded-xl border border-gray-200/70">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer:</span>
              <span className="font-semibold text-gray-900">{payment.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone:</span>
              <span className="font-mono text-gray-800">{payment.customerPhone}</span>
            </div>
            {payment.description && (
              <div className="flex justify-between">
                <span className="text-gray-500">Description:</span>
                <span className="text-gray-800 font-medium">{payment.description}</span>
              </div>
            )}
          </div>

          {/* Pay Button */}
          {isAlreadyPaid ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>This payment has already been completed.</span>
              </div>
              <Link
                to={`/payment-success/${payment.paymentId}`}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition"
              >
                <span>View Receipt</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handlePayWithRazorpay}
                disabled={paying}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 px-6 rounded-xl shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {paying ? 'Connecting...' : `Pay ₹${payment.amount?.toLocaleString('en-IN')} with Razorpay`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={paying}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <span>⚡ Simulate Instant Payment (Demo Mode)</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secured by Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
