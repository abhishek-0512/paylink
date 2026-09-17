import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;

  const styles = {
    info: 'bg-blue-50 text-blue-800 border-blue-200 icon-blue-500',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 icon-emerald-500',
    error: 'bg-red-50 text-red-800 border-red-200 icon-red-500'
  };

  const Icons = {
    info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
  };

  return (
    <div className={`p-4 rounded-lg border flex items-start justify-between shadow-sm my-3 ${styles[type]}`}>
      <div className="flex items-center space-x-3">
        {Icons[type]}
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
