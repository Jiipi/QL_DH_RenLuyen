/**
 * Enhanced Tab Session Manager với SessionStorage + Unique Tab ID
 * OWASP Recommended Approach for Multi-Tab Session Management
 * 
 * Tính năng:
 * - Mỗi tab có unique ID riêng biệt
 * - Session data lưu trong sessionStorage (tự động tách biệt giữa các tabs)
 * - Hỗ trợ 4 roles: ADMIN, GIANG_VIEN, LOP_TRUONG, SINH_VIEN
 * - Logout độc lập từng tab không ảnh hưởng tabs khác
 * - Sync state với localStorage cho shared data (optional)
 * - Auto cleanup khi tab đóng
 */

class SessionStorageManager {
  constructor() {
    // Attempt to reuse existing tabId if present (persist across reloads)
    let existingTabId = null;
    try {
      existingTabId = sessionStorage.getItem('tab_id') || localStorage.getItem('tab_id_temp');
    } catch (_) {}

    if (existingTabId) {
      this.tabId = existingTabId;
    } else {
      this.tabId = this.generateTabId();
      try { sessionStorage.setItem('tab_id', this.tabId); } catch (_) {}
      try { localStorage.setItem('tab_id_temp', this.tabId); } catch (_) {}
    }

    // Storage keys - per tab
    this.SESSION_KEY_PREFIX = 'tab_session_data';
    this.SESSION_KEY = `${this.SESSION_KEY_PREFIX}_${this.tabId}`;
    this.TAB_REGISTRY_KEY = 'all_tabs_registry';
    this.SYNC_EVENT_KEY = 'tab_sync_event';

    // Session state
    this.isAuthenticated = false;
    this.sessionData = null;
    
    // Initialize
    this.init();
  }

