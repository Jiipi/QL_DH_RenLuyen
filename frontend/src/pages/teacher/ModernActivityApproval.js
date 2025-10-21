import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Calendar, 
  Award,
  AlertCircle,
  Eye,
  Filter,
  Search,
  History,
  FileCheck
} from 'lucide-react';
import http from '../../services/http';
import { getActivityImage } from '../../utils/activityImages';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function ModernActivityApproval() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' hoặc 'history'
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [semester, setSemester] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', activityId: null, title: '', message: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const [detailModal, setDetailModal] = useState({ isOpen: false, activity: null });

  // Auto-detect current semester on mount
  useEffect(() => {
    const currentSemester = getCurrentSemesterValue();
    setSemester(currentSemester);
  }, []);

  useEffect(() => {
    loadActivities();
  }, [semester, activeTab]);

  // Helper function to get current semester
  const getCurrentSemesterValue = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    // Học kỳ 1: tháng 9 - tháng 1 (năm sau)
    // Học kỳ 2: tháng 2 - tháng 8
    if (month >= 2 && month <= 8) {
      return `hoc_ky_2-${year}`;
    } else {
      // Tháng 9-12: HK1 năm hiện tại
      // Tháng 1: HK1 năm trước
      const academicYear = month === 1 ? year - 1 : year;
      return `hoc_ky_1-${academicYear}`;
    }
  };

  // Unified semester options
  const { options: semesterOptions } = useSemesterOptions();

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // Chọn endpoint dựa trên tab hiện tại
      const endpoint = activeTab === 'pending' 
        ? '/teacher/activities/pending' 
        : '/teacher/activities/history';
      
      const params = { 
        page: 1, 
        limit: 100,
        search: searchTerm || undefined,
        semester: semester || undefined
      };
      
      // Nếu là tab history, thêm status filter
      if (activeTab === 'history' && filter !== 'all') {
        params.status = filter;
      }
      
      const res = await http.get(endpoint, { params });
      
      // Parse response - backend returns: { success: true, data: { items: [...], total, page, limit, stats } }
      const responseData = res.data?.data || res.data || {};
      const activities = responseData.items || responseData.data || responseData || [];
      const activitiesArray = Array.isArray(activities) ? activities : [];
      
      setActivities(activitiesArray);
      
      // Cập nhật stats từ API (chỉ cho tab pending)
      if (activeTab === 'pending' && responseData.stats) {
        setStats(responseData.stats);
      } else if (activeTab === 'pending') {
        // Fallback nếu backend chưa trả stats
        setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      }
      
      setError('');
      
      console.log(`✅ Loaded ${activitiesArray.length} activities (tab: ${activeTab})`);
      if (activeTab === 'pending') console.log(`📊 Stats:`, responseData.stats);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Không thể tải danh sách hoạt động');
      setActivities([]);
      if (activeTab === 'pending') {
        setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const handleApproveClick = (activityId) => {
    setConfirmModal({
      isOpen: true,
      type: 'approve',
      activityId,
      title: 'Xác nhận phê duyệt',
      message: 'Bạn có chắc chắn muốn phê duyệt hoạt động này không?'
    });
  };

  const handleRejectClick = (activityId) => {
    setRejectReason('');
    setConfirmModal({
      isOpen: true,
      type: 'reject',
      activityId,
      title: 'Xác nhận từ chối',
      message: 'Vui lòng nhập lý do từ chối hoạt động này:'
    });
  };

  const handleConfirmAction = async () => {
    const { type, activityId } = confirmModal;
    
    try {
      if (type === 'approve') {
        await http.post(`/teacher/activities/${activityId}/approve`);
        showToast('Phê duyệt hoạt động thành công!', 'success');
        await loadActivities();
      } else if (type === 'reject') {
        if (!rejectReason || rejectReason.trim() === '') {
          showToast('Vui lòng nhập lý do từ chối', 'warning');
          return;
        }
        await http.post(`/teacher/activities/${activityId}/reject`, { reason: rejectReason.trim() });
        showToast('Từ chối hoạt động thành công!', 'success');
        await loadActivities();
      }
      setConfirmModal({ isOpen: false, type: '', activityId: null, title: '', message: '' });
      setRejectReason('');
    } catch (err) {
      console.error('Error processing activity:', err);
      const errorMsg = err?.response?.data?.message || 'Không thể xử lý hoạt động. Vui lòng thử lại.';
      showToast(errorMsg, 'error');
    }
  };

  const handleViewDetail = (activity) => {
    setDetailModal({ isOpen: true, activity });
  };

  const filteredActivities = activities.filter(activity => {
    const matchesFilter = filter === 'all' || activity.trang_thai === filter;
    const matchesSearch = activity.ten_hd.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.mo_ta?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusColors = {
    'cho_duyet': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'da_duyet': 'bg-green-100 text-green-800 border-green-200',
    'tu_choi': 'bg-red-100 text-red-800 border-red-200'
  };

  const statusLabels = {
    'cho_duyet': 'Chờ duyệt',
    'da_duyet': 'Đã duyệt',
    'tu_choi': 'Từ chối'
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Có lỗi xảy ra</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadActivities}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Phê duyệt hoạt động</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Xem và phê duyệt các hoạt động do sinh viên trong lớp tạo
          {semester && (
            <span className="ml-2 text-blue-600 font-medium">
              ({(semesterOptions || []).find(opt => opt.value === semester)?.label})
            </span>
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px space-x-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Chờ phê duyệt</span>
                {activeTab === 'pending' && stats.pending > 0 && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {stats.pending}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-5 h-5" />
                <span>Lịch sử phê duyệt</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Stats Summary - Only show for pending tab */}
      {!loading && activeTab === 'pending' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Tổng hoạt động</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Chờ duyệt</div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Đã duyệt</div>
                <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm hoạt động..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[160px]"
            >
              {(semesterOptions || []).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {activeTab === 'history' && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[140px]"
              >
                <option value="all">Tất cả</option>
                <option value="da_duyet">Đã duyệt</option>
                <option value="tu_choi">Từ chối</option>
              </select>
            )}
            {activeTab === 'pending' && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[140px]"
              >
                <option value="all">Tất cả</option>
                <option value="cho_duyet">Chờ duyệt</option>
                <option value="da_duyet">Đã duyệt</option>
                <option value="tu_choi">Từ chối</option>
              </select>
            )}
            <button
              onClick={loadActivities}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Tải lại</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activities Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredActivities.length > 0 ? (
          filteredActivities.map(activity => (
            <div key={activity.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
              {/* Activity Image */}
              <div className="relative w-full h-48 overflow-hidden">
                <img 
                  src={getActivityImage(activity.hinh_anh, activity.loai_hd?.ten_loai_hd)} 
                  alt={activity.ten_hd}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${statusColors[activity.trang_thai]}`}>
                    {statusLabels[activity.trang_thai]}
                  </span>
                </div>

                {/* Title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-white text-lg line-clamp-2 drop-shadow-lg">{activity.ten_hd}</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                {/* Creator Info - Lớp trưởng */}
                {activity.nguoi_tao && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-indigo-600 font-medium">Người tạo</div>
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {activity.nguoi_tao.ho_ten}
                        </div>
                        {activity.nguoi_tao.sinh_vien?.lop?.ten_lop && (
                          <div className="text-xs text-gray-600">
                            Lớp: {activity.nguoi_tao.sinh_vien.lop.ten_lop}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-shrink-0">{activity.mo_ta || 'Không có mô tả'}</p>
              
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-amber-50 rounded-lg p-2">
                    <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Điểm</div>
                      <div className="font-semibold text-sm text-gray-900">{activity.diem_rl}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                    <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Ngày</div>
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {new Date(activity.ngay_bd).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2">
                    <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">SL tối đa</div>
                      <div className="font-semibold text-sm text-gray-900">{activity.sl_toi_da}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-purple-50 rounded-lg p-2">
                    <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Tạo lúc</div>
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {new Date(activity.ngay_tao).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Always at bottom */}
                <div className="mt-auto pt-4 border-t border-gray-100">
                  {activeTab === 'pending' && activity.trang_thai === 'cho_duyet' ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleApproveClick(activity.id)}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 font-medium text-sm shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Phê duyệt
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRejectClick(activity.id)}
                          className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 font-medium text-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          Từ chối
                        </button>
                        <button 
                          onClick={() => handleViewDetail(activity)}
                          className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Display reason if rejected */}
                      {activity.trang_thai === 'tu_choi' && activity.ly_do_tu_choi && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                          <div className="text-xs text-red-600 font-medium mb-1">Lý do từ chối:</div>
                          <div className="text-sm text-gray-700">{activity.ly_do_tu_choi}</div>
                        </div>
                      )}
                      <button 
                        onClick={() => handleViewDetail(activity)}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Xem chi tiết
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
            {activeTab === 'pending' ? (
              <>
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">Không có hoạt động nào</h3>
                <p className="text-gray-400 text-sm">
                  {searchTerm || filter !== 'all' 
                    ? 'Không tìm thấy hoạt động phù hợp với bộ lọc' 
                    : semester 
            ? `Chưa có hoạt động nào cần phê duyệt trong ${(semesterOptions || []).find(opt => opt.value === semester)?.label || 'học kỳ này'}`
                      : 'Chưa có hoạt động nào cần phê duyệt'
                  }
                </p>
                <p className="text-gray-400 text-xs mt-2">Hãy thử chọn học kỳ khác hoặc thay đổi bộ lọc</p>
              </>
            ) : (
              <>
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">Chưa có lịch sử phê duyệt</h3>
                <p className="text-gray-400 text-sm">
                  {searchTerm || filter !== 'all' 
                    ? 'Không tìm thấy hoạt động phù hợp với bộ lọc' 
                    : semester 
            ? `Chưa có hoạt động nào đã xử lý trong ${(semesterOptions || []).find(opt => opt.value === semester)?.label || 'học kỳ này'}`
                      : 'Chưa có hoạt động nào đã được phê duyệt hoặc từ chối'
                  }
                </p>
                <p className="text-gray-400 text-xs mt-2">Các hoạt động đã duyệt hoặc từ chối sẽ xuất hiện ở đây</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          setConfirmModal({ isOpen: false, type: '', activityId: null, title: '', message: '' });
          setRejectReason('');
        }}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type === 'approve' ? 'confirm' : 'warning'}
        confirmText={confirmModal.type === 'approve' ? 'Phê duyệt' : 'Từ chối'}
        cancelText="Hủy"
        showInput={confirmModal.type === 'reject'}
        inputPlaceholder="Nhập lý do từ chối..."
        inputValue={rejectReason}
        onInputChange={setRejectReason}
      />

      {/* Toast Notification */}
      {toast.isOpen && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ isOpen: false, message: '', type: 'success' })}
          duration={3000}
        />
      )}

      {/* Activity Detail Modal */}
      {detailModal.isOpen && detailModal.activity && (
        <ActivityDetailModal
          activityId={detailModal.activity.id}
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal({ isOpen: false, activity: null })}
        />
      )}
    </div>
  );
}
