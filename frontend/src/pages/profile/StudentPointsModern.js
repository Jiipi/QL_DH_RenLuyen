import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, Calendar, Award, Target, BarChart3, Download, 
  Star, Trophy, CheckCircle, Clock, Filter, RefreshCw,
  ChevronRight, Sparkles, Medal, TrendingDown
} from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function StudentPointsModern() {
  const [pointsSummary, setPointsSummary] = useState(null);
  const [pointsDetail, setPointsDetail] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [semester, setSemester] = useState('');
  const { options: semesterOptions } = useSemesterOptions();

  const parseSemesterToLegacy = (value) => {
    const m = String(value || '').match(/^(hoc_ky_1|hoc_ky_2)-(\d{4})$/);
    if (!m) return { hoc_ky: '', nam_hoc: '' };
    const hoc_ky = m[1];
    const y = parseInt(m[2], 10);
    const nam_hoc = hoc_ky === 'hoc_ky_1' ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    return { hoc_ky, nam_hoc };
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const legacy = parseSemesterToLegacy(semester);
      const baseParams = { };
      if (semester) {
        baseParams.semester = semester;
        if (legacy.hoc_ky) baseParams.hoc_ky = legacy.hoc_ky;
        if (legacy.nam_hoc) baseParams.nam_hoc = legacy.nam_hoc;
      }

      const summaryResponse = await http.get('/student-points/summary', { params: baseParams });
      const summaryData = summaryResponse?.data?.data || summaryResponse?.data;
      
      if (summaryData && summaryData.thong_ke) {
        const transformedSummary = {
          tong_diem: summaryData.thong_ke.tong_diem || 0,
          so_hoat_dong: summaryData.thong_ke.tong_hoat_dong || 0,
          diem_trung_binh: summaryData.thong_ke.tong_hoat_dong > 0 
            ? (summaryData.thong_ke.tong_diem / summaryData.thong_ke.tong_hoat_dong).toFixed(2)
            : 0,
          xep_hang: '-',
          diem_theo_tieu_chi: {},
          hoat_dong_gan_day: (summaryData.hoat_dong_gan_day || []).slice(0, 5).map(activity => ({
            ten_hoat_dong: activity.ten_hd,
            ngay_to_chuc: activity.ngay_dang_ky,
            diem: activity.diem_rl,
            loai_hd: activity.loai_hd || 'Khác',
            trang_thai: activity.trang_thai || 'da_duyet'
          }))
        };
        
        if (summaryData.thong_ke.diem_theo_loai) {
          summaryData.thong_ke.diem_theo_loai.forEach(item => {
            transformedSummary.diem_theo_tieu_chi[item.ten_loai] = item.tong_diem;
          });
        }
        
        setPointsSummary(transformedSummary);
      } else {
        setPointsSummary({
          tong_diem: 0,
          so_hoat_dong: 0,
          diem_trung_binh: 0,
          xep_hang: '-',
          diem_theo_tieu_chi: {},
          hoat_dong_gan_day: []
        });
      }
      
  const detailResponse = await http.get('/student-points/detail', { params: baseParams });
      const detailData = detailResponse?.data?.data?.data || detailResponse?.data?.data || [];
      
      const transformedDetail = detailData.map(item => ({
        ten_hoat_dong: item.hoat_dong?.ten_hd || '',
        ngay_to_chuc: item.hoat_dong?.ngay_bd || item.dang_ky?.ngay_dang_ky,
        diem: item.hoat_dong?.diem_rl || 0,
        mo_ta: item.hoat_dong?.mo_ta || '',
        loai_hd: item.hoat_dong?.loai_hd || 'Khác',
        trang_thai: item.dang_ky?.trang_thai || 'da_duyet',
        ghi_chu: item.dang_ky?.ghi_chu || ''
      }));
      
      setPointsDetail(transformedDetail);
      
  const attendanceResponse = await http.get('/student-points/attendance-history', { params: baseParams });
      const attendanceData = attendanceResponse?.data?.data?.data || attendanceResponse?.data?.data || [];
      
      const transformedAttendance = attendanceData.map(item => ({
        ten_hoat_dong: item.hoat_dong?.ten_hd || '',
        ngay_dang_ky: item.diem_danh?.thoi_gian || '',
        loai_hd: item.hoat_dong?.loai_hd || 'Khác',
        trang_thai: item.diem_danh?.trang_thai_tham_gia === 'co_mat' ? 'da_duyet' : 'tu_choi',
        diem_danh: item.diem_danh?.trang_thai_tham_gia === 'co_mat',
        diem_nhan_duoc: item.diem_danh?.trang_thai_tham_gia === 'co_mat' ? item.hoat_dong?.diem_rl || 0 : 0,
        phuong_thuc: item.diem_danh?.phuong_thuc || 'QR_CODE'
      }));
      
      setAttendanceHistory(transformedAttendance);
      
    } catch (error) {
      console.error('Failed to load student points data:', error);
      setPointsSummary({
        tong_diem: 0,
        so_hoat_dong: 0,
        diem_trung_binh: 0,
        xep_hang: '-',
        diem_theo_tieu_chi: {},
        hoat_dong_gan_day: []
      });
      setPointsDetail([]);
      setAttendanceHistory([]);
    } finally {
      setLoading(false);
    }
  }, [semester]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const downloadReport = async () => {
    try {
      const legacy = parseSemesterToLegacy(semester);
      const params = {};
      if (semester) {
        params.semester = semester;
        if (legacy.hoc_ky) params.hoc_ky = legacy.hoc_ky;
        if (legacy.nam_hoc) params.nam_hoc = legacy.nam_hoc;
      }
      const response = await http.get('/student-points/report', { 
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao-cao-diem-ren-luyen-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Lỗi khi tải báo cáo');
    }
  };

  const getPointsColor = (points) => {
    if (points >= 90) return 'from-green-500 to-emerald-600';
    if (points >= 80) return 'from-blue-500 to-indigo-600';
    if (points >= 65) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-600';
  };

  const getPointsBadgeColor = (points) => {
    if (points >= 90) return 'bg-green-100 text-green-700 border-green-200';
    if (points >= 80) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (points >= 65) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getClassification = (points) => {
    if (points >= 90) return { text: 'Xuất sắc', icon: Trophy, color: 'text-yellow-500' };
    if (points >= 80) return { text: 'Tốt', icon: Star, color: 'text-blue-500' };
    if (points >= 65) return { text: 'Khá', icon: Award, color: 'text-purple-500' };
    if (points >= 50) return { text: 'Trung bình', icon: CheckCircle, color: 'text-gray-500' };
    return { text: 'Yếu', icon: TrendingDown, color: 'text-red-500' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getCategoryIcon = (categoryName) => {
    if (categoryName.includes('Học tập') || categoryName.includes('học tập')) return '📚';
    if (categoryName.includes('Tình nguyện') || categoryName.includes('tình nguyện')) return '❤️';
    if (categoryName.includes('Nội quy') || categoryName.includes('nội quy')) return '⚖️';
    if (categoryName.includes('Văn hóa') || categoryName.includes('văn nghệ')) return '🎭';
    if (categoryName.includes('Thể thao') || categoryName.includes('thể dục')) return '⚽';
    return '🎯';
  };

  const getCategoryColor = (categoryName) => {
    if (categoryName.includes('Học tập')) return 'from-blue-400 to-blue-600';
    if (categoryName.includes('Tình nguyện')) return 'from-red-400 to-pink-600';
    if (categoryName.includes('Nội quy')) return 'from-green-400 to-emerald-600';
    if (categoryName.includes('Văn hóa')) return 'from-purple-400 to-purple-600';
    if (categoryName.includes('Thể thao')) return 'from-orange-400 to-orange-600';
    return 'from-gray-400 to-gray-600';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-64 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="h-6 w-24 bg-gray-200 rounded mb-3"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="h-64 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const classification = getClassification(pointsSummary?.tong_diem || 0);
  const ClassificationIcon = classification.icon;
  const pointsPercentage = Math.min((pointsSummary?.tong_diem || 0) / 100 * 100, 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-8">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                Điểm Rèn Luyện
                <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
              </h1>
              <p className="text-blue-100 text-lg">Theo dõi kết quả hoạt động và điểm rèn luyện của bạn</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => loadData()}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-5 py-3 rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/30"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 bg-white text-blue-600 px-5 py-3 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <Download className="h-4 w-4" />
              Tải báo cáo
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Bộ lọc</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Học kỳ</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
            >
              <option value="">Tất cả học kỳ</option>
              {semesterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Points Card */}
        <div className="relative group">
          <div className={`absolute inset-0 bg-gradient-to-br ${getPointsColor(pointsSummary?.tong_diem || 0)} rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300`}></div>
          <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-blue-200">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPointsBadgeColor(pointsSummary?.tong_diem || 0)}`}>
                {classification.text}
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Tổng điểm</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-4xl font-bold bg-gradient-to-br ${getPointsColor(pointsSummary?.tong_diem || 0)} bg-clip-text text-transparent`}>
                {pointsSummary?.tong_diem || 0}
              </p>
              <span className="text-gray-400 text-lg font-medium">/100</span>
            </div>
            {/* Progress bar */}
            <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getPointsColor(pointsSummary?.tong_diem || 0)} transition-all duration-1000 ease-out`}
                style={{ width: `${pointsPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Activities Count Card */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-3 shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Hoạt động tham gia</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-gray-900">{pointsSummary?.so_hoat_dong || 0}</p>
              <span className="text-gray-400 text-lg">hoạt động</span>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              🎯 Tiếp tục phấn đấu nhé!
            </p>
          </div>
        </div>

        {/* Average Points Card */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Điểm trung bình</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-gray-900">{pointsSummary?.diem_trung_binh || 0}</p>
              <span className="text-gray-400 text-lg">điểm/HĐ</span>
            </div>
            <div className="flex items-center gap-1 mt-3 text-emerald-600 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              <span>Ổn định</span>
            </div>
          </div>
        </div>

        {/* Ranking Card */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 shadow-lg">
                <Medal className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Xếp hạng lớp</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-gray-900">{pointsSummary?.xep_hang || '-'}</p>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              🏆 Sắp có bảng xếp hạng
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border">
        {/* Tab Headers */}
        <div className="border-b border-gray-100">
          <nav className="flex space-x-2 px-6">
            <button
              onClick={() => setActiveTab('summary')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 ${
                activeTab === 'summary'
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tổng quan
              {activeTab === 'summary' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 ${
                activeTab === 'detail'
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Chi tiết điểm
              {activeTab === 'detail' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 ${
                activeTab === 'attendance'
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lịch sử tham gia
              {activeTab === 'attendance' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && pointsSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Points by Category */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Điểm theo loại hoạt động</h3>
                  </div>
                  
                  {Object.keys(pointsSummary.diem_theo_tieu_chi).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(pointsSummary.diem_theo_tieu_chi).map(([key, value]) => {
                        const percentage = (value / (pointsSummary.tong_diem || 1)) * 100;
                        return (
                          <div key={key} className="group">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <span className="text-xl">{getCategoryIcon(key)}</span>
                                {key}
                              </span>
                              <span className="text-lg font-bold text-gray-900">{value} điểm</span>
                            </div>
                            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${getCategoryColor(key)} transition-all duration-1000 ease-out rounded-full shadow-sm`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <BarChart3 className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Chưa có dữ liệu điểm theo loại</p>
                    </div>
                  )}
                </div>

                {/* Recent Activities */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-2">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Hoạt động gần đây</h3>
                  </div>
                  
                  {pointsSummary.hoat_dong_gan_day && pointsSummary.hoat_dong_gan_day.length > 0 ? (
                    <div className="space-y-3">
                      {pointsSummary.hoat_dong_gan_day.map((activity, index) => (
                        <div 
                          key={index} 
                          className="group flex items-center justify-between p-4 rounded-xl bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-all duration-200 hover:shadow-md"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {activity.ten_hoat_dong}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(activity.ngay_to_chuc)}
                              </span>
                              {activity.loai_hd && (
                                <span className="text-xs text-gray-400">• {activity.loai_hd}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm">
                              <span>+{activity.diem}</span>
                              <Sparkles className="h-3 w-3" />
                            </span>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <Clock className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Chưa có hoạt động gần đây</p>
                      <p className="text-sm text-gray-400 mt-1">Hãy tham gia các hoạt động để tích điểm nhé!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Achievement Banner */}
              <div className="relative overflow-hidden bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl p-8 shadow-xl">
                <div className="absolute inset-0 bg-black opacity-10"></div>
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <ClassificationIcon className={`h-16 w-16 ${classification.color === 'text-yellow-500' ? 'text-yellow-300' : 'text-white'} drop-shadow-lg`} />
                    <div className="text-white">
                      <p className="text-sm font-medium opacity-90">Xếp loại hiện tại</p>
                      <h3 className="text-3xl font-bold mt-1">{classification.text}</h3>
                      <p className="text-sm opacity-80 mt-1">
                        {pointsSummary.tong_diem >= 90 ? 'Xuất sắc! Tiếp tục duy trì nhé! 🎉' : 
                         pointsSummary.tong_diem >= 80 ? 'Rất tốt! Cố gắng thêm một chút nữa! 💪' : 
                         pointsSummary.tong_diem >= 65 ? 'Khá tốt! Hãy phấn đấu để đạt loại cao hơn! 📈' : 
                         'Hãy tích cực tham gia các hoạt động để cải thiện điểm! 🎯'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-white">
                    <p className="text-5xl font-bold">{pointsSummary.tong_diem}</p>
                    <p className="text-lg opacity-80">/ 100 điểm</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detail Tab */}
          {activeTab === 'detail' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="h-6 w-6 text-blue-600" />
                  Chi tiết điểm rèn luyện
                </h3>
                <span className="text-sm text-gray-500">
                  {pointsDetail.length} hoạt động
                </span>
              </div>
              
              {pointsDetail.length > 0 ? (
                <div className="space-y-3">
                  {pointsDetail.map((item, index) => (
                    <div 
                      key={index} 
                      className="group bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl p-5 border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {item.ten_hoat_dong}
                            </h4>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm">
                              +{item.diem} điểm
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(item.ngay_to_chuc)}
                            </span>
                            {item.loai_hd && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">
                                {item.loai_hd}
                              </span>
                            )}
                          </div>
                          
                          {item.mo_ta && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                              {item.mo_ta}
                            </p>
                          )}
                          
                          {item.ghi_chu && (
                            <p className="text-xs text-gray-400 mt-2 italic">
                              📝 {item.ghi_chu}
                            </p>
                          )}
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <Award className="h-10 w-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Chưa có dữ liệu chi tiết</h4>
                  <p className="text-gray-500 mb-6">Hãy tham gia các hoạt động để tích lũy điểm rèn luyện</p>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Lịch sử tham gia hoạt động
                </h3>
                <span className="text-sm text-gray-500">
                  {attendanceHistory.filter(a => a.diem_danh).length} / {attendanceHistory.length} có mặt
                </span>
              </div>
              
              {attendanceHistory.length > 0 ? (
                <div className="space-y-3">
                  {attendanceHistory.map((item, index) => (
                    <div 
                      key={index} 
                      className={`group rounded-xl p-5 border transition-all duration-200 ${
                        item.diem_danh 
                          ? 'bg-white hover:bg-green-50 border-gray-200 hover:border-green-300 hover:shadow-lg' 
                          : 'bg-gray-50 border-gray-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-base font-bold text-gray-900">
                              {item.ten_hoat_dong}
                            </h4>
                            {item.diem_danh ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-lg border border-green-200">
                                <CheckCircle className="h-4 w-4" />
                                Có mặt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-600 text-sm font-semibold rounded-lg">
                                <Clock className="h-4 w-4" />
                                Vắng mặt
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(item.ngay_dang_ky)}
                            </span>
                            {item.loai_hd && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">
                                {item.loai_hd}
                              </span>
                            )}
                            {item.phuong_thuc && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg font-medium">
                                {item.phuong_thuc === 'QR_CODE' ? '📱 QR Code' : '✍️ Thủ công'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {item.diem_danh && (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold rounded-xl shadow-sm">
                              +{item.diem_nhan_duoc}
                              <Sparkles className="h-4 w-4" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <CheckCircle className="h-10 w-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Chưa có lịch sử tham gia</h4>
                  <p className="text-gray-500 mb-6">Bạn chưa điểm danh hoạt động nào</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
