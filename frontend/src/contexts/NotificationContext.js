import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext();

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const showSuccess = useCallback((message, title = 'Thành công', duration = 8000) => {
    return addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const showError = useCallback((message, title = 'Lỗi', duration = 6000) => {
    return addNotification({ type: 'error', title, message, duration });
  }, [addNotification]);

  const showWarning = useCallback((message, title = 'Cảnh báo', duration = 5000) => {
    return addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  const showInfo = useCallback((message, title = 'Thông tin', duration = 4000) => {
    return addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        ...options,
        onConfirm: () => {
          setConfirmModal(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        },
      });
    });
  }, []);

  const value = {
    notifications,
    confirmModal,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    confirm,
  };

  return React.createElement(
    NotificationContext.Provider,
    { value },
    [
      children,
      React.createElement(NotificationContainer, { key: 'notifications' }),
      React.createElement(ConfirmModal, { key: 'confirm-modal' }),
    ]
  );
}

// Toast Notification Component
function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return React.createElement(
    'div',
    { className: 'fixed top-4 right-4 z-50 space-y-2' },
    notifications.map(notification => 
      React.createElement(ToastNotification, {
        key: notification.id,
        notification,
        onClose: () => removeNotification(notification.id)
      })
    )
  );
}

function ToastNotification({ notification, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    if (notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, onClose]);

  const getNotificationStyle = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    const iconClass = 'h-5 w-5';
    switch (notification.type) {
      case 'success':
        return React.createElement(CheckCircle, { className: `${iconClass} text-green-500` });
      case 'error':
        return React.createElement(XCircle, { className: `${iconClass} text-red-500` });
      case 'warning':
        return React.createElement(AlertCircle, { className: `${iconClass} text-yellow-500` });
      default:
        return React.createElement(Info, { className: `${iconClass} text-blue-500` });
    }
  };

  return React.createElement(
    'div',
    {
      className: `max-w-xl w-full bg-white shadow-xl rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-500 ${
        isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`,
    },
    React.createElement(
      'div',
      { className: `p-7 border-l-4 ${getNotificationStyle()}` },
      [
        React.createElement(
          'div',
          { key: 'content', className: 'flex items-start' },
          [
            React.createElement('div', { key: 'icon', className: 'flex-shrink-0 mt-0.5' }, getIcon()),
            React.createElement(
              'div',
              { key: 'text', className: 'ml-5 flex-1 min-w-0' },
              [
                notification.title && React.createElement(
                  'p',
                  { key: 'title', className: 'text-base font-semibold mb-1 break-words' },
                  notification.title
                ),
                React.createElement(
                  'p',
                  { key: 'message', className: 'text-sm leading-relaxed break-words' },
                  notification.message
                ),
              ]
            ),
            React.createElement(
              'div',
              { key: 'close', className: 'ml-5 flex-shrink-0 flex' },
              React.createElement(
                'button',
                {
                  className: 'bg-white rounded-full inline-flex text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1 transition-colors',
                  onClick: onClose,
                },
                React.createElement(X, { className: 'h-4 w-4' })
              )
            ),
          ]
        ),
      ]
    )
  );
}

// Confirmation Modal Component
function ConfirmModal() {
  const { confirmModal } = useNotification();

  if (!confirmModal) return null;

  return React.createElement(
    'div',
    { className: 'fixed inset-0 z-50 overflow-y-auto' },
    React.createElement(
      'div',
      { className: 'flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0' },
      [
        // Backdrop
        React.createElement(
          'div',
          { 
            key: 'backdrop',
            className: 'fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity',
            onClick: confirmModal.onCancel
          }
        ),
        // Modal
        React.createElement(
          'div',
          { key: 'modal', className: 'inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full' },
          [
            React.createElement(
              'div',
              { key: 'content', className: 'bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4' },
              [
                React.createElement(
                  'div',
                  { key: 'icon', className: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10' },
                  React.createElement(AlertCircle, { className: 'h-6 w-6 text-yellow-600' })
                ),
                React.createElement(
                  'div',
                  { key: 'text', className: 'mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left' },
                  [
                    React.createElement(
                      'h3',
                      { key: 'title', className: 'text-lg leading-6 font-medium text-gray-900' },
                      confirmModal.title || 'Xác nhận'
                    ),
                    React.createElement(
                      'div',
                      { key: 'message', className: 'mt-2' },
                      React.createElement(
                        'p',
                        { className: 'text-sm text-gray-500' },
                        confirmModal.message || 'Bạn có chắc chắn muốn thực hiện hành động này?'
                      )
                    ),
                  ]
                ),
              ]
            ),
            React.createElement(
              'div',
              { key: 'actions', className: 'bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse' },
              [
                React.createElement(
                  'button',
                  {
                    key: 'confirm',
                    type: 'button',
                    className: 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm',
                    onClick: confirmModal.onConfirm,
                  },
                  confirmModal.confirmText || 'Xác nhận'
                ),
                React.createElement(
                  'button',
                  {
                    key: 'cancel',
                    type: 'button',
                    className: 'mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm',
                    onClick: confirmModal.onCancel,
                  },
                  confirmModal.cancelText || 'Hủy'
                ),
              ]
            ),
          ]
        ),
      ]
    )
  );
}
