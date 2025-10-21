import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import ModernHeader from './ModernHeader';
import ModernFooter from './ModernFooter';
import MobileSidebarWrapper from './MobileSidebarWrapper';
import MobileMenuButton from './MobileMenuButton';

export default function StudentLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('student-sidebar-collapsed');
    console.log('[StudentLayout] Initial state:', stored === 'true');
    return stored === 'true';
  });

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false); // Close mobile sidebar when resizing to desktop
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('student-sidebar-collapsed');
      console.log('[StudentLayout] Storage change:', stored === 'true');
      setSidebarCollapsed(stored === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // Listen to custom events from sidebar toggle for same-tab updates
    const handleCustom = () => {
      const stored = localStorage.getItem('student-sidebar-collapsed');
      console.log('[StudentLayout] Custom event received:', stored === 'true');
      setSidebarCollapsed(stored === 'true');
    };
    window.addEventListener('student-sidebar-toggle', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('student-sidebar-toggle', handleCustom);
    };
  }, []);

  console.log('[StudentLayout] Render with collapsed:', sidebarCollapsed);

  return (
    <div className="fixed inset-0 flex bg-gray-50 dark:bg-slate-950">
      {/* Desktop Sidebar - only render on desktop */}
      {!isMobile && <StudentSidebar />}

      {/* Mobile Sidebar with overlay - only render on mobile */}
      {isMobile && (
        <MobileSidebarWrapper 
          isOpen={mobileSidebarOpen} 
          onClose={() => setMobileSidebarOpen(false)}
        >
          <StudentSidebar />
        </MobileSidebarWrapper>
      )}

      {/* Main Content */}
      <div 
        className="flex-1 min-w-0 h-screen flex flex-col transition-all duration-300 ease-in-out"
        style={{ 
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? '80px' : '288px')
        }}
      >
        <ModernHeader 
          isMobile={isMobile}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <Outlet />
          </div>
          <ModernFooter />
        </main>
      </div>

      {/* Mobile Menu Button - FAB ẨN, dùng nút trong header */}
      {/* {isMobile && (
        <MobileMenuButton onClick={() => setMobileSidebarOpen(true)} />
      )} */}
    </div>
  );
}
