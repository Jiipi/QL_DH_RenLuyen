import React, { useState, useEffect } from 'react';
import { 
  Activity, Search, Eye, Calendar, MapPin, Users, Award, Clock, 
  CheckCircle, XCircle, AlertCircle, Filter, RefreshCw, LayoutGrid, List
} from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';
import { getActivityImage } from '../../utils/activityImages';

const TeacherActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // View state (no pagination)
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Semester filter state (reuse logic consistent with monitor pages)
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

  useEffect(() => {
    // Initial load
    fetchActivities();
  }, [semester]); // ✅ Chỉ reload khi đổi semester

  const fetchActivities = async () => {
    try {
      setLoading(true);
      // ✅ Gửi semester để backend lọc đúng học kỳ
      const response = await http.get('/activities', {
        params: { 
          page: 1, 
          limit: 'all',
          semester: semester || undefined
        }
      });
      
      // Parse response data the same way as ClassActivities
      const responseData = response.data?.data || response.data || {};
      const items = responseData.items || responseData.data || responseData || [];
      const itemsArray = Array.isArray(items) ? items : [];
      setActivities(itemsArray);
    } catch (error) {
      console.error('Lỗi khi tải danh sách hoạt động:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityDetails = async (activityId) => {
    try {
      const response = await http.get(`/activities/${activityId}`);
      const activityData = response.data?.data || response.data;
      setSelectedActivity(activityData);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Lỗi khi tải chi tiết hoạt động:', error);
      // Fallback: sử dụng dữ liệu từ danh sách
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        setSelectedActivity(activity);
        setShowDetailModal(true);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'cho_duyet': return { bg: '#fef3c7', color: '#92400e', text: 'Chờ duyệt' };
      case 'da_duyet': return { bg: '#dcfce7', color: '#15803d', text: 'Đã duyệt' };
      case 'tu_choi': return { bg: '#fef2f2', color: '#dc2626', text: 'Từ chối' };
      case 'da_huy': return { bg: '#f3f4f6', color: '#374151', text: 'Đã hủy' };
      case 'ket_thuc': return { bg: '#e0e7ff', color: '#3730a3', text: 'Kết thúc' };
      default: return { bg: '#fef3c7', color: '#92400e', text: 'Chưa xác định' };
    }
  };

  const filteredActivities = activities.filter(activity => {
    const needle = searchTerm.toLowerCase();
    const matchesSearch = !needle ||
      activity.ten_hd?.toLowerCase().includes(needle) ||
      activity.mo_ta?.toLowerCase().includes(needle) ||
      activity.dia_diem?.toLowerCase().includes(needle);
    
    // ✅ Khi không chọn status filter cụ thể (statusFilter = ""), chỉ hiển thị đã duyệt + kết thúc
    // (Giống logic trang lớp trưởng - chỉ đếm hoạt động có giá trị)
    const matchesStatus = statusFilter 
      ? activity.trang_thai === statusFilter 
      : (activity.trang_thai === 'da_duyet' || activity.trang_thai === 'ket_thuc');
    
    const matchesType = !typeFilter || activity.loai_hd_id === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleApproveActivity = async (activityId) => {
    if (!window.confirm('Bạn có chắc chắn muốn phê duyệt hoạt động này?')) return;
    
    try {
      await http.post(`/teacher/activities/${activityId}/approve`);
      alert('Phê duyệt hoạt động thành công!');
      await fetchActivities();
    } catch (error) {
      console.error('Lỗi khi phê duyệt hoạt động:', error);
      alert('Lỗi khi phê duyệt hoạt động: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRejectActivity = async (activityId) => {
    const reason = window.prompt('Nhập lý do từ chối:');
    if (!reason || !reason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    
    try {
      await http.post(`/teacher/activities/${activityId}/reject`, { reason: reason.trim() });
      alert('Từ chối hoạt động thành công!');
      await fetchActivities();
    } catch (error) {
      console.error('Lỗi khi từ chối hoạt động:', error);
      alert('Lỗi khi từ chối hoạt động: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Đang tải danh sách hoạt động...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Danh sách Hoạt động</h1>
            <p className="text-blue-100 mt-1">Xem và quản lý các hoạt động rèn luyện</p>
          </div>
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode==='list' ? 'bg-white text-blue-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
              title="Dạng danh sách"
            >
              <List className="h-4 w-4" />
              Danh sách
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode==='grid' ? 'bg-white text-blue-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
              title="Dạng lưới"
            >
              <LayoutGrid className="h-4 w-4" />
              Lưới
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Tìm kiếm hoạt động..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Semester Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {semesterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Đã duyệt + Kết thúc</option>
              <option value="cho_duyet">Chờ duyệt</option>
              <option value="da_duyet">Đã duyệt</option>
              <option value="tu_choi">Từ chối</option>
              <option value="da_huy">Đã hủy</option>
              <option value="ket_thuc">Kết thúc</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchActivities}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Hoạt động ({filteredActivities.length})
            </h2>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Không có hoạt động nào</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActivities.map((activity) => {
                const statusInfo = getStatusColor(activity.trang_thai);
                const registeredCount = activity.registrationCount ?? activity.so_dang_ky ?? activity._count?.dang_ky_hd ?? 0;
                const capacity = activity.sl_toi_da ?? activity.so_luong_toi_da ?? 0;
                return (
                  <div key={activity.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    <div className="relative w-full h-40">
                      <img 
                        src={getActivityImage(activity.hinh_anh, activity.loai_hd?.ten_loai_hd)} 
                        alt={activity.ten_hd}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: statusInfo.bg, color: statusInfo.color}}>
                        {statusInfo.text}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">{activity.ten_hd || 'Chưa có tên'}</h3>
                      <div className="space-y-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {activity.ngay_bd ? new Date(activity.ngay_bd).toLocaleDateString('vi-VN') : 'Chưa có thời gian'}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {activity.dia_diem || 'Chưa có địa điểm'}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-gray-700"><Users className="h-4 w-4" />{registeredCount} / {capacity}</span>
                          <span className="inline-flex items-center gap-1 text-gray-700"><Award className="h-4 w-4" />{activity.diem_rl || 0}</span>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <button
                          onClick={() => fetchActivityDetails(activity.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          Chi tiết
                        </button>
                        {activity.trang_thai === 'cho_duyet' && (
                          <>
                            <button
                              onClick={() => handleApproveActivity(activity.id)}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleRejectActivity(activity.id)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const statusInfo = getStatusColor(activity.trang_thai);
                const registeredCount = activity.registrationCount ?? activity.so_dang_ky ?? activity._count?.dang_ky_hd ?? 0;
                const capacity = activity.sl_toi_da ?? activity.so_luong_toi_da ?? 0;
                return (
                  <div 
                    key={activity.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      {/* Activity Image */}
                      <div className="relative w-48 h-40 flex-shrink-0">
                        <img 
                          src={getActivityImage(activity.hinh_anh, activity.loai_hd?.ten_loai_hd)} 
                          alt={activity.ten_hd}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                      </div>
                      
                      <div className="flex-1 p-4 flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {activity.ten_hd || 'Chưa có tên'}
                            </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{activity.mo_ta || 'Không có mô tả'}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {activity.dia_diem || 'Chưa có địa điểm'}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {activity.ngay_bd ? new Date(activity.ngay_bd).toLocaleDateString('vi-VN') : 'Chưa có thời gian'}
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Đăng ký: {registeredCount} / {capacity}
                          </div>

                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Điểm: {activity.diem_rl || 0}
                          </div>
                        </div>
                        
                        {/* Thông tin người tạo */}
                        {activity.nguoi_tao && (
                          <div className="mt-2 text-xs text-gray-400">
                            Tạo bởi: {activity.nguoi_tao.ho_ten || activity.nguoi_tao.email || 'Không xác định'}
                          </div>
                        )}
                        
                        {/* Thông tin loại hoạt động */}
                        {activity.loai_hd && (
                          <div className="mt-1 text-xs text-gray-400">
                            Loại: {activity.loai_hd.ten_loai_hd || 'Không xác định'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => fetchActivityDetails(activity.id)}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          Chi tiết
                        </button>
                        
                        {activity.trang_thai === 'cho_duyet' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveActivity(activity.id)}
                              className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleRejectActivity(activity.id)}
                              className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              <XCircle className="h-4 w-4" />
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No pagination: load all */}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chi tiết hoạt động</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên hoạt động</label>
                <p className="text-gray-900">{selectedActivity.ten_hd || 'Chưa có tên'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <p className="text-gray-900">{selectedActivity.mo_ta || 'Không có mô tả'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                  <p className="text-gray-900">{selectedActivity.dia_diem || 'Chưa có địa điểm'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tối đa</label>
                  <p className="text-gray-900">{selectedActivity.sl_toi_da || 0} người</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu</label>
                  <p className="text-gray-900">
                    {selectedActivity.ngay_bd ? new Date(selectedActivity.ngay_bd).toLocaleString('vi-VN') : 'Chưa có thời gian'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
                  <p className="text-gray-900">
                    {selectedActivity.ngay_kt ? new Date(selectedActivity.ngay_kt).toLocaleString('vi-VN') : 'Chưa có thời gian'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điểm rèn luyện</label>
                  <p className="text-gray-900">{selectedActivity.diem_rl || 0} điểm</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <p className="text-gray-900">{getStatusColor(selectedActivity.trang_thai).text}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người tạo</label>
                  <p className="text-gray-900">
                    {selectedActivity.nguoi_tao?.ho_ten || selectedActivity.nguoi_tao?.email || 'Không xác định'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại hoạt động</label>
                  <p className="text-gray-900">
                    {selectedActivity.loai_hd?.ten_loai_hd || 'Không xác định'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
                  <p className="text-gray-900">
                    {selectedActivity.ngay_tao ? new Date(selectedActivity.ngay_tao).toLocaleString('vi-VN') : 'Không xác định'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hạn đăng ký</label>
                  <p className="text-gray-900">
                    {selectedActivity.han_dk ? new Date(selectedActivity.han_dk).toLocaleString('vi-VN') : 'Không giới hạn'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherActivities;
