import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import http from '../services/http';
import '../styles/teacher-sidebar.css';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Bell, 
  Activity,
  BookOpen,
  TrendingUp,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Menu,
  Home,
  Clipboard,
  FolderOpen,
  FileSpreadsheet,
  School,
  Send,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
  QrCode
} from 'lucide-react';

// MenuItem component với modern design - REMOVED React.memo to allow active state updates
function MenuItem({ to, icon, label, badge, active, onClick, collapsed, inDropdown }) {
  console.log('[MenuItem] Rendering:', { to, label, active, collapsed, inDropdown });
  
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

  // Show tooltip only when collapsed and NOT in dropdown
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

// Group component với modern design - REMOVED React.memo to allow re-renders
function Group({ title, children, defaultOpen = false, groupKey, icon, collapsed }) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(`teacher-sidebar-group-${groupKey}`);
    return stored !== null ? stored === 'true' : defaultOpen;
  });
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const containerRef = useRef(null);
  const hoverTimerRef = useRef(null);
  
  const handleToggle = useCallback(() => {
    setOpen(prev => {
      const newState = !prev;
      localStorage.setItem(`teacher-sidebar-group-${groupKey}`, newState.toString());
      return newState;
    });
  }, [groupKey]);

  // Khi collapsed, hiển thị submenu dạng dropdown khi hover/click
  if (collapsed) {
    return (
      <div
        className="relative group mb-2"
        ref={containerRef}
        onMouseEnter={() => { if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); } setFlyoutOpen(true); }}
        onMouseLeave={(e) => {
          // Đóng sau một khoảng nhỏ nếu chuột rời hẳn khỏi cả trigger và flyout
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
        {/* Dropdown menu khi hover/click - đảm bảo click được */}
        <div
          className={`absolute left-full ml-2 top-0 min-w-[220px] max-w-[260px] bg-gray-800 rounded-lg shadow-2xl transition-all duration-200 z-[100] border border-gray-700 ${flyoutOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'}`}
          onMouseEnter={() => { if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); } setFlyoutOpen(true); }}
          onMouseLeave={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => setFlyoutOpen(false), 150);
          }}
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-700">
            <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</span>
          </div>
          {/* Menu items */}
          <div className="py-2">
            {children}
          </div>
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
        <div className="flex items-center justify-center w-5 h-5">
          {icon}
        </div>
        <span className="font-semibold flex-1 text-left uppercase text-xs tracking-wider">{title}</span>
        <div className="transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      <div 
        className="overflow-hidden transition-all duration-300"
        style={{ 
          maxHeight: open ? '500px' : '0',
          opacity: open ? 1 : 0
        }}
      >
        <div className="pl-4 mt-1 space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// Remove React.memo to allow re-render when location changes
