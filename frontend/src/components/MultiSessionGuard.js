import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiSession } from '../hooks/useMultiSession';
import { AlertCircle, Shield, User, Monitor, Users } from 'lucide-react';

/**
 * Component bảo vệ multi-session
 * Ngăn chặn xung đột giữa các session khác nhau
 */
export default function MultiSessionGuard({ children, requiredRole }) {
  const { isLoggedIn, currentRole, getActiveSessions, hasOtherActiveSessions } = useMultiSession();
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Kiểm tra xung đột role khi component mount
    checkRoleConflict();
  }, [currentRole, requiredRole]);

  const checkRoleConflict = () => {
    if (!isLoggedIn || !requiredRole) return;

    const activeSessions = getActiveSessions();
    const otherSessions = activeSessions.filter(session => !session.isCurrentSession);
    
    // Kiểm tra xung đột role
    const hasRoleConflict = otherSessions.some(session => 
      session.role !== currentRole && 
      session.role !== 'SINH_VIEN' // Sinh viên có thể đăng nhập cùng lúc với role khác
    );

    if (hasRoleConflict) {
      setConflictInfo({
        currentRole,
        conflictingSessions: otherSessions.filter(session => 
          session.role !== currentRole && session.role !== 'SINH_VIEN'
        )
      });
      setShowConflictModal(true);
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return <Shield className="h-5 w-5 text-red-500" />;
      case 'GIANG_VIEN': return <User className="h-5 w-5 text-blue-500" />;
      case 'LOP_TRUONG': return <Monitor className="h-5 w-5 text-green-500" />;
      case 'SINH_VIEN': return <Users className="h-5 w-5 text-purple-500" />;
      default: return <User className="h-5 w-5 text-gray-500" />;
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

  const handleContinueAnyway = () => {
    setShowConflictModal(false);
    setConflictInfo(null);
  };

  const handleLogoutOthers = () => {
    // Có thể implement logic logout sessions khác nếu cần
    setShowConflictModal(false);
    setConflictInfo(null);
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  if (!isLoggedIn) {
    return children;
  }

  return (
    <>
      {children}
      
      {/* Conflict Modal */}
      {showConflictModal && conflictInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Xung đột phiên đăng nhập
                </h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Bạn đang đăng nhập với vai trò <strong>{getRoleName(conflictInfo.currentRole)}</strong> 
                  nhưng có phiên đăng nhập khác với vai trò khác đang hoạt động:
                </p>
                
                <div className="space-y-2">
                  {conflictInfo.conflictingSessions.map((session, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      {getRoleIcon(session.role)}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getRoleName(session.role)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.user?.ho_ten || session.user?.name || 'Không tên'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleContinueAnyway}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tiếp tục
                </button>
                <button
                  onClick={handleGoToLogin}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Đăng nhập lại
                </button>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                💡 Mỗi tab có thể đăng nhập với tài khoản khác nhau, nhưng nên tránh xung đột vai trò
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
