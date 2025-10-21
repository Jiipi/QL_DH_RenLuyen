import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Users, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, Eye, FileText, Sparkles, TrendingUp, Mail, Phone, Award, MapPin, BookOpen, Trophy } from 'lucide-react';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';
import { getActivityImage, getBestActivityImage } from '../../utils/activityImages';
import { getUserAvatar } from '../../utils/avatarUtils';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function ClassApprovalsModern() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('pending'); // 'pending', 'approved', 'rejected', 'completed'
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]); // Track selected registration IDs
  const [activityDetailId, setActivityDetailId] = useState(null); // For modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // For modal
  const { showSuccess, showError, showWarning, confirm } = useNotification();

  // Semester state (align with MonitorMyActivities)
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

  // Status mappings (matching Prisma enum TrangThaiDangKy)
  const statusLabels = {
    'cho_duyet': 'Chờ duyệt',
    'da_duyet': 'Đã duyệt',
    'tu_choi': 'Từ chối',
    'da_tham_gia': 'Đã tham gia'
  };

  const statusColors = {
    'cho_duyet': 'bg-amber-50 text-amber-700 border-amber-200',
    'da_duyet': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'tu_choi': 'bg-rose-50 text-rose-700 border-rose-200',
    'da_tham_gia': 'bg-blue-50 text-blue-700 border-blue-200'
  };

  useEffect(() => {
    loadRegistrations();
  }, [semester]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const res = await http.get('/class/registrations', {
        params: { status: 'all', semester }
      });
      
      const data = res.data?.data || res.data || [];
      const items = Array.isArray(data) ? data : [];
      console.log('[ClassApprovalsModern] Loaded registrations:', { total: items.length, semester });
      setRegistrations(items);
      setError('');
    } catch (err) {
      console.error('Error loading registrations:', err);
      setError('Không thể tải danh sách đăng ký');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registration) => {
    const confirmed = await confirm({
      title: 'Xác nhận phê duyệt',
      message: `Phê duyệt đăng ký của ${registration.sinh_vien?.nguoi_dung?.ho_ten || 'sinh viên'} tham gia hoạt động?`,
      confirmText: 'Phê duyệt',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      setProcessing(true);
      await http.post(`/class/registrations/${registration.id}/approve`);
      await loadRegistrations();
      showSuccess(`Đã phê duyệt đăng ký cho ${registration.sinh_vien?.nguoi_dung?.ho_ten}`, 'Phê duyệt thành công');
    } catch (err) {
      console.error('Error approving:', err);
      showError(err.response?.data?.message || 'Không thể phê duyệt', 'Lỗi phê duyệt');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (registration) => {
    const reason = window.prompt('Lý do từ chối (tùy chọn):') || 'Không đáp ứng yêu cầu';

    const confirmed = await confirm({
      title: 'Xác nhận từ chối',
      message: `Từ chối đăng ký của ${registration.sinh_vien?.nguoi_dung?.ho_ten || 'sinh viên'}?\n\nLý do: ${reason}`,
      confirmText: 'Từ chối',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      setProcessing(true);
      await http.post(`/class/registrations/${registration.id}/reject`, { reason });
      await loadRegistrations();
      showSuccess(`Đã từ chối đăng ký của ${registration.sinh_vien?.nguoi_dung?.ho_ten}`, 'Từ chối thành công');
    } catch (err) {
      console.error('Error rejecting:', err);
      showError(err.response?.data?.message || 'Không thể từ chối', 'Lỗi từ chối');
    } finally {
      setProcessing(false);
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      showWarning('Vui lòng chọn ít nhất một đăng ký', 'Chưa chọn đăng ký');
      return;
    }

    const confirmed = await confirm({
      title: 'Xác nhận phê duyệt hàng loạt',
      message: `Bạn có chắc muốn phê duyệt ${selectedIds.length} đăng ký đã chọn?`,
      confirmText: 'Phê duyệt tất cả',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      setProcessing(true);
      const res = await http.post('/class/registrations/bulk-approve', {
        registrationIds: selectedIds
      });
      
      await loadRegistrations();
      setSelectedIds([]); // Clear selection
      const approvedCount = res.data?.data?.approved || selectedIds.length;
      showSuccess(`Đã phê duyệt ${approvedCount} đăng ký thành công`, 'Phê duyệt hàng loạt thành công');
    } catch (err) {
      console.error('Error bulk approving:', err);
      showError(err.response?.data?.message || 'Không thể phê duyệt hàng loạt', 'Lỗi phê duyệt');
    } finally {
      setProcessing(false);
    }
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    const pendingRegistrations = filteredRegistrations.filter(r => r.trang_thai_dk === 'cho_duyet');
    if (selectedIds.length === pendingRegistrations.length && pendingRegistrations.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRegistrations.map(r => r.id));
    }
  };

  // Toggle individual selection
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    );
  };

  const filteredRegistrations = registrations.filter(reg => {
    const student = reg.sinh_vien?.nguoi_dung;
    const activity = reg.hoat_dong;
    const matchesSearch = 
      student?.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity?.ten_hd?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.sinh_vien?.mssv?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by view mode
    let matchesViewMode = false;
    switch (viewMode) {
      case 'pending':
        matchesViewMode = reg.trang_thai_dk === 'cho_duyet';
        break;
      case 'approved':
        matchesViewMode = reg.trang_thai_dk === 'da_duyet';
        break;
      case 'rejected':
        matchesViewMode = reg.trang_thai_dk === 'tu_choi';
        break;
      case 'completed':
        matchesViewMode = reg.trang_thai_dk === 'da_tham_gia';
        break;
      default:
        matchesViewMode = true;
    }
    
    return matchesSearch && matchesViewMode;
  });

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.trang_thai_dk === 'cho_duyet').length,
    approved: registrations.filter(r => r.trang_thai_dk === 'da_duyet').length,
    rejected: registrations.filter(r => r.trang_thai_dk === 'tu_choi').length,
    participated: registrations.filter(r => r.trang_thai_dk === 'da_tham_gia').length
  };

  const RegistrationCard = ({ registration }) => {
    const student = registration.sinh_vien?.nguoi_dung;
    const activity = registration.hoat_dong;
    const isPending = registration.trang_thai_dk === 'cho_duyet';
    const activityImage = getBestActivityImage(activity);
    const isSelected = selectedIds.includes(registration.id);

    return (
      <div className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
        isPending ? 'border-amber-200 shadow-lg shadow-amber-100' : 'border-gray-200'
      } ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}>
        
        {/* Activity Name Header - NEW */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
          <h3 className="text-white font-bold text-lg truncate" title={activity?.ten_hd}>
            {activity?.ten_hd || 'Hoạt động'}
          </h3>
        </div>

        {/* Activity Image */}
        <div className="relative w-full h-40 overflow-hidden">
          {/* Checkbox for pending items - in bottom left corner */}
          {isPending && (
            <div className="absolute bottom-4 left-4 z-20">
              <label className="flex items-center gap-2 cursor-pointer bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg hover:bg-white transition-all">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelect(registration.id)}
                  className="w-5 h-5 rounded border-2 cursor-pointer accent-blue-600"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm font-semibold text-gray-700">Chọn</span>
              </label>
            </div>
          )}
          
          <img 
            src={activityImage} 
            alt={activity?.ten_hd || 'Hoạt động'}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          
          {/* Priority badge */}
          {isPending && (
            <div className="absolute top-4 right-4">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-bold">Chờ duyệt</span>
              </div>
            </div>
          )}
          
          {/* Activity type badge */}
          {activity?.loai_hd?.ten_loai_hd && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-700 rounded-full text-xs font-semibold shadow-lg">
                {activity.loai_hd.ten_loai_hd}
              </span>
            </div>
          )}
          
          {/* Points badge */}
          <div className="absolute bottom-4 right-4">
            <span className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/90 backdrop-blur-sm text-white rounded-full text-sm font-bold shadow-lg">
              <Award className="h-4 w-4" />
              +{activity?.diem_rl || 0}
            </span>
          </div>
        </div>
        
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div className="p-6 relative z-10">
          {/* Status Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${statusColors[registration.trang_thai_dk]} whitespace-nowrap`}>
              {statusLabels[registration.trang_thai_dk]}
            </span>
          </div>

          {/* Student Info */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4 border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {(() => {
                  const avatar = getUserAvatar(student);
                  return avatar.hasValidAvatar ? (
                    <img 
                      src={avatar.src} 
                      alt={avatar.alt}
                      className="w-12 h-12 rounded-xl object-cover shadow-lg ring-2 ring-white"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white">
                      {avatar.fallback}
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1 truncate">
                  {student?.ho_ten || 'Không rõ tên'}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <FileText className="h-3 w-3" />
                  <span className="font-medium">MSSV: {registration.sinh_vien?.mssv}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{student?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Details */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Ngày</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {activity?.ngay_bd ? new Date(activity.ngay_bd).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A'}
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
                  {activity?.ngay_bd ? new Date(activity.ngay_bd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </p>
              </div>
            </div>

            {activity?.dia_diem && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2 col-span-2">
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
            )}
          </div>

          {/* Processed By Info - Show who processed this */}
          {registration.processedBy && !isPending && (
            <div className={`mb-4 p-3 rounded-lg border-l-4 ${
              registration.processedBy === 'teacher' 
                ? 'bg-blue-50 border-blue-500' 
                : 'bg-green-50 border-green-500'
            }`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle className={`h-4 w-4 ${
                  registration.processedBy === 'teacher' ? 'text-blue-600' : 'text-green-600'
                }`} />
                <span className={registration.processedBy === 'teacher' ? 'text-blue-700' : 'text-green-700'}>
                  Đã xử lý bởi: {registration.processedBy === 'teacher' ? 'Giảng viên' : 'Lớp trưởng'}
                </span>
              </div>
              {registration.ghi_chu && (
                <p className="text-xs text-gray-600 mt-1 ml-6">{registration.ghi_chu}</p>
              )}
            </div>
          )}

          {/* Actions */}
          {isPending && registration.canProcess !== false && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleApprove(registration)}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg shadow-emerald-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <CheckCircle className="h-5 w-5" />
                Phê duyệt
              </button>
              <button
                onClick={() => handleReject(registration)}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-rose-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <XCircle className="h-5 w-5" />
                Từ chối
              </button>
            </div>
          )}

          {!isPending && (
            <div className="space-y-2">
              {/* Detail button for all non-pending registrations */}
              <button
                onClick={() => {
                  setActivityDetailId(activity?.id);
                  setIsDetailModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
              >
                <FileText className="h-4 w-4" />
                Xem chi tiết hoạt động
              </button>
            </div>
          )}

          {/* Blocked by other role */}
          {isPending && registration.canProcess === false && (
            <div className="space-y-2">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>Giảng viên đang xử lý</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Bạn không thể duyệt đăng ký này</p>
              </div>
              {/* Detail button */}
              <button
                onClick={() => {
                  setActivityDetailId(activity?.id);
                  setIsDetailModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
              >
                <FileText className="h-4 w-4" />
                Xem chi tiết hoạt động
              </button>
            </div>
          )}
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
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Phê Duyệt Đăng Ký</h1>
                <p className="text-indigo-100 mt-1">Quản lý và phê duyệt đăng ký tham gia hoạt động</p>
              </div>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total}</div>
            <div className="text-indigo-100 text-sm font-medium">Tổng đăng ký</div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.pending}</div>
            <div className="text-amber-100 text-sm font-medium">Chờ duyệt</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.approved}</div>
            <div className="text-emerald-100 text-sm font-medium">Đã duyệt</div>
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.rejected}</div>
            <div className="text-rose-100 text-sm font-medium">Từ chối</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.participated}</div>
            <div className="text-blue-100 text-sm font-medium">Hoàn thành</div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 bg-white border rounded-lg p-2 overflow-x-auto">
          <button
            onClick={() => {
              setViewMode('pending');
              setSelectedIds([]); // Clear selection when switching tabs
            }}
            className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'pending'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5" />
              Chờ duyệt
              {registrations.filter(r => r.trang_thai_dk === 'cho_duyet').length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {registrations.filter(r => r.trang_thai_dk === 'cho_duyet').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => {
              setViewMode('approved');
              setSelectedIds([]);
            }}
            className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'approved'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Đã duyệt
              {registrations.filter(r => r.trang_thai_dk === 'da_duyet').length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {registrations.filter(r => r.trang_thai_dk === 'da_duyet').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setViewMode('rejected')}
            className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'rejected'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5" />
              Từ chối
              {registrations.filter(r => r.trang_thai_dk === 'tu_choi').length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {registrations.filter(r => r.trang_thai_dk === 'tu_choi').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setViewMode('completed')}
            className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'completed'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5" />
              Hoàn thành
              {registrations.filter(r => r.trang_thai_dk === 'da_tham_gia').length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {registrations.filter(r => r.trang_thai_dk === 'da_tham_gia').length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Tìm kiếm sinh viên, MSSV, email, hoạt động..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
            />
          </div>
        </div>

        {/* Bulk Action Toolbar - Only show for pending view */}
        {viewMode === 'pending' && filteredRegistrations.filter(r => r.trang_thai_dk === 'cho_duyet').length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 rounded-lg px-3 py-2 transition-all">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredRegistrations.filter(r => r.trang_thai_dk === 'cho_duyet').length}
                    onChange={handleToggleSelectAll}
                    className="w-5 h-5 rounded border-2 cursor-pointer accent-blue-600"
                  />
                  <span className="font-semibold text-gray-700">Chọn tất cả ({filteredRegistrations.filter(r => r.trang_thai_dk === 'cho_duyet').length})</span>
                </label>
                {selectedIds.length > 0 && (
                  <span className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-md animate-pulse">
                    ✓ Đã chọn: {selectedIds.length}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {selectedIds.length > 0 ? (
                  <>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Bỏ chọn
                    </button>
                    <button
                      onClick={handleBulkApprove}
                      disabled={processing}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {processing ? 'Đang xử lý...' : `Phê duyệt ${selectedIds.length} đăng ký`}
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    ← Chọn các đăng ký để phê duyệt hàng loạt
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Registrations Grid */}
        {filteredRegistrations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRegistrations.map(reg => (
              <RegistrationCard key={reg.id} registration={reg} />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {viewMode === 'pending' && <Clock className="h-12 w-12 text-amber-600" />}
                {viewMode === 'approved' && <CheckCircle className="h-12 w-12 text-emerald-600" />}
                {viewMode === 'rejected' && <XCircle className="h-12 w-12 text-rose-600" />}
                {viewMode === 'completed' && <Trophy className="h-12 w-12 text-blue-600" />}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchTerm ? 'Không tìm thấy đăng ký' : 
                 viewMode === 'pending' ? 'Không có đăng ký chờ duyệt' :
                 viewMode === 'approved' ? 'Không có đăng ký đã duyệt' :
                 viewMode === 'rejected' ? 'Không có đăng ký bị từ chối' :
                 viewMode === 'completed' ? 'Không có đăng ký hoàn thành' :
                 'Chưa có đăng ký nào'}
              </h3>
              <p className="text-gray-600 text-lg">
                {searchTerm 
                  ? 'Thử tìm kiếm với từ khóa khác'
                  : viewMode === 'pending' ? 'Tất cả đăng ký đã được xử lý'
                  : viewMode === 'approved' ? 'Chưa có đăng ký nào được phê duyệt'
                  : viewMode === 'rejected' ? 'Chưa có đăng ký nào bị từ chối'
                  : viewMode === 'completed' ? 'Chưa có đăng ký nào hoàn thành'
                  : 'Chưa có sinh viên nào đăng ký hoạt động'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activityId={activityDetailId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setActivityDetailId(null);
        }}
      />
    </div>
  );
}