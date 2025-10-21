/**
 * Tab Session Context
 * Quản lý multi-tab session state cho React application
 * Hỗ trợ 4 roles: ADMIN, GIANG_VIEN, LOP_TRUONG, SINH_VIEN
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import sessionStorageManager from '../services/sessionStorageManager';
import { useAppStore } from '../store/useAppStore';

// Create context
const TabSessionContext = createContext(null);

/**
 * Tab Session Provider
 */
export function TabSessionProvider({ children }) {
  const [tabId] = useState(() => sessionStorageManager.getTabId());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [activeTabs, setActiveTabs] = useState([]);
  
  const setAuth = useAppStore((state) => state.setAuth);
  const clearAuth = useAppStore((state) => state.clearAuth);

  /**
   * Load session từ sessionStorage
   */
  const loadSession = useCallback(() => {
    const session = sessionStorageManager.getSession();
    if (session) {
      setSessionData(session);
      setIsAuthenticated(true);
      
      // Sync với Zustand store
      setAuth({
        token: session.token,
        user: session.user,
        role: session.role
      });
      
      console.log('[TabSession] Session loaded:', {
        tabId,
        role: session.role,
        user: session.user?.ho_ten
      });
    } else {
      setSessionData(null);
      setIsAuthenticated(false);
      clearAuth();
    }
  }, [tabId, setAuth, clearAuth]);

  /**
   * Save session
   */
  const saveSession = useCallback((data) => {
    const success = sessionStorageManager.saveSession(data);
    if (success) {
      loadSession();
    }
    return success;
  }, [loadSession]);

  /**
   * Clear session của tab hiện tại
   */
  const logout = useCallback(() => {
    sessionStorageManager.clearSession();
    setSessionData(null);
    setIsAuthenticated(false);
    clearAuth();
    console.log('[TabSession] Logged out from tab:', tabId);
  }, [tabId, clearAuth]);

  /**
   * Clear tất cả sessions (logout toàn bộ)
   */
  const logoutAll = useCallback(() => {
    sessionStorageManager.clearAllSessions();
    setSessionData(null);
    setIsAuthenticated(false);
    clearAuth();
    console.log('[TabSession] Logged out from all tabs');
  }, [clearAuth]);

  /**
   * Refresh danh sách active tabs
   */
  const refreshActiveTabs = useCallback(() => {
    const tabs = sessionStorageManager.getActiveTabs();
    setActiveTabs(tabs);
  }, []);

  /**
   * Get tab info
   */
  const getTabInfo = useCallback(() => {
    return sessionStorageManager.getCurrentTabInfo();
  }, []);

  /**
   * Initialize - load session khi mount
   */
  useEffect(() => {
    loadSession();
    refreshActiveTabs();
    
    // Cleanup expired tabs
    sessionStorageManager.cleanupExpiredTabs();
  }, [loadSession, refreshActiveTabs]);

  /**
   * Listen to tab session sync events
   */
  useEffect(() => {
    const handleTabSessionSync = (event) => {
      console.log('[TabSession] Sync event received:', event.detail);
      refreshActiveTabs();
    };

    const handleTabLogoutAll = (event) => {
      console.log('[TabSession] Logout all event received');
      logout();
    };

    window.addEventListener('tab_session_sync', handleTabSessionSync);
    window.addEventListener('tab_logout_all', handleTabLogoutAll);

    return () => {
      window.removeEventListener('tab_session_sync', handleTabSessionSync);
      window.removeEventListener('tab_logout_all', handleTabLogoutAll);
    };
  }, [logout, refreshActiveTabs]);

  /**
   * Refresh active tabs periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      refreshActiveTabs();
    }, 60000); // Mỗi 1 phút

    return () => clearInterval(interval);
  }, [refreshActiveTabs]);

  // Context value
  const value = {
    tabId,
    isAuthenticated,
    sessionData,
    activeTabs,
    saveSession,
    logout,
    logoutAll,
    loadSession,
    refreshActiveTabs,
    getTabInfo
  };

  return (
    <TabSessionContext.Provider value={value}>
      {children}
    </TabSessionContext.Provider>
  );
}

/**
 * Hook để sử dụng TabSessionContext
 */
export function useTabSession() {
  const context = useContext(TabSessionContext);
  if (!context) {
    throw new Error('useTabSession must be used within TabSessionProvider');
  }
  return context;
}

/**
 * Hook để lấy thông tin tab hiện tại
 */
export function useCurrentTab() {
  const { tabId, sessionData, isAuthenticated } = useTabSession();
  return {
    tabId,
    session: sessionData,
    isAuthenticated,
    role: sessionData?.role,
    user: sessionData?.user,
    token: sessionData?.token
  };
}

/**
 * Hook để lấy danh sách active tabs
 */
export function useActiveTabs() {
  const { activeTabs, refreshActiveTabs } = useTabSession();
  return {
    tabs: activeTabs,
    refresh: refreshActiveTabs,
    count: activeTabs.length
  };
}

export default TabSessionContext;