function TeacherSidebar(props) {
  const storeRole = useAppStore(s => s.role);
  const roleProp = props?.role || null;
  const role = (roleProp || storeRole || '').toString().toLowerCase();
  const location = useLocation();
  const path = location.pathname;
  const roleUpper = role.toUpperCase();
  
  // Pending registrations count
  const [pendingCount, setPendingCount] = useState(0);
  
  // Debug: Log current path on every render (disabled in production)
  // console.log('[TeacherSidebar] RENDER - Current path:', path);
  
  // Sidebar toggle state với persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('teacher-sidebar-collapsed');
    return stored === 'true';
  });
  const asideRef = React.useRef(null);

  // Sync CSS variable --sidebar-w for layout calculations
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

  // Toggle sidebar function
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('teacher-sidebar-collapsed', newState.toString());
      
      // Update CSS variable immediately with the new state
      const w = newState ? 64 : 280;
      document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
      
      // dispatch a custom event so layout in same tab can react immediately
      setTimeout(() => {
        try { window.dispatchEvent(new Event('teacher-sidebar-toggle')); } catch(_) {}
      }, 0);
      
      return newState;
    });
  }, []);
  
  // Fetch pending registrations count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await http.get('/teacher/registrations/pending');
        const data = response.data?.data?.items || response.data?.items || response.data?.data || response.data || [];
        const pendingRegs = Array.isArray(data) ? data.filter(r => r.trang_thai_dk === 'cho_duyet') : [];
        setPendingCount(pendingRegs.length);
      } catch (err) {
        console.error('Error fetching pending count:', err);
      }
    };
    
    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Use refs to prevent unnecessary re-renders
  const prevRoleRef = useRef(role);
  const prevPathRef = useRef(path);
  const stableRoleRef = useRef(role);
  const stablePathRef = useRef(path);
  
  // Only update refs if values actually changed
  if (prevRoleRef.current !== role || prevPathRef.current !== path) {
    prevRoleRef.current = role;
    prevPathRef.current = path;
    stableRoleRef.current = role;
    stablePathRef.current = path;
  }
  
  // NEW ALGORITHM: Direct path comparison + sub-routes highlighting
  const getActiveState = (menuPath) => {
    if (!menuPath) return false;
    
    // Clean paths
    const cleanMenuPath = menuPath.replace(/\/$/, '');
    const cleanCurrentPath = path.replace(/\/$/, '');
    
    // Direct comparison (exact match)
    if (cleanCurrentPath === cleanMenuPath) return true;
    
    // Sub-route check: highlight parent menu when on sub-routes
    // Example: /teacher/students should be active when on /teacher/students/import
    if (cleanCurrentPath.startsWith(cleanMenuPath + '/')) return true;
    
    return false;
  };

  // Teacher menu structure based on tkht.md analysis
  // IMPORTANT: Include 'path' in dependencies to re-calculate when URL changes
  const teacherMenu = useMemo(() => {
    return [
    // Dashboard - Tổng quan
    {
      key: 'dashboard',
      to: '/teacher',
      label: 'Tổng quan',
      icon: <Home className="w-5 h-5" />,
      active: getActiveState('/teacher')
    },
    
    // Quản lý hoạt động - Group
    {
      type: 'group',
      key: 'activity-management',
      title: 'Quản lý hoạt động',
      groupKey: 'activity-management',
      icon: <Activity className="w-5 h-5" />,
      defaultOpen: true,
      items: [
        {
          key: 'pending-activities',
          to: '/teacher/approve',
          label: 'Phê duyệt hoạt động',
          icon: <Clipboard className="w-4 h-4" />,
          active: getActiveState('/teacher/approve')
        },
        {
          key: 'pending-registrations',
          to: '/teacher/registrations/approve',
          label: 'Phê duyệt đăng ký',
          icon: <UserCheck className="w-4 h-4" />,
          active: getActiveState('/teacher/registrations/approve'),
          badge: pendingCount > 0 ? pendingCount : null
        },
        {
          key: 'activity-types',
          to: '/teacher/activity-types',
          label: 'Loại hoạt động',
          icon: <FolderOpen className="w-4 h-4" />,
          active: getActiveState('/teacher/activity-types')
        },
        {
          key: 'all-activities',
          to: '/teacher/activities',
          label: 'Tất cả hoạt động',
          icon: <Calendar className="w-4 h-4" />,
          active: getActiveState('/teacher/activities')
        }
      ]
    },

    // Quản lý sinh viên - Group
    {
      type: 'group',
      key: 'student-management',
      title: 'Quản lý sinh viên',
      groupKey: 'student-management',
      icon: <Users className="w-5 h-5" />,
      defaultOpen: false,
      items: [
        {
          key: 'student-list',
          to: '/teacher/students',
          label: 'Danh sách sinh viên',
          icon: <Users className="w-4 h-4" />,
          active: getActiveState('/teacher/students')
        }
      ]
    },

    // Báo cáo & Thống kê - Group
    {
      type: 'group',
      key: 'reports-analytics',
      title: 'Báo cáo & Thống kê',
      groupKey: 'reports-analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      defaultOpen: false,
      items: [
        {
          key: 'statistics',
          to: '/teacher/reports',
          label: 'Thống kê & Báo cáo',
          icon: <TrendingUp className="w-4 h-4" />,
          active: getActiveState('/teacher/reports')
        }
      ]
    },

    // Quản lý thông báo - Group
    {
      type: 'group',
      key: 'notifications',
      title: 'Thông báo',
      groupKey: 'notifications',
      icon: <Bell className="w-5 h-5" />,
      defaultOpen: false,
      items: [
        {
          key: 'notification-list',
          to: '/teacher/notifications',
          label: 'Danh sách thông báo',
          icon: <MessageSquare className="w-4 h-4" />,
          active: getActiveState('/teacher/notifications')
        }
      ]
    }
  ];
  }, [path]);

  // Render menu items
  const renderMenuItem = useCallback((item) => {
    
    if (item.type === 'group') {
      return (
        <Group 
          key={item.key}
          title={item.title}
          defaultOpen={item.defaultOpen}
          groupKey={item.groupKey}
          icon={item.icon}
          collapsed={sidebarCollapsed}
        >
          {item.items
            .filter(subItem => subItem && subItem.to && subItem.label)
            .map(subItem => (
            <MenuItem
              key={subItem.key}
              to={subItem.to}
              label={subItem.label}
              icon={subItem.icon}
              active={subItem.active}
              badge={subItem.badge}
              collapsed={sidebarCollapsed}
              inDropdown={sidebarCollapsed}
            />
          ))}
        </Group>
      );
    }
    
    return (
      <MenuItem
        key={item.key}
        to={item.to}
        label={item.label}
        icon={item.icon}
        active={item.active}
        badge={item.badge}
        collapsed={sidebarCollapsed}
        inDropdown={false}
      />
    );
  }, [sidebarCollapsed]);

  return (
    <aside ref={asideRef} className={`
      fixed left-0 top-0 h-screen z-30 transition-all duration-300
      ${sidebarCollapsed ? 'w-20' : 'w-72'}
      bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900
      border-r border-gray-700/50 shadow-2xl
    `}>
      {/* Brand Header với gradient */}
      <div className={`h-16 flex items-center border-b border-gray-700/50 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 relative ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {sidebarCollapsed ? (
          // Khi thu nhỏ: Icon chính là nút toggle
          <button
            onClick={toggleSidebar}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg hover:shadow-indigo-500/50 hover:scale-105 transition-all cursor-pointer"
            title="Mở rộng sidebar"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        ) : (
          // Khi mở rộng: Hiển thị info và nút toggle riêng
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Giảng viên</div>
                <div className="text-gray-400 text-xs">Quản lý lớp học</div>
              </div>
            </div>
            
            {/* Toggle Button - Only visible when expanded */}
            <button 
              onClick={toggleSidebar}
              className="
                relative p-2 rounded-xl
                bg-gradient-to-br from-indigo-500 to-purple-600
                hover:from-indigo-600 hover:to-purple-700
                text-white
                shadow-lg shadow-indigo-500/30
                hover:shadow-indigo-500/50 hover:scale-110
                transition-all duration-300
                group
                ring-2 ring-white/20 hover:ring-white/40
              "
              title="Thu gọn sidebar"
            >
              <ChevronsLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </button>
          </>
        )}
      </div>
      
      {/* Navigation Menu */}
      <nav className={`flex-1 py-6 space-y-2 ${sidebarCollapsed ? 'px-2' : 'px-3'}`} style={{ overflowX: 'visible', overflowY: 'visible' }}>
        {!sidebarCollapsed && (
          <div className="px-4 mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Menu chính
            </div>
            {/* Debug: Show current path (disabled in production) */}
            {/* <div className="mt-2 px-2 py-1 bg-yellow-500/10 rounded text-xs text-yellow-400 font-mono">
              Path: {path}
            </div> */}
          </div>
        )}
        {teacherMenu.map(renderMenuItem)}
      </nav>

    </aside>
  );
}

export default TeacherSidebar;