  /**
   * Tạo unique tab ID theo chuẩn OWASP
   * Format: tab_[timestamp]_[random]_[counter]
   */
  generateTabId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const counter = performance.now().toString(36).substring(2);
    return `tab_${timestamp}_${random}_${counter}`;
  }

  /**
   * Khởi tạo session manager
   */
  init() {
    console.log('[SessionStorage] Initializing with Tab ID:', this.tabId);
    
    this.migrateLegacySessionIfNeeded();
    
    // Register tab
    this.registerTab();
    
    // Load session from sessionStorage
    this.loadSession();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Đăng ký tab vào registry (localStorage)
   */
  registerTab() {
    try {
      const registry = this.getTabRegistry();
      registry[this.tabId] = {
        createdAt: Date.now(),
        lastActivity: Date.now(),
        isActive: true,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      localStorage.setItem(this.TAB_REGISTRY_KEY, JSON.stringify(registry));
      console.log('[SessionStorage] Tab registered:', this.tabId);
    } catch (error) {
      console.error('[SessionStorage] Error registering tab:', error);
    }
  }

  /**
   * Lấy danh sách tất cả tabs từ registry
   */
  getTabRegistry() {
    try {
      const data = localStorage.getItem(this.TAB_REGISTRY_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('[SessionStorage] Error getting tab registry:', error);
      return {};
    }
  }

  /**
   * Load session từ sessionStorage
   */
  loadSession() {
    try {
      const data = sessionStorage.getItem(this.SESSION_KEY);
      if (data) {
        this.sessionData = JSON.parse(data);
        this.isAuthenticated = !!(this.sessionData?.token);
        console.log('[SessionStorage] Session loaded:', {
          tabId: this.tabId,
          isAuthenticated: this.isAuthenticated,
          role: this.sessionData?.role,
          user: this.sessionData?.user?.ho_ten
        });
      } else {
        console.log('[SessionStorage] No session found for tab:', this.tabId);
      }
    } catch (error) {
      console.error('[SessionStorage] Error loading session:', error);
      this.sessionData = null;
      this.isAuthenticated = false;
    }
  }

  /**
   * Lưu session vào sessionStorage
   */
  saveSession(data) {
    try {
      const sessionData = {
        tabId: this.tabId,
        token: data.token,
        user: data.user,
        role: data.role,
        timestamp: Date.now(),
        lastActivity: Date.now()
      };
      
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      this.sessionData = sessionData;
      this.isAuthenticated = true;
      
      // Update tab registry
      this.updateTabActivity({ 
        hasSession: true, 
        role: data.role,
        userId: data.user?.id,
        userName: data.user?.ho_ten 
      });
      
      console.log('[SessionStorage] Session saved:', {
        tabId: this.tabId,
        role: data.role,
        user: data.user?.ho_ten
      });
      
      // Emit sync event
      this.emitSyncEvent('session_saved', sessionData);
      
      return true;
    } catch (error) {
      console.error('[SessionStorage] Error saving session:', error);
      return false;
    }
  }

  /**
   * Lấy session hiện tại
   */
  getSession() {
    if (!this.sessionData) {
      this.loadSession();
    }
    return this.sessionData;
  }

  /**
   * Kiểm tra xem có session không
   */
  hasSession() {
    return this.isAuthenticated && !!this.sessionData?.token;
  }

  /**
   * Lấy token
   */
  getToken() {
    const session = this.getSession();
    return session?.token || null;
  }

  /**
   * Lấy user
   */
  getUser() {
    const session = this.getSession();
    return session?.user || null;
  }

  /**
   * Lấy role
   */
  getRole() {
    const session = this.getSession();
    return session?.role || null;
  }

  /**
   * Lấy tabId
   */
  getTabId() {
    return this.tabId;
  }

  /**
   * Clear session của tab hiện tại (logout độc lập)
   * CHỈ clear sessionStorage, KHÔNG touch localStorage để các tabs khác không bị ảnh hưởng
   */
  clearSession() {
    try {
      // Clear sessionStorage (tab-specific only)
      sessionStorage.removeItem(this.SESSION_KEY);
      
      // Update state
      this.sessionData = null;
      this.isAuthenticated = false;
      
      // Update tab registry (mark as logged out but keep tab in registry)
      this.updateTabActivity({ hasSession: false, role: null, userId: null, userName: null });
      
      console.log('[SessionStorage] Session cleared for tab:', this.tabId, '(other tabs not affected)');
      
      // Emit sync event
      this.emitSyncEvent('session_cleared', { tabId: this.tabId });
      // Không xóa localStorage ở đây để các tab khác vẫn có thể rehydrate nếu cần
      
      return true;
    } catch (error) {
      console.error('[SessionStorage] Error clearing session:', error);
      return false;
    }
  }

  /**
   * Clear tất cả sessions (logout toàn bộ - ảnh hưởng tất cả tabs)
   */
  clearAllSessions() {
    try {
      // Clear TẤT CẢ session keys của mọi tabs (có prefix tab_session_data_)
      const allKeys = Object.keys(sessionStorage);
      const sessionKeys = allKeys.filter(key => key.startsWith(this.SESSION_KEY_PREFIX + '_'));
      
      sessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      // Clear session của tab hiện tại
      this.sessionData = null;
      this.isAuthenticated = false;
      
      // Emit event để các tabs khác cũng logout
      this.emitSyncEvent('logout_all', { initiatorTabId: this.tabId });
      
      // Clear localStorage shared data nếu cần (từ version cũ)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      console.log('[SessionStorage] All sessions cleared:', sessionKeys.length, 'tabs');
      return true;
    } catch (error) {
      console.error('[SessionStorage] Error clearing all sessions:', error);
      return false;
    }
  }

  /**
   * Cập nhật activity của tab
   */
  updateTabActivity(additionalData = {}) {
    try {
      const registry = this.getTabRegistry();
      if (registry[this.tabId]) {
        registry[this.tabId] = {
          ...registry[this.tabId],
          lastActivity: Date.now(),
          isActive: !document.hidden,
          url: window.location.href,
          ...additionalData
        };
        localStorage.setItem(this.TAB_REGISTRY_KEY, JSON.stringify(registry));
      }
    } catch (error) {
      console.error('[SessionStorage] Error updating tab activity:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen to storage events (từ tabs khác)
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Listen to beforeunload (tab đóng)
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    // Listen to visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Listen to focus
    window.addEventListener('focus', this.handleFocus.bind(this));
  }

  /**
   * Handle storage event từ tabs khác
   */
  handleStorageEvent(event) {
    if (event.key === this.SYNC_EVENT_KEY) {
      try {
        const data = JSON.parse(event.newValue);
        
        // Ignore events từ chính tab này
        if (data.tabId === this.tabId) return;
        
        console.log('[SessionStorage] Storage event received:', data.type);
        
        switch (data.type) {
          case 'logout_all':
            // Logout tất cả tabs
            this.clearSession();
            window.dispatchEvent(new CustomEvent('tab_logout_all', { detail: data }));
            break;
            
          case 'session_saved':
          case 'session_cleared':
            // Dispatch custom event để React components có thể listen
            window.dispatchEvent(new CustomEvent('tab_session_sync', { detail: data }));
            break;
            
          default:
            console.log('[SessionStorage] Unknown sync event type:', data.type);
        }
      } catch (error) {
        console.error('[SessionStorage] Error handling storage event:', error);
      }
    }
  }

  /**
   * Handle beforeunload (cleanup khi đóng tab)
   */
  handleBeforeUnload() {
    try {
      // Unregister tab
      const registry = this.getTabRegistry();
      delete registry[this.tabId];
      localStorage.setItem(this.TAB_REGISTRY_KEY, JSON.stringify(registry));
      
      console.log('[SessionStorage] Tab unregistered:', this.tabId);
    } catch (error) {
      console.error('[SessionStorage] Error in beforeunload:', error);
    }
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    this.updateTabActivity({ isActive: !document.hidden });
  }

  /**
   * Handle focus
   */
  handleFocus() {
    this.updateTabActivity({ isActive: true });
  }

  /**
   * Emit sync event cho các tabs khác
   */
  emitSyncEvent(type, data) {
    try {
      const event = {
        type,
        tabId: this.tabId,
        timestamp: Date.now(),
        ...data
      };
      
      // Lưu vào localStorage để trigger storage event ở tabs khác
      localStorage.setItem(this.SYNC_EVENT_KEY, JSON.stringify(event));
      
      // Remove ngay sau đó để có thể trigger event lần sau
      setTimeout(() => {
        try {
          localStorage.removeItem(this.SYNC_EVENT_KEY);
        } catch (e) {
          // Ignore
        }
      }, 100);
    } catch (error) {
      console.error('[SessionStorage] Error emitting sync event:', error);
    }
  }

  /**
   * Start heartbeat để maintain tab activity
   */
  startHeartbeat() {
    // Update activity mỗi 30 giây
    this.heartbeatInterval = setInterval(() => {
      if (!document.hidden && this.hasSession()) {
        this.updateTabActivity();
      }
    }, 30000);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Lấy danh sách tất cả tabs đang active
   */
  getActiveTabs() {
    try {
      const registry = this.getTabRegistry();
      const now = Date.now();
      const tabs = [];
      
      Object.entries(registry).forEach(([tabId, data]) => {
        // Tab được coi là active nếu có activity trong 5 phút gần nhất
        const timeSinceActivity = now - data.lastActivity;
        if (timeSinceActivity < 5 * 60 * 1000) {
          tabs.push({
            tabId,
            ...data,
            isCurrent: tabId === this.tabId,
            timeSinceActivity
          });
        }
      });
      
      // Sort theo lastActivity
      tabs.sort((a, b) => b.lastActivity - a.lastActivity);
      
      return tabs;
    } catch (error) {
      console.error('[SessionStorage] Error getting active tabs:', error);
      return [];
    }
  }

  /**
   * Cleanup expired tabs từ registry
   */
  cleanupExpiredTabs() {
    try {
      const registry = this.getTabRegistry();
      const now = Date.now();
      const expirationTime = 24 * 60 * 60 * 1000; // 24 giờ
      
      let cleaned = false;
      Object.keys(registry).forEach(tabId => {
        const tab = registry[tabId];
        if (now - tab.lastActivity > expirationTime) {
          delete registry[tabId];
          cleaned = true;
        }
      });
      
      if (cleaned) {
        localStorage.setItem(this.TAB_REGISTRY_KEY, JSON.stringify(registry));
        console.log('[SessionStorage] Expired tabs cleaned');
      }
    } catch (error) {
      console.error('[SessionStorage] Error cleaning expired tabs:', error);
    }
  }

  /**
   * Lấy thông tin chi tiết về tab hiện tại
   */
  getCurrentTabInfo() {
    return {
      tabId: this.tabId,
      isAuthenticated: this.isAuthenticated,
      session: this.sessionData,
      hasSession: this.hasSession(),
      role: this.getRole(),
      user: this.getUser(),
      token: this.getToken()
    };
  }

  /**
   * Destroy manager (cleanup)
   */
  destroy() {
    this.stopHeartbeat();
    this.handleBeforeUnload();
  }

  /**
   * Di chuyển dữ liệu phiên bản cũ (nếu có) sang key mới
   * Chỉ áp dụng cho phiên bản trước đó không có tabId trong key
   */
  migrateLegacySessionIfNeeded() {
    try {
      // Legacy key (cũ) không có suffix tabId
      const legacyKey = 'tab_session_data';
      const legacy = sessionStorage.getItem(legacyKey);
      if (legacy && !sessionStorage.getItem(this.SESSION_KEY)) {
        console.log('[SessionStorage] Migrating legacy key ->', this.SESSION_KEY);
        sessionStorage.setItem(this.SESSION_KEY, legacy);
        sessionStorage.removeItem(legacyKey);
      }
    } catch (e) {
      console.warn('[SessionStorage] migrateLegacySessionIfNeeded failed', e);
    }
  }
}

// Tạo singleton instance
const sessionStorageManager = new SessionStorageManager();

// Export
export default sessionStorageManager;

// Export class để có thể test hoặc tạo instances mới nếu cần
export { SessionStorageManager };
