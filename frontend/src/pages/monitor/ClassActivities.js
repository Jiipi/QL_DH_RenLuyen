import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Edit, Trash2, Eye, Plus, Search, Filter, Users, Clock, MapPin, Award, AlertCircle, CheckCircle, XCircle, QrCode, X, Sparkles, TrendingUp, Activity as ActivityIcon, BarChart3, Save } from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';
import { useNotification } from '../../contexts/NotificationContext';
import ActivityQRModal from '../../components/ActivityQRModal';
import FileUpload from '../../components/FileUpload';
import { getActivityImage } from '../../utils/activityImages';

export default function ClassActivities() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, confirm } = useNotification();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // Status view: 'all', 'cho_duyet', 'da_duyet', 'tu_choi', 'da_huy', 'ket_thuc'
  const [error, setError] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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
  
  // ✅ Add dashboard stats state to get accurate total activities count
  const [dashboardStats, setDashboardStats] = useState({
    totalActivities: 0,
    approvedCount: 0,
    endedCount: 0
  });

  const { options: semesterOptions } = useSemesterOptions();

  // Status mappings (matching Prisma TrangThaiHoatDong enum)
  const statusLabels = {
    'cho_duyet': 'Chờ duyệt',
    'da_duyet': 'Đã duyệt',
    'tu_choi': 'Từ chối',
    'da_huy': 'Đã hủy',
    'ket_thuc': 'Kết thúc'
  };

  const statusColors = {
    'cho_duyet': 'bg-amber-50 text-amber-700 border-amber-200',
    'da_duyet': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'tu_choi': 'bg-rose-50 text-rose-700 border-rose-200',
    'da_huy': 'bg-slate-50 text-slate-700 border-slate-200',
    'ket_thuc': 'bg-purple-50 text-purple-700 border-purple-200'
  };

  useEffect(() => {
    loadActivities();
    loadDashboardStats(); // ✅ Load dashboard stats for accurate counts
  }, [semester]); // ✅ Add semester dependency

  // ✅ Load dashboard stats to get accurate total activities count
  const loadDashboardStats = async () => {
    try {
      const response = await http.get(`/class/dashboard?semester=${semester}`);
      const data = response.data?.data || response.data || {};
      const summary = data.summary || {};
      
      setDashboardStats({
        totalActivities: summary.totalActivities || 0,
        approvedCount: summary.approvedCount || 0,
        endedCount: summary.endedCount || 0
      });
      
      console.log('📊 Dashboard stats loaded:', summary);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      // Fallback to counting from activities if dashboard fails
      setDashboardStats({
        totalActivities: 0,
        approvedCount: 0,
        endedCount: 0
      });
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      // ✅ Add semester parameter
      // Backend now returns ALL statuses for lop_truong and giang_vien (including cho_duyet)
      // Frontend will filter by statusFilter state
      const response = await http.get(`/activities?semester=${semester}&limit=all`);
      
      // Backend returns: { success: true, data: { items: [...], total, page, limit }, message: "..." }
      const responseData = response.data?.data || response.data || {};
      
      // Extract items array from response
      const activities = responseData.items || responseData.data || responseData || [];
      
      // Ensure it's an array
      const activitiesArray = Array.isArray(activities) ? activities : [];
      
      console.log('📊 Loaded activities:', activitiesArray.length, 'items');
      console.log('📊 Status breakdown:', {
        cho_duyet: activitiesArray.filter(a => a.trang_thai === 'cho_duyet').length,
        da_duyet: activitiesArray.filter(a => a.trang_thai === 'da_duyet').length,
        tu_choi: activitiesArray.filter(a => a.trang_thai === 'tu_choi').length,
        da_huy: activitiesArray.filter(a => a.trang_thai === 'da_huy').length,
        ket_thuc: activitiesArray.filter(a => a.trang_thai === 'ket_thuc').length
      });
      
      setActivities(activitiesArray);
      setError('');
    } catch (err) {
      console.error('Error loading class activities:', err);
      showError('Không thể tải danh sách hoạt động', 'Lỗi tải dữ liệu');
      setError('Không thể tải danh sách hoạt động');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = () => {
    navigate('/monitor/activities/create');
  };

  const handleEditActivity = async (activity) => {
    try {
      // Fetch full activity details
      const response = await http.get(`/activities/${activity.id}`);
      const activityData = response.data?.data || response.data;
      setSelectedActivity(activityData);
      setShowEditModal(true);
      setEditMode(false); // Start in view mode
    } catch (err) {
      console.error('Error loading activity details:', err);
      showError('Không thể tải chi tiết hoạt động', 'Lỗi');
    }
  };

  const handleSaveActivity = async () => {
    try {
      console.log('💾 Saving activity:', selectedActivity);
      console.log('💾 hinh_anh:', selectedActivity.hinh_anh);
      console.log('💾 tep_dinh_kem:', selectedActivity.tep_dinh_kem);
      
      // ✅ Convert string values to numbers before sending to backend
      const diem_rl = selectedActivity.diem_rl === '' ? 0 : parseFloat(selectedActivity.diem_rl) || 0;
      const sl_toi_da = selectedActivity.sl_toi_da === '' ? 0 : parseInt(selectedActivity.sl_toi_da) || 0;
      
      // Send only the fields that backend expects
      const updateData = {
        ten_hd: selectedActivity.ten_hd,
        mo_ta: selectedActivity.mo_ta,
        loai_hd_id: selectedActivity.loai_hd_id,
        diem_rl: diem_rl, // ✅ Converted to number
        dia_diem: selectedActivity.dia_diem,
        ngay_bd: selectedActivity.ngay_bd,
        ngay_kt: selectedActivity.ngay_kt,
        han_dk: selectedActivity.han_dk,
        sl_toi_da: sl_toi_da, // ✅ Converted to number
        don_vi_to_chuc: selectedActivity.don_vi_to_chuc,
        yeu_cau_tham_gia: selectedActivity.yeu_cau_tham_gia,
        trang_thai: selectedActivity.trang_thai,
        hinh_anh: selectedActivity.hinh_anh,
        tep_dinh_kem: selectedActivity.tep_dinh_kem
      };
      
      console.log('💾 Update data:', updateData);
      
      const response = await http.put(`/activities/${selectedActivity.id}`, updateData);
      console.log('💾 Update response:', response);
      
      await loadActivities();
      showSuccess(`Đã cập nhật hoạt động "${selectedActivity.ten_hd}" thành công`, 'Cập nhật hoạt động');
      setEditMode(false);
      setShowEditModal(false);
      setSelectedActivity(null);
    } catch (err) {
      console.error('Error updating activity:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.message || 'Không thể cập nhật hoạt động';
      showError(errorMessage, 'Lỗi cập nhật');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditMode(false);
    setSelectedActivity(null);
  };

  const handleDeleteActivity = async (activity) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa hoạt động',
      message: `Bạn có chắc chắn muốn xóa hoạt động "${activity.ten_hd}"? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      await http.delete(`/activities/${activity.id}`);
      await loadActivities();
      showSuccess(`Đã xóa hoạt động "${activity.ten_hd}" thành công`, 'Xóa hoạt động');
    } catch (err) {
      console.error('Error deleting activity:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Không thể xóa hoạt động';
      showError(errorMessage, 'Lỗi xóa hoạt động');
    }
  };

  const handleViewDetails = async (activity) => {
    // Open small in-page modal with activity details instead of navigating away
    try {
      const response = await http.get(`/activities/${activity.id}`);
      const activityData = response.data?.data || response.data;
      setSelectedActivity(activityData);
      setEditMode(false); // view-only mode
      setShowEditModal(true);
    } catch (err) {
      console.error('Error loading activity details:', err);
      showError('Không thể tải chi tiết hoạt động', 'Lỗi');
    }
  };

  const handleShowQR = (activity) => {
    setSelectedActivity(activity);
    setShowQRModal(true);
  };

  const handleCancelActivity = async (activity) => {
    const confirmed = await confirm({
      title: 'Xác nhận hủy hoạt động',
      message: `Bạn có chắc chắn muốn hủy hoạt động "${activity.ten_hd}"?`,
      confirmText: 'Hủy hoạt động',
      cancelText: 'Không'
    });

    if (!confirmed) return;

    try {
      await http.put(`/activities/${activity.id}`, {
        trang_thai: 'da_huy'
      });
      await loadActivities();
      showSuccess(`Đã hủy hoạt động "${activity.ten_hd}"`, 'Hủy hoạt động');
    } catch (err) {
      console.error('Error canceling activity:', err);
      const errorMessage = err.response?.data?.message || 'Không thể hủy hoạt động';
      showError(errorMessage, 'Lỗi hủy hoạt động');
    }
  };

  // Filter and sort activities
  const filteredActivities = activities
    .filter(activity => {
      const matchesSearch = activity.ten_hd?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           activity.mo_ta?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || activity.trang_thai === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const now = new Date();
      const aDeadline = a.han_dang_ky ? new Date(a.han_dang_ky) : new Date(a.ngay_bd);
      const bDeadline = b.han_dang_ky ? new Date(b.han_dang_ky) : new Date(b.ngay_bd);
      const aIsOpen = aDeadline > now && (a.trang_thai === 'da_duyet' || a.trang_thai === 'cho_duyet');
      const bIsOpen = bDeadline > now && (b.trang_thai === 'da_duyet' || b.trang_thai === 'cho_duyet');
      
      if (aIsOpen && !bIsOpen) return -1;
      if (!aIsOpen && bIsOpen) return 1;
      return new Date(a.ngay_bd) - new Date(b.ngay_bd);
    });

  // Derived counts within the selected semester (activities already filtered by semester from API)
  // ✅ DEPRECATED: Use dashboardStats instead for accurate counts
  // These counts are for local filtering only (status tabs)
  const localApprovedCount = activities.filter(a => a.trang_thai === 'da_duyet').length;
  const localPendingCount = activities.filter(a => a.trang_thai === 'cho_duyet').length;
  const localEndedCount = activities.filter(a => a.trang_thai === 'ket_thuc').length;
  
  // ✅ Use dashboard stats for display (accurate count from backend)
  const approvedCount = dashboardStats.approvedCount || localApprovedCount;
  const pendingCount = localPendingCount; // Keep local count for pending
  const endedCount = dashboardStats.endedCount || localEndedCount;
  const totalApprovedAndEnded = dashboardStats.totalActivities || (approvedCount + endedCount);

  const ActivityCard = ({ activity }) => {
    const now = new Date();
    const deadline = activity.han_dang_ky ? new Date(activity.han_dang_ky) : new Date(activity.ngay_bd);
    const isRegistrationOpen = deadline > now && (activity.trang_thai === 'da_duyet' || activity.trang_thai === 'cho_duyet');
    
    return (
      <div className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
        isRegistrationOpen ? 'border-emerald-200 shadow-lg shadow-emerald-100' : 'border-gray-200 hover:border-indigo-200'
      }`}>
        {/* Activity Image */}
        <div className="relative w-full h-48 overflow-hidden">
          <img 
            src={getActivityImage(activity.hinh_anh, activity.loai_hd?.ten_loai_hd)} 
            alt={activity.ten_hd}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          
          {/* Featured badge for open registration - moved on top of image */}
          {isRegistrationOpen && (
            <div className="absolute top-4 right-4">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-bold">Đang mở ĐK</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="p-6 relative z-10">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 flex-1">
                {activity.ten_hd}
              </h3>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${statusColors[activity.trang_thai]} whitespace-nowrap`}>
                {statusLabels[activity.trang_thai]}
              </span>
            </div>
            
            {/* Category tag */}
            {activity.loai_hd?.ten_loai_hd && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Filter className="h-3 w-3 mr-1" />
                {activity.loai_hd.ten_loai_hd}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">{activity.mo_ta || 'Không có mô tả'}</p>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Ngày</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {new Date(activity.ngay_bd).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Giờ</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {new Date(activity.ngay_bd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2">
              <div className="flex-shrink-0 w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Địa điểm</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {activity.dia_diem}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-2 border border-emerald-100">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Award className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-600 font-medium">Điểm RL</p>
                <p className="text-sm font-bold text-emerald-700 truncate">
                  {activity.diem_rl} điểm
                </p>
              </div>
            </div>
          </div>

          {/* Registration Stats */}
          <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">
                <span className="font-bold text-indigo-600">{activity.registrationCount || 0}</span> sinh viên đăng ký
              </span>
            </div>
            {activity.so_luong_toi_da && (
              <span className="text-xs text-gray-500">
                / {activity.so_luong_toi_da} tối đa
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewDetails(activity)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-xl font-medium"
              title="Xem chi tiết"
            >
              <Eye className="h-4 w-4" />
              Chi tiết
            </button>
            
            {(activity.trang_thai === 'da_duyet') && (
              <button
                onClick={() => handleShowQR(activity)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-lg shadow-purple-200 hover:shadow-xl font-medium"
                title="QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>
            )}
            
            <button
              onClick={() => handleEditActivity(activity)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-200 shadow-lg shadow-amber-200 hover:shadow-xl font-medium"
              title="Chỉnh sửa"
            >
              <Edit className="h-4 w-4" />
            </button>
            
            {(activity.trang_thai === 'da_duyet' || activity.trang_thai === 'cho_duyet') && (
              <button
                onClick={() => handleCancelActivity(activity)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl hover:from-rose-500 hover:to-pink-500 transition-all duration-200 shadow-lg shadow-rose-200 hover:shadow-xl font-medium"
                title="Hủy hoạt động"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            <button
              onClick={() => handleDeleteActivity(activity)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-200 shadow-lg shadow-red-200 hover:shadow-xl font-medium"
              title="Xóa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="flex justify-center items-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent absolute top-0 left-0"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <ActivityIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">Quản lý Hoạt động Lớp</h1>
                    <p className="text-indigo-100 mt-1">Tổ chức và theo dõi các hoạt động của lớp bạn</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreateActivity}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 font-semibold"
              >
                <Plus className="h-5 w-5" />
                Tạo hoạt động mới
              </button>
            </div>
          </div>
        </div>

        {/* Semester Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-700">Học kỳ:</span>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="flex-1 max-w-xs px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white font-medium text-gray-700 hover:border-indigo-300 cursor-pointer"
            >
              {semesterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <ActivityIcon className="h-6 w-6" />
              </div>
              <TrendingUp className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {totalApprovedAndEnded}
            </div>
            <div className="text-indigo-100 text-sm font-medium">Tổng hoạt động</div>
          </div>

          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
              <AlertCircle className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{pendingCount}</div>
            <div className="text-amber-100 text-sm font-medium">Chờ duyệt</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <CheckCircle className="h-6 w-6" />
              </div>
              <Sparkles className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{approvedCount}</div>
            <div className="text-emerald-100 text-sm font-medium">Đã duyệt</div>
          </div>

          <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BarChart3 className="h-6 w-6" />
              </div>
              <XCircle className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{endedCount}</div>
            <div className="text-violet-100 text-sm font-medium">Hoàn thành</div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 bg-white border rounded-lg p-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Filter className="h-5 w-5" />
              Tất cả
              {activities.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {activities.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setStatusFilter('cho_duyet')}
            className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold transition-all ${
              statusFilter === 'cho_duyet'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5" />
              Chờ duyệt
              {activities.filter(a => a.trang_thai === 'cho_duyet').length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {activities.filter(a => a.trang_thai === 'cho_duyet').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setStatusFilter('da_duyet')}
            className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold transition-all ${
              statusFilter === 'da_duyet'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Đã duyệt
              {activities.filter(a => a.trang_thai === 'da_duyet').length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {activities.filter(a => a.trang_thai === 'da_duyet').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setStatusFilter('tu_choi')}
            className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold transition-all ${
              statusFilter === 'tu_choi'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5" />
              Từ chối
              {activities.filter(a => a.trang_thai === 'tu_choi').length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {activities.filter(a => a.trang_thai === 'tu_choi').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setStatusFilter('ket_thuc')}
            className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold transition-all ${
              statusFilter === 'ket_thuc'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Award className="h-5 w-5" />
              Kết thúc
              {activities.filter(a => a.trang_thai === 'ket_thuc').length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {activities.filter(a => a.trang_thai === 'ket_thuc').length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Search Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Tìm kiếm hoạt động..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
            />
          </div>
        </div>

        {/* Activities Grid */}
        {filteredActivities.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchTerm || statusFilter !== 'all' ? 'Không tìm thấy hoạt động' : 'Chưa có hoạt động nào'}
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác'
                  : 'Bắt đầu bằng cách tạo hoạt động đầu tiên cho lớp của bạn'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={handleCreateActivity}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 font-semibold text-lg"
                >
                  <Plus className="h-6 w-6" />
                  Tạo hoạt động đầu tiên
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Activity Modal */}
      {showEditModal && selectedActivity && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={handleCloseEditModal}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f9fafb'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Chi tiết hoạt động
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!editMode ? (
                  <button 
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Chỉnh sửa
                  </button>
                ) : (
                  <button 
                    onClick={handleSaveActivity}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Lưu
                  </button>
                )}
                <button 
                  onClick={handleCloseEditModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tên hoạt động */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên hoạt động *
                  </label>
                  <input
                    type="text"
                    value={selectedActivity.ten_hd || ''}
                    onChange={(e) => editMode && setSelectedActivity({...selectedActivity, ten_hd: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                {/* Địa điểm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Địa điểm *
                  </label>
                  <input
                    type="text"
                    value={selectedActivity.dia_diem || ''}
                    onChange={(e) => editMode && setSelectedActivity({...selectedActivity, dia_diem: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                {/* Điểm rèn luyện */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Điểm rèn luyện *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedActivity.diem_rl ?? ''}
                    onChange={(e) => {
                      if (editMode) {
                        // ✅ Keep as string to allow continuous typing
                        // Will be converted to number when saving
                        setSelectedActivity({
                          ...selectedActivity, 
                          diem_rl: e.target.value
                        });
                      }
                    }}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                {/* Ngày bắt đầu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="datetime-local"
                    value={selectedActivity.ngay_bd ? new Date(selectedActivity.ngay_bd).toISOString().slice(0, 16) : ''}
                    onChange={(e) => editMode && setSelectedActivity({...selectedActivity, ngay_bd: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                {/* Ngày kết thúc */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày kết thúc *
                  </label>
                  <input
                    type="datetime-local"
                    value={selectedActivity.ngay_kt ? new Date(selectedActivity.ngay_kt).toISOString().slice(0, 16) : ''}
                    onChange={(e) => editMode && setSelectedActivity({...selectedActivity, ngay_kt: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                {/* Hạn đăng ký */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hạn đăng ký
                  </label>
                  <input
                    type="datetime-local"
                    value={selectedActivity.han_dk ? new Date(selectedActivity.han_dk).toISOString().slice(0, 16) : ''}
                    onChange={(e) => editMode && setSelectedActivity({...selectedActivity, han_dk: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                {/* Số lượng tối đa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số lượng tối đa
                  </label>
                  <input
                    type="number"
                    value={selectedActivity.sl_toi_da ?? ''}
                    onChange={(e) => {
                      if (editMode) {
                        // ✅ Keep as string to allow continuous typing
                        // Will be converted to number when saving
                        setSelectedActivity({
                          ...selectedActivity, 
                          sl_toi_da: e.target.value
                        });
                      }
                    }}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={selectedActivity.trang_thai || 'cho_duyet'}
                    onChange={(e) => editMode && setSelectedActivity({...selectedActivity, trang_thai: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="cho_duyet">Chờ duyệt</option>
                    <option value="da_duyet">Đã duyệt</option>
                    <option value="tu_choi">Từ chối</option>
                    <option value="da_huy">Đã hủy</option>
                    <option value="ket_thuc">Kết thúc</option>
                  </select>
                </div>

                {/* Mô tả */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={selectedActivity.mo_ta || ''}
                    onChange={(e) => editMode && setSelectedActivity({...selectedActivity, mo_ta: e.target.value})}
                    disabled={!editMode}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 resize-vertical"
                  />
                </div>

                {/* Hình ảnh hoạt động - Upload in Edit Mode */}
                {editMode && (
                  <div className="md:col-span-2">
                    <FileUpload
                      type="image"
                      multiple={true}
                      maxFiles={5}
                      label="Hình ảnh hoạt động (Ảnh đầu tiên là ảnh nền)"
                      value={selectedActivity.hinh_anh || []}
                      onChange={(urls) => setSelectedActivity({...selectedActivity, hinh_anh: urls})}
                      disabled={!editMode}
                    />
                    
                    {/* Hiển thị ảnh để chọn làm ảnh nền */}
                    {selectedActivity.hinh_anh && selectedActivity.hinh_anh.length > 0 && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Chọn ảnh nền (Click vào ảnh để đặt làm ảnh nền)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {selectedActivity.hinh_anh.map((url, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                // Di chuyển ảnh được chọn lên vị trí đầu tiên
                                const newImages = [url, ...selectedActivity.hinh_anh.filter(img => img !== url)];
                                setSelectedActivity({...selectedActivity, hinh_anh: newImages});
                              }}
                              className={`relative cursor-pointer group ${idx === 0 ? 'ring-4 ring-indigo-500' : ''}`}
                            >
                              <img 
                                src={url} 
                                alt={`Activity ${idx + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-indigo-400 transition-all"
                              />
                              {idx === 0 && (
                                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                  Ảnh nền
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                                <span className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                  {idx === 0 ? 'Ảnh nền hiện tại' : 'Đặt làm ảnh nền'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          💡 Ảnh đầu tiên (có viền xanh) sẽ được hiển thị làm ảnh nền của hoạt động
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Hình ảnh hoạt động - Display in View Mode */}
                {!editMode && selectedActivity.hinh_anh && selectedActivity.hinh_anh.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hình ảnh hoạt động
                    </label>
                    
                    {/* Ảnh nền chính - Hiển thị lớn */}
                    <div className="mb-4">
                      <div className="relative">
                        <img 
                          src={selectedActivity.hinh_anh[0]} 
                          alt="Ảnh nền hoạt động"
                          className="w-full h-64 object-cover rounded-xl border-4 border-indigo-200 shadow-lg"
                        />
                        <div className="absolute top-3 left-3 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-full font-semibold shadow-md">
                          📸 Ảnh nền
                        </div>
                      </div>
                    </div>
                    
                    {/* Các ảnh còn lại - Hiển thị nhỏ */}
                    {selectedActivity.hinh_anh.length > 1 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Ảnh chi tiết ({selectedActivity.hinh_anh.length - 1} ảnh)
                        </label>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                          {selectedActivity.hinh_anh.slice(1).map((url, idx) => (
                            <img 
                              key={idx}
                              src={url} 
                              alt={`Activity detail ${idx + 2}`}
                              className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 hover:border-indigo-300 transition-all cursor-pointer"
                              onClick={() => window.open(url, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tệp đính kèm - Upload in Edit Mode */}
                {editMode && (
                  <div className="md:col-span-2">
                    <FileUpload
                      type="attachment"
                      multiple={true}
                      maxFiles={3}
                      label="Tệp đính kèm"
                      value={selectedActivity.tep_dinh_kem || []}
                      onChange={(urls) => setSelectedActivity({...selectedActivity, tep_dinh_kem: urls})}
                      disabled={!editMode}
                    />
                  </div>
                )}

                {/* Tệp đính kèm - Display in View Mode */}
                {!editMode && selectedActivity.tep_dinh_kem && selectedActivity.tep_dinh_kem.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tệp đính kèm
                    </label>
                    <div className="space-y-2">
                      {selectedActivity.tep_dinh_kem.map((url, idx) => {
                        const filename = url.split('/').pop();
                        // ✅ Fix: Prepend backend base URL for attachments
                        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
                        const backendBase = baseURL.replace('/api', ''); // Remove /api to get base server URL
                        const downloadUrl = url.startsWith('http') ? url : `${backendBase}${url}`;
                        
                        return (
                          <a 
                            key={idx}
                            href={downloadUrl}
                            download={filename} // ✅ Add download attribute to force download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-indigo-600 hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm font-medium truncate">{filename}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedActivity && (
        <ActivityQRModal
          activityId={selectedActivity.id}
          activityName={selectedActivity.ten_hd}
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
}
