import React, { useState, useEffect } from 'react';
import { useMultiSession } from '../hooks/useMultiSession';
import { 
  Users, 
  Monitor, 
  User, 
  Shield, 
  Clock, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

/**
 * Component hiển thị thông tin chi tiết về multi-session
 * Cho phép quản lý và monitor tất cả sessions
 */
export default function SessionMonitor() {
  const { 
    getDetailedSessionsInfo, 
    forceSync, 
    checkSessionHealth,
    cleanupExpiredSessions,
    onSessionEvent,
    offSessionEvent
  } = useMultiSession();
  
  const [sessionsInfo, setSessionsInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const updateSessionsInfo = () => {
      const info = getDetailedSessionsInfo();
      setSessionsInfo(info);
    };

    // Lắng nghe session events
    const handleSessionEvent = (event) => {
      updateSessionsInfo();
    };

    onSessionEvent(handleSessionEvent);
    updateSessionsInfo();

    // Auto refresh mỗi 10 giây
    let interval;
    if (autoRefresh) {
      interval = setInterval(updateSessionsInfo, 10000);
    }

    return () => {
      offSessionEvent(handleSessionEvent);
      if (interval) clearInterval(interval);
    };
  }, [getDetailedSessionsInfo, onSessionEvent, offSessionEvent, autoRefresh]);

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

  const getStatusIcon = (session) => {
    const isHealthy = checkSessionHealth();
    const now = Date.now();
    const lastActivity = session.lastActivity || session.timestamp;
    const timeSinceLastActivity = now - lastActivity;
    
    if (session.isCurrentSession) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (timeSinceLastActivity < 5 * 60 * 1000) { // 5 phút
      return <Activity className="h-4 w-4 text-blue-500" />;
    } else if (timeSinceLastActivity < 30 * 60 * 1000) { // 30 phút
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ngày trước`;
    } else if (hours > 0) {
      return `${hours}h trước`;
    } else if (minutes > 0) {
      return `${minutes}m trước`;
    } else {
      return 'Vừa xong';
    }
  };

  const handleForceSync = () => {
    forceSync();
  };

  const handleCleanup = () => {
    cleanupExpiredSessions();
    const info = getDetailedSessionsInfo();
    setSessionsInfo(info);
  };

  if (!sessionsInfo || sessionsInfo.totalSessions <= 1) {
    return null;
  }

  return (
    <div className="relative">
      {/* Monitor Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        title="Quản lý phiên đăng nhập"
      >
        <Monitor className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-medium text-purple-700">
          {sessionsInfo.totalSessions} phiên
        </span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </button>

      {/* Expanded Monitor Panel */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Quản lý phiên đăng nhập
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleForceSync}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Đồng bộ"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCleanup}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Dọn dẹp phiên hết hạn"
                >
                  <XCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Sessions List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sessionsInfo.sessions.map((session, index) => (
                <div
                  key={session.sessionId}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    session.isCurrentSession 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(session)}
                    {getRoleIcon(session.role)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {session.user?.ho_ten || session.user?.name || 'Không tên'}
                      </div>
                      {session.isCurrentSession && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Tab này
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{getRoleName(session.role)}</span>
                      <span>•</span>
                      <span>{formatTime(session.lastActivity || session.timestamp)}</span>
                      {session.tabTitle && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-32" title={session.tabTitle}>
                            {session.tabTitle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Events Log */}
            {sessionsInfo.events && sessionsInfo.events.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Hoạt động gần đây
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {sessionsInfo.events.slice(-5).map((event, index) => (
                    <div key={index} className="text-xs text-gray-500 flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{event.type}</span>
                      <span>•</span>
                      <span>{formatTime(event.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  Tự động cập nhật
                </label>
                <div className="text-xs text-gray-500">
                  Cập nhật: {formatTime(sessionsInfo.lastSync)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
