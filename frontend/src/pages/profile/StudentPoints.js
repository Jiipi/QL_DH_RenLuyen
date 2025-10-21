import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, Calendar, Award, Target, BarChart3, Download, 
  Star, Trophy, CheckCircle, Clock, Filter, RefreshCw,
  ChevronRight, Sparkles, Medal, TrendingDown
} from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function StudentPoints() {
  const [pointsSummary, setPointsSummary] = useState(null);
  const [pointsDetail, setPointsDetail] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [semester, setSemester] = useState('');
  const { options: semesterOptions } = useSemesterOptions();

  const parseSemesterToLegacy = useCallback((value) => {
    const m = String(value || '').match(/^(hoc_ky_1|hoc_ky_2)-(\d{4})$/);
    if (!m) return { hoc_ky: '', nam_hoc: '' };
    const hoc_ky = m[1];
    const y = parseInt(m[2], 10);
    const nam_hoc = hoc_ky === 'hoc_ky_1' ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    return { hoc_ky, nam_hoc };
  }, []);

  useEffect(() => {
    loadData();
  }, [semester]);

  const loadData = async () => {
    try {
      setLoading(true);
      const legacy = parseSemesterToLegacy(semester);
      const params = {};
      if (semester) {
        params.semester = semester;
        if (legacy.hoc_ky) params.hoc_ky = legacy.hoc_ky;
        if (legacy.nam_hoc) params.nam_hoc = legacy.nam_hoc;
      }
      
      // Load points summary
      const summaryResponse = await http.get('/student-points/summary', { params });
      const summaryData = summaryResponse?.data?.data || summaryResponse?.data;
      
      // Transform backend response to frontend format
      if (summaryData && summaryData.thong_ke) {
        const transformedSummary = {
          tong_diem: summaryData.thong_ke.tong_diem || 0,
          so_hoat_dong: summaryData.thong_ke.tong_hoat_dong || 0,
          diem_trung_binh: summaryData.thong_ke.tong_hoat_dong > 0 
            ? (summaryData.thong_ke.tong_diem / summaryData.thong_ke.tong_hoat_dong).toFixed(2)
            : 0,
          xep_hang: '-', // TODO: Implement ranking logic
          diem_theo_tieu_chi: {},
          hoat_dong_gan_day: (summaryData.hoat_dong_gan_day || []).map(activity => ({
            ten_hoat_dong: activity.ten_hd,
            ngay_to_chuc: activity.ngay_dang_ky,
            diem: activity.diem_rl
          }))
        };
        
        // Transform activity types to criteria format
        if (summaryData.thong_ke.diem_theo_loai) {
          summaryData.thong_ke.diem_theo_loai.forEach(item => {
            transformedSummary.diem_theo_tieu_chi[item.ten_loai] = item.tong_diem;
          });
        }
        
        setPointsSummary(transformedSummary);
      } else {
        // Empty state
        setPointsSummary({
          tong_diem: 0,
          so_hoat_dong: 0,
          diem_trung_binh: 0,
          xep_hang: '-',
          diem_theo_tieu_chi: {},
          hoat_dong_gan_day: []
        });
      }
      
      // Load points detail
  const detailResponse = await http.get('/student-points/detail', { params });
      const detailData = detailResponse?.data?.data?.data || detailResponse?.data?.data || [];
      
      // Transform detail data to expected format
      const transformedDetail = detailData.map(item => ({
        ten_hoat_dong: item.hoat_dong?.ten_hd || '',
        ngay_to_chuc: item.hoat_dong?.ngay_bd || item.dang_ky?.ngay_dang_ky,
        diem: item.hoat_dong?.diem_rl || 0,
        mo_ta: item.hoat_dong?.mo_ta || '',
        ghi_chu: item.dang_ky?.ghi_chu || ''
      }));
      
      setPointsDetail(transformedDetail);
      
      // Load attendance history  
  const attendanceResponse = await http.get('/student-points/attendance-history', { params });
      const attendanceData = attendanceResponse?.data?.data?.data || attendanceResponse?.data?.data || [];
      
      // Transform attendance data to expected format
      const transformedAttendance = attendanceData.map(item => ({
        ten_hoat_dong: item.hoat_dong?.ten_hd || '',
        ngay_dang_ky: item.diem_danh?.thoi_gian || '',
        trang_thai: item.diem_danh?.trang_thai_tham_gia === 'co_mat' ? 'da_duyet' : 'tu_choi',
        diem_danh: item.diem_danh?.trang_thai_tham_gia === 'co_mat',
        diem_nhan_duoc: item.diem_danh?.trang_thai_tham_gia === 'co_mat' ? item.hoat_dong?.diem_rl || 0 : 0
      }));
      
      setAttendanceHistory(transformedAttendance);
      
    } catch (error) {
      console.error('Failed to load student points data:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Show empty state instead of mock data
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
  };

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
    if (points >= 90) return 'text-green-600 bg-green-100';
    if (points >= 80) return 'text-blue-600 bg-blue-100';
    if (points >= 65) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getClassification = (points) => {
    if (points >= 90) return 'Xuất sắc';
    if (points >= 80) return 'Tốt';
    if (points >= 65) return 'Khá';
    if (points >= 50) return 'Trung bình';
    return 'Yếu';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Điểm rèn luyện</h1>
            <p className="text-gray-600">Theo dõi kết quả hoạt động và điểm rèn luyện</p>
          </div>
        </div>
        <button
          onClick={downloadReport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Tải báo cáo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả</option>
              {semesterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {pointsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng điểm</p>
                <p className={`text-2xl font-bold ${getPointsColor(pointsSummary.tong_diem).split(' ')[0]}`}>
                  {pointsSummary.tong_diem || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPointsColor(pointsSummary.tong_diem)}`}>
                {getClassification(pointsSummary.tong_diem)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hoạt động tham gia</p>
                <p className="text-2xl font-bold text-green-600">{pointsSummary.so_hoat_dong || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Điểm trung bình</p>
                <p className="text-2xl font-bold text-purple-600">{pointsSummary.diem_trung_binh || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Xếp hạng</p>
                <p className="text-2xl font-bold text-orange-600">{pointsSummary.xep_hang || '-'}</p>
              </div>
              <Award className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'detail'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Chi tiết điểm
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'attendance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Lịch sử tham gia
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && pointsSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Points by Category */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Điểm theo tiêu chí</h3>
                  <div className="space-y-3">
                    {pointsSummary.diem_theo_tieu_chi && Object.entries(pointsSummary.diem_theo_tieu_chi).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{key}</span>
                        <span className="font-medium">{value} điểm</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activities */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Hoạt động gần đây</h3>
                  <div className="space-y-3">
                    {pointsSummary.hoat_dong_gan_day && pointsSummary.hoat_dong_gan_day.map((activity, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div>
                          <p className="text-sm font-medium">{activity.ten_hoat_dong}</p>
                          <p className="text-xs text-gray-500">{formatDate(activity.ngay_to_chuc)}</p>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          +{activity.diem} điểm
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detail Tab */}
          {activeTab === 'detail' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Chi tiết điểm rèn luyện</h3>
              {pointsDetail.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hoạt động
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày tổ chức
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Điểm
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pointsDetail.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.ten_hoat_dong}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.mo_ta}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(item.ngay_to_chuc)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              +{item.diem}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.ghi_chu || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Chưa có dữ liệu điểm rèn luyện
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Lịch sử tham gia hoạt động</h3>
              {attendanceHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hoạt động
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày đăng ký
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Điểm danh
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Điểm
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceHistory.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.ten_hoat_dong}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(item.ngay_dang_ky)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.trang_thai === 'da_duyet' ? 'bg-green-100 text-green-800' :
                              item.trang_thai === 'cho_duyet' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.trang_thai === 'da_duyet' ? 'Đã duyệt' :
                               item.trang_thai === 'cho_duyet' ? 'Chờ duyệt' : 'Từ chối'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.diem_danh ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.diem_danh ? 'Có mặt' : 'Vắng mặt'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.diem_nhan_duoc || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Chưa có lịch sử tham gia hoạt động
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}