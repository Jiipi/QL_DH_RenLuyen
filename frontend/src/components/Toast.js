import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const types = {
    success: {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800'
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800'
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800'
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800'
    }
  };

  const style = types[type] || types.success;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideDown">
      <div className={`${style.bg} ${style.border} border rounded-lg shadow-lg p-4 pr-12 min-w-[300px] max-w-md`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {style.icon}
          </div>
          <div className={`flex-1 ${style.text} text-sm font-medium`}>
            {message}
          </div>
          <button
            onClick={onClose}
            className={`absolute top-3 right-3 ${style.text} opacity-50 hover:opacity-100 transition-opacity`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
