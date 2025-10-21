import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import http from '../services/http';
import '../styles/teacher-sidebar.css';
import {
  Users,
  Activity,
  CheckCircle,
  BarChart3,
  Bell,
  Home,
  ChevronDown,
  Menu,
  ChevronsLeft,
  User,
  QrCode
} from 'lucide-react';

function MenuItem({ to, icon, label, badge, active, onClick, collapsed, inDropdown }) {
  const content = (
    <Link
      to={to}
      className={`
        flex items-center gap-3 rounded-lg transition-all duration-200 relative group
        ${collapsed && !inDropdown ? 'justify-center p-3' : 'px-4 py-2.5'}
        ${inDropdown ? 'mx-2' : ''}
        ${active
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
        }
      `}
      onClick={onClick}
      title={collapsed && !inDropdown ? label : ''}
    >
      <div className={`flex items-center justify-center w-4 h-4 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
        {icon || <span className="w-2 h-2 rounded-full bg-current" />}
      </div>
      {(!collapsed || inDropdown) && (
        <>
          <span className="font-medium flex-1 text-sm">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
              {badge}
            </span>
          )}
        </>
      )}
      {active && !collapsed && !inDropdown && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
      )}
      {collapsed && badge && !inDropdown && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {badge}
        </div>
      )}
    </Link>
  );

  if (collapsed && !inDropdown) {
    return (
      <div className="relative group">
        {content}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
        </div>
      </div>
    );
  }

  return content;
}

function Group({ title, children, defaultOpen = false, groupKey, icon, collapsed }) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(`monitor-sidebar-group-${groupKey}`);
    return stored !== null ? stored === 'true' : defaultOpen;
  });
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const containerRef = useRef(null);
  const hoverTimerRef = useRef(null);

  const handleToggle = useCallback(() => {
    setOpen(prev => {
      const newState = !prev;
      localStorage.setItem(`monitor-sidebar-group-${groupKey}`, newState.toString());
      return newState;
    });
  }, [groupKey]);

  if (collapsed) {
    return (
      <div
        className="relative group mb-2"
        ref={containerRef}
        onMouseEnter={() => { if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); } setFlyoutOpen(true); }}
        onMouseLeave={(e) => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = setTimeout(() => {
            const container = containerRef.current;
            if (!container) { setFlyoutOpen(false); return; }
            const rect = container.getBoundingClientRect();
            const x = e.clientX; const y = e.clientY;
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
              setFlyoutOpen(false);
            }
          }, 120);
        }}
      >
        <div
          className="w-full flex items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 cursor-pointer"
          onClick={() => setFlyoutOpen(v => !v)}
        >
          <div className="flex items-center justify-center w-5 h-5">
            {icon}
          </div>
        </div>
        <div
          className={`absolute left-full ml-2 top-0 min-w-[220px] max-w-[260px] bg-gray-800 rounded-lg shadow-2xl transition-all duration-200 z-[100] border border-gray-700 ${flyoutOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'}`}
          onMouseEnter={() => { if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); } setFlyoutOpen(true); }}
          onMouseLeave={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => setFlyoutOpen(false), 150);
          }}
        >
          <div className="px-4 py-2 border-b border-gray-700">
            <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</span>
          </div>
          <div className="py-2">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
        aria-expanded={open}
      >
        <div className="flex items-center justify-center w-5 h-5">{icon}</div>
        <span className="font-semibold flex-1 text-left uppercase text-xs tracking-wider">{title}</span>
        <div className="transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? '500px' : '0', opacity: open ? 1 : 0 }}>
        <div className="pl-4 mt-1 space-y-1">{children}</div>
      </div>
    </div>
  );
}

