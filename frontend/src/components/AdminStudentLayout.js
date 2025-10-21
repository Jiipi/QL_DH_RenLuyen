import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminStudentSidebar from './AdminStudentSidebar';
import ModernHeader from './ModernHeader';
import ModernFooter from './ModernFooter';
import MobileSidebarWrapper from './MobileSidebarWrapper';

export default function AdminStudentLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('admin-sidebar-collapsed');
    return stored === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      const stored = localStorage.getItem('admin-sidebar-collapsed');
      setSidebarCollapsed(stored === 'true');
    };
    const handleCustom = () => {
      const stored = localStorage.getItem('admin-sidebar-collapsed');
      setSidebarCollapsed(stored === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('admin-sidebar-toggle', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('admin-sidebar-toggle', handleCustom);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex bg-gray-50 dark:bg-slate-950">
      {!isMobile && <AdminStudentSidebar />}
      {isMobile && (
        <MobileSidebarWrapper isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)}>
          <AdminStudentSidebar />
        </MobileSidebarWrapper>
      )}
      <div 
        className="flex-1 min-w-0 h-screen flex flex-col transition-all duration-300 ease-in-out"
        style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? '80px' : '288px') }}
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
    </div>
  );
}


