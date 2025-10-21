import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Award, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Bell, 
  TrendingUp,
  Activity,
  BookOpen,
  UserCheck,
  Download,
  Eye,
  Plus,
  ArrowRight,
  Star,
  Target,
  Zap
} from 'lucide-react';
import http from '../../services/http';
import SemesterClosureWidget from '../../components/SemesterClosureWidget';
import useSemesterOptions from '../../hooks/useSemesterOptions';
import { 
  MobileOptimizedStatCard, 
  MobileOptimizedActionCard, 
  MobileOptimizedGrid,
  MobileOptimizedHeader,
  MobileOptimizedSection,
  MobileOptimizedEmptyState
} from '../../components/MobileOptimizedDashboard';

// Modern Stat Card Component
function ModernStatCard({ title, value, icon, color = 'blue', change, trend, subtitle, onClick }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600'
  };

  const iconColorClasses = {
    blue: 'text-blue-100',
    green: 'text-green-100',
    purple: 'text-purple-100',
    orange: 'text-orange-100',
    red: 'text-red-100',
    indigo: 'text-indigo-100'
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colorClasses[color]} p-6 text-white cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl`}
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -translate-y-10 translate-x-10"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg bg-white bg-opacity-20 ${iconColorClasses[color]}`}>
            {icon}
          </div>
          {change && (
            <div className="flex items-center gap-1 text-sm">
              <span className={trend === 'up' ? 'text-green-200' : 'text-red-200'}>
                {trend === 'up' ? '↗' : '↘'}
              </span>
              <span>{change}</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm opacity-90 mb-1">{title}</p>
          <p className="text-3xl font-bold mb-1">{value}</p>
          {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({ title, description, icon, color = 'blue', onClick, badge }) {
  const colorClasses = {
    blue: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700',
    green: 'hover:bg-green-50 hover:border-green-200 hover:text-green-700',
    purple: 'hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700',
    orange: 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700'
  };

  return (
    <div 
      className={`group relative bg-white border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${colorClasses[color]}`}
      onClick={onClick}
    >
      {badge && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {badge}
        </span>
      )}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 group-hover:bg-current rounded-lg transition-colors">
          <div className="text-gray-600 group-hover:text-white transition-colors">
            {icon}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-current transition-colors" />
      </div>
    </div>
  );
}

// Activity Card Component
function ActivityCard({ activity, onSelect, onApprove, onReject }) {
  const statusColors = {
    'cho_duyet': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'da_duyet': 'bg-green-100 text-green-800 border-green-200', 
    'tu_choi': 'bg-red-100 text-red-800 border-red-200',
    'hoan_thanh': 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const statusLabels = {
    'cho_duyet': 'Chờ duyệt',
    'da_duyet': 'Đã duyệt',
    'tu_choi': 'Từ chối',
    'hoan_thanh': 'Hoàn thành'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg mb-2">{activity.ten_hd}</h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{activity.mo_ta}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[activity.trang_thai]}`}>
          {statusLabels[activity.trang_thai]}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-600">Điểm:</span>
          <span className="font-medium">{activity.diem_rl}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-gray-600">Ngày:</span>
          <span className="font-medium">{new Date(activity.ngay_bd).toLocaleDateString('vi-VN')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-500" />
          <span className="text-gray-600">Sức chứa:</span>
          <span className="font-medium">{activity.sl_toi_da}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-500" />
          <span className="text-gray-600">Tạo:</span>
          <span className="font-medium">{new Date(activity.ngay_tao).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>

      {activity.trang_thai === 'cho_duyet' && (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(activity.id)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Phê duyệt
          </button>
          <button
            onClick={() => onReject(activity.id)}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Từ chối
          </button>
        </div>
      )}
    </div>
  );
}

export default function ModernTeacherDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    totalActivities: 0, 
    pendingApprovals: 0, 
    totalStudents: 0, 
    avgClassScore: 0,
    participationRate: 0,
    approvedThisWeek: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('teacher-sidebar-collapsed');
    return stored === 'true';
  });
  
  // Semester filter state (sync with backend current + session cache)
  const [semester, setSemester] = useState(() => {
    const cached = sessionStorage.getItem('current_semester');
    return cached || '';
  });

  // Unified semester options from backend
  const { options: semesterOptions, currentSemester } = useSemesterOptions();

  // Keep selected semester in sync with backend-reported current active
  useEffect(() => {
    if (currentSemester && currentSemester !== semester) {
      setSemester(currentSemester);
    }
  }, [currentSemester]);

  useEffect(() => { 
    if (!semester) return;
    loadDashboardData(); 
  }, [semester]);

  // Listen for sidebar state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('teacher-sidebar-collapsed');
      setSidebarCollapsed(stored === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use new dashboard endpoint with semester filter
      const dashboardRes = await http.get('/teacher/dashboard', {
        params: { semester }
      }).catch(() => ({ data: { data: {
        summary: {
          totalActivities: 0,
          pendingApprovals: 0,
          totalStudents: 0,
          avgClassScore: 0,
          participationRate: 0,
          approvedThisWeek: 0
        },
        pendingActivities: [],
        recentNotifications: [],
        classes: []
      } } }));
      
      const dashboardData = dashboardRes.data?.data || {};
      const summary = dashboardData.summary || {};
      
      setStats({
        totalActivities: summary.totalActivities || 0,
        pendingApprovals: summary.pendingApprovals || 0,
        totalStudents: summary.totalStudents || 0,
        avgClassScore: summary.avgClassScore || 0,
        participationRate: summary.participationRate || 0,
        approvedThisWeek: summary.approvedThisWeek || 0
      });
      
      setRecentActivities(dashboardData.pendingActivities || []);
      setRecentNotifications(dashboardData.recentNotifications || []);
      setClasses(dashboardData.classes || []);
      
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Không thể tải dữ liệu dashboard');
    } finally { 
      setLoading(false); 
    }
  };

  // Load classes for banner (removed as already loaded in dashboard)
  // useEffect(() => {
  //   const loadClasses = async () => {
  //     try {
  //       const res = await http.get('/teacher/classes').catch(()=>({ data:{ data:{ classes: [] } } }));
  //       const clz = res.data?.data?.classes || [];
  //       setClasses(Array.isArray(clz) ? clz : []);
  //     } catch(e) {
  //       setClasses([]);
  //     }
  //   };
  //   loadClasses();
  // }, []);

  const handleApprove = async (activityId) => {
    try {
      await http.post(`/teacher/activities/${activityId}/approve`);
      await loadDashboardData();
      // Show success notification
    } catch (err) {
      console.error('Error approving activity:', err);
      // Show error notification
    }
  };

  const handleReject = async (activityId) => {
    const reason = window.prompt('Nhập lý do từ chối:');
    if (!reason) return;
    
    try {
      await http.post(`/teacher/activities/${activityId}/reject`, { reason });
      await loadDashboardData();
      // Show success notification
    } catch (err) {
      console.error('Error rejecting activity:', err);
      // Show error notification
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Có lỗi xảy ra</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Mobile Optimized Header with Semester Filter */}
          <MobileOptimizedHeader
            title="Chào mừng trở lại!"
            subtitle="Quản lý hoạt động rèn luyện và theo dõi tiến độ sinh viên"
            badge={new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            action={
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="flex-1 sm:flex-none bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base border border-white border-opacity-20 text-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  >
                    {semesterOptions.map(opt => (
                      <option key={opt.value} value={opt.value} className="text-gray-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={loadDashboardData}
                    className="flex items-center justify-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors touch-target flex-shrink-0"
                    title="Làm mới"
                  >
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline text-sm sm:text-base">Làm mới</span>
                  </button>
                </div>
                {/* Semester closure controls (teacher/monitor) */}
                <div className="hidden md:block">
                  <SemesterClosureWidget
                    compact
                    classId={classes && classes.length > 0 ? classes[0]?.id : null}
                    enableSoftLock={true}
                    enableHardLock={true}
                    onChanged={loadDashboardData}
                  />
                </div>
              </div>
            }
          >
            {classes.length > 0 ? (
              <div className="flex items-center gap-2 text-blue-200 text-sm">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="line-clamp-1">Lớp: {classes.map(c => c.ten_lop).join(', ')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-200 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Chưa được gán lớp</span>
              </div>
            )}
          </MobileOptimizedHeader>

          {/* Mobile Optimized Stats Cards */}
          <MobileOptimizedGrid type="stats">
            <MobileOptimizedStatCard
              title="Tổng hoạt động"
              value={stats.totalActivities}
              icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="blue"
              subtitle="Trong học kỳ"
              onClick={() => navigate('/teacher/activities')}
            />
            <MobileOptimizedStatCard
              title="Chờ phê duyệt"
              value={stats.pendingApprovals}
              icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="orange"
              subtitle={`+${stats.approvedThisWeek} tuần này`}
              onClick={() => navigate('/teacher/approve')}
            />
            <MobileOptimizedStatCard
              title="Tổng sinh viên"
              value={stats.totalStudents}
              icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="green"
              subtitle="Trong các lớp"
              onClick={() => navigate('/teacher/students')}
            />
            <MobileOptimizedStatCard
              title="Điểm TB"
              value={stats.avgClassScore}
              icon={<Award className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="purple"
              subtitle={`${stats.participationRate}% tham gia`}
              onClick={() => navigate('/teacher/reports')}
            />
          </MobileOptimizedGrid>

          {/* Mobile Optimized Quick Actions */}
          <MobileOptimizedSection title="Thao tác nhanh">
            <MobileOptimizedGrid type="actions">
              <MobileOptimizedActionCard
                title="Phê duyệt hoạt động"
                description="Xem và phê duyệt các hoạt động chờ duyệt"
                icon={<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
                color="green"
                badge={stats.pendingApprovals > 0 ? stats.pendingApprovals : null}
                onClick={() => navigate('/teacher/approve')}
              />
              <MobileOptimizedActionCard
                title="Quản lý sinh viên"
                description="Xem danh sách và quản lý sinh viên lớp"
                icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
                color="blue"
                onClick={() => navigate('/teacher/students')}
              />
              <MobileOptimizedActionCard
                title="Tạo thông báo"
                description="Gửi thông báo đến sinh viên lớp"
                icon={<Bell className="w-5 h-5 sm:w-6 sm:h-6" />}
                color="purple"
                onClick={() => navigate('/teacher/notifications/create')}
              />
              <MobileOptimizedActionCard
                title="Xem báo cáo"
                description="Thống kê và xuất báo cáo chi tiết"
                icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />}
                color="orange"
                onClick={() => navigate('/teacher/reports')}
              />
            </MobileOptimizedGrid>
          </MobileOptimizedSection>

          {/* Recent Activities - Mobile Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Hoạt động chờ duyệt</h2>
                <button 
                  onClick={() => navigate('/teacher/approve')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 touch-target"
                >
                  Xem tất cả
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {recentActivities.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentActivities.map(activity => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              ) : (
                <MobileOptimizedEmptyState
                  icon={<Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300" />}
                  title="Chưa có hoạt động chờ duyệt"
                  message="Các hoạt động mới sẽ xuất hiện ở đây"
                />
              )}
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Thông báo gần đây</h2>
                <button 
                  onClick={() => navigate('/teacher/notifications')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 touch-target"
                >
                  Xem tất cả
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {recentNotifications.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentNotifications.map(notification => (
                    <div key={notification.id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg sm:rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{notification.tieu_de}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{notification.noi_dung}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.ngay_gui).toLocaleDateString('vi-VN')} - {new Date(notification.ngay_gui).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MobileOptimizedEmptyState
                  icon={<Bell className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300" />}
                  title="Chưa có thông báo nào"
                  message="Tạo thông báo mới để gửi đến sinh viên"
                />
              )}
            </div>
          </div>
    </div>
  );
}