export default function MonitorSidebar() {
  const location = useLocation();
  const path = location.pathname;
  const asideRef = React.useRef(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('monitor-sidebar-collapsed');
    return stored === 'true';
  });
  
  const [pendingApprovalsCount, setPendingApprovalsCount] = React.useState(0);

  React.useEffect(() => {
    const updateVar = () => {
      const el = asideRef.current;
      if (!el) return;
      const w = el.offsetWidth || (sidebarCollapsed ? 64 : 280);
      document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
    };
    updateVar();
    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(updateVar);
      if (asideRef.current) ro.observe(asideRef.current);
    } else {
      window.addEventListener('resize', updateVar);
    }
    return () => {
      if (ro && asideRef.current) ro.unobserve(asideRef.current);
      window.removeEventListener('resize', updateVar);
    };
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('monitor-sidebar-collapsed', newState.toString());
      // Match Tailwind classes: w-20 = 80px (5rem), w-72 = 288px (18rem)
      const w = newState ? 80 : 288;
      document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
      setTimeout(() => { try { window.dispatchEvent(new Event('monitor-sidebar-toggle')); } catch(_) {} }, 0);
      return newState;
    });
  }, []);

  // Fetch pending approvals count
  React.useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await http.get('/class/registrations/pending-count');
        const count = res.data?.data?.count || 0;
        setPendingApprovalsCount(count);
      } catch (err) {
        console.error('Error fetching pending count:', err);
        setPendingApprovalsCount(0);
      }
    };
    
    fetchCount();
    
    // Refresh every 30s
    const interval = setInterval(fetchCount, 30000);
    
    return () => clearInterval(interval);
   }, []);

  const getActiveState = (menuPath) => {
    if (!menuPath) return false;
    const cleanMenuPath = menuPath.replace(/\/$/, '');
    const cleanCurrentPath = path.replace(/\/$/, '');
    return cleanCurrentPath === cleanMenuPath;
  };

  const monitorMenu = useMemo(() => {
    return [
      // ====================================
      // TỔNG QUAN - Đầu tiên
      // ====================================
      { key: 'dashboard', to: '/monitor', label: 'Tổng quan', icon: <Home className="w-5 h-5" />, active: getActiveState('/monitor') },
      
      // ====================================
      // PHẦN CÁ NHÂN (Chức năng sinh viên)
      // ====================================
      {
        type: 'group', 
        key: 'personal', 
        title: 'Cá nhân', 
        groupKey: 'personal', 
        icon: <User className="w-5 h-5" />, 
        defaultOpen: true,
        items: [
          { key: 'my-activities', to: '/monitor/my-activities', label: 'Hoạt động của tôi', icon: <Activity className="w-4 h-4" />, active: getActiveState('/monitor/my-activities') },
          { key: 'qr-scanner', to: '/monitor/qr-scanner', label: 'Quét QR điểm danh', icon: <QrCode className="w-4 h-4" />, active: getActiveState('/monitor/qr-scanner') }
        ]
      },
      
      // ====================================
      // PHẦN QUẢN LÝ LỚP (Quyền lớp trưởng)
      // ====================================
      {
        type: 'group', 
        key: 'activities', 
        title: 'Quản lý hoạt động', 
        groupKey: 'activities', 
        icon: <Activity className="w-5 h-5" />, 
        defaultOpen: true,
        items: [
          { key: 'class-activities', to: '/monitor/activities', label: 'Hoạt động lớp', icon: <Activity className="w-4 h-4" />, active: getActiveState('/monitor/activities') },
          { 
            key: 'class-approvals', 
            to: '/monitor/approvals', 
            label: 'Phê duyệt đăng ký', 
            icon: <CheckCircle className="w-4 h-4" />, 
            active: getActiveState('/monitor/approvals'),
            badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null
          }
        ]
      },
      { key: 'students', to: '/monitor/students', label: 'Sinh viên lớp', icon: <Users className="w-5 h-5" />, active: getActiveState('/monitor/students') },
      { key: 'reports', to: '/monitor/reports', label: 'Báo cáo & Thống kê', icon: <BarChart3 className="w-5 h-5" />, active: getActiveState('/monitor/reports') },
      { key: 'notifications', to: '/monitor/notifications', label: 'Thông báo', icon: <Bell className="w-5 h-5" />, active: getActiveState('/monitor/notifications') }
    ];
  }, [path, pendingApprovalsCount]);

  const renderMenuItems = useCallback((items) => {
    return items.map(item => {
      if (item.type === 'group') {
        return (
          <Group
            key={item.key}
            title={item.title}
            groupKey={item.groupKey}
            icon={item.icon}
            defaultOpen={item.defaultOpen}
            collapsed={sidebarCollapsed}
          >
            {item.items.map(subItem => (
              <MenuItem
                key={subItem.key}
                to={subItem.to}
                icon={subItem.icon}
                label={subItem.label}
                badge={subItem.badge}
                active={subItem.active}
                collapsed={sidebarCollapsed}
                inDropdown={sidebarCollapsed}
              />
            ))}
          </Group>
        );
      }
      return (
        <MenuItem key={item.key} to={item.to} icon={item.icon} label={item.label} badge={item.badge} active={item.active} collapsed={sidebarCollapsed} />
      );
    });
  }, [sidebarCollapsed]);

  return (
    <aside
      ref={asideRef}
      className={`
        fixed left-0 top-0 h-screen z-30 transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-20' : 'w-72'}
        bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900
        border-r border-gray-700/50 shadow-2xl
      `}
    >
      <div className={`h-16 flex items-center border-b border-gray-700/50 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 relative ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {sidebarCollapsed ? (
          <button
            onClick={toggleSidebar}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all cursor-pointer"
            title="Mở rộng sidebar"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Lớp trưởng</div>
                <div className="text-gray-400 text-xs">Quản lý lớp</div>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="relative p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 group ring-2 ring-white/20 hover:ring-white/40"
              title="Thu gọn sidebar"
            >
              <ChevronsLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </button>
          </>
        )}
      </div>

      <nav className={`flex-1 py-6 space-y-2 ${sidebarCollapsed ? 'px-2' : 'px-3'}`} style={{ overflowX: 'visible', overflowY: 'visible' }}>
        {!sidebarCollapsed && (
          <div className="px-4 mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu chính</div>
          </div>
        )}
        {renderMenuItems(monitorMenu)}
      </nav>
    </aside>
  );
}


