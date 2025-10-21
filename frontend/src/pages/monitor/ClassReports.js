import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Area } from 'recharts';
import { TrendingUp, Users, Calendar, Award, Download, RefreshCw, Filter, BarChart3, PieChart as PieIcon, LineChart as LineIcon, FileText, AlertCircle, Sparkles, Target, Activity, Trophy, Star, CheckCircle2, XCircle } from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function ClassReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState('participation');
  const [error, setError] = useState('');

  // Determine current semester for default value
  const getCurrentSemesterValue = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (currentMonth >= 7 && currentMonth <= 11) {
      return `hoc_ky_1-${currentYear}`;
    } else if (currentMonth === 12) {
      return `hoc_ky_2-${currentYear}`;
    } else if (currentMonth >= 1 && currentMonth <= 4) {
      return `hoc_ky_2-${currentYear - 1}`;
    } else {
      return `hoc_ky_1-${currentYear}`; // Default for break months
    }
  };
  
  const [semester, setSemester] = useState(getCurrentSemesterValue());

  const { options: semesterOptions } = useSemesterOptions();

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  useEffect(() => {
    loadReportData();
  }, [semester]); // ✅ Reload when semester changes

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('📊 [ClassReports] Loading data for semester:', semester);
      
      // ✅ Send semester parameter instead of timeRange
      const response = await http.get(`/class/reports?semester=${semester}`);
      const raw = response?.data?.data;
      console.log('📊 [ClassReports] Raw response:', raw);
      
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
        
        console.log('📊 [ClassReports] Processed data:', {
          overview: data.overview,
          monthlyActivitiesCount: data.monthlyActivities.length,
          pointsDistributionCount: data.pointsDistribution.length,
          attendanceRateCount: data.attendanceRate.length,
          activityTypesCount: data.activityTypes.length,
          topStudentsCount: data.topStudents.length
        });
      }
      setReportData(data);
    } catch (err) {
      console.error('❌ [ClassReports] Error loading report data:', err);
      const errorMsg = err.response?.data?.message || 'Không thể tải dữ liệu báo cáo';
      setError(errorMsg);
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
    downloadBlob(blob, `bao_cao_lop_${semester}_${new Date().toISOString().split('T')[0]}.csv`);
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
    csv += `Học kỳ: ${semester}\n`;
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
      <p><strong>Học kỳ:</strong> ${semester}</p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-red-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Không thể tải báo cáo</h2>
                <p className="text-gray-600 mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-2">💡 Giải pháp:</h3>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Kiểm tra bạn đã được gán vào lớp nào chưa</li>
                <li>Liên hệ admin để được gán làm lớp trưởng</li>
                <li>Đảm bảo tài khoản có role LOP_TRUONG</li>
              </ul>
            </div>
            <button
              onClick={loadReportData}
              className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const overview = reportData?.overview || {};
  const avgScore = Number(overview.avgPoints || 0);
  const avgScoreRounded = Number.isFinite(avgScore) ? Number(avgScore.toFixed(1)) : 0;
  const getScoreTheme = (s) => {
    if (s >= 90) return { gradient: 'from-violet-500 to-purple-600', label: 'Xuất sắc' };
    if (s >= 80) return { gradient: 'from-blue-500 to-indigo-600', label: 'Tốt' };
    if (s >= 65) return { gradient: 'from-emerald-500 to-green-600', label: 'Khá' };
    if (s >= 50) return { gradient: 'from-amber-400 to-orange-500', label: 'Trung bình' };
    return { gradient: 'from-rose-500 to-red-600', label: 'Yếu' };
  };
  const scoreTheme = getScoreTheme(avgScore);

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
            <div className="text-3xl font-bold mb-1">{avgScoreRounded}</div>
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

        {/* Semester Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">Học kỳ:</span>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="flex-1 max-w-xs px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white font-medium text-gray-700 hover:border-purple-300 cursor-pointer"
            >
              {semesterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
              onClick={() => setSelectedChart('participation')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold ${
                selectedChart === 'participation'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="h-5 w-5" />
              Tỷ Lệ Tham Gia
            </button>
            <button
              onClick={() => setSelectedChart('activities')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold ${
                selectedChart === 'activities'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              Loại Hoạt Động
            </button>
            <button
              onClick={() => setSelectedChart('points')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold ${
                selectedChart === 'points'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Award className="h-5 w-5" />
              Điểm Rèn Luyện
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          
          {/* BIỂU ĐỒ 1: TỶ LỆ THAM GIA SINH VIÊN */}
          {selectedChart === 'participation' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Users className="h-6 w-6 text-indigo-600" />
                Tỷ Lệ Tham Gia Hoạt Động Của Sinh Viên
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Phân bố sinh viên theo mức độ tham gia hoạt động trong học kỳ
              </p>
              {(() => {
                const data = reportData?.pointsDistribution || [];
                const total = data.reduce((s, i) => s + (i?.count || 0), 0);
                console.log('📊 [Chart-Participation] Rendering with data:', data);
                
                // Custom colors theo mức độ (Chuẩn học thuật)
                const PARTICIPATION_COLORS = {
                  '0-49': '#EF4444',    // Red - Yếu
                  '50-64': '#F59E0B',   // Amber - Trung bình
                  '65-79': '#10B981',   // Green - Khá
                  '80-89': '#3B82F6',   // Blue - Tốt
                  '90-100': '#8B5CF6',  // Purple - Xuất sắc
                };
                
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            nameKey="range"
                            innerRadius={80}
                            outerRadius={140}
                            paddingAngle={3}
                            dataKey="count"
                          >
                            {data.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={PARTICIPATION_COLORS[entry.range] || COLORS[index % COLORS.length]}
                                stroke="#fff"
                                strokeWidth={3}
                              />
                            ))}
                          </Pie>
                          {/* Center label */}
                          <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 16, fill: '#6B7280', fontWeight: 500 }}>
                            Tổng số
                          </text>
                          <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 36, fill: '#111827', fontWeight: 700 }}>
                            {total}
                          </text>
                          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 14, fill: '#6B7280', fontWeight: 500 }}>
                            sinh viên
                          </text>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '2px solid #E5E7EB',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              padding: '12px'
                            }}
                            formatter={(value, name, props) => {
                              const item = props?.payload;
                              const pct = item?.percentage ?? (total ? ((value / total) * 100).toFixed(1) : 0);
                              return [`${value} SV (${pct}%)`, item?.range || name];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="space-y-3">
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <Trophy className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-gray-900">Xuất sắc (90-100 điểm)</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-purple-600">
                            {data.find(d => d.range === '90-100')?.count || 0}
                          </span>
                          <span className="text-sm text-gray-600">sinh viên</span>
                          <span className="ml-auto text-lg font-semibold text-purple-600">
                            {data.find(d => d.range === '90-100')?.percentage || 0}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <Star className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-gray-900">Tốt (80-89 điểm)</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-blue-600">
                            {data.find(d => d.range === '80-89')?.count || 0}
                          </span>
                          <span className="text-sm text-gray-600">sinh viên</span>
                          <span className="ml-auto text-lg font-semibold text-blue-600">
                            {data.find(d => d.range === '80-89')?.percentage || 0}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-gray-900">Khá (65-79 điểm)</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-green-600">
                            {data.find(d => d.range === '65-79')?.count || 0}
                          </span>
                          <span className="text-sm text-gray-600">sinh viên</span>
                          <span className="ml-auto text-lg font-semibold text-green-600">
                            {data.find(d => d.range === '65-79')?.percentage || 0}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-amber-500 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-gray-900">Trung bình (50-64 điểm)</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-amber-600">
                            {data.find(d => d.range === '50-64')?.count || 0}
                          </span>
                          <span className="text-sm text-gray-600">sinh viên</span>
                          <span className="ml-auto text-lg font-semibold text-amber-600">
                            {data.find(d => d.range === '50-64')?.percentage || 0}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border-2 border-red-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-red-500 rounded-lg">
                            <XCircle className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-gray-900">Yếu (0-49 điểm)</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-red-600">
                            {data.find(d => d.range === '0-49')?.count || 0}
                          </span>
                          <span className="text-sm text-gray-600">sinh viên</span>
                          <span className="ml-auto text-lg font-semibold text-red-600">
                            {data.find(d => d.range === '0-49')?.percentage || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* BIỂU ĐỒ 2: PHÂN LOẠI HOẠT ĐỘNG */}
          {selectedChart === 'activities' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
                Phân Loại Hoạt Động Theo Loại
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Thống kê số lượng và điểm trung bình của các loại hoạt động
              </p>
              {(() => {
                const data = reportData?.activityTypes || [];
                console.log('📊 [Chart-Activities] Rendering with data:', data);
                
                // Calculate totals
                const totalActivities = data.reduce((s, d) => s + d.count, 0);
                const totalPoints = data.reduce((s, d) => s + d.points, 0);
                
                return (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3 mb-2">
                          <Activity className="h-6 w-6" />
                          <span className="text-sm font-medium opacity-90">Tổng hoạt động</span>
                        </div>
                        <div className="text-4xl font-bold">{totalActivities}</div>
                        <div className="text-sm opacity-75 mt-1">hoạt động đã tổ chức</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3 mb-2">
                          <Award className="h-6 w-6" />
                          <span className="text-sm font-medium opacity-90">Tổng điểm</span>
                        </div>
                        <div className="text-4xl font-bold">{totalPoints.toFixed(1)}</div>
                        <div className="text-sm opacity-75 mt-1">điểm rèn luyện</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3 mb-2">
                          <Target className="h-6 w-6" />
                          <span className="text-sm font-medium opacity-90">Số loại</span>
                        </div>
                        <div className="text-4xl font-bold">{data.length}</div>
                        <div className="text-sm opacity-75 mt-1">loại hoạt động</div>
                      </div>
                    </div>

                    {/* Bar Chart */}
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart 
                        data={data}
                        margin={{ top: 30, right: 30, left: 80, bottom: 80 }}
                        barGap={15}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                          axisLine={{ stroke: '#D1D5DB', strokeWidth: 2 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          label={{ 
                            value: 'Số hoạt động', 
                            angle: -90, 
                            position: 'insideLeft', 
                            style: { fontSize: 13, fill: '#374151', fontWeight: 600 } 
                          }}
                          axisLine={{ stroke: '#D1D5DB', strokeWidth: 2 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '2px solid #E5E7EB',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            padding: '12px'
                          }}
                          formatter={(value, name, props) => {
                            if (name === 'count') {
                              const avgPoints = props.payload.points / props.payload.count;
                              return [
                                <>
                                  <div><strong>{value}</strong> hoạt động</div>
                                  <div className="text-sm text-gray-600">Điểm TB: {avgPoints.toFixed(1)}</div>
                                </>,
                                'Thống kê'
                              ];
                            }
                            return [value, name];
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          radius={[10, 10, 0, 0]} 
                          maxBarSize={100}
                          label={({ x, y, width, value }) => (
                            <text 
                              x={x + width / 2} 
                              y={y - 8} 
                              fill="#4B5563" 
                              textAnchor="middle" 
                              fontSize="14"
                              fontWeight="700"
                            >
                              {value}
                            </text>
                          )}
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Stats Table */}
                    <div className="overflow-hidden rounded-xl border-2 border-gray-200">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                            <th className="px-6 py-4 text-left font-semibold">Loại hoạt động</th>
                            <th className="px-6 py-4 text-center font-semibold">Số lượng</th>
                            <th className="px-6 py-4 text-center font-semibold">Tỷ lệ</th>
                            <th className="px-6 py-4 text-center font-semibold">Tổng điểm</th>
                            <th className="px-6 py-4 text-center font-semibold">Điểm TB</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((item, index) => {
                            const percentage = totalActivities > 0 ? ((item.count / totalActivities) * 100).toFixed(1) : 0;
                            const avgPoints = item.count > 0 ? (item.points / item.count).toFixed(1) : 0;
                            return (
                              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="font-medium text-gray-900">{item.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                                    {item.count}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-semibold text-gray-900">{percentage}%</span>
                                    <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                                      <div 
                                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="font-bold text-emerald-600">{item.points.toFixed(1)}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
                                    {avgPoints}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-bold">
                            <td className="px-6 py-4 text-gray-900">TỔNG CỘNG</td>
                            <td className="px-6 py-4 text-center text-indigo-600">{totalActivities}</td>
                            <td className="px-6 py-4 text-center text-gray-900">100%</td>
                            <td className="px-6 py-4 text-center text-emerald-600">{totalPoints.toFixed(1)}</td>
                            <td className="px-6 py-4 text-center text-amber-600">
                              {totalActivities > 0 ? (totalPoints / totalActivities).toFixed(1) : '0.0'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* BIỂU ĐỒ 3: ĐIỂM RÈN LUYỆN TRUNG BÌNH */}
          {selectedChart === 'points' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Award className="h-6 w-6 text-indigo-600" />
                Điểm Rèn Luyện Trung Bình Lớp
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Xu hướng điểm rèn luyện và tỷ lệ tham gia theo thời gian
              </p>
              {(() => {
                const attendanceData = reportData?.attendanceRate || [];
                const monthlyData = reportData?.monthlyActivities || [];
                const overview = reportData?.overview || {};
                
                // Combine data for dual-axis chart
                const combinedData = monthlyData.map(month => {
                  const attendance = attendanceData.find(a => a.month === month.month.split('/')[0]) || {};
                  return {
                    month: month.month,
                    activities: month.activities,
                    participants: month.participants,
                    rate: attendance.rate || 0
                  };
                });
                
                console.log('📊 [Chart-Points] Rendering with data:', combinedData);
                
                return (
                  <div className="space-y-6">
                    {/* Overall Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-6 text-white text-center">
                        <Award className="h-10 w-10 mx-auto mb-3" />
                        <div className="text-4xl font-bold mb-1">{overview.avgPoints || 0}</div>
                        <div className="text-sm opacity-90">Điểm TB lớp</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-6 text-white text-center">
                        <Users className="h-10 w-10 mx-auto mb-3" />
                        <div className="text-4xl font-bold mb-1">{overview.participationRate || 0}%</div>
                        <div className="text-sm opacity-90">Tỷ lệ tham gia</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 text-white text-center">
                        <Activity className="h-10 w-10 mx-auto mb-3" />
                        <div className="text-4xl font-bold mb-1">{overview.totalActivities || 0}</div>
                        <div className="text-sm opacity-90">Tổng hoạt động</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl p-6 text-white text-center">
                        <TrendingUp className="h-10 w-10 mx-auto mb-3" />
                        <div className="text-4xl font-bold mb-1">{overview.totalStudents || 0}</div>
                        <div className="text-sm opacity-90">Tổng sinh viên</div>
                      </div>
                    </div>

                    {/* Dual-Axis Chart */}
                    <ResponsiveContainer width="100%" height={450}>
                      <LineChart 
                        data={combinedData}
                        margin={{ top: 40, right: 60, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#6B7280"
                          tick={{ fontSize: 13, fill: '#374151', fontWeight: 500 }}
                          height={60}
                          axisLine={{ stroke: '#D1D5DB', strokeWidth: 2 }}
                        />
                        <YAxis 
                          yAxisId="left"
                          stroke="#6B7280"
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          label={{ 
                            value: 'Số lượng', 
                            angle: -90, 
                            position: 'insideLeft', 
                            style: { fontSize: 13, fill: '#374151', fontWeight: 600 } 
                          }}
                          axisLine={{ stroke: '#D1D5DB', strokeWidth: 2 }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#6B7280"
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          label={{ 
                            value: 'Tỷ lệ (%)', 
                            angle: 90, 
                            position: 'insideRight', 
                            style: { fontSize: 13, fill: '#374151', fontWeight: 600 } 
                          }}
                          domain={[0, 100]}
                          axisLine={{ stroke: '#D1D5DB', strokeWidth: 2 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '2px solid #E5E7EB',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            padding: '12px'
                          }}
                          labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: '8px' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="line"
                          iconSize={20}
                        />
                        
                        {/* Area for participation rate */}
                        <defs>
                          <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366F1" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="rate" 
                          fill="url(#rateGradient)" 
                          stroke="none"
                        />
                        
                        {/* Line for participation rate */}
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#6366F1" 
                          strokeWidth={4}
                          dot={{ fill: '#6366F1', r: 7, strokeWidth: 3, stroke: '#fff' }}
                          name="Tỷ lệ tham gia (%)"
                          label={({ x, y, value }) => {
                            if (!value) return null;
                            return (
                              <g>
                                <rect 
                                  x={x - 22} 
                                  y={y - 26} 
                                  width={44} 
                                  height={22} 
                                  fill="#6366F1" 
                                  rx={6}
                                  opacity={0.95}
                                />
                                <text 
                                  x={x} 
                                  y={y - 12} 
                                  fill="white" 
                                  textAnchor="middle" 
                                  dominantBaseline="middle"
                                  fontSize="13"
                                  fontWeight="700"
                                >
                                  {value}%
                                </text>
                              </g>
                            );
                          }}
                        />
                        
                        {/* Bar for activities */}
                        <Bar 
                          yAxisId="left"
                          dataKey="activities" 
                          fill="#10B981"
                          radius={[8, 8, 0, 0]}
                          name="Số hoạt động"
                          maxBarSize={60}
                          label={({ x, y, width, value }) => (
                            <text 
                              x={x + width / 2} 
                              y={y - 8} 
                              fill="#059669" 
                              textAnchor="middle" 
                              fontSize="13"
                              fontWeight="700"
                            >
                              {value}
                            </text>
                          )}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          Phân tích xu hướng
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Tỷ lệ tham gia trung bình: <strong>{overview.participationRate || 0}%</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Điểm rèn luyện TB: <strong>{overview.avgPoints || 0} điểm</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Số hoạt động đã tổ chức: <strong>{overview.totalActivities || 0}</strong></span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-amber-200">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Target className="h-5 w-5 text-amber-600" />
                          Đánh giá chung
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Hoạt động</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              (overview.totalActivities || 0) >= 10 
                                ? 'bg-green-100 text-green-700' 
                                : (overview.totalActivities || 0) >= 5
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {(overview.totalActivities || 0) >= 10 ? 'Tốt' : (overview.totalActivities || 0) >= 5 ? 'Trung bình' : 'Cần cải thiện'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Tham gia</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              (overview.participationRate || 0) >= 70 
                                ? 'bg-green-100 text-green-700' 
                                : (overview.participationRate || 0) >= 50
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {(overview.participationRate || 0) >= 70 ? 'Tốt' : (overview.participationRate || 0) >= 50 ? 'Trung bình' : 'Cần cải thiện'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Điểm TB</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              (overview.avgPoints || 0) >= 70 
                                ? 'bg-green-100 text-green-700' 
                                : (overview.avgPoints || 0) >= 50
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {(overview.avgPoints || 0) >= 70 ? 'Tốt' : (overview.avgPoints || 0) >= 50 ? 'Trung bình' : 'Cần cải thiện'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
