import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, CreditCard, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { getPaymentHistory } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalVolume: 0,
    paidCount: 0,
    pendingCount: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await getPaymentHistory({ page: 1, limit: 5 });
      if (response.success) {
        const list = response.data || [];
        setPayments(list);

        const totalVol = list
          .filter((p) => p.status === 'SUCCESS')
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        setStats({
          totalCount: response.pagination?.total || list.length,
          totalVolume: totalVol,
          paidCount: list.filter((p) => p.status === 'SUCCESS').length,
          pendingCount: list.filter((p) => p.status === 'PENDING' || p.status === 'CREATED').length
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Quick overview of your WhatsApp payment links</p>
        </div>
        <Link
          to="/create-payment"
          className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Payment Link</span>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500">Total Links</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500">Collected</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">₹{stats.totalVolume.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.paidCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.pendingCount}</p>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Recent Payment Links</h2>
          <Link to="/payments" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1">
            <span>View all</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading..." />
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No payment links created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase">
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {payments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono text-gray-700">{p.paymentId}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{p.customerName}</div>
                      <div className="text-[11px] text-gray-400">{p.customerPhone}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">₹{p.amount?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/pay/${p.paymentId}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs inline-flex items-center space-x-1"
                      >
                        <span>Open Link</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
