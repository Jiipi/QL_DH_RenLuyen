import React, { useState, useEffect } from 'react';
import MonitorSidebar from './MonitorSidebar';
import ModernHeader from './ModernHeader';
import ModernFooter from './ModernFooter';
import MobileSidebarWrapper from './MobileSidebarWrapper';
import MobileMenuButton from './MobileMenuButton';
import { Outlet } from 'react-router-dom';

export default function MonitorLayout({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('monitor-sidebar-collapsed');
    return stored === 'true';
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('monitor-sidebar-collapsed');
      setSidebarCollapsed(stored === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    const handleCustom = () => {
      const stored = localStorage.getItem('monitor-sidebar-collapsed');
      setSidebarCollapsed(stored === 'true');
    };
    window.addEventListener('monitor-sidebar-toggle', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('monitor-sidebar-toggle', handleCustom);
    };
  }, []);

  return React.createElement(
    'div',
    { className: 'fixed inset-0 flex bg-gray-50 dark:bg-slate-950' },
    [
      // Desktop Sidebar - only show on desktop
      !isMobile && React.createElement('div', { key: 'desktop-sidebar' }, 
        React.createElement(MonitorSidebar)
      ),
      
      // Mobile Sidebar - only show on mobile
      isMobile && React.createElement(MobileSidebarWrapper, { 
        key: 'mobile-sidebar',
        isOpen: mobileSidebarOpen, 
        onClose: () => setMobileSidebarOpen(false)
      }, React.createElement(MonitorSidebar)),

      // Main Content
      React.createElement('div', { 
        key: 'content', 
        className: 'flex-1 min-w-0 h-screen flex flex-col transition-all duration-300 ease-in-out', 
        style: { marginLeft: isMobile ? 0 : (sidebarCollapsed ? '80px' : '288px') } 
      }, [
        React.createElement(ModernHeader, { 
          key: 'hdr',
          isMobile: isMobile,
          onMenuClick: () => setMobileSidebarOpen(true)
        }),
        React.createElement('main', { key: 'main', className: 'flex-1 overflow-y-auto' }, [
          React.createElement('div', { key: 'content-div', className: 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8' }, 
            children || React.createElement(Outlet)
          ),
          React.createElement(ModernFooter, { key: 'footer' })
        ])
      ])

      // Mobile Menu Button - ẨN, dùng nút trong header
      // isMobile && React.createElement(MobileMenuButton, { 
      //   key: 'mobile-btn',
      //   onClick: () => setMobileSidebarOpen(true) 
      // })
    ]
  );
}