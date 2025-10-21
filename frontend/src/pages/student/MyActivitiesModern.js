import React from 'react';
import { 
  Clock, CheckCircle, XCircle, Calendar, MapPin, Award, Users, Eye, AlertCircle, 
  UserX, QrCode, ChevronRight, FileText, Trophy, Sparkles, TrendingUp, Star,
  RefreshCw, Zap, Filter
} from 'lucide-react';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import ActivityQRModal from '../../components/ActivityQRModal';
import { getActivityImage } from '../../utils/activityImages';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function MyActivitiesModern() {
  const { showSuccess, showError, confirm } = useNotification();
  const [tab, setTab] = React.useState('pending');
  const [data, setData] = React.useState({ pending: [], approved: [], joined: [], rejected: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedActivityId, setSelectedActivityId] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [qrModalOpen, setQrModalOpen] = React.useState(false);
  const [qrActivityId, setQrActivityId] = React.useState(null);
  const [qrActivityName, setQrActivityName] = React.useState('');
  const [scopeFilter, setScopeFilter] = React.useState('all'); // 'all', 'in-class', 'out-class'
  const [semester, setSemester] = React.useState('');
  const { options: semesterOptions } = useSemesterOptions();

  const parseSemesterToLegacy = React.useCallback((value) => {
    const m = String(value || '').match(/^(hoc_ky_1|hoc_ky_2)-(\d{4})$/);
    if (!m) return { hoc_ky: '', nam_hoc: '' };
    const hoc_ky = m[1];
    const y = parseInt(m[2], 10);
    const nam_hoc = hoc_ky === 'hoc_ky_1' ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    return { hoc_ky, nam_hoc };
  }, []);

  const loadMyActivities = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const legacy = parseSemesterToLegacy(semester);
      const params = {};
      if (semester) {
        params.semester = semester;
        if (legacy.hoc_ky) params.hoc_ky = legacy.hoc_ky;
        if (legacy.nam_hoc) params.nam_hoc = legacy.nam_hoc;
      }
      
      const res = await http.get('/dashboard/activities/me', { params });
      const activities = res.data?.data || res.data || [];
      
      const pending = activities.filter(x => (x.trang_thai_dk || '').toLowerCase() === 'cho_duyet');
      const approved = activities.filter(x => (x.trang_thai_dk || '').toLowerCase() === 'da_duyet');
      const joined = activities.filter(x => (x.trang_thai_dk || '').toLowerCase() === 'da_tham_gia');
      const rejected = activities.filter(x => (x.trang_thai_dk || '').toLowerCase() === 'tu_choi');
      
      setData({ pending, approved, joined, rejected });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải dữ liệu hoạt động');
    } finally {
      setLoading(false);
    }
  }, [semester, parseSemesterToLegacy]);

  React.useEffect(() => {
    loadMyActivities();
  }, [loadMyActivities]);

  async function cancelRegistration(hdId, activityName) {
    const confirmed = await confirm({
      title: 'Xác nhận hủy đăng ký',
      message: `Bạn có chắc muốn hủy đăng ký hoạt động "${activityName}"?`,
      confirmText: 'Hủy đăng ký',
      cancelText: 'Không'
    });
    
    if (!confirmed) return;
    
    try {
      const res = await http.post(`/activities/${hdId}/cancel`);
      if (res.data?.success) {
        showSuccess('Hủy đăng ký thành công');
        loadMyActivities();
      } else {
        showSuccess(res.data?.message || 'Hủy đăng ký thành công');
        loadMyActivities();
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.message || e?.message || 'Hủy đăng ký thất bại';
      showError(errorMsg);
    }
  }

  function handleViewDetail(activityId) {
    setSelectedActivityId(activityId);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedActivityId(null);
  }

  function handleShowQR(activityId, activityName) {
    setQrActivityId(activityId);
    setQrActivityName(activityName);
    setQrModalOpen(true);
  }

  function handleCloseQRModal() {
    setQrModalOpen(false);
    setQrActivityId(null);
    setQrActivityName('');
  }

  function ActivityCard({ activity, status }) {
    const activityData = activity.hoat_dong || activity;
    const startDate = activityData.ngay_bd ? new Date(activityData.ngay_bd) : null;
    const registrationDate = activity.ngay_dang_ky ? new Date(activity.ngay_dang_ky) : null;
    const approvalDate = activity.ngay_duyet ? new Date(activity.ngay_duyet) : null;

    const statusConfig = {
      'pending': { 
        icon: Clock, 
        bg: 'bg-amber-50', 
        border: 'border-amber-200', 
        text: 'text-amber-700', 
        dot: 'bg-amber-400',
        gradient: 'from-amber-400 to-orange-500',
        label: 'Chờ phê duyệt' 
      },
      'approved': { 
        icon: CheckCircle, 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        text: 'text-emerald-700', 
        dot: 'bg-emerald-400',
        gradient: 'from-emerald-400 to-green-500',
        label: 'Đã duyệt' 
      },
      'joined': { 
        icon: Trophy, 
        bg: 'bg-blue-50', 
        border: 'border-blue-200', 
        text: 'text-blue-700', 
        dot: 'bg-blue-400',
        gradient: 'from-blue-400 to-indigo-500',
        label: 'Đã tham gia' 
      },
      'rejected': { 
        icon: XCircle, 
        bg: 'bg-rose-50', 
        border: 'border-rose-200', 
        text: 'text-rose-700', 
        dot: 'bg-rose-400',
        gradient: 'from-rose-400 to-red-500',
        label: 'Bị từ chối' 
      }
    };

    const config = statusConfig[status] || statusConfig['pending'];
    const StatusIcon = config.icon;

    return (
      <div className="group relative">
        <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
        
        <div className={`relative bg-white border-2 ${config.border} rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col`}>
          {/* Activity Image */}
          <div className="relative w-full h-48 overflow-hidden">
            <img 
              src={getActivityImage(activityData.hinh_anh, activityData.loai || activityData.loai_hd?.ten_loai_hd)} 
              alt={activityData.ten_hd || activityData.name || 'Hoạt động'}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                e.target.src = getActivityImage(null, activityData.loai || activityData.loai_hd?.ten_loai_hd);
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            
            {/* Status Badge on Image */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/90 backdrop-blur-sm ${config.text} shadow-lg`}>
                <div className={`w-2 h-2 rounded-full ${config.dot} mr-2 animate-pulse`}></div>
                {config.label}
              </span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/90 backdrop-blur-sm text-white shadow-lg">
                <Trophy className="h-4 w-4" />
                <span className="font-bold">+{activityData.diem_rl || activityData.diem || 0}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                {activityData.ten_hd || activityData.name || 'Hoạt động'}
              </h3>
            </div>

          {/* Details Grid */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-700">{activityData.loai || 'Chưa phân loại'}</span>
            </div>
            
            {startDate && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <Clock className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">{startDate.toLocaleDateString('vi-VN')}</p>
                  <p className="text-sm text-gray-600">{startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )}
            
            {activityData.dia_diem && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <MapPin className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-700">{activityData.dia_diem}</span>
              </div>
            )}
            
            {activityData.don_vi_to_chuc && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                <Users className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-gray-700">{activityData.don_vi_to_chuc}</span>
              </div>
            )}

            {registrationDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600 px-4 py-2 bg-gray-50 rounded-xl">
                <FileText className="h-4 w-4" />
                <span>Đăng ký ngày: {registrationDate.toLocaleDateString('vi-VN')}</span>
              </div>
            )}

            {(status === 'approved' || status === 'joined') && approvalDate && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Duyệt ngày: {approvalDate.toLocaleDateString('vi-VN')}</span>
              </div>
            )}

            {status === 'rejected' && activity.ly_do_tu_choi && (
              <div className="flex items-start gap-3 text-sm text-rose-700 px-4 py-3 bg-rose-50 rounded-xl border border-rose-200">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Lý do từ chối:</p>
                  <p>{activity.ly_do_tu_choi}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 mt-4 border-t-2 border-gray-100">
            <button
              onClick={() => handleViewDetail(activityData.id || activity.hd_id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Eye className="h-5 w-5" />
              Chi tiết
            </button>
            
            {(status === 'approved' || status === 'joined') && (
              <button
                onClick={() => handleShowQR(activityData.id || activity.hd_id, activityData.ten_hd || activityData.name || 'Hoạt động')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <QrCode className="h-5 w-5" />
                QR
              </button>
            )}
            
            {status === 'pending' && (
              <button
                onClick={() => cancelRegistration(activity.hd_id || activityData.id, activityData.ten_hd || activityData.name)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <UserX className="h-5 w-5" />
                Hủy
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    );
  }

  const tabsConfig = [
    { key: 'pending', title: 'Chờ duyệt', icon: Clock, count: data.pending.length, gradient: 'from-amber-500 to-orange-600' },
    { key: 'approved', title: 'Đã duyệt', icon: CheckCircle, count: data.approved.length, gradient: 'from-emerald-500 to-green-600' },
    { key: 'joined', title: 'Đã tham gia', icon: Trophy, count: data.joined.length, gradient: 'from-blue-500 to-indigo-600' },
    { key: 'rejected', title: 'Bị từ chối', icon: XCircle, count: data.rejected.length, gradient: 'from-rose-500 to-red-600' }
  ];

  const currentItems = data[tab] || [];
  const totalActivities = data.pending.length + data.approved.length + data.joined.length + data.rejected.length;

  return (
    <div className="space-y-6">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-blue-700 rounded-3xl shadow-2xl p-8">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  Hoạt Động Của Tôi
                  <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                </h1>
              </div>
              <p className="text-purple-100 text-lg">Theo dõi và quản lý các hoạt động bạn đã đăng ký</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
              <p className="text-white/80 text-sm mb-1">Tổng số</p>
              <p className="text-3xl font-bold text-white">{totalActivities}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Semester Filter */}
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Bộ lọc</h3>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả học kỳ</option>
              {semesterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabsConfig.map(config => (
          <div key={config.key} className="group relative">
            <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>
            
            <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-4 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${config.gradient}`}>
                  <config.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-gray-900">{config.count}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">{config.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Scope Filter Tabs */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScopeFilter('all')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              scopeFilter === 'all' 
                ? 'bg-white shadow-lg text-blue-600 scale-105' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span>Tất cả</span>
            <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
              {currentItems.length}
            </span>
          </button>
          
          <button
            onClick={() => setScopeFilter('in-class')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              scopeFilter === 'in-class' 
                ? 'bg-white shadow-lg text-green-600 scale-105' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Lớp của tôi</span>
            <span className="px-2.5 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full">
              {currentItems.filter(item => item.is_class_activity).length}
            </span>
          </button>
          
          <button
            onClick={() => setScopeFilter('out-class')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              scopeFilter === 'out-class' 
                ? 'bg-white shadow-lg text-purple-600 scale-105' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            <span>Ngoài lớp</span>
            <span className="px-2.5 py-1 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
              {currentItems.filter(item => !item.is_class_activity).length}
            </span>
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-3">
        {tabsConfig.map(config => (
          <button
            key={config.key}
            onClick={() => setTab(config.key)}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              tab === config.key
                ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg transform scale-105`
                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
            }`}
          >
            <config.icon className="h-5 w-5" />
            <span>{config.title}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              tab === config.key ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {config.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative inline-block mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-purple-600 border-r-pink-600 absolute inset-0"></div>
            <Zap className="absolute inset-0 m-auto h-6 w-6 text-purple-600 animate-pulse" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">Đang tải...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 rounded-xl p-3">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-red-900 font-semibold">Đã xảy ra lỗi</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!loading && !error && currentItems.length === 0) && (
        <div className="text-center py-16">
          <div className="inline-block p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-full mb-6">
            <Award className="h-16 w-16 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Chưa có hoạt động nào</h3>
          <p className="text-gray-600 mb-6">Bạn chưa có hoạt động nào trong danh mục này</p>
          <button
            onClick={loadMyActivities}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <RefreshCw className="h-5 w-5" />
            Làm mới
          </button>
        </div>
      )}

      {/* Activities Grid */}
      {(!loading && !error && currentItems.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-700 font-semibold">
              Có <span className="text-purple-600 font-bold">{currentItems.length}</span> hoạt động
            </span>
            <button
              onClick={loadMyActivities}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:text-purple-700 font-medium hover:bg-purple-50 rounded-xl transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentItems
              .filter(activity => {
                // Filter by scope
                if (scopeFilter === 'all') return true;
                if (scopeFilter === 'in-class') return activity.is_class_activity;
                if (scopeFilter === 'out-class') return !activity.is_class_activity;
                return true;
              })
              .map((activity, idx) => (
                <ActivityCard key={activity.id || activity.hd_id || idx} activity={activity} status={tab} />
              ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ActivityDetailModal
        activityId={selectedActivityId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
      
      <ActivityQRModal
        activityId={qrActivityId}
        activityName={qrActivityName}
        isOpen={qrModalOpen}
        onClose={handleCloseQRModal}
      />
    </div>
  );
}
