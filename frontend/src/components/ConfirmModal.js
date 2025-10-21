import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'confirm', // 'confirm', 'success', 'error', 'warning'
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  showInput = false,
  inputPlaceholder = '',
  inputValue = '',
  onInputChange = () => {}
}) {
  if (!isOpen) return null;

  const typeStyles = {
    confirm: {
      icon: <AlertTriangle className="w-12 h-12 text-blue-600" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      iconBg: 'bg-blue-100'
    },
    success: {
      icon: <CheckCircle className="w-12 h-12 text-green-600" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      buttonColor: 'bg-green-600 hover:bg-green-700',
      iconBg: 'bg-green-100'
    },
    error: {
      icon: <XCircle className="w-12 h-12 text-red-600" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      buttonColor: 'bg-red-600 hover:bg-red-700',
      iconBg: 'bg-red-100'
    },
    warning: {
      icon: <AlertTriangle className="w-12 h-12 text-amber-600" />,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      buttonColor: 'bg-amber-600 hover:bg-amber-700',
      iconBg: 'bg-amber-100'
    }
  };

  const style = typeStyles[type] || typeStyles.confirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slideUp">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <div className={`${style.iconBg} rounded-full p-3 mb-4`}>
              {style.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Input Field (if needed) */}
        {showInput && (
          <div className="px-6 pb-4">
            <textarea
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows="3"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 ${style.buttonColor} text-white rounded-lg transition-colors font-medium text-sm shadow-sm`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
