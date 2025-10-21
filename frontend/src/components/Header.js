import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { Bell } from 'lucide-react';
import http from '../services/http';
import { useAppStore } from '../store/useAppStore';
import { useMultiSession } from '../hooks/useMultiSession';
import MultiSessionIndicator from './MultiSessionIndicator';
import SessionMonitor from './SessionMonitor';
import sessionStorageManager from '../services/sessionStorageManager';
import { getUserAvatar, getAvatarGradient } from '../utils/avatarUtils';

export default function Header() {
  console.log('🏠 Header component rendering');
  const navigate = useNavigate();
  const { clearSession, getActiveSessions } = useMultiSession();
  const [profile, setProfile] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [detail, setDetail] = React.useState(null);
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const dropdownRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  
  // Lấy role từ store
  const { user } = useAppStore();
  const computedRole = (profile?.vai_tro?.ten_vt) || (profile?.vai_tro) || user?.vai_tro || user?.role || '';
  const normalizedRole = String(computedRole).toUpperCase();
  // Hỗ trợ nhiều tên admin từ database: Admin, ADMIN, Quản trị viên, admin
  const isAdminContext = normalizedRole === 'ADMIN' || 
                        normalizedRole === 'QUẢN TRỊ VIÊN' || 
                        normalizedRole === 'QUAN TRI VIEN' ||
                        normalizedRole.includes('ADMIN');

  // Hỗ trợ nhiều biến thể tên vai trò Giảng viên
  const isTeacherContext = normalizedRole === 'GIANG_VIEN' ||
                           normalizedRole === 'GIẢNG_VIÊN' ||
                           normalizedRole.includes('GIANG') ||
                           normalizedRole.includes('GIẢNG');
  
  // Hỗ trợ nhiều biến thể tên vai trò Lớp trưởng/Monitor
  const isMonitorContext = normalizedRole === 'LOP_TRUONG' ||
                           normalizedRole === 'LỚP_TRƯỞNG' ||
                           normalizedRole === 'MONITOR' ||
                           normalizedRole.includes('LOP') ||
                           normalizedRole.includes('LỚP');
  
  // Debug: log role để kiểm tra
  console.log('Header Debug:', { computedRole, normalizedRole, isAdminContext, isTeacherContext, isMonitorContext, profile: profile?.vai_tro, user: user?.vai_tro });

  React.useEffect(() => {
    // NEW: Always prefer per-tab session
    const session = sessionStorageManager.getSession();
    if (session && session.user) {
      setProfile(session.user);
    } else {
      // Fallback legacy cache (will be removed soon)
      try {
        const cached = sessionStorage.getItem(sessionStorageManager.SESSION_KEY);
        if (cached) {
          try { const parsed = JSON.parse(cached); if (parsed?.user) setProfile(parsed.user); } catch(_) {}
        }
      } catch(_) {}
    }

    // If we still need fresh profile (no user yet) but we have a token
    const token = sessionStorageManager.getToken();
    if (token && (!session || !session.user)) {
      http.get('/auth/profile')
        .then(res => {
          const payload = (res?.data?.data || res?.data) || null;
          setProfile(payload);
          // Persist inside this tab's session only
          if (payload) {
            sessionStorageManager.saveSession({ token, user: payload, role: sessionStorageManager.getRole() || payload?.role || payload?.roleCode });
          }
        })
        .catch(err => {
          console.error('Failed to load profile (tab):', err?.response?.status || err?.message);
          if (err?.response?.status === 401) {
            sessionStorageManager.clearSession();
            setProfile(null);
          }
        });
    }
  }, []);

  // Listen for profile updates (when avatar is changed)
  React.useEffect(() => {
    const handleProfileUpdate = (event) => {
      console.log('📢 Header received profileUpdated event:', event.detail);
      if (event.detail?.profile) {
        console.log('🔄 Updating header profile from:', profile?.anh_dai_dien, 'to:', event.detail.profile.anh_dai_dien);
        setProfile(event.detail.profile);
        setForceUpdate(prev => prev + 1); // Force re-render
        // Also update session storage
        const currentSession = sessionStorageManager.getSession();
        if (currentSession) {
          sessionStorageManager.saveSession({ ...currentSession, user: event.detail.profile });
        }
      }
    };

    // Listen for custom profile update events
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // Also listen for storage changes (in case profile is updated in another tab)
    const handleStorageChange = (e) => {
      console.log('💾 Storage change detected:', e.key, e.newValue);
      if (e.key === 'profile' && e.newValue) {
        try {
          const updatedProfile = JSON.parse(e.newValue);
          console.log('🔄 Updating header from localStorage:', updatedProfile);
          setProfile(updatedProfile);
          setForceUpdate(prev => prev + 1); // Force re-render
        } catch (error) {
          console.error('Error parsing updated profile:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check localStorage on mount
    const checkLocalStorage = () => {
      const storedProfile = localStorage.getItem('profile');
      if (storedProfile) {
        try {
          const parsedProfile = JSON.parse(storedProfile);
          console.log('📦 Loading profile from localStorage on mount:', parsedProfile);
          setProfile(parsedProfile);
        } catch (error) {
          console.error('Error parsing stored profile:', error);
        }
      }
    };
    
    checkLocalStorage();
    
    // Debug: Log when event listener is added
    console.log('🎧 Header event listeners added');

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen to storage sync events to update header when this tab session changes
  React.useEffect(() => {
    function handleSync(e) {
      try {
        if (e.key === sessionStorageManager.SYNC_EVENT_KEY) {
          const session = sessionStorageManager.getSession();
            if (session?.user) setProfile(session.user); else setProfile(null);
        }
      } catch(_) {}
    }
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      if (buttonRef.current && buttonRef.current.contains(e.target)) return;
      setOpen(false);
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  const loadNotifications = async () => {
    try {
      const response = await http.get('/notifications?limit=10');
      const data = response?.data?.data || response?.data || {};
      
      if (data.notifications && Array.isArray(data.notifications)) {
        // Transform API data to match frontend format
        const transformedNotifications = data.notifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          time: formatTimeAgo(notification.time),
          type: notification.type,
          unread: notification.unread
        }));
        
        setNotifications(transformedNotifications);
      } else {
        console.warn('Unexpected API response format:', data);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      
      // Fallback to placeholder data if API fails
      const placeholderNotifications = [
        { 
          id: 'n1', 
          title: 'Cập nhật lịch hoạt động tuần này',
          message: 'Có 3 hoạt động mới được thêm vào lịch tuần này',
          time: '2 giờ trước',
          type: 'info',
          unread: true
        },
        { 
          id: 'n2', 
          title: 'Nhắc nhở nộp minh chứng điểm RL',
          message: 'Hạn cuối nộp minh chứng là 30/09/2025',
          time: '1 ngày trước',
          type: 'warning',
          unread: true
        },
        { 
          id: 'n3', 
          title: 'Chúc mừng! Bạn đã đạt mục tiêu điểm RL',
          message: 'Bạn đã tích lũy đủ 80 điểm rèn luyện trong học kỳ',
          time: '3 ngày trước',
          type: 'success',
          unread: false
        }
      ];
      setNotifications(placeholderNotifications);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info':
      default: return 'ℹ️';
    }
  };

  const formatTimeAgo = (timestamp) => {
    try {
      const now = new Date();
      const time = new Date(timestamp);
      const diffInMinutes = Math.floor((now - time) / (1000 * 60));
      
      if (diffInMinutes < 60) {
        return `${diffInMinutes} phút trước`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} giờ trước`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days} ngày trước`;
      }
    } catch (error) {
      return 'Vừa xong';
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, unread: false } : n
      ));
      await http.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, unread: true } : n
      ));
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
      await http.put('/notifications/mark-all-read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      loadNotifications();
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await http.get(`/notifications/${id}`);
      const d = res?.data?.data || res?.data || null;
      if (d) {
        setDetail({
          id: d.id,
          title: d.title,
          message: d.message,
          time: formatTimeAgo(d.time),
          sender: d.sender,
          activity: d.activity
        });
      }
      await markAsRead(id);
    } catch (e) {
      console.error('Failed to load notification detail', e);
    }
  };

  // Handle click outside to close dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && !event.target.closest('[data-profile-dropdown]')) {
        setOpen(false);
      }
      if (notificationOpen && !event.target.closest('[data-notification-dropdown]')) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, notificationOpen]);

  const handleLogout = () => {
    try {
      // Clear multi-session
      clearSession();
      
      // Clear localStorage (backward compatibility)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (_) {}
    setProfile(null);
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <header 
      className="sticky top-0 border-b border-gray-200 bg-white shadow-sm"
      style={{ zIndex: 20 }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900 hover:opacity-90 transition flex-shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold">
            TA
          </span>
          <span className="text-base sm:text-lg">TailAdmin</span>
        </Link>

        {/* Search bar - always visible */}
        <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm hoạt động, sinh viên..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 text-sm"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </form>

        {/* Multi-Session Monitor */}
        <SessionMonitor />

        {profile ? (
          <div className="flex items-center gap-3 relative">
            {/* Notification Bell */}
            <div className="relative" data-notification-dropdown>
              <button
                type="button"
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => { setNotificationOpen(!notificationOpen); if (!notificationOpen) { loadNotifications(); } }}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notificationOpen && (
                <div 
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200"
                  style={{ zIndex: 50 }}
                >
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Thông báo</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        Không có thông báo nào
                      </div>
                    ) : (
                      notifications.map((notification, idx) => (
                        <div
                          key={notification.id || `notification-${idx}`}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            notification.unread ? 'bg-blue-50' : ''
                          }`}
                          onClick={(e) => { e.stopPropagation(); openDetail(notification.id); }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-lg">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <h4 className={`text-sm font-medium ${
                                notification.unread ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <span className="text-xs text-gray-500 mt-2 block">
                                {notification.time}
                              </span>
                            </div>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-200">
                      <button
                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
                        onClick={markAllAsRead}
                      >
                        Đánh dấu tất cả đã đọc
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detail popup */}
            {detail && (
              <div 
                className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
                style={{ zIndex: 50 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{detail.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{detail.time} • {detail.sender}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600" onClick={() => setDetail(null)}>✕</button>
                </div>
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{detail.message}</p>
                {detail.activity && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border">
                    <div className="text-sm font-medium text-gray-800">Hoạt động liên quan</div>
                    <div className="text-sm text-gray-700 mt-1">{detail.activity.ten_hd}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {detail.activity.dia_diem || '—'} • {detail.activity.ngay_bd ? new Date(detail.activity.ngay_bd).toLocaleString('vi-VN') : ''}
                    </div>
                    <div className="text-xs text-green-700 mt-1">+{Number(detail.activity.diem_rl || 0)} điểm</div>
                  </div>
                )}
              </div>
            )}

            <div className="relative" data-profile-dropdown>
            <button
              type="button"
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              ref={buttonRef}
              onClick={() => {
                console.log('Profile button clicked! Current open state:', open);
                setOpen(!open);
              }}
            >
              {(() => {
                const avatar = getUserAvatar(profile);
                console.log('🎨 Header rendering avatar:', { 
                  profileAnhDaiDien: profile?.anh_dai_dien, 
                  avatarHasValid: avatar.hasValidAvatar, 
                  avatarSrc: avatar.src 
                });
                return avatar.hasValidAvatar ? (
                  <img
                    src={avatar.src}
                    alt={avatar.alt}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(profile?.ho_ten || profile?.ten_dn || '')} flex items-center justify-center text-white text-sm font-semibold`}>
                    {avatar.fallback}
                  </div>
                );
              })()}
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {profile?.ho_ten || profile?.ten_dn || profile?.name || profile?.email || 'User'}
              </span>
            </button>

            {open && (
              <div
                ref={dropdownRef}
                className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200"
                style={{ zIndex: 50 }}
              >
                <div className="py-1">
                  {/* Hiển thị links khác nhau dựa trên role */}
                  {isAdminContext ? (
                    <>
                      <Link
                        replace
                        to="/admin/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        Thông tin cá nhân
                      </Link>
                    </>
                  ) : isMonitorContext ? (
                    <>
                      <Link
                        replace
                        to="/monitor/my-profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        👤 Hồ sơ cá nhân
                      </Link>
                    </>
                  ) : isTeacherContext ? (
                    <>
                      <Link
                        replace
                        to="/teacher/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        Thông tin cá nhân
                      </Link>
                      <Link
                        replace
                        to="/teacher/preferences"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        Tùy chọn
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/student/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        Thông tin cá nhân
                      </Link>
                    </>
                  )}
                  {/* Common items */}
                  {/* no extra teacher-only option here to avoid duplicates */}
                  <Link
                    to="/support"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    Hỗ trợ
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        )}
      </div>

      {/* Backdrop overlay for dropdown - lower z-index than dropdown */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/10" 
          style={{ zIndex: 25, pointerEvents: 'auto' }}
          onClick={() => setOpen(false)}
        />
      )}
    </header>
  );
}
