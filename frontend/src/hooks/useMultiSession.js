import { useState, useEffect, useCallback } from 'react';
import sessionManager from '../services/sessionManager';
import { useAppStore } from '../store/useAppStore';

/**
 * Hook quản lý multi-session
 * Cho phép mỗi tab hoạt động độc lập với session riêng
 */
export const useMultiSession = () => {
  const { setAuth, clearAuth, user, token, role } = useAppStore();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Khởi tạo session từ localStorage
  const initializeSession = useCallback(() => {
    try {
      const sessionData = sessionManager.getSessionData();
      if (sessionData) {
        setAuth({
          token: sessionData.token,
          user: sessionData.user,
          role: sessionData.role
        });
        setSessionInfo(sessionData);
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing session:', error);
      setIsInitialized(true);
    }
  }, [setAuth]);

  // Lưu session data
  const saveSession = useCallback((authData) => {
    try {
      const sessionData = {
        token: authData.token,
        user: authData.user,
        role: authData.role,
        timestamp: Date.now()
      };
      
      sessionManager.saveSessionData(sessionData);
      setSessionInfo(sessionData);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, []);

  // Xóa session hiện tại
  const clearSession = useCallback(() => {
    try {
      sessionManager.clearCurrentSession();
      clearAuth();
      setSessionInfo(null);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }, [clearAuth]);

  // Xóa tất cả sessions
  const clearAllSessions = useCallback(() => {
    try {
      sessionManager.clearAllSessions();
      clearAuth();
      setSessionInfo(null);
    } catch (error) {
      console.error('Error clearing all sessions:', error);
    }
  }, [clearAuth]);

  // Lấy thông tin session hiện tại
  const getCurrentSessionInfo = useCallback(() => {
    return sessionManager.getCurrentSessionInfo();
  }, []);

  // Lấy danh sách sessions đang hoạt động
  const getActiveSessions = useCallback(() => {
    return sessionManager.getActiveSessions();
  }, []);

  // Kiểm tra có session khác đang hoạt động
  const hasOtherActiveSessions = useCallback(() => {
    return sessionManager.hasOtherActiveSessions();
  }, []);

  // Lắng nghe sự kiện sync từ tab khác
  useEffect(() => {
    const handleSessionSync = (event) => {
      const sessionData = event.detail;
      if (sessionData && sessionData.sessionId !== sessionManager.sessionId) {
        // Chỉ sync nếu là session khác và có data hợp lệ
        setAuth({
          token: sessionData.token,
          user: sessionData.user,
          role: sessionData.role
        });
        setSessionInfo(sessionData);
      }
    };

    // Lắng nghe multi-session events
    const handleMultiSessionEvent = (event) => {
      const { type, sessionId, data } = event.detail;
      
      // Chỉ xử lý events từ session khác
      if (sessionId === sessionManager.sessionId) {
        return;
      }
      
      switch (type) {
        case 'session_logout':
          console.log('Another session logged out:', data);
          break;
          
        case 'session_removed':
          console.log('Another session was removed:', sessionId);
          break;
          
        case 'session_updated':
          // Không tự động sync auth data từ session khác
          console.log('Another session updated:', data);
          break;
          
        case 'force_sync':
          // Force sync khi có yêu cầu
          sessionManager.syncFromStorage();
          break;
          
        default:
          break;
      }
    };

    window.addEventListener('sessionSync', handleSessionSync);
    window.addEventListener('multiSessionEvent', handleMultiSessionEvent);
    
    return () => {
      window.removeEventListener('sessionSync', handleSessionSync);
      window.removeEventListener('multiSessionEvent', handleMultiSessionEvent);
    };
  }, [setAuth]);

  // Khởi tạo session khi component mount
  useEffect(() => {
    if (!isInitialized) {
      initializeSession();
    }
  }, [isInitialized, initializeSession]);

  // Auto-save khi auth state thay đổi (chỉ khi cần thiết)
  useEffect(() => {
    if (isInitialized && token && user && role) {
      // Chỉ save khi có thay đổi thực sự
      const currentSession = sessionManager.getSessionData();
      if (!currentSession || 
          currentSession.token !== token || 
          currentSession.user?.id !== user?.id || 
          currentSession.role !== role) {
        saveSession({ token, user, role });
      }
    }
  }, [isInitialized, token, user, role, saveSession]);

  // Force sync với tất cả tabs
  const forceSync = useCallback(() => {
    sessionManager.forceSync();
  }, []);

  // Lấy thông tin chi tiết về sessions
  const getDetailedSessionsInfo = useCallback(() => {
    return sessionManager.getDetailedSessionsInfo();
  }, []);

  // Kiểm tra session health
  const checkSessionHealth = useCallback(() => {
    return sessionManager.checkSessionHealth();
  }, []);

  // Cleanup expired sessions
  const cleanupExpiredSessions = useCallback(() => {
    sessionManager.cleanupExpiredSessions();
  }, []);

  // Lắng nghe session events
  const onSessionEvent = useCallback((callback) => {
    sessionManager.onSessionEvent(callback);
  }, []);

  // Hủy lắng nghe session events
  const offSessionEvent = useCallback((callback) => {
    sessionManager.offSessionEvent(callback);
  }, []);

  return {
    // Session state
    sessionInfo,
    isInitialized,
    isLoggedIn: !!(token && user),
    
    // Session actions
    saveSession,
    clearSession,
    clearAllSessions,
    
    // Session info
    getCurrentSessionInfo,
    getActiveSessions,
    hasOtherActiveSessions,
    
    // Enhanced session methods
    forceSync,
    getDetailedSessionsInfo,
    checkSessionHealth,
    cleanupExpiredSessions,
    onSessionEvent,
    offSessionEvent,
    
    // Current session data
    currentUser: user,
    currentToken: token,
    currentRole: role
  };
};
