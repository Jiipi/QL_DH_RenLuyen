import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Users, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, Eye, FileText, Sparkles, TrendingUp, Mail, Phone, Award, MapPin, BookOpen, Trophy } from 'lucide-react';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';
import { getActivityImage, getBestActivityImage } from '../../utils/activityImages';
import { getUserAvatar } from '../../utils/avatarUtils';
import ActivityDetailModal from '../../components/ActivityDetailModal';

export default function TeacherRegistrationApprovalsModern() {
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
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const res = await http.get('/teacher/registrations/pending', {
        params: { status: 'all' } // Get all registrations like monitor
      });
      
      // Parse response same as monitor
      const data = res.data?.data || res.data || [];
      const items = Array.isArray(data) ? data : [];
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
      await http.post(`/teacher/registrations/${registration.id}/approve`);
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
      await http.post(`/teacher/registrations/${registration.id}/reject`, { reason });
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
      const res = await http.post('/teacher/registrations/bulk-approve', {
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
        
        {/* Activity Image */}
        <div className="relative w-full h-48 overflow-hidden">
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
          {/* Activity Title */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
              {activity?.ten_hd || 'Không rõ hoạt động'}
            </h3>
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
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="font-medium">{registration.sinh_vien?.mssv || 'N/A'}</span>
                  </p>
                  {registration.sinh_vien?.lop?.ten_lop && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {registration.sinh_vien.lop.ten_lop}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-gray-600">Ngày tổ chức</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {activity?.ngay_bd ? new Date(activity.ngay_bd).toLocaleDateString('vi-VN') : 'N/A'}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-gray-600">Ngày đăng ký</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {registration.ngay_dang_ky ? new Date(registration.ngay_dang_ky).toLocaleDateString('vi-VN') : 'N/A'}
              </p>
            </div>
          </div>

          {/* Processed By Info - Show who processed this */}
          {registration.processedBy && !isPending && (
            <div className={`mb-4 p-3 rounded-lg border-l-4 ${
              registration.processedBy === 'monitor' 
                ? 'bg-green-50 border-green-500' 
                : 'bg-blue-50 border-blue-500'
            }`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle className={`h-4 w-4 ${
                  registration.processedBy === 'monitor' ? 'text-green-600' : 'text-blue-600'
                }`} />
                <span className={registration.processedBy === 'monitor' ? 'text-green-700' : 'text-blue-700'}>
                  Đã xử lý bởi: {registration.processedBy === 'monitor' ? 'Lớp trưởng' : 'Giảng viên'}
                </span>
              </div>
              {registration.ghi_chu && (
                <p className="text-xs text-gray-600 mt-1 ml-6">{registration.ghi_chu}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isPending && registration.canProcess !== false ? (
              <>
                <button
                  onClick={() => handleApprove(registration)}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold text-sm shadow-lg disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Duyệt
                </button>
                <button
                  onClick={() => handleReject(registration)}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold text-sm shadow-lg disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối
                </button>
              </>
            ) : (
              <button 
                onClick={() => {
                  setActivityDetailId(activity?.id);
                  setIsDetailModalOpen(true);
                }}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2.5 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2 font-semibold text-sm shadow-lg"
              >
                <FileText className="h-4 w-4" />
                Xem chi tiết hoạt động
              </button>
            )}

            {/* Blocked by other role */}
            {isPending && registration.canProcess === false && (
              <div className="w-full space-y-2">
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>Lớp trưởng đang xử lý</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Bạn không thể duyệt đăng ký này</p>
                </div>
                <button 
                  onClick={() => {
                    setActivityDetailId(activity?.id);
                    setIsDetailModalOpen(true);
                  }}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2.5 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2 font-semibold text-sm shadow-lg"
                >
                  <FileText className="h-4 w-4" />
                  Xem chi tiết hoạt động
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Phê Duyệt Đăng Ký</h1>
                <p className="text-indigo-100 mt-1">Quản lý và phê duyệt đăng ký tham gia hoạt động của sinh viên</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 bg-white border rounded-lg p-2 overflow-x-auto">
          <button
            onClick={() => {
              setViewMode('pending');
              setSelectedIds([]);
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
              {stats.pending > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {stats.pending}
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
              {stats.approved > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {stats.approved}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => {
              setViewMode('rejected');
              setSelectedIds([]);
            }}
            className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'rejected'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5" />
              Từ chối
              {stats.rejected > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {stats.rejected}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => {
              setViewMode('completed');
              setSelectedIds([]);
            }}
            className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'completed'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5" />
              Hoàn thành
              {stats.participated > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {stats.participated}
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
                <FileText className="h-12 w-12 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Không có đăng ký nào</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Không tìm thấy đăng ký phù hợp với từ khóa tìm kiếm' : 'Chưa có đăng ký nào trong danh sách'}
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
