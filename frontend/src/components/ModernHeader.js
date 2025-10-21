import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { 
  Bell, 
  Search, 
  Sun, 
  Moon, 
  User, 
  Settings, 
  LogOut, 
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import http from '../services/http';
import { useAppStore } from '../store/useAppStore';
import { normalizeRole } from '../utils/role';
import { useMultiSession } from '../hooks/useMultiSession';
import SessionMonitor from './SessionMonitor';
import sessionStorageManager from '../services/sessionStorageManager';
import { getUserAvatar, getAvatarGradient } from '../utils/avatarUtils';

export default function ModernHeader({ isMobile, onMenuClick }) {
  const navigate = useNavigate();
  const { clearSession } = useMultiSession();
  const [profile, setProfile] = React.useState(null);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  
  const dropdownRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const notifRef = React.useRef(null);
  
  // Lấy role từ store (ưu tiên role từ store để tránh nhầm hiển thị)
  const { user } = useAppStore();
  const storeRole = useAppStore(s => s.role);
  const tokenInStore = useAppStore(s => s.token);
  const computedRole = storeRole || profile?.vai_tro?.ten_vt || profile?.vai_tro || user?.vai_tro || user?.role || '';
  const normalizedRole = String(normalizeRole(computedRole) || computedRole).toUpperCase();
  
  const isAdminContext = normalizedRole === 'ADMIN' || 
                        normalizedRole === 'QUẢN TRỊ VIÊN' || 
                        normalizedRole === 'QUAN TRI VIEN' ||
                        normalizedRole.includes('ADMIN');

  const isTeacherContext = normalizedRole === 'GIANG_VIEN' ||
                           normalizedRole === 'GIẢNG_VIÊN' ||
                           normalizedRole.includes('GIANG') ||
                           normalizedRole.includes('GIẢNG');
  
  const isMonitorContext = normalizedRole === 'LOP_TRUONG' ||
                           normalizedRole === 'LỚP_TRƯỞNG' ||
                           normalizedRole === 'MONITOR' ||
                           normalizedRole.includes('LOP') ||
                           normalizedRole.includes('LỚP');

  // Theme toggle
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Load profile (tab-specific)
  React.useEffect(() => {
    try {
      const session = sessionStorageManager.getSession();
      if (session?.user) setProfile(session.user);
    } catch(_) {}

    const token = sessionStorageManager.getToken();
    if (token) {
      // Try /users/profile first (has anh_dai_dien), fallback to /auth/profile
      http.get('/users/profile')
        .then(response => {
          const payload = (response?.data?.data || response?.data) || null;
          console.log('🔍 ModernHeader profile loaded from /users/profile:', {
            ho_ten: payload?.ho_ten,
            anh_dai_dien: payload?.anh_dai_dien,
            fullPayload: payload
          });
          setProfile(payload);
          if (payload) {
            sessionStorageManager.saveSession({ token, user: payload, role: sessionStorageManager.getRole() || payload?.role || payload?.roleCode });
          }
        })
        .catch(error => {
          console.error('Failed to load from /users/profile, trying /auth/profile:', error?.response?.status);
          // Fallback to /auth/profile
          http.get('/auth/profile')
            .then(response => {
              const payload = (response?.data?.data || response?.data) || null;
              console.log('🔍 ModernHeader profile loaded from /auth/profile:', {
                ho_ten: payload?.ho_ten,
                anh_dai_dien: payload?.anh_dai_dien,
                fullPayload: payload
              });
              setProfile(payload);
              if (payload) {
                sessionStorageManager.saveSession({ token, user: payload, role: sessionStorageManager.getRole() || payload?.role || payload?.roleCode });
              }
            })
            .catch(err => {
              console.error('Failed to load profile (modern header):', err?.response?.status || err?.message);
              if (err?.response?.status === 401) {
                sessionStorageManager.clearSession();
                setProfile(null);
              }
            });
        });
      loadNotifications();
    }
  }, []);

  // Listen for profile updates (when avatar is changed)
  React.useEffect(() => {
    const handleProfileUpdate = (event) => {
      console.log('📢 ModernHeader received profileUpdated event:', event.detail);
      if (event.detail?.profile) {
        console.log('🔄 Updating ModernHeader profile from:', profile?.anh_dai_dien, 'to:', event.detail.profile.anh_dai_dien);
        setProfile(event.detail.profile);
        // Also update session storage
        const currentSession = sessionStorageManager.getSession();
        if (currentSession) {
          sessionStorageManager.saveSession({ ...currentSession, user: event.detail.profile });
        }
      }
    };

    // Listen for custom profile update events
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // Also listen for storage changes
    const handleStorageChange = (e) => {
      console.log('💾 ModernHeader storage change detected:', e.key, e.newValue);
      if (e.key === 'profile' && e.newValue) {
        try {
          const updatedProfile = JSON.parse(e.newValue);
          console.log('🔄 Updating ModernHeader from localStorage:', updatedProfile);
          setProfile(updatedProfile);
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
          console.log('📦 ModernHeader loading profile from localStorage on mount:', parsedProfile);
          setProfile(parsedProfile);
        } catch (error) {
          console.error('Error parsing stored profile:', error);
        }
      }
    };
    
    checkLocalStorage();
    
    console.log('🎧 ModernHeader event listeners added');

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Keep in sync with session events
  React.useEffect(() => {
    function sync() {
      const s = sessionStorageManager.getSession();
      if (s?.user) setProfile(s.user); else setProfile(null);
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const isAuthenticated = Boolean(tokenInStore || sessionStorageManager.getToken());

  const loadNotifications = async () => {
    try {
      const response = await http.get('/notifications?limit=10');
      const data = response?.data?.data || response?.data || {};
      
      if (data.notifications && Array.isArray(data.notifications)) {
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
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Fallback placeholder
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
      setNotificationOpen(false);
    } catch (e) {
      console.error('Failed to load notification detail', e);
    }
  };

  const handleLogout = () => {
    try {
      clearSession();
      sessionStorageManager.clearSession();
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

  const getInitials = () => {
    const name = profile?.ho_ten || profile?.ten_dn || profile?.name || profile?.email || '';
    if (!name) return 'U';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const getRoleColor = () => {
    if (isAdminContext) return 'from-red-500 to-orange-500';
    if (isTeacherContext) return 'from-purple-500 to-indigo-500';
    if (isMonitorContext) return 'from-green-500 to-teal-500';
    return 'from-blue-500 to-cyan-500';
  };

  const getRoleLabel = () => {
    if (isAdminContext) return 'Quản trị viên';
    if (isTeacherContext) return 'Giảng viên';
    if (isMonitorContext) return 'Lớp trưởng';
    return 'Sinh viên';
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-200">
      {/* Top gradient line */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Mobile Menu Button - Left side on mobile only */}
          {isMobile && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors touch-target"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className={`relative p-2 bg-gradient-to-br ${getRoleColor()} rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105`}>
                <GraduationCap className="h-6 w-6 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Điểm Rèn Luyện</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Quản lý chuyên nghiệp</p>
              </div>
            </Link>
          </div>

          {/* Search bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm hoạt động, sinh viên..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
              />
            </div>
          </form>

          {/* Right section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {/* Session Monitor */}
              <SessionMonitor />

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200 group"
                title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-500 transition-colors" />
                ) : (
                  <Sun className="h-5 w-5 text-gray-300 group-hover:text-yellow-500 transition-colors" />
                )}
              </button>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { 
                    setNotificationOpen(!notificationOpen); 
                    if (!notificationOpen) loadNotifications(); 
                  }}
                  className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200 group"
                >
                  <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-500 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">Thông báo</h3>
                        {unreadCount > 0 && (
                          <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
                            {unreadCount} mới
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">Không có thông báo nào</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => openDetail(notification.id)}
                            className={`p-4 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                              notification.unread ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-2xl flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-semibold ${
                                  notification.unread 
                                    ? 'text-gray-900 dark:text-white' 
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <span className="text-xs text-gray-500 dark:text-gray-500 mt-2 block">
                                  {notification.time}
                                </span>
                              </div>
                              {notification.unread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {notifications.length > 0 && (
                      <div className="p-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-700">
                        <button
                          onClick={markAllAsRead}
                          className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200 group"
                >
                  {(() => {
                    const avatar = getUserAvatar(profile);
                    console.log('🖼️ ModernHeader avatar info:', {
                      profile_anh_dai_dien: profile?.anh_dai_dien,
                      avatar_src: avatar.src,
                      avatar_hasValid: avatar.hasValidAvatar,
                      avatar_fallback: avatar.fallback
                    });
                    return avatar.hasValidAvatar ? (
                      <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                        <img
                          src={avatar.src}
                          alt={avatar.alt}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full"></div>
                      </div>
                    ) : (
                      <div className={`relative w-9 h-9 bg-gradient-to-br ${getAvatarGradient(profile?.ho_ten || profile?.ten_dn || '')} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105`}>
                        {avatar.fallback}
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full"></div>
                      </div>
                    );
                  })()}
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {profile?.ho_ten || profile?.ten_dn || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getRoleLabel()}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-top-2 duration-200"
                  >
                    {/* Profile Header */}
                    <div className={`p-4 bg-gradient-to-r ${getRoleColor()} text-white`}>
                      <div className="flex items-center gap-3">
                        {(() => {
                          const avatar = getUserAvatar(profile);
                          return avatar.hasValidAvatar ? (
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/20 backdrop-blur-sm">
                              <img
                                src={avatar.src}
                                alt={avatar.alt}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm">
                              {avatar.fallback}
                            </div>
                          );
                        })()}
                        <div>
                          <p className="font-semibold">{profile?.ho_ten || profile?.ten_dn}</p>
                          <p className="text-xs text-white/80">{profile?.email || getRoleLabel()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {isAdminContext && (
                        <>
                          <Link
                            to="/admin/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <User className="h-5 w-5 text-gray-400" />
                            <span>Thông tin cá nhân</span>
                          </Link>
                          <Link
                            to="/admin/settings"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Settings className="h-5 w-5 text-gray-400" />
                            <span>Cài đặt</span>
                          </Link>
                        </>
                      )}
                      
                      {isMonitorContext && (
                        <Link
                          to="/monitor/my-profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <User className="h-5 w-5 text-gray-400" />
                          <span>Hồ sơ cá nhân</span>
                        </Link>
                      )}
                      
                      {isTeacherContext && (
                        <>
                          <Link
                            to="/teacher/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <User className="h-5 w-5 text-gray-400" />
                            <span>Thông tin cá nhân</span>
                          </Link>
                          <Link
                            to="/teacher/preferences"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Settings className="h-5 w-5 text-gray-400" />
                            <span>Tùy chọn</span>
                          </Link>
                        </>
                      )}
                      
                      {!isAdminContext && !isMonitorContext && !isTeacherContext && (
                        <Link
                          to="/student/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <User className="h-5 w-5 text-gray-400" />
                          <span>Thông tin cá nhân</span>
                        </Link>
                      )}

                      <Link
                        to="/support"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <HelpCircle className="h-5 w-5 text-gray-400" />
                        <span>Hỗ trợ</span>
                      </Link>

                      <div className="my-2 border-t border-gray-200 dark:border-slate-700"></div>

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button đã chuyển sang bên trái logo */}
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              Đăng nhập
            </Link>
          )}
        </div>

        {/* Mobile Search */}
        {profile && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white"
              />
            </form>
          </div>
        )}
      </div>

      {/* Notification Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{detail.title}</h3>
                  <p className="text-sm text-white/80 mt-1">{detail.time} • {detail.sender}</p>
                </div>
                <button
                  onClick={() => setDetail(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {detail.message}
              </p>
              
              {detail.activity && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    📅 Hoạt động liên quan
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {detail.activity.ten_hd}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    📍 {detail.activity.dia_diem || 'Chưa xác định'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    🕐 {detail.activity.ngay_bd ? new Date(detail.activity.ngay_bd).toLocaleString('vi-VN') : 'Chưa xác định'}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-2">
                    +{Number(detail.activity.diem_rl || 0)} điểm RL
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
