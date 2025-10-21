import React from 'react';
import { 
  Search, Filter, Calendar, MapPin, Users, Clock, Award, Eye, UserPlus, 
  ChevronRight, Grid3X3, List, SlidersHorizontal, ChevronLeft, Sparkles,
  TrendingUp, Star, Trophy, Zap, RefreshCw, AlertCircle, Info
} from 'lucide-react';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import { getActivityImage } from '../../utils/activityImages';
import SemesterClosureBanner from '../../components/SemesterClosureBanner';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function ActivitiesListModern() {
  const { showSuccess, showError, confirm } = useNotification();
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState({ type: '', status: '', from: '', to: '' });
  const [items, setItems] = React.useState([]);
  const [activityTypes, setActivityTypes] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [viewMode, setViewMode] = React.useState('grid');
  const [showFilters, setShowFilters] = React.useState(false);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 12, total: 0 });
  const [role, setRole] = React.useState('');
  const [selectedActivityId, setSelectedActivityId] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [scopeTab, setScopeTab] = React.useState('all'); // 'all', 'in-class', 'out-class'
  const [filteredItems, setFilteredItems] = React.useState([]);
  // Semester filter state
  const getCurrentSemesterValue = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 7 && currentMonth <= 11) return `hoc_ky_1-${currentYear}`;
    if (currentMonth === 12) return `hoc_ky_2-${currentYear}`;
    if (currentMonth >= 1 && currentMonth <= 4) return `hoc_ky_2-${currentYear - 1}`;
    return `hoc_ky_1-${currentYear}`;
  };
  const [semester, setSemester] = React.useState(getCurrentSemesterValue());
  const { options: semesterOptions } = useSemesterOptions();

  React.useEffect(() => {
    loadActivities();
    loadActivityTypes();
    http.get('/auth/profile')
      .then(res => {
        const p = res.data?.data || res.data || {};
        const r = String(p?.role || p?.vai_tro?.ten_vt || '').toLowerCase();
        setRole(r);
      })
      .catch(() => setRole(''));
  }, []);

  React.useEffect(() => {
    loadActivities();
  }, [pagination.page]);

  function loadActivityTypes() {
    http.get('/activities/types/list')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setActivityTypes(res.data.data);
        }
      })
      .catch(err => console.warn('Could not load activity types:', err));
  }

  function loadActivities() {
    setLoading(true);
    setError('');
    
    const params = { 
      q: query || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page: pagination.page,
      limit: pagination.limit,
      sort: 'ngay_bd',
      order: 'asc',
      semester: semester || undefined
    };

    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key];
      }
    });

    http.get('/activities', { params })
      .then(res => {
        const responseData = res.data?.data;
        if (responseData && Array.isArray(responseData.items)) {
          setItems(responseData.items);
          setPagination(prev => ({
            ...prev,
            total: responseData.total || 0
          }));
        } else {
          const items = Array.isArray(responseData) ? responseData : [];
          setItems(items);
          setPagination(prev => ({ ...prev, total: items.length }));
        }
      })
      .catch(err => {
        setItems([]);
        setError(err?.response?.data?.message || err?.message || 'Lỗi tải dữ liệu hoạt động');
      })
      .finally(() => setLoading(false));
  }

  function onSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadActivities();
  }

  function onFilterChange(newFilters) {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }

  // Tự động load khi filters thay đổi
  React.useEffect(() => {
    loadActivities();
  }, [filters, semester]);

  // Update filtered items when items or scopeTab changes
  React.useEffect(() => {
    const filtered = items.filter(activity => {
      // Filter by scope tab
      if (scopeTab === 'all') return true;
      if (scopeTab === 'in-class') return activity.is_class_activity === true;
      if (scopeTab === 'out-class') return activity.is_class_activity === false;
      return true;
    });
    setFilteredItems(filtered);
    console.log('📊 Filtered activities:', {
      total: items.length,
      inClass: items.filter(a => a.is_class_activity).length,
      outClass: items.filter(a => !a.is_class_activity).length,
      currentTab: scopeTab,
      filteredCount: filtered.length
    });
  }, [items, scopeTab]);

  // Đếm số filter đang active
  function getActiveFilterCount() {
    let count = 0;
    if (filters.type) count++;
    if (filters.status) count++;
    if (filters.from) count++;
    if (filters.to) count++;
    return count;
  }

  // Clear tất cả filters
  function clearAllFilters() {
    setFilters({ type: '', status: '', from: '', to: '' });
    setQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }

  async function handleRegister(activityId, activityName) {
    const confirmed = await confirm({
      title: 'Xác nhận đăng ký',
      message: `Bạn có chắc muốn đăng ký tham gia "${activityName}"?`,
      confirmText: 'Đăng ký',
      cancelText: 'Hủy'
    });
    
    if (!confirmed) return;
    
    http.post(`/activities/${activityId}/register`)
      .then(res => {
        if (res.data?.success) {
          showSuccess('Đăng ký thành công');
          loadActivities();
        } else {
          showSuccess(res.data?.message || 'Đăng ký thành công');
        }
      })
      .catch(err => {
        const firstValidation = err?.response?.data?.errors?.[0]?.message;
        const errorMsg = firstValidation || err?.response?.data?.message || err?.message || 'Đăng ký thất bại';
        showError(errorMsg);
      });
  }

  function handleViewDetail(activityId) {
    setSelectedActivityId(activityId);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedActivityId(null);
  }

  function handlePageChange(newPage) {
    setPagination(prev => ({ ...prev, page: newPage }));
  }

  function parseDateSafe(d) {
    try { return d ? new Date(d) : null; } catch(_) { return null; }
  }

  function ActivityCard({ activity, mode = 'grid' }) {
    const startDate = parseDateSafe(activity.ngay_bd) || new Date();
    const endDate = parseDateSafe(activity.ngay_kt) || startDate;
    const now = new Date();
    const isUpcoming = startDate > now;
    const isOngoing = startDate <= now && endDate >= now;
    const isPast = endDate < now;
    // Fix: chỉ kiểm tra deadline nếu có han_dk, không fallback về startDate
    const deadline = activity.han_dk ? parseDateSafe(activity.han_dk) : null;
    const isDeadlinePast = deadline ? (deadline.getTime() < now.getTime()) : false;
    const isAfterStart = now.getTime() >= startDate.getTime();
    
    // Debug log
    if (activity.ten_hd?.includes('Hội thảo') || activity.ten_hd?.includes('AI')) {
      console.log('[ActivityCard Debug]', {
        name: activity.ten_hd,
        ngay_bd_raw: activity.ngay_bd,
        startDate: startDate.toISOString(),
        han_dk_raw: activity.han_dk,
        deadline: deadline?.toISOString(),
        now: now.toISOString(),
        isDeadlinePast,
        isAfterStart,
        showWarning: (isDeadlinePast || isAfterStart)
      });
    }

    // Registration status config (trạng thái đăng ký của sinh viên)
    const registrationStatusConfig = {
      'cho_duyet': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Chờ duyệt', gradient: 'from-amber-400 to-orange-500' },
      'da_duyet': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Đã duyệt', gradient: 'from-emerald-400 to-green-500' },
      'tu_choi': { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-400', label: 'Bị từ chối', gradient: 'from-rose-400 to-red-500' },
      'da_tham_gia': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Đã tham gia', gradient: 'from-blue-400 to-indigo-500' }
    };

    // Activity status config (trạng thái hoạt động)
    const activityStatusConfig = {
      'cho_duyet': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Chờ duyệt', gradient: 'from-gray-400 to-slate-500' },
      'da_duyet': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-400', label: 'Đã mở', gradient: 'from-green-400 to-emerald-500' },
      'tu_choi': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-400', label: 'Bị từ chối', gradient: 'from-red-400 to-rose-500' },
      'ket_thuc': { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400', label: 'Đã kết thúc', gradient: 'from-slate-400 to-gray-500' }
    };

    // Use registration status if user is registered, otherwise show activity status
    const status = activity.is_registered && activity.registration_status 
      ? registrationStatusConfig[activity.registration_status] || activityStatusConfig['da_duyet']
      : activityStatusConfig[activity.trang_thai] || activityStatusConfig['da_duyet'];
    
    const timeStatus = isPast ? 'Đã kết thúc' : 
                     isOngoing ? 'Đang diễn ra' : 
                     isUpcoming ? 'Sắp diễn ra' : 'Chưa xác định';

    const timeStatusColor = isPast ? 'text-slate-500' : 
                          isOngoing ? 'text-emerald-600' : 
                          isUpcoming ? 'text-blue-600' : 'text-slate-500';

    // Allow re-registration if: not registered OR registration was rejected (tu_choi)
    const canRegister = activity.trang_thai === 'da_duyet' && !isPast && !isDeadlinePast && !isAfterStart 
      && (!activity.is_registered || activity.registration_status === 'tu_choi') 
      && role !== 'giang_vien' && role !== 'teacher';
    const activityType = activity.loai || activity.loai_hd?.ten_loại_hd || 'Chưa phân loại';

    if (mode === 'list') {
      return (
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300">
            <div className="flex items-start gap-6">
              {/* Activity Image */}
              <div className="relative w-64 h-48 flex-shrink-0">
                <img 
                  src={getActivityImage(activity.hinh_anh, activity.loai_hd?.ten_loai_hd)} 
                  alt={activity.ten_hd}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
                
                {/* Status Badge on Image */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/90 backdrop-blur-sm ${status.text} shadow-lg`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`}></span>
                    {status.label}
                  </span>
                  {activity.is_class_activity && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500/90 backdrop-blur-sm text-white shadow-lg">
                      <Users className="h-3 w-3 mr-1.5" />
                      Lớp của tôi
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {activity.ten_hd || 'Hoạt động'}
                      </h3>
                      {activity.is_class_activity && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500 text-white">
                          <Users className="h-3 w-3 mr-1" />
                          Lớp
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                        <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                        <span className="font-medium text-blue-700">{activityType}</span>
                      </span>
                      <span className={`font-medium ${timeStatusColor}`}>{timeStatus}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${status.bg} ${status.text} border-2 ${status.border}`}>
                      {status.label}
                    </span>
                    {activity.registration_status === 'tu_choi' && activity.rejection_reason && (
                      <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg max-w-xs">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-semibold text-red-700">Lý do từ chối:</p>
                          <p className="text-red-600">{activity.rejection_reason}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200">
                      <Trophy className="h-4 w-4 text-amber-600" />
                      <span className="font-bold text-amber-700">+{activity.diem_rl || 0} điểm</span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Thời gian</p>
                      <p className="text-sm font-semibold text-gray-900">{startDate.toLocaleDateString('vi-VN')}</p>
                      <p className="text-xs text-gray-500">{startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs text-green-600 font-medium">Địa điểm</p>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{activity.dia_diem || 'Chưa xác định'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Đơn vị</p>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{activity.don_vi_to_chuc || 'Nhà trường'}</p>
                    </div>
                  </div>
                </div>

                {/* Deadline Warning */}
                {(isDeadlinePast || isAfterStart) && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                    <Clock className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Đã quá hạn đăng ký</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleRegister(activity.id, activity.ten_hd)}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    canRegister
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!canRegister}
                >
                  <UserPlus className="h-5 w-5" />
                  {activity.registration_status === 'tu_choi' ? 'Đăng ký lại' : 
                   activity.is_registered ? 'Đã đăng ký' : 'Đăng ký'}
                </button>
                
                <button
                  onClick={() => handleViewDetail(activity.id)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <Eye className="h-5 w-5" />
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Grid mode
    return (
      <div className="group relative h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
        
        <div className="relative bg-white border-2 border-gray-100 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-blue-200 transition-all duration-300 flex flex-col h-full">
          {/* Activity Image */}
          <div className="relative w-full h-48 overflow-hidden">
            <img 
              src={getActivityImage(activity.hinh_anh, activity.loai_hd?.ten_loai_hd)} 
              alt={activity.ten_hd}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            
            {/* Badges on Image */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/90 backdrop-blur-sm ${status.text} shadow-lg`}>
                  <div className={`w-2 h-2 rounded-full ${status.dot} mr-2 animate-pulse`}></div>
                  {status.label}
                </span>
                {activity.is_class_activity && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500/90 backdrop-blur-sm text-white shadow-lg">
                    <Users className="h-3 w-3 mr-1.5" />
                    Lớp của tôi
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/90 backdrop-blur-sm text-white shadow-lg">
                <Trophy className="h-4 w-4" />
                <span className="font-bold">+{activity.diem_rl || 0}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {activity.ten_hd || 'Hoạt động'}
            </h3>
            
            <p className="text-sm text-gray-600 line-clamp-2">
              {activity.mo_ta || 'Chưa có mô tả'}
            </p>

            {/* Meta Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-700">{activityType}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{startDate.toLocaleDateString('vi-VN')}</p>
                  <p className="text-xs text-gray-500">{startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-medium text-gray-700 line-clamp-1">{activity.dia_diem || 'Chưa xác định'}</span>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${timeStatusColor}`}>{timeStatus}</span>
              {(isDeadlinePast || isAfterStart) && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  Hết hạn ĐK
                </span>
              )}
            </div>

            {/* Rejection Reason */}
            {activity.registration_status === 'tu_choi' && activity.rejection_reason && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-red-700">Lý do từ chối:</p>
                  <p className="text-red-600">{activity.rejection_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 mt-4 border-t-2 border-gray-100">
            {canRegister && (
              <button
                onClick={() => handleRegister(activity.id, activity.ten_hd)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <UserPlus className="h-4 w-4" />
                {activity.registration_status === 'tu_choi' ? 'Đăng ký lại' : 'Đăng ký'}
              </button>
            )}
            <button
              onClick={() => handleViewDetail(activity.id)}
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 ${canRegister ? '' : 'flex-1'}`}
            >
              <Eye className="h-4 w-4" />
              Chi tiết
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Semester closure banner (read-only, non-invasive) */}
      <SemesterClosureBanner />
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-8">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  Danh Sách Hoạt Động
                  <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                </h1>
              </div>
              <p className="text-blue-100 text-lg">Khám phá và tham gia các hoạt động rèn luyện bổ ích</p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                <p className="text-white/80 text-sm mb-1">Tổng số</p>
                <p className="text-2xl font-bold text-white">{pagination.total}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
        
        <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-6">
          {/* Search Bar */}
          <form onSubmit={onSearch} className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="block w-full pl-12 pr-40 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Tìm kiếm hoạt động..."
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Search className="h-4 w-4" />
                  Tìm kiếm
                </button>
              </div>
            </div>
          </form>

          {/* Scope Tabs - Show only for students */}
          {(role === 'student' || role === 'sinh_vien') && (
            <div className="mb-6">
              <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-2 border-2 border-gray-200">
                <button
                  onClick={() => setScopeTab('all')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                    scopeTab === 'all' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105 transform' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Tất cả</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full min-w-[28px] ${
                    scopeTab === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {items.length}
                  </span>
                </button>
                
                <button
                  onClick={() => setScopeTab('in-class')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                    scopeTab === 'in-class' 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl scale-105 transform' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>Lớp của tôi</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full min-w-[28px] ${
                    scopeTab === 'in-class'
                      ? 'bg-white/20 text-white'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {items.filter(item => item.is_class_activity).length}
                  </span>
                </button>
                
                <button
                  onClick={() => setScopeTab('out-class')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                    scopeTab === 'out-class' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl scale-105 transform' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <TrendingUp className="h-5 w-5" />
                  <span>Ngoài lớp</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full min-w-[28px] ${
                    scopeTab === 'out-class'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {items.filter(item => !item.is_class_activity).length}
                  </span>
                </button>
              </div>
              
              {/* Tab Description */}
              <div className="mt-3 px-2">
                {scopeTab === 'all' && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    Hiển thị tất cả hoạt động có thể tham gia
                  </p>
                )}
                {scopeTab === 'in-class' && (
                  <p className="text-sm text-green-700 flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <Users className="h-4 w-4 text-green-600" />
                    Các hoạt động do giảng viên chủ nhiệm hoặc lớp trưởng của lớp bạn tạo
                  </p>
                )}
                {scopeTab === 'out-class' && (
                  <p className="text-sm text-purple-700 flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Các hoạt động từ các lớp khác và tổ chức bên ngoài
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Filter Toggle and View Mode */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium"
              >
                <SlidersHorizontal className="h-5 w-5" />
                <span>Lọc nâng cao</span>
                {getActiveFilterCount() > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                    {getActiveFilterCount()}
                  </span>
                )}
                <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 px-4 py-3 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 font-medium"
                  title="Xóa tất cả bộ lọc"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Xóa bộ lọc</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Hiển thị:</span>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Hiển thị dạng lưới"
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Hiển thị dạng danh sách"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
              {/* Semester picker */}
              <div className="relative">
                <select
                  value={semester}
                  onChange={(e) => { setSemester(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="ml-2 w-full sm:w-auto pl-3 pr-8 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  title="Chọn học kỳ"
                >
                  {semesterOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-gray-200 animate-slideDown">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="h-5 w-5 text-blue-600" />
                  Bộ lọc nâng cao
                </h3>
                {getActiveFilterCount() > 0 && (
                  <span className="text-sm text-gray-600">
                    Đang áp dụng <span className="font-bold text-blue-600">{getActiveFilterCount()}</span> bộ lọc
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="inline-flex text-sm font-semibold text-gray-700 mb-2 items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Loại hoạt động
                  </label>
                  <select
                    value={filters.type}
                    onChange={e => {
                      const newFilters = {...filters, type: e.target.value};
                      setFilters(newFilters);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-300"
                  >
                    <option value="">Tất cả loại</option>
                    {activityTypes.map(type => (
                      <option key={type.id} value={type.name}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="inline-flex text-sm font-semibold text-gray-700 mb-2 items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    Trạng thái
                  </label>
                  <select
                    value={filters.status}
                    onChange={e => {
                      const newFilters = {...filters, status: e.target.value};
                      setFilters(newFilters);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-300"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="soon">🔵 Sắp diễn ra</option>
                    <option value="open">🟢 Đang mở đăng ký</option>
                    <option value="closed">⚫ Đã kết thúc</option>
                  </select>
                </div>
                
                <div>
                  <label className="inline-flex text-sm font-semibold text-gray-700 mb-2 items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={e => {
                      const newFilters = {...filters, from: e.target.value};
                      setFilters(newFilters);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-300"
                  />
                </div>
                
                <div>
                  <label className="inline-flex text-sm font-semibold text-gray-700 mb-2 items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={e => {
                      const newFilters = {...filters, to: e.target.value};
                      setFilters(newFilters);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-300"
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {getActiveFilterCount() > 0 ? (
                    <span>✓ Đã áp dụng <strong>{getActiveFilterCount()}</strong> bộ lọc</span>
                  ) : (
                    <span>Chưa có bộ lọc nào được áp dụng</span>
                  )}
                </div>
                {getActiveFilterCount() > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Xóa tất cả
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative inline-block mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-r-indigo-600 absolute inset-0"></div>
            <Zap className="absolute inset-0 m-auto h-6 w-6 text-blue-600 animate-pulse" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">Đang tải danh sách...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 rounded-xl p-3">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-red-900 font-semibold">Đã xảy ra lỗi</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!loading && !error && filteredItems.length === 0) && (
        <div className="text-center py-16">
          <div className="inline-block p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full mb-6">
            {scopeTab === 'all' && <Calendar className="h-16 w-16 text-blue-400" />}
            {scopeTab === 'in-class' && <Users className="h-16 w-16 text-green-400" />}
            {scopeTab === 'out-class' && <TrendingUp className="h-16 w-16 text-purple-400" />}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {scopeTab === 'all' && 'Không tìm thấy hoạt động nào'}
            {scopeTab === 'in-class' && 'Lớp chưa có hoạt động nào'}
            {scopeTab === 'out-class' && 'Chưa có hoạt động ngoài lớp'}
          </h3>
          <p className="text-gray-600 mb-6">
            {scopeTab === 'all' && 'Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác'}
            {scopeTab === 'in-class' && 'Giảng viên chủ nhiệm hoặc lớp trưởng chưa tạo hoạt động nào'}
            {scopeTab === 'out-class' && 'Hiện chưa có hoạt động từ các lớp khác hoặc bên ngoài'}
          </p>
          {scopeTab !== 'all' && (
            <button
              onClick={() => setScopeTab('all')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Sparkles className="h-5 w-5" />
              Xem tất cả hoạt động
            </button>
          )}
          {scopeTab === 'all' && (
            <button
              onClick={() => {
                setQuery('');
                setFilters({ type: '', status: '', from: '', to: '' });
                setPagination(prev => ({ ...prev, page: 1 }));
                loadActivities();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RefreshCw className="h-5 w-5" />
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Activities Grid/List */}
      {(!loading && !error && filteredItems.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-700 font-semibold">
              {scopeTab === 'all' && (
                <>Tìm thấy <span className="text-blue-600 font-bold">{filteredItems.length}</span> hoạt động</>
              )}
              {scopeTab === 'in-class' && (
                <>Có <span className="text-green-600 font-bold">{filteredItems.length}</span> hoạt động lớp của bạn</>
              )}
              {scopeTab === 'out-class' && (
                <>Có <span className="text-purple-600 font-bold">{filteredItems.length}</span> hoạt động ngoài lớp</>
              )}
            </span>
            <button
              onClick={loadActivities}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-xl transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
          </div>

          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
            {filteredItems.map((activity, idx) => (
              <ActivityCard key={activity.id || idx} activity={activity} mode={viewMode} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-center mt-10 gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  pagination.page <= 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200 shadow-md'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
                Trước
              </button>

              {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.limit)) }, (_, i) => {
                const pageNum = pagination.page - 2 + i;
                const isValidPage = pageNum > 0 && pageNum <= Math.ceil(pagination.total / pagination.limit);
                if (!isValidPage) return null;

                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-5 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      pageNum === pagination.page
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }).filter(Boolean)}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  pagination.page >= Math.ceil(pagination.total / pagination.limit)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200 shadow-md'
                }`}
              >
                Sau
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activityId={selectedActivityId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
