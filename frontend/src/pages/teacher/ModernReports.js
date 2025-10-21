import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar, 
  Users, 
  Activity,
  Award,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function ModernReports() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('month');
  
  // Semester filter state (same logic as activities page)
  const getCurrentSemesterValue = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 7 && currentMonth <= 11) return `hoc_ky_1-${currentYear}`;
    else if (currentMonth === 12) return `hoc_ky_2-${currentYear}`;
    else if (currentMonth >= 1 && currentMonth <= 4) return `hoc_ky_2-${currentYear - 1}`;
    else return `hoc_ky_1-${currentYear}`;
  };
  const [semester, setSemester] = useState(getCurrentSemesterValue());
  const [filterMode, setFilterMode] = useState('semester'); // 'semester' | 'dateRange'

  // Unified semester options from backend
  const { options: semesterOptions } = useSemesterOptions();

  useEffect(() => {
    loadStatistics();
  }, [dateRange, semester, filterMode]);

  const getDateRangeParams = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    endDate = new Date();

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      let params = {};
      if (filterMode === 'semester') {
        params = { semester: semester || undefined };
      } else {
        params = getDateRangeParams();
      }
      const res = await http.get('/teacher/reports/statistics', { params });
      const data = res.data?.data || {};
      setStats(data);
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError('Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format = 'excel') => {
    try {
      let params = { format };
      if (filterMode === 'semester') {
        params.semester = semester || undefined;
      } else {
        params = { format, ...getDateRangeParams() };
      }
      const res = await http.get('/teacher/reports/export', {
        params,
        responseType: 'text' // Backend trả về CSV string
      });
      
      // Create download link
      const blob = new Blob([res.data], { 
        type: format === 'excel' ? 'text/csv' : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-giang-vien-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      alert('Xuất báo cáo thành công!');
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Không thể xuất báo cáo: ' + (err.response?.data?.message || 'Lỗi không xác định'));
    }
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Có lỗi xảy ra</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadStatistics}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Báo cáo & Thống kê</h1>
        <p className="text-gray-600">Xem thống kê chi tiết và xuất báo cáo</p>
      </div>

      {/* Filter Mode Toggle & Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        {/* Filter Mode Toggle */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('semester')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMode === 'semester' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Lọc theo học kỳ
            </button>
            <button
              onClick={() => setFilterMode('dateRange')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMode === 'dateRange' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Lọc theo khoảng thời gian
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Semester or Date Range Filter */}
          {filterMode === 'semester' ? (
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Học kỳ</h3>
              <div className="max-w-md">
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {semesterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Khoảng thời gian</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setDateRange('week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === 'week' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tuần này
                </button>
                <button
                  onClick={() => setDateRange('month')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === 'month' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tháng này
                </button>
                <button
                  onClick={() => setDateRange('year')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === 'year' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Năm này
                </button>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={loadStatistics}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất PDF
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-blue-200 text-sm">Tổng hoạt động</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalActivities || 0}</div>
          <div className="text-blue-200 text-sm">Trong khoảng thời gian</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-green-200 text-sm">Sinh viên tham gia</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalStudents || 0}</div>
          <div className="text-green-200 text-sm">Tổng số sinh viên</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-purple-200 text-sm">Tỷ lệ tham gia</span>
          </div>
          <div className="text-3xl font-bold mb-1">{Math.round(stats.participationRate || 0)}%</div>
          <div className="text-purple-200 text-sm">Trung bình</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-orange-200 text-sm">Điểm trung bình</span>
          </div>
          <div className="text-3xl font-bold mb-1">{parseFloat(stats.averageScore || 0).toFixed(1)}</div>
          <div className="text-orange-200 text-sm">Điểm rèn luyện</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết thống kê</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalRegistrations || 0}</div>
              <div className="text-sm text-gray-600">Lượt đăng ký hoạt động</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalStudents || 0}</div>
              <div className="text-sm text-gray-600">Tổng sinh viên quản lý</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{Math.round(stats.participationRate || 0)}%</div>
              <div className="text-sm text-gray-600">Tỷ lệ sinh viên tham gia</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Hoạt động theo tháng</h3>
            <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Eye className="w-5 h-5" />
            </button>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Biểu đồ sẽ được hiển thị ở đây</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Tỷ lệ tham gia</h3>
            <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Eye className="w-5 h-5" />
            </button>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Biểu đồ sẽ được hiển thị ở đây</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Reports */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Báo cáo chi tiết</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Lọc
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Xuất báo cáo
            </button>
          </div>
        </div>
        
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-500 mb-2">Chưa có dữ liệu báo cáo</h4>
          <p className="text-gray-400">Dữ liệu báo cáo sẽ được hiển thị khi có hoạt động</p>
        </div>
      </div>
    </div>
  );
}
