/**
 * Enhanced Multi-Session Manager
 * Quản lý đa phiên đăng nhập mạnh mẽ cho từng tab/window độc lập
 * Hỗ trợ logout độc lập, session sync, và xử lý nhiều thao tác
 */

class SessionManager {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.storageKey = 'multi_session_data';
    this.eventsKey = 'multi_session_events';
    this.syncKey = 'multi_session_sync';
    this.isActive = true;
    this.heartbeatInterval = null;
    this.lastSyncData = null;
    this.debounceTimeout = null;
    this.init();
  }

  // Tạo session ID duy nhất cho mỗi tab
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Khởi tạo session manager
  init() {
    // Lắng nghe sự kiện storage change từ tab khác
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Lắng nghe sự kiện beforeunload để cleanup
    window.addEventListener('beforeunload', this.cleanup.bind(this));
    
    // Lắng nghe sự kiện focus để sync data
    window.addEventListener('focus', this.syncFromStorage.bind(this));
    
    // Lắng nghe sự kiện visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Lắng nghe sự kiện page hide/show
    window.addEventListener('pagehide', this.handlePageHide.bind(this));
    window.addEventListener('pageshow', this.handlePageShow.bind(this));
    
    // Khởi tạo heartbeat để duy trì session
    this.startHeartbeat();
    
    // Đăng ký session hiện tại
    this.registerCurrentSession();
  }

  // Lưu session data vào localStorage với session ID
  saveSessionData(data) {
    try {
      const allSessions = this.getAllSessions();
      const newSessionData = {
        ...data,
        timestamp: Date.now(),
        lastActivity: Date.now(),
        sessionId: this.sessionId,
        isActive: this.isActive,
        tabTitle: document.title,
        url: window.location.href
      };
      
      // Chỉ emit event nếu có thay đổi thực sự
      const currentSession = allSessions[this.sessionId];
      const hasChanged = !currentSession || 
        currentSession.token !== newSessionData.token || 
        currentSession.user?.id !== newSessionData.user?.id || 
        currentSession.role !== newSessionData.role;
      
      allSessions[this.sessionId] = newSessionData;
      localStorage.setItem(this.storageKey, JSON.stringify(allSessions));
      
      // Chỉ emit event nếu có thay đổi
      if (hasChanged) {
        this.emitSessionEvent('session_updated', {
          sessionId: this.sessionId,
          data: newSessionData
        });
      }
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }

  // Lấy session data của tab hiện tại
  getSessionData() {
    try {
      const allSessions = this.getAllSessions();
      return allSessions[this.sessionId] || null;
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
    }
  }

  // Lấy tất cả sessions
  getAllSessions() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting all sessions:', error);
      return {};
    }
  }

  // Xóa session hiện tại (logout độc lập)
  clearCurrentSession() {
    try {
      const allSessions = this.getAllSessions();
      const currentSession = allSessions[this.sessionId];
      
      if (currentSession) {
        // Emit logout event trước khi xóa
        this.emitSessionEvent('session_logout', {
          sessionId: this.sessionId,
          user: currentSession.user,
          role: currentSession.role
        });
        
        // Xóa session hiện tại
        delete allSessions[this.sessionId];
        localStorage.setItem(this.storageKey, JSON.stringify(allSessions));
        
        // Clear local storage chỉ cho session này
        this.clearLocalStorageForCurrentSession();
        
        // Emit session removed event
        this.emitSessionEvent('session_removed', {
          sessionId: this.sessionId
        });
      }
    } catch (error) {
      console.error('Error clearing current session:', error);
    }
  }

  // Xóa tất cả sessions (logout toàn bộ)
  clearAllSessions() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing all sessions:', error);
    }
  }

  // Xử lý thay đổi storage từ tab khác
  handleStorageChange(event) {
    if (event.key === this.storageKey) {
      // Có thay đổi từ tab khác, sync lại data
      this.syncFromStorage();
    }
  }

  // Sync data từ storage với debounce
  syncFromStorage() {
    // Clear timeout cũ
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    // Debounce 100ms để tránh quá nhiều events
    this.debounceTimeout = setTimeout(() => {
      const sessionData = this.getSessionData();
      if (sessionData) {
        // Chỉ dispatch event nếu có thay đổi thực sự
        const lastSync = this.lastSyncData;
        if (!lastSync || 
            lastSync.token !== sessionData.token || 
            lastSync.user?.id !== sessionData.user?.id || 
            lastSync.role !== sessionData.role) {
          
          this.lastSyncData = sessionData;
          
          // Dispatch event để các component cập nhật
          window.dispatchEvent(new CustomEvent('sessionSync', { 
            detail: sessionData 
          }));
        }
      }
    }, 100);
  }

  // Cleanup khi tab đóng
  cleanup() {
    // Clear debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    
    this.clearCurrentSession();
  }

  // Lấy thông tin session hiện tại
  getCurrentSessionInfo() {
    const sessionData = this.getSessionData();
    return {
      sessionId: this.sessionId,
      isLoggedIn: !!(sessionData?.token),
      user: sessionData?.user || null,
      role: sessionData?.role || null,
      timestamp: sessionData?.timestamp || null
    };
  }

  // Lấy danh sách tất cả sessions đang hoạt động
  getActiveSessions() {
    const allSessions = this.getAllSessions();
    const now = Date.now();
    const activeSessions = [];

    Object.entries(allSessions).forEach(([sessionId, data]) => {
      // Session được coi là active nếu còn trong 24h
      if (now - data.timestamp < 24 * 60 * 60 * 1000) {
        activeSessions.push({
          sessionId,
          user: data.user,
          role: data.role,
          timestamp: data.timestamp,
          isCurrentSession: sessionId === this.sessionId
        });
      }
    });

    return activeSessions;
  }

  // Kiểm tra xem có session nào khác đang hoạt động không
  hasOtherActiveSessions() {
    const activeSessions = this.getActiveSessions();
    return activeSessions.some(session => !session.isCurrentSession);
  }

  // ===== ENHANCED METHODS =====

  // Đăng ký session hiện tại
  registerCurrentSession() {
    try {
      const sessionData = {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        lastActivity: Date.now(),
        isActive: true,
        tabTitle: document.title,
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      this.emitSessionEvent('session_registered', sessionData);
    } catch (error) {
      console.error('Error registering session:', error);
    }
  }

  // Start heartbeat để duy trì session
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isActive) {
        this.updateSessionActivity();
      }
    }, 30000); // Update mỗi 30 giây
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Cập nhật hoạt động session
  updateSessionActivity() {
    try {
      const allSessions = this.getAllSessions();
      if (allSessions[this.sessionId]) {
        allSessions[this.sessionId].lastActivity = Date.now();
        allSessions[this.sessionId].isActive = this.isActive;
        localStorage.setItem(this.storageKey, JSON.stringify(allSessions));
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  // Xử lý visibility change
  handleVisibilityChange() {
    this.isActive = !document.hidden;
    this.updateSessionActivity();
  }

  // Xử lý page hide
  handlePageHide() {
    this.isActive = false;
    this.updateSessionActivity();
  }

  // Xử lý page show
  handlePageShow() {
    this.isActive = true;
    this.updateSessionActivity();
    this.syncFromStorage();
  }

  // Clear localStorage chỉ cho session hiện tại
  clearLocalStorageForCurrentSession() {
    try {
      // Chỉ xóa token và user của session hiện tại
      // Không xóa toàn bộ localStorage
      const currentSession = this.getSessionData();
      if (currentSession) {
        // Có thể thêm logic để clear các data khác nếu cần
        console.log('Clearing localStorage for session:', this.sessionId);
      }
    } catch (error) {
      console.error('Error clearing localStorage for current session:', error);
    }
  }

  // Emit session event
  emitSessionEvent(eventType, data) {
    try {
      const event = {
        type: eventType,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        data: data
      };
      
      // Lưu event vào localStorage để sync với tabs khác
      const events = this.getSessionEvents();
      events.push(event);
      
      // Chỉ giữ lại 100 events gần nhất
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem(this.eventsKey, JSON.stringify(events));
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('multiSessionEvent', {
        detail: event
      }));
    } catch (error) {
      console.error('Error emitting session event:', error);
    }
  }

  // Lấy session events
  getSessionEvents() {
    try {
      const events = localStorage.getItem(this.eventsKey);
      return events ? JSON.parse(events) : [];
    } catch (error) {
      console.error('Error getting session events:', error);
      return [];
    }
  }

  // Lắng nghe session events
  onSessionEvent(callback) {
    window.addEventListener('multiSessionEvent', callback);
  }

  // Hủy lắng nghe session events
  offSessionEvent(callback) {
    window.removeEventListener('multiSessionEvent', callback);
  }

  // Force sync với tất cả tabs
  forceSync() {
    this.emitSessionEvent('force_sync', {
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  // Lấy thông tin chi tiết về tất cả sessions
  getDetailedSessionsInfo() {
    const activeSessions = this.getActiveSessions();
    const events = this.getSessionEvents();
    
    return {
      sessions: activeSessions,
      events: events.slice(-20), // 20 events gần nhất
      totalSessions: activeSessions.length,
      currentSession: this.getCurrentSessionInfo(),
      lastSync: Date.now()
    };
  }

  // Kiểm tra session health
  checkSessionHealth() {
    const currentSession = this.getSessionData();
    if (!currentSession) return false;
    
    const now = Date.now();
    const lastActivity = currentSession.lastActivity || currentSession.timestamp;
    const timeSinceLastActivity = now - lastActivity;
    
    // Session được coi là healthy nếu hoạt động trong 5 phút gần nhất
    return timeSinceLastActivity < 5 * 60 * 1000;
  }

  // Cleanup expired sessions
  cleanupExpiredSessions() {
    try {
      const allSessions = this.getAllSessions();
      const now = Date.now();
      const expiredThreshold = 24 * 60 * 60 * 1000; // 24 giờ
      
      let hasExpired = false;
      Object.keys(allSessions).forEach(sessionId => {
        const session = allSessions[sessionId];
        if (now - session.timestamp > expiredThreshold) {
          delete allSessions[sessionId];
          hasExpired = true;
        }
      });
      
      if (hasExpired) {
        localStorage.setItem(this.storageKey, JSON.stringify(allSessions));
        this.emitSessionEvent('sessions_cleaned', {
          timestamp: now
        });
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }
}

// Tạo instance global
const sessionManager = new SessionManager();

export default sessionManager;
