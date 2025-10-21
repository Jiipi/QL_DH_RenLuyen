import React, { useState, useEffect } from 'react';
import { useMultiSession } from '../hooks/useMultiSession';
import { Users, Monitor, User, Shield, AlertCircle } from 'lucide-react';

/**
 * Component hiển thị thông tin multi-session
 * Cho phép user biết có bao nhiêu session đang hoạt động
 */
export default function MultiSessionIndicator() {
  const { getActiveSessions, hasOtherActiveSessions, currentRole } = useMultiSession();
  const [activeSessions, setActiveSessions] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateSessions = () => {
      const sessions = getActiveSessions();
      setActiveSessions(sessions);
    };

    updateSessions();
    
    // Cập nhật mỗi 5 giây
    const interval = setInterval(updateSessions, 5000);
    return () => clearInterval(interval);
  }, [getActiveSessions]);

  const getRoleIcon = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return <Shield className="h-4 w-4 text-red-500" />;
      case 'GIANG_VIEN': return <User className="h-4 w-4 text-blue-500" />;
      case 'LOP_TRUONG': return <Monitor className="h-4 w-4 text-green-500" />;
      case 'SINH_VIEN': return <Users className="h-4 w-4 text-purple-500" />;
      default: return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleName = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'Quản trị viên';
      case 'GIANG_VIEN': return 'Giảng viên';
      case 'LOP_TRUONG': return 'Lớp trưởng';
      case 'SINH_VIEN': return 'Sinh viên';
      default: return 'Không xác định';
    }
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h trước`;
    } else if (minutes > 0) {
      return `${minutes}m trước`;
    } else {
      return 'Vừa xong';
    }
  };

  if (activeSessions.length <= 1) {
    return null; // Không hiển thị nếu chỉ có 1 session
  }

  return (
    <div className="relative">
      {/* Indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        title="Xem thông tin phiên đăng nhập"
      >
        <Users className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-700">
          {activeSessions.length} phiên
        </span>
        {hasOtherActiveSessions() && (
          <AlertCircle className="h-3 w-3 text-orange-500" />
        )}
      </button>

      {/* Details dropdown */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Phiên đăng nhập đang hoạt động
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    session.isCurrentSession 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getRoleIcon(session.role)}
                    <div className="text-xs text-gray-600">
                      {getRoleName(session.role)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {session.user?.ho_ten || session.user?.name || 'Không tên'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(session.timestamp)}
                    </div>
                  </div>
                  
                  {session.isCurrentSession && (
                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Tab này
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                💡 Mỗi tab có thể đăng nhập với tài khoản khác nhau
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
