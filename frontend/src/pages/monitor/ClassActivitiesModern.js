import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Edit, Trash2, Eye, Plus, Search, Filter, Users, Clock, MapPin, Award, AlertCircle, CheckCircle, XCircle, QrCode, X, Sparkles, TrendingUp, Activity as ActivityIcon, BarChart3 } from 'lucide-react';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';
import ActivityQRModal from '../../components/ActivityQRModal';
import SemesterClosureWidget from '../../components/SemesterClosureWidget';
import SemesterClosureBanner from '../../components/SemesterClosureBanner';

export default function ClassActivities() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, confirm } = useNotification();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await http.get('/activities');
      const data = response.data?.data || response.data || [];
      setActivities(Array.isArray(data) ? data : []);
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

  const handleEditActivity = (activity) => {
    navigate(`/activities/edit/${activity.id}`);
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
    try {
      const response = await http.get(`/activities/${activity.id}`);
      const activityData = response.data?.data || response.data;
      setSelectedActivity(activityData);
      setEditMode(false);
      setShowEditModal(true);
    } catch (err) {
      console.error('Error loading activity details:', err);
      alert('Không thể tải chi tiết hoạt động');
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

  const ActivityCard = ({ activity }) => {
    const now = new Date();
    const deadline = activity.han_dang_ky ? new Date(activity.han_dang_ky) : new Date(activity.ngay_bd);
    const isRegistrationOpen = deadline > now && (activity.trang_thai === 'da_duyet' || activity.trang_thai === 'cho_duyet');
    
    return (
      <div className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
        isRegistrationOpen ? 'border-emerald-200 shadow-lg shadow-emerald-100' : 'border-gray-200 hover:border-indigo-200'
      }`}>
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Featured badge for open registration */}
        {isRegistrationOpen && (
          <div className="absolute top-0 right-0">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl shadow-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-bold">Đang mở ĐK</span>
            </div>
          </div>
        )}

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
        {/* Semester closure banner (read-only) */}
        <SemesterClosureBanner />
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
              <div className="flex flex-col gap-3 items-stretch lg:items-end">
                <SemesterClosureWidget compact onChanged={loadActivities} />
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
            <div className="text-3xl font-bold mb-1">{activities.length}</div>
            <div className="text-indigo-100 text-sm font-medium">Tổng hoạt động</div>
          </div>

          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
              <AlertCircle className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {activities.filter(a => a.trang_thai === 'cho_duyet').length}
            </div>
            <div className="text-amber-100 text-sm font-medium">Chờ duyệt</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <CheckCircle className="h-6 w-6" />
              </div>
              <Sparkles className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {activities.filter(a => a.trang_thai === 'da_duyet').length}
            </div>
            <div className="text-emerald-100 text-sm font-medium">Đã duyệt</div>
          </div>

          <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BarChart3 className="h-6 w-6" />
              </div>
              <XCircle className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {activities.filter(a => a.trang_thai === 'ket_thuc').length}
            </div>
            <div className="text-violet-100 text-sm font-medium">Hoàn thành</div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
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

            {/* Status Filter */}
            <div className="md:w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white font-medium"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="cho_duyet">⏳ Chờ duyệt</option>
                <option value="da_duyet">✅ Đã duyệt</option>
                <option value="tu_choi">❌ Từ chối</option>
                <option value="da_huy">🚫 Đã hủy</option>
                <option value="ket_thuc">🏁 Kết thúc</option>
              </select>
            </div>
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
