import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CreditCard, PlusCircle, History, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path
      ? 'bg-blue-50 text-blue-700 font-semibold'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50';
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center space-x-2 text-gray-900 font-bold text-lg">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <span>PayLink</span>
          </Link>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <Link
              to="/dashboard"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isActive('/dashboard')}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/create-payment"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isActive('/create-payment')}`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Link</span>
            </Link>

            <Link
              to="/payments"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isActive('/payments')}`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

