import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreatePayment from './pages/CreatePayment';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import PaymentHistory from './pages/PaymentHistory';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-payment" element={<CreatePayment />} />
            <Route path="/pay/:paymentId" element={<PaymentPage />} />
            <Route path="/payment-success/:paymentId" element={<PaymentSuccess />} />
            <Route path="/payment-failed/:paymentId" element={<PaymentFailed />} />
            <Route path="/payments" element={<PaymentHistory />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          PayLink Express • Production-Ready Payment Link & WhatsApp Cloud Integration
        </footer>
      </div>
    </Router>
  );
}
