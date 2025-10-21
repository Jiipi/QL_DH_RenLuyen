import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, MapPin, Award, Users, Eye, UserPlus, 
  Filter, Search, X, ChevronDown, AlertCircle, Trophy, 
  CheckCircle, XCircle, BookOpen
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import http from '../../services/http';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import ActivityQRModal from '../../components/ActivityQRModal';
import { getActivityImage, getBestActivityImage } from '../../utils/activityImages';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function MonitorMyActivities() {
  const [viewMode, setViewMode] = useState('available'); // available | pending | approved | completed
  const [activities, setActivities] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [activityTypes, setActivityTypes] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  // ❌ Removed scopeFilter - only show class activities
  
  // ✅ Add semester filter
  const getCurrentSemesterValue = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 7 && currentMonth <= 11) return `hoc_ky_1-${currentYear}`;
    else if (currentMonth === 12) return `hoc_ky_2-${currentYear}`;
    else if (currentMonth >= 1 && currentMonth <= 4) return `hoc_ky_2-${currentYear - 1}`;
    else return `hoc_ky_1-${currentYear}`;
  };
  
  const [semester, setSemester] = useState(getCurrentSemesterValue());

  const { options: semesterOptions } = useSemesterOptions();
  
  const { showSuccess, showError, confirm } = useNotification();

  useEffect(() => {
    loadActivityTypes();
    loadMyRegistrations();
  }, [semester]); // ✅ Add semester dependency

  useEffect(() => {
    if (viewMode === 'available') {
      loadAvailableActivities();
    } else {
      loadMyRegistrations();
    }
  }, [viewMode, searchText, filters, semester]); // ✅ Add semester dependency

  // Load activity types for filter
  function loadActivityTypes() {
    http.get('/activities/types/list')
      .then(res => {
        const types = res.data?.data || [];
        setActivityTypes(types);
      })
      .catch(() => setActivityTypes([]));
  }

  // Load available activities (for registration)
  function loadAvailableActivities() {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchText) params.append('q', searchText);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('trangThai', filters.status);
    params.append('trangThai', 'da_duyet'); // Only approved activities
    params.append('semester', semester); // ✅ Add semester filter
    params.append('limit', '100'); // Get more activities to ensure we see all unregistered ones

    http.get(`/activities?${params.toString()}`)
      .then(res => {
        console.log('📊 API Response for /activities:', res.data);
        const data = res.data?.data || res.data || {};
        let items = data.items || data || [];
        items = Array.isArray(items) ? items : [];
        console.log(`📝 Total activities from API: ${items.length}`);
        
        // DEBUG: Show alert with total
        if (items.length === 0) {
          console.warn('⚠️ API returned 0 activities!');
        }
        
        // Log registration status
        items.forEach(act => {
          console.log(`  - ${act.ten_hd}: is_registered=${act.is_registered}, is_class_activity=${act.is_class_activity}`);
        });
        
        // ✅ Filter: Only show class activities (lớp trưởng manages class activities)
        const beforeClassFilter = items.length;
        items = items.filter(activity => activity.is_class_activity === true);
        console.log(`✅ After filter (is_class_activity): ${items.length} activities (was ${beforeClassFilter})`);
        
        // ✅ NEW LOGIC: Show ALL approved class activities here
        // Registered activities will ALSO appear in their status tabs (Chờ duyệt/Đã duyệt/Đã tham gia)
        // This gives complete visibility: see all class activities + track registration status
        console.log(`ℹ️ Showing ALL approved class activities (${items.length} total)`);
        console.log(`ℹ️ Registered activities also visible in status tabs`);
        
        if (items.length === 0) {
          console.warn('⚠️ No approved class activities found for this semester');
        }
        
        // Sort: Open registration first, then by start date
        const now = new Date();
        items.sort((a, b) => {
          const aDeadline = parseDateSafe(a.han_dk || a.ngay_bd);
          const bDeadline = parseDateSafe(b.han_dk || b.ngay_bd);
          const aStart = parseDateSafe(a.ngay_bd);
          const bStart = parseDateSafe(b.ngay_bd);
          
          const aIsOpen = aDeadline && aDeadline > now && aStart && aStart > now;
          const bIsOpen = bDeadline && bDeadline > now && bStart && bStart > now;
          
          // Open registrations first
          if (aIsOpen && !bIsOpen) return -1;
          if (!aIsOpen && bIsOpen) return 1;
          
          // Within same category, sort by start date (nearest first)
          if (aStart && bStart) return aStart - bStart;
          return 0;
        });
        
        setActivities(items);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }

  // Load my registrations
  function loadMyRegistrations() {
    setLoading(true);
    // ✅ Add semester parameter
    http.get(`/dashboard/activities/me?semester=${semester}`)
      .then(res => {
        const data = res.data?.data || [];
        console.log('📊 My Registrations API Response:', data);
        console.log(`📝 Total registrations: ${data.length}`);
        
        // Log each registration
        data.forEach((reg, index) => {
          console.log(`  ${index + 1}. ${reg.hoat_dong?.ten_hd} - Status: ${reg.trang_thai_dk} - is_class_activity: ${reg.is_class_activity}`);
        });
        
        // Count by status
        const pending = data.filter(r => r.is_class_activity === true && r.trang_thai_dk === 'cho_duyet').length;
        const approved = data.filter(r => r.is_class_activity === true && r.trang_thai_dk === 'da_duyet').length;
        const completed = data.filter(r => r.is_class_activity === true && r.trang_thai_dk === 'da_tham_gia').length;
        console.log(`✅ Class Activity Counts: Pending=${pending}, Approved=${approved}, Completed=${completed}`);
        
        setMyRegistrations(Array.isArray(data) ? data : []);
        
        // Calculate total points from completed activities (for selected semester)
        const points = data
          .filter(reg => reg.trang_thai_dk === 'da_tham_gia')
          .reduce((sum, reg) => sum + (parseFloat(reg.hoat_dong?.diem_rl) || 0), 0);
        setTotalPoints(points);
      })
      .catch(() => setMyRegistrations([]))
      .finally(() => setLoading(false));
  }

  // Register for activity
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
          showSuccess('Đăng ký thành công. Chờ phê duyệt từ giảng viên.');
          loadAvailableActivities();
          loadMyRegistrations();
        } else {
          showSuccess(res.data?.message || 'Đăng ký thành công');
          loadAvailableActivities();
          loadMyRegistrations();
        }
      })
      .catch(err => {
        const errorMsg = err?.response?.data?.errors?.[0]?.message || 
                        err?.response?.data?.message || 
                        'Đăng ký thất bại';
        showError(errorMsg);
      });
  }

  // Cancel registration
  async function handleCancel(hdId, activityName) {
    const confirmed = await confirm({
      title: 'Xác nhận hủy đăng ký',
      message: `Bạn có chắc muốn hủy đăng ký hoạt động "${activityName}"?`,
      confirmText: 'Hủy đăng ký',
      cancelText: 'Không'
    });
    
    if (!confirmed) return;
    
    http.post(`/activities/${hdId}/cancel`)
      .then(res => {
        if (res.data?.success) {
          showSuccess('Hủy đăng ký thành công');
          loadMyRegistrations();
        } else {
          showSuccess(res.data?.message || 'Hủy đăng ký thành công');
          loadMyRegistrations();
        }
      })
      .catch(err => {
        const errorMsg = err?.response?.data?.message || 'Hủy đăng ký thất bại';
        showError(errorMsg);
      });
  }

  // View activity detail
  function handleViewDetail(activityId) {
    window.location.href = `/activities/${activityId}`;
  }

  // Show QR for attendance
  function handleShowQR(activityId, activityName) {
    setSelectedActivity({ id: activityId, ten_hd: activityName });
    setShowQRModal(true);
  }

  // Filter registered activities by status (removed scope filter)
  function getFilteredRegistrations() {
    let filtered = myRegistrations;
    
    // Filter by tab status
    if (viewMode === 'pending') {
      filtered = filtered.filter(reg => reg.trang_thai_dk === 'cho_duyet');
    } else if (viewMode === 'approved') {
      filtered = filtered.filter(reg => reg.trang_thai_dk === 'da_duyet');
    } else if (viewMode === 'completed') {
      filtered = filtered.filter(reg => reg.trang_thai_dk === 'da_tham_gia');
    }

    // Filter 3: Filter by search text
    if (searchText) {
      filtered = filtered.filter(reg => 
        reg.hoat_dong?.ten_hd?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return filtered;
  }

  // Parse date safely
  function parseDateSafe(dateStr) {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  // Format date
  function formatDate(dateStr) {
    const date = parseDateSafe(dateStr);
    return date ? date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : '—';
  }

  // Get status badge
  function getStatusBadge(status) {
    const badges = {
      'cho_duyet': { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      'da_duyet': { label: 'Đã duyệt', color: 'bg-green-100 text-green-700 border-green-200' },
      'tu_choi': { label: 'Từ chối', color: 'bg-red-100 text-red-700 border-red-200' },
      'da_tham_gia': { label: 'Hoàn thành', color: 'bg-blue-100 text-blue-700 border-blue-200' }
    };
    
    const badge = badges[status] || badges['cho_duyet'];
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        {status === 'da_duyet' && <CheckCircle className="h-3 w-3" />}
        {status === 'tu_choi' && <XCircle className="h-3 w-3" />}
        {status === 'da_tham_gia' && <Trophy className="h-3 w-3" />}
        {badge.label}
      </span>
    );
  }

  // Render available activities
  function renderAvailableActivities() {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (activities.length === 0) {
      return (
        <div className="text-center py-20">
          <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">Không có hoạt động nào</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map(activity => {
          const startDate = parseDateSafe(activity.ngay_bd);
          const endDate = parseDateSafe(activity.ngay_kt);
          const deadline = parseDateSafe(activity.han_dk);
          const now = new Date();
          
          const isDeadlinePast = deadline && deadline < now;
          const isAfterStart = startDate && startDate < now;
          // Ensure we always pass a usable image url for rendering
          const imageUrl = getBestActivityImage(activity);
          // Lớp trưởng: ẩn nút đăng ký khi đã quá hạn hoặc đã đăng ký
          const canRegister = !activity.is_registered && !isDeadlinePast;
          const isRegistrationOpen = canRegister;
          
          return (
            <div key={activity.id} className={`bg-white border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 ${
              isRegistrationOpen ? 'border-green-300 bg-green-50/20' : 'border-gray-200'
            }`}>
              {/* Activity Image */}
              <div className="relative w-full h-40 overflow-hidden">
                <img 
                  src={imageUrl} 
                  alt={activity.ten_hd}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                
                {/* Badges on Image */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-700 rounded-full text-xs font-semibold shadow-lg">
                    {activity.loai_hd?.ten_loai_hd || activity.loai || 'Khác'}
                  </span>
                  {isRegistrationOpen && (
                    <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-semibold animate-pulse shadow-lg">
                      Đang mở
                    </span>
                  )}
                </div>
                
                {/* Points Badge on Image */}
                <div className="absolute bottom-3 right-3">
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/90 backdrop-blur-sm text-white rounded-full text-sm font-bold shadow-lg">
                    <Award className="h-4 w-4" />
                    +{activity.diem_rl}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
              {/* Title */}
              <h3 className="text-lg font-bold text-gray-800 mb-3 line-clamp-2 min-h-[3.5rem]">
                {activity.ten_hd}
              </h3>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{formatDate(activity.ngay_bd)}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{activity.dia_diem || 'Chưa xác định'}</span>
                </div>
                {activity.don_vi_to_chuc && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{activity.don_vi_to_chuc}</span>
                  </div>
                )}
              </div>

              {/* Deadline Warning */}
              {/* Chỉ cảnh báo quá hạn khi chưa đăng ký */}
              {isDeadlinePast && !activity.is_registered && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs text-red-700 font-medium">Đã quá hạn đăng ký</span>
                </div>
              )}

              {/* Already Registered */}
              {activity.is_registered && (
                <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-xs text-green-700 font-medium">✓ Bạn đã đăng ký hoạt động này</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {canRegister && (
                  <button
                    onClick={() => handleRegister(activity.id, activity.ten_hd)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    Đăng ký
                  </button>
                )}
                <button
                  onClick={() => handleViewDetail(activity.id)}
                  className={`${canRegister ? '' : 'flex-1'} flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all`}
                >
                  <Eye className="h-4 w-4" />
                  Chi tiết
                </button>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render my registrations
  function renderMyRegistrations() {
    const filteredRegs = getFilteredRegistrations();

    if (loading) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (filteredRegs.length === 0) {
      return (
        <div className="text-center py-20">
          <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">
            {viewMode === 'completed' ? 'Chưa hoàn thành hoạt động nào' : 'Chưa đăng ký hoạt động nào'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegs.map(reg => {
          const activity = reg.hoat_dong || {};
          const imageUrl = getBestActivityImage(activity);
          const canCancel = reg.trang_thai_dk === 'cho_duyet' || reg.trang_thai_dk === 'da_duyet';
          const canShowQR = reg.trang_thai_dk === 'da_duyet';
          
          return (
            <div key={reg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
              {/* Activity Image */}
              <div className="relative w-full h-40 overflow-hidden">
                <img 
                  src={imageUrl} 
                  alt={activity.ten_hd}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                
                {/* Status Badge on Image */}
                <div className="absolute top-3 left-3">
                  {getStatusBadge(reg.trang_thai_dk)}
                </div>
                
                {/* Points Badge on Image */}
                <div className="absolute bottom-3 right-3">
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/90 backdrop-blur-sm text-white rounded-full text-sm font-bold shadow-lg">
                    <Award className="h-4 w-4" />
                    +{activity.diem_rl}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
              {/* Title */}
              <h3 className="text-lg font-bold text-gray-800 mb-3 line-clamp-2 min-h-[3.5rem]">
                {activity.ten_hd}
              </h3>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{formatDate(activity.ngay_bd)}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{activity.dia_diem || 'Chưa xác định'}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Đăng ký: {formatDate(reg.ngay_dang_ky)}</span>
                </div>
              </div>

              {/* Reject Reason */}
              {reg.trang_thai_dk === 'tu_choi' && reg.ly_do_tu_choi && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">
                    <strong>Lý do:</strong> {reg.ly_do_tu_choi}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {canShowQR && (
                  <button
                    onClick={() => handleShowQR(activity.id, activity.ten_hd)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium transition-all"
                  >
                    <Trophy className="h-4 w-4" />
                    QR Code
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => handleCancel(activity.id, activity.ten_hd)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all"
                  >
                    <XCircle className="h-4 w-4" />
                    Hủy
                  </button>
                )}
                <button
                  onClick={() => handleViewDetail(activity.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
                >
                  <Eye className="h-4 w-4" />
                  Chi tiết
                </button>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hoạt động của tôi</h1>
            <p className="text-blue-100">Quản lý hoạt động cá nhân - Lớp trưởng</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{totalPoints.toFixed(2)}</div>
            <div className="text-blue-100">Tổng điểm rèn luyện</div>
          </div>
        </div>
      </div>

      {/* Semester Filter */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">Học kỳ:</span>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-medium text-gray-700 hover:border-blue-300 cursor-pointer"
          >
            {semesterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 bg-white border rounded-lg p-2 overflow-x-auto">
        <button
          onClick={() => setViewMode('available')}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
            viewMode === 'available'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="h-5 w-5" />
            Hoạt động có sẵn
          </div>
        </button>
        <button
          onClick={() => setViewMode('pending')}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
            viewMode === 'pending'
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5" />
            Chờ duyệt
            {myRegistrations.filter(r => r.trang_thai_dk === 'cho_duyet').length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {myRegistrations.filter(r => r.trang_thai_dk === 'cho_duyet').length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setViewMode('approved')}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
            viewMode === 'approved'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Đã duyệt
            {myRegistrations.filter(r => r.trang_thai_dk === 'da_duyet').length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {myRegistrations.filter(r => r.trang_thai_dk === 'da_duyet').length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setViewMode('completed')}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
            viewMode === 'completed'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5" />
            Hoàn thành
            {myRegistrations.filter(r => r.trang_thai_dk === 'da_tham_gia').length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {myRegistrations.filter(r => r.trang_thai_dk === 'da_tham_gia').length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Scope Filter - REMOVED: Only show class activities for monitor */}

      {/* Search & Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm hoạt động..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter - Only for available activities */}
          {viewMode === 'available' && (
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả loại</option>
              {activityTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'available' ? renderAvailableActivities() : renderMyRegistrations()}

      {/* Modals */}
      {showDetailModal && (
        <ActivityDetailModal
          activityId={selectedActivity}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedActivity(null);
            // Reload after modal close in case user registered
            if (viewMode === 'available') {
              loadAvailableActivities();
            }
            loadMyRegistrations();
          }}
        />
      )}

      {showQRModal && selectedActivity && (
        <ActivityQRModal
          activityId={selectedActivity.id}
          activityName={selectedActivity.ten_hd}
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedActivity(null);
            // Reload after QR modal close - attendance might change status
            loadMyRegistrations();
          }}
        />
      )}
    </div>
  );
}
