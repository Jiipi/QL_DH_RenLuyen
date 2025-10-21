  import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Search, Filter, Eye, CheckCircle, XCircle, AlertCircle,
  Calendar, Activity, Clock, Download, Award
} from 'lucide-react';
import http from '../../services/http';
import { extractRegistrationsFromAxiosResponse, extractActivitiesFromAxiosResponse } from '../../utils/apiNormalization';
import { getUserAvatar } from '../../utils/avatarUtils';
import { getBestActivityImage } from '../../utils/activityImages';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import ConfirmModal from '../../components/ConfirmModal';
import useSemesterOptions from '../../hooks/useSemesterOptions';

const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [viewMode, setViewMode] = useState('pending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [exporting, setExporting] = useState(false);
  // Unified semester filter
  const getCurrentSemesterValue = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 7 && currentMonth <= 11) return `hoc_ky_1-${currentYear}`;
    if (currentMonth === 12) return `hoc_ky_2-${currentYear}`;
    if (currentMonth >= 1 && currentMonth <= 4) return `hoc_ky_2-${currentYear - 1}`;
    return `hoc_ky_1-${currentYear}`;
  };
  const [semester, setSemester] = useState(getCurrentSemesterValue());
  const { options: semesterOptions } = useSemesterOptions();
  
  // Confirmation dialog states
  const [confirmApprove, setConfirmApprove] = useState({ isOpen: false, registrationId: null });
  const [confirmReject, setConfirmReject] = useState({ isOpen: false, registrationId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [confirmBulkApprove, setConfirmBulkApprove] = useState(false);

  const getStatusFromViewMode = () => {
    switch (viewMode) {
      case 'pending': return 'cho_duyet';
      case 'approved': return 'da_duyet';
      case 'rejected': return 'tu_choi';
      case 'participated': return 'da_tham_gia';
      default: return undefined;
    }
  };

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const params = { 
        status: getStatusFromViewMode(),
        activityId: activityFilter || undefined,
        classId: classId || undefined,
        semester: semester || undefined
      };
      const res = await http.get('/admin/registrations', { params });
      const items = extractRegistrationsFromAxiosResponse(res);
      setRegistrations(items);
      console.log(`[AdminRegistrations] Loaded: ${items.length} registrations`);
    } catch (error) {
      console.error('Lỗi khi tải danh sách đăng ký:', error);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, activityFilter, classId, semester]);

  useEffect(() => {
    fetchRegistrations();
    fetchActivities();
    fetchClasses();
  }, [fetchRegistrations, semester]);

  const fetchActivities = async () => {
    try {
      const res = await http.get('/admin/activities', { params: { semester } });
      const list = extractActivitiesFromAxiosResponse(res);
      setActivities(list);
    } catch (error) {
      console.error('Lỗi khi tải danh sách hoạt động:', error);
      setActivities([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await http.get('/admin/classes');
      const list = Array.isArray(res?.data?.data) ? res.data.data : (res?.data || []);
      setClasses(list);
    } catch (error) {
      console.error('Lỗi khi tải danh sách lớp:', error);
      setClasses([]);
    }
  };

  const handleViewActivity = (activity) => {
    if (activity) {
      setSelectedActivity(activity);
      setShowActivityModal(true);
      console.log('[AdminRegistrations] Opening activity modal:', activity);
    } else {
      console.error('[AdminRegistrations] No activity provided to handleViewActivity');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một đăng ký');
      return;
    }
    setConfirmBulkApprove(true);
  };

  const confirmBulkApproveAction = async () => {
    try {
      await http.post('/admin/registrations/bulk', { 
        ids: selectedIds, 
        action: 'approve' 
      });
      setSelectedIds([]);
      setConfirmBulkApprove(false);
      await fetchRegistrations();
    } catch (error) {
      console.error('Lỗi khi phê duyệt hàng loạt:', error);
      alert('Có lỗi xảy ra khi phê duyệt');
    }
  };

  const handleApproveRegistration = async (registrationId) => {
    setConfirmApprove({ isOpen: true, registrationId });
  };

  const confirmApproveAction = async () => {
    try {
      await http.post(`/admin/registrations/${confirmApprove.registrationId}/approve`);
      setConfirmApprove({ isOpen: false, registrationId: null });
      await fetchRegistrations();
    } catch (error) {
      console.error('Lỗi khi phê duyệt đăng ký:', error);
      alert('Có lỗi xảy ra khi phê duyệt');
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    setRejectReason('');
    setConfirmReject({ isOpen: true, registrationId });
  };

  const confirmRejectAction = async () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await http.post(`/admin/registrations/${confirmReject.registrationId}/reject`, { reason: rejectReason });
      setConfirmReject({ isOpen: false, registrationId: null });
      setRejectReason('');
      await fetchRegistrations();
    } catch (error) {
      console.error('Lỗi khi từ chối đăng ký:', error);
      alert('Có lỗi xảy ra khi từ chối');
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        status: getStatusFromViewMode() || '',
        classId: classId || '',
        semester: semester || ''
      });
      const baseURL = (typeof window !== 'undefined' && window.location)
        ? window.location.origin.replace(/\/$/, '') + '/api'
        : (process.env.REACT_APP_API_URL || 'http://dacn_backend_dev:3001/api');
      window.location.href = `${baseURL}/admin/registrations/export?${params}`;
    } catch (error) {
      console.error('Lỗi khi xuất Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel');
    } finally {
      setTimeout(() => setExporting(false), 2000);
    }
  };

  const filteredRegistrations = Array.isArray(registrations) ? registrations.filter(registration => {
    const matchesSearch = (registration.sinh_vien?.nguoi_dung?.ho_ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (registration.sinh_vien?.mssv || registration.sinh_vien?.ma_sv || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (registration.hoat_dong?.ten_hd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (registration.hoat_dong?.ma_hd || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActivity = !activityFilter || registration.hd_id === activityFilter || registration.hoat_dong_id === activityFilter;
    return matchesSearch && matchesActivity;
  }) : [];

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => (r.trang_thai_dk || r.trang_thai) === 'cho_duyet').length,
    approved: registrations.filter(r => (r.trang_thai_dk || r.trang_thai) === 'da_duyet').length,
    rejected: registrations.filter(r => (r.trang_thai_dk || r.trang_thai) === 'tu_choi').length,
    participated: registrations.filter(r => (r.trang_thai_dk || r.trang_thai) === 'da_tham_gia').length
  };

  const getStatusColor = (statusRaw) => {
    const status = statusRaw || 'cho_duyet';
    switch (status) {
      case 'da_duyet': return 'bg-green-100 text-green-800';
      case 'cho_duyet': return 'bg-yellow-100 text-yellow-800';
      case 'tu_choi': return 'bg-red-100 text-red-800';
      case 'da_tham_gia': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (statusRaw) => {
    const status = statusRaw || 'cho_duyet';
    switch (status) {
      case 'da_duyet': return 'Đã duyệt';
      case 'cho_duyet': return 'Chờ duyệt';
      case 'tu_choi': return 'Từ chối';
      case 'da_tham_gia': return 'Đã tham gia';
      default: return status;
    }
  };

  const getStatusIcon = (statusRaw) => {
    const status = statusRaw || 'cho_duyet';
    switch (status) {
      case 'da_duyet': return <CheckCircle className="w-4 h-4" />;
      case 'cho_duyet': return <Clock className="w-4 h-4" />;
      case 'tu_choi': return <XCircle className="w-4 h-4" />;
      case 'da_tham_gia': return <Award className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const RegistrationCard = ({ registration }) => {
    const status = registration.trang_thai_dk || registration.trang_thai;
    const isSelected = selectedIds.includes(registration.id);
    const activity = registration.hoat_dong;
    const student = registration.sinh_vien;

    return (
      <div className="bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="flex">
          {/* Activity Image */}
          <div className="w-48 h-48 flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
            <img
              src={getBestActivityImage(activity)}
              alt={activity?.ten_hd}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/200x200?text=No+Image';
              }}
            />
            {viewMode === 'pending' && (
              <div className="absolute top-2 left-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds([...selectedIds, registration.id]);
                    } else {
                      setSelectedIds(selectedIds.filter(id => id !== registration.id));
                    }
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                  {activity?.ten_hd}
                </h3>
                <p className="text-sm text-gray-500 font-mono">{activity?.ma_hd}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                {getStatusText(status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const avatar = getUserAvatar(student?.nguoi_dung);
                    return avatar.hasValidAvatar ? (
                      <img
                        src={avatar.src}
                        alt={avatar.alt}
                        className="w-10 h-10 rounded-full object-cover border-2 border-orange-200"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/40?text=SV';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold border-2 border-orange-200">
                        {avatar.fallback}
                      </div>
                    );
                  })()}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{student?.nguoi_dung?.ho_ten}</p>
                    <p className="text-xs text-gray-500 font-mono">{student?.mssv || student?.ma_sv}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Lớp:</span> {student?.lop?.ten_lop || student?.lop || 'N/A'}
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span className="text-xs">
                    {registration.ngay_dang_ky || registration.ngay_dk 
                      ? new Date(registration.ngay_dang_ky || registration.ngay_dk).toLocaleDateString('vi-VN')
                      : 'N/A'}
                  </span>
                </div>
                {registration.ngay_duyet && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs">
                      Duyệt: {new Date(registration.ngay_duyet).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {registration.ly_do_dk && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-1">Lý do đăng ký:</p>
                <p className="text-sm text-gray-600 line-clamp-2">{registration.ly_do_dk}</p>
              </div>
            )}

            {registration.ly_do_tu_choi && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs font-medium text-red-700 mb-1">Lý do từ chối:</p>
                <p className="text-sm text-red-600">{registration.ly_do_tu_choi}</p>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t">
              <button
                onClick={() => handleViewActivity(activity)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium shadow-md hover:shadow-lg"
              >
                <Eye className="w-4 h-4" />
                Xem hoạt động
              </button>
              
              {status === 'cho_duyet' && (
                <>
                  <button
                    onClick={() => handleApproveRegistration(registration.id)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Phê duyệt
                  </button>
                  <button
                    onClick={() => handleRejectRegistration(registration.id)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    <XCircle className="w-4 h-4" />
                    Từ chối
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50/30 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải danh sách đăng ký...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50/30 p-6">
      {/* Header với gradient admin theme */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 rounded-2xl shadow-2xl p-8 mb-6">
        <div className="flex justify-between items-start">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Quản Lý Đăng Ký</h1>
                <p className="text-orange-100 mt-1">Phê duyệt và theo dõi đăng ký hoạt động</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleExportExcel}
              disabled={exporting || filteredRegistrations.length === 0}
              className="px-4 py-2 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Tổng đăng ký', value: stats.total, icon: Activity, color: 'from-blue-500 to-cyan-600' },
          { label: 'Chờ duyệt', value: stats.pending, icon: Clock, color: 'from-yellow-500 to-amber-600' },
          { label: 'Đã duyệt', value: stats.approved, icon: CheckCircle, color: 'from-green-500 to-emerald-600' },
          { label: 'Từ chối', value: stats.rejected, icon: XCircle, color: 'from-red-500 to-rose-600' },
          { label: 'Đã tham gia', value: stats.participated, icon: Award, color: 'from-purple-500 to-indigo-600' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <div className={`bg-gradient-to-r ${stat.color} p-4`}>
                <Icon className="w-6 h-6 text-white mb-2" />
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/90 mt-1">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'pending', label: 'Chờ duyệt', icon: Clock, count: stats.pending },
            { key: 'approved', label: 'Đã duyệt', icon: CheckCircle, count: stats.approved },
            { key: 'rejected', label: 'Từ chối', icon: XCircle, count: stats.rejected },
            { key: 'participated', label: 'Đã tham gia', icon: Award, count: stats.participated }
          ].map(mode => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 transform ${
                  viewMode === mode.key
                    ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {mode.label} ({mode.count})
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm sinh viên, hoạt động..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Activity filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white transition-all"
            >
              <option value="">Tất cả hoạt động</option>
              {activities.map(activity => (
                <option key={activity.id} value={activity.id}>
                  {activity.ten_hd}
                </option>
              ))}
            </select>
          </div>

          {/* Class filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white transition-all"
            >
              <option value="">Tất cả lớp</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.ten_lop || cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Semester filter (unified source) */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white transition-all"
            >
              {semesterOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {viewMode === 'pending' && selectedIds.length > 0 && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Đã chọn {selectedIds.length} đăng ký
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                Phê duyệt hàng loạt
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 text-sm font-medium"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Registrations List */}
      {filteredRegistrations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Không tìm thấy đăng ký nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRegistrations.map(registration => (
            <RegistrationCard key={registration.id} registration={registration} />
          ))}
        </div>
      )}

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        isOpen={!!showActivityModal && !!selectedActivity}
        activityId={selectedActivity?.id || selectedActivity?.hoat_dong_id || selectedActivity?.hd_id}
        onClose={() => {
          setShowActivityModal(false);
          setSelectedActivity(null);
        }}
      />

      {/* Approve Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmApprove.isOpen}
        onClose={() => setConfirmApprove({ isOpen: false, registrationId: null })}
        onConfirm={confirmApproveAction}
        title="Xác nhận phê duyệt"
        message="Bạn có chắc chắn muốn phê duyệt đăng ký này không? Sinh viên sẽ được tham gia hoạt động sau khi được phê duyệt."
        type="success"
        confirmText="Phê duyệt"
        cancelText="Hủy bỏ"
      />

      {/* Reject Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmReject.isOpen}
        onClose={() => {
          setConfirmReject({ isOpen: false, registrationId: null });
          setRejectReason('');
        }}
        onConfirm={confirmRejectAction}
        title="Xác nhận từ chối"
        message="Vui lòng nhập lý do từ chối đăng ký. Sinh viên sẽ nhận được thông báo về quyết định này."
        type="error"
        confirmText="Từ chối"
        cancelText="Hủy bỏ"
        showInput={true}
        inputPlaceholder="Nhập lý do từ chối (bắt buộc)..."
        inputValue={rejectReason}
        onInputChange={setRejectReason}
      />

      {/* Bulk Approve Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmBulkApprove}
        onClose={() => setConfirmBulkApprove(false)}
        onConfirm={confirmBulkApproveAction}
        title="Phê duyệt hàng loạt"
        message={`Bạn đang thực hiện phê duyệt ${selectedIds.length} đăng ký cùng lúc. Tất cả các sinh viên được chọn sẽ được phê duyệt tham gia hoạt động. Bạn có chắc chắn muốn tiếp tục?`}
        type="warning"
        confirmText={`Phê duyệt ${selectedIds.length} đăng ký`}
        cancelText="Hủy bỏ"
      />
    </div>
  );
};

export default AdminRegistrations;
