/**
 * Tab Manager Component
 * Hiển thị và quản lý các tabs đang active
 * Admin và Teacher có thể xem danh sách tabs và logout specific tab
 */

import React from 'react';
import { useTabSession, useActiveTabs } from '../contexts/TabSessionContext';
import { Monitor, X, RefreshCw, Clock, User, CheckCircle } from 'lucide-react';

export default function TabManager() {
  const { tabId: currentTabId, logout, logoutAll, refreshActiveTabs } = useTabSession();
  const { tabs, refresh, count } = useActiveTabs();
  const [isOpen, setIsOpen] = React.useState(false);

  // Auto refresh every minute
  React.useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        refresh();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen, refresh]);

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700';
      case 'GIANG_VIEN':
        return 'bg-blue-100 text-blue-700';
      case 'LOP_TRUONG':
        return 'bg-green-100 text-green-700';
      case 'SINH_VIEN':
      case 'STUDENT':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'GIANG_VIEN':
        return 'Giảng viên';
      case 'LOP_TRUONG':
        return 'Lớp trưởng';
      case 'SINH_VIEN':
      case 'STUDENT':
        return 'Sinh viên';
      default:
        return role || 'Không rõ';
    }
  };

  const formatTimeSince = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds} giây trước`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const handleLogoutTab = (tabId) => {
    if (tabId === currentTabId) {
      // Logout tab hiện tại
      if (window.confirm('Bạn có chắc muốn đăng xuất tab này?')) {
        logout();
      }
    } else {
      // Không thể logout tab khác trực tiếp (vì mỗi tab độc lập)
      alert('Không thể đăng xuất tab khác. Vui lòng chuyển sang tab đó để đăng xuất.');
    }
  };

  const handleLogoutAll = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất tất cả các tabs?')) {
      logoutAll();
    }
  };

  const handleRefresh = () => {
    refreshActiveTabs();
    refresh();
  };

  return (
    <div className="relative">
      {/* Button to open tab manager */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Quản lý tabs"
      >
        <Monitor className="w-5 h-5" />
        {count > 1 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Quản lý Tabs ({count})
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="Làm mới"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs list */}
            <div className="max-h-96 overflow-y-auto">
              {tabs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Không có tabs nào đang hoạt động
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {tabs.map((tab) => (
                    <div
                      key={tab.tabId}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        tab.isCurrent ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Tab info */}
                          <div className="flex items-center space-x-2 mb-2">
                            {tab.isCurrent && (
                              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {tab.isCurrent ? 'Tab hiện tại' : `Tab ${tab.tabId.slice(-8)}`}
                            </span>
                          </div>

                          {/* User info */}
                          {tab.hasSession && (
                            <div className="space-y-1 mb-2">
                              <div className="flex items-center space-x-2">
                                <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-600 truncate">
                                  {tab.userName || 'Không rõ'}
                                </span>
                              </div>
                              <span
                                className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(
                                  tab.role
                                )}`}
                              >
                                {getRoleLabel(tab.role)}
                              </span>
                            </div>
                          )}

                          {/* Last activity */}
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeSince(tab.lastActivity)}</span>
                          </div>

                          {/* Active status */}
                          <div className="mt-1">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${
                                tab.isActive ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                              title={tab.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                            />
                            <span className="ml-1 text-xs text-gray-500">
                              {tab.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                            </span>
                          </div>
                        </div>

                        {/* Logout button */}
                        {tab.hasSession && (
                          <button
                            onClick={() => handleLogoutTab(tab.tabId)}
                            className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title={tab.isCurrent ? 'Đăng xuất tab này' : 'Không thể đăng xuất tab khác'}
                            disabled={!tab.isCurrent}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {count > 1 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={handleLogoutAll}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Đăng xuất tất cả tabs
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Thao tác này sẽ đăng xuất tất cả các tabs đang hoạt động
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
