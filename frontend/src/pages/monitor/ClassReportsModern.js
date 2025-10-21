import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Users, Calendar, Award, Download, RefreshCw, Filter, BarChart3, PieChart as PieIcon, LineChart as LineIcon, FileText, AlertCircle, Sparkles, Target, Activity } from 'lucide-react';
import http from '../../services/http';

export default function ClassReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('semester');
  const [selectedChart, setSelectedChart] = useState('activities');
  const [error, setError] = useState('');

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  useEffect(() => {
    loadReportData();
  }, [timeRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const response = await http.get(`/class/reports?timeRange=${timeRange}`);
      const raw = response?.data?.data;
      const data = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? { ...raw } : null;
      
      if (data) {
        data.overview = data.overview || {
          totalStudents: 0,
          totalActivities: 0,
          avgPoints: 0,
          participationRate: 0
        };
        data.monthlyActivities = Array.isArray(data.monthlyActivities) ? data.monthlyActivities : [];
        data.pointsDistribution = Array.isArray(data.pointsDistribution) ? data.pointsDistribution : [];
        data.attendanceRate = Array.isArray(data.attendanceRate) ? data.attendanceRate : [];
        data.activityTypes = Array.isArray(data.activityTypes) ? data.activityTypes : [];
        data.topStudents = Array.isArray(data.topStudents) ? data.topStudents : [];
      }
      setReportData(data);
      setError('');
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Không thể tải dữ liệu báo cáo');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    const csv = generateCSV();
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `bao_cao_lop_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    const html = generateReportHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const generateCSV = () => {
    if (!reportData) return '';
    let csv = 'BÁO CÁO THỐNG KÊ LỚP\n\n';
    csv += `Thời gian: ${timeRange}\n`;
    csv += `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}\n\n`;
    csv += 'TỔNG QUAN\n';
    csv += `Tổng sinh viên,${reportData.overview.totalStudents}\n`;
    csv += `Tổng hoạt động,${reportData.overview.totalActivities}\n`;
    csv += `Điểm TB,${reportData.overview.avgPoints}\n`;
    csv += `Tỷ lệ tham gia,${reportData.overview.participationRate}%\n\n`;
    
    if (reportData.topStudents?.length > 0) {
      csv += 'TOP SINH VIÊN\n';
      csv += 'STT,Họ tên,MSSV,Điểm RL,Hoạt động\n';
      reportData.topStudents.forEach((s, i) => {
        csv += `${i + 1},"${s.name}",${s.mssv},${s.points},${s.activities}\n`;
      });
    }
    return csv;
  };

  const generateReportHTML = () => {
    return `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Báo cáo lớp</title>
      <style>body{font-family:Arial;padding:20px;}h1{color:#6366F1;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}</style>
      </head><body>
      <h1>BÁO CÁO THỐNG KÊ LỚP</h1>
      <p><strong>Thời gian:</strong> ${timeRange}</p>
      <p><strong>Ngày xuất:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
      <h2>Tổng quan</h2>
      <ul>
        <li>Tổng sinh viên: ${reportData?.overview?.totalStudents || 0}</li>
        <li>Tổng hoạt động: ${reportData?.overview?.totalActivities || 0}</li>
        <li>Điểm trung bình: ${reportData?.overview?.avgPoints || 0}</li>
        <li>Tỷ lệ tham gia: ${reportData?.overview?.participationRate || 0}%</li>
      </ul>
      ${reportData?.topStudents?.length > 0 ? `
        <h2>Top sinh viên</h2>
        <table><tr><th>STT</th><th>Họ tên</th><th>MSSV</th><th>Điểm</th></tr>
        ${reportData.topStudents.map((s, i) => `<tr><td>${i+1}</td><td>${s.name}</td><td>${s.mssv}</td><td>${s.points}</td></tr>`).join('')}
        </table>` : ''}
      </body></html>
    `;
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

  const overview = reportData?.overview || {};
  const score = Number(overview.avgPoints || 0);
  const scoreRounded = Number.isFinite(score) ? Number(score.toFixed(1)) : 0;

  // Map score to theme (colors + label) using school scale
  const getScoreTheme = (s) => {
    if (s >= 90) return { gradient: 'from-violet-500 to-purple-600', label: 'Xuất sắc' };
    if (s >= 80) return { gradient: 'from-blue-500 to-indigo-600', label: 'Tốt' };
    if (s >= 65) return { gradient: 'from-emerald-500 to-green-600', label: 'Khá' };
    if (s >= 50) return { gradient: 'from-amber-400 to-orange-500', label: 'Trung bình' };
    return { gradient: 'from-rose-500 to-red-600', label: 'Yếu' };
  };
  const scoreTheme = getScoreTheme(score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">Báo Cáo & Thống Kê</h1>
                  <p className="text-indigo-100 mt-1">Phân tích chi tiết hoạt động và thành tích lớp</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 font-semibold"
                >
                  <Download className="h-5 w-5" />
                  Xuất Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-white/90 text-purple-600 rounded-2xl hover:bg-white transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 font-semibold"
                >
                  <FileText className="h-5 w-5" />
                  Xuất PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <Sparkles className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{overview.totalStudents || 0}</div>
            <div className="text-indigo-100 text-sm font-medium">Tổng sinh viên</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
              <TrendingUp className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{overview.totalActivities || 0}</div>
            <div className="text-emerald-100 text-sm font-medium">Tổng hoạt động</div>
          </div>

          <div className={`bg-gradient-to-br ${scoreTheme.gradient} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105`}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Award className="h-6 w-6" />
              </div>
              <Target className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{scoreRounded}</div>
            <div className="text-white/90 text-sm font-medium flex items-center gap-2">
              <span>Điểm TB</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-white/20">{scoreTheme.label}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <BarChart3 className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{overview.participationRate || 0}%</div>
            <div className="text-rose-100 text-sm font-medium">Tỷ lệ tham gia</div>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Thời gian:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white font-medium"
            >
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="semester">Học kỳ</option>
              <option value="year">Năm học</option>
            </select>
            <button
              onClick={loadReportData}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Chart Selector */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChart('activities')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold ${
                selectedChart === 'activities'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              Hoạt động theo tháng
            </button>
            <button
              onClick={() => setSelectedChart('distribution')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold ${
                selectedChart === 'distribution'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PieIcon className="h-5 w-5" />
              Phân bổ điểm
            </button>
            <button
              onClick={() => setSelectedChart('attendance')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold ${
                selectedChart === 'attendance'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <LineIcon className="h-5 w-5" />
              Tỷ lệ tham gia
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          {selectedChart === 'activities' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
                Hoạt động theo tháng
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData?.monthlyActivities || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '2px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="count" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {selectedChart === 'distribution' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <PieIcon className="h-6 w-6 text-indigo-600" />
                Phân bổ điểm rèn luyện
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData?.pointsDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(reportData?.pointsDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '2px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {selectedChart === 'attendance' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <LineIcon className="h-6 w-6 text-indigo-600" />
                Tỷ lệ tham gia theo thời gian
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData?.attendanceRate || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '2px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#6366F1" 
                    strokeWidth={3}
                    dot={{ fill: '#6366F1', r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Students */}
        {reportData?.topStudents?.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Award className="h-6 w-6 text-amber-500" />
              Top sinh viên xuất sắc
            </h3>
            <div className="space-y-3">
              {reportData.topStudents.slice(0, 5).map((student, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 hover:shadow-md transition-all"
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                    index === 2 ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' :
                    'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-600">MSSV: {student.mssv}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{student.points}</p>
                    <p className="text-sm text-gray-600">{student.activities} hoạt động</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
