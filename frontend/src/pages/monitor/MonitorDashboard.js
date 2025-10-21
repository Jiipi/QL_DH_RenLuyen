import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, Clock, TrendingUp, Award, Target, 
  ChevronRight, Activity, BarChart3, Medal, Star,
  FileText, UserCheck, AlertCircle, CheckCircle2,
  ArrowUpRight, Sparkles, Trophy, MapPin, Plus, Zap
} from 'lucide-react';
import http from '../../services/http';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import SemesterClosureWidget from '../../components/SemesterClosureWidget';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function MonitorDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monitorName, setMonitorName] = useState('Lớp trưởng');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  // Semester filter synced with backend current + session cache
  const [semester, setSemester] = useState(() => {
    const cached = sessionStorage.getItem('current_semester');
    return cached || '';
  });

  // Unified semester options from backend
  const { options: semesterOptions, currentSemester } = useSemesterOptions();

  // Keep selected semester in sync with backend-reported current active
  useEffect(() => {
    if (currentSemester && currentSemester !== semester) {
      setSemester(currentSemester);
    }
  }, [currentSemester]);

  // Persist selection for other pages/tabs in the session
  useEffect(() => {
    if (semester) {
      try { sessionStorage.setItem('current_semester', semester); } catch (_) {}
    }
  }, [semester]);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem('user');
      if (cached) {
        const u = JSON.parse(cached);
        setMonitorName(u?.ho_ten || u?.name || 'Lớp trưởng');
      }
    } catch (_) {}
    if (!semester) return;
    loadDashboard();
  }, [semester]); // Reload when semester changes

  const loadDashboard = async () => {
    try {
      setLoading(true);
      // Always send semester parameter
      const params = { semester };
      const res = await http.get('/class/dashboard', { params });
      const data = res?.data?.data;
      console.log('✅ Monitor Dashboard Data:', data);
      setDashboard(data);
    } catch (err) {
      console.error('❌ Error loading monitor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityClick = (activityId) => {
    setSelectedActivity(activityId);
    setShowActivityModal(true);
  };

  const handleCloseModal = () => {
    setShowActivityModal(false);
    setSelectedActivity(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Không thể tải dữ liệu dashboard</p>
        </div>
      </div>
    );
  }

  const { summary, upcomingActivities, recentApprovals, topStudents, categories, monthlyTrend } = dashboard;
  const progressPercent = Math.min(Math.round((summary.avgClassScore / 100) * 100), 100);

  // Format semester display
  const getSemesterDisplay = (semester) => {
    if (semester === 'hoc_ky_1') return 'Học kỳ 1';
    if (semester === 'hoc_ky_2') return 'Học kỳ 2';
    if (semester === 'hoc_ky_he') return 'Học kỳ hè';
    return semester;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white opacity-5 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-white opacity-5 rounded-full"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-yellow-300" />
            <h1 className="text-3xl font-bold text-white">Dashboard Lớp Trưởng</h1>
          </div>
          <p className="text-purple-100 text-lg mb-2">
            Lớp {summary.className} · {summary.totalStudents} sinh viên
          </p>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white font-medium">
              {getSemesterDisplay(summary.currentSemester)} - {summary.academicYear}
            </span>
          </div>
          <div className="flex gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {summary.totalActivities} hoạt động
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Điểm TB: {summary.avgClassScore?.toFixed(1) || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Semester closure widget for monitor (propose only) */}
      <div className="mb-6">
        <SemesterClosureWidget compact enableSoftLock={false} enableHardLock={false} />
      </div>

      {/* Semester Filter */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="h-5 w-5 text-purple-600" />
            <span className="font-semibold">Học kỳ:</span>
          </div>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white font-medium text-gray-700 hover:border-purple-300 cursor-pointer"
          >
            {semesterOptions && semesterOptions.length > 0 && semesterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={loadDashboard}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Tổng số</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{summary.totalStudents}</div>
          <p className="text-sm text-gray-600">Sinh viên lớp</p>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            {summary.pendingApprovals > 0 && (
              <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full animate-pulse">
                !
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{summary.pendingApprovals}</div>
          <p className="text-sm text-gray-600">Chờ phê duyệt</p>
        </div>

        {/* Total Activities */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Học kỳ</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{summary.totalActivities}</div>
          <p className="text-sm text-gray-600">Hoạt động đã tạo</p>
        </div>

        {/* Average Score */}
        <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl shadow-lg p-6 border border-orange-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-gray-500 font-medium">TB Lớp</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {summary.avgClassScore?.toFixed(1) || 0}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-400 to-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Upcoming Activities (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Hoạt động sắp diễn ra</h2>
            </div>
            <button 
              onClick={() => navigate('/class/activities')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors"
            >
              Xem tất cả →
            </button>
          </div>
          
          <div className="space-y-3">
            {upcomingActivities && upcomingActivities.length > 0 ? (
              upcomingActivities.map(activity => (
                <div 
                  key={activity.id}
                  onClick={() => handleActivityClick(activity.id)}
                  className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all duration-300 cursor-pointer bg-gradient-to-r from-white to-purple-50/30"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{activity.ten_hd}</h3>
                    <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
                      +{activity.diem_rl} điểm
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(activity.ngay_bd).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{activity.dia_diem}</span>
                    </div>
                    {activity.registeredStudents > 0 && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">{activity.registeredStudents} SV</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="mb-2">Chưa có hoạt động sắp diễn ra</p>
                <button 
                  onClick={() => navigate('/class/activities/create')}
                  className="mt-2 text-purple-600 hover:text-purple-700 font-medium text-sm"
                >
                  Tạo hoạt động đầu tiên →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top Students (1/3) */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="text-xl font-semibold text-gray-900">Danh Sách Sinh Viên</h2>
            </div>
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full">
              {topStudents?.length || 0} sinh viên
            </span>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {topStudents && topStudents.length > 0 ? (
              topStudents.map((student, index) => {
                // Xếp loại dựa trên điểm
                const getScoreGrade = (points) => {
                  if (points >= 90) return { label: 'Xuất sắc', color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-700' };
                  if (points >= 80) return { label: 'Tốt', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' };
                  if (points >= 65) return { label: 'Khá', color: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-700' };
                  if (points >= 50) return { label: 'Trung bình', color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-700' };
                  return { label: 'Yếu', color: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-700' };
                };
                
                const grade = getScoreGrade(student.points);
                
                return (
                  <div 
                    key={student.id}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-300"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">{student.mssv}</p>
                        <span className="text-gray-300">•</span>
                        <p className="text-xs text-gray-500">{student.activitiesCount} hoạt động</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${grade.bg} ${grade.text}`}>
                          {grade.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`font-bold text-lg bg-gradient-to-r ${grade.color} bg-clip-text text-transparent`}>
                        {student.points}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">điểm RL</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Chưa có dữ liệu</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>

      {/* Activity Categories */}
      {categories && categories.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Phân loại hoạt động</h2>
            <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
              {categories.length} loại
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, index) => {
              const colors = [
                { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-700' },
                { bg: 'bg-green-100', bar: 'bg-green-500', text: 'text-green-700' },
                { bg: 'bg-purple-100', bar: 'bg-purple-500', text: 'text-purple-700' },
                { bg: 'bg-orange-100', bar: 'bg-orange-500', text: 'text-orange-700' },
                { bg: 'bg-pink-100', bar: 'bg-pink-500', text: 'text-pink-700' },
                { bg: 'bg-indigo-100', bar: 'bg-indigo-500', text: 'text-indigo-700' }
              ];
              const color = colors[index % colors.length];
              
              return (
                <div key={cat.name} className={`p-4 rounded-xl ${color.bg} border border-gray-200`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${color.text}`}>{cat.name}</span>
                    <span className="text-sm text-gray-600">{cat.count} HD</span>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-2 mb-2">
                    <div 
                      className={`${color.bar} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min((cat.avgPoints / 10) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">TB: {cat.avgPoints.toFixed(1)} điểm</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">xu hướng 6 tháng gần đây</h2>
          </div>
          
          <div className="space-y-3">
            {monthlyTrend.map(month => (
              <div key={month.month} className="flex items-center gap-4">
                <div className="w-20 text-sm text-gray-600 font-medium">{month.month}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-8 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{ width: `${Math.min((month.registrations / 50) * 100, 100)}%` }}
                    >
                      <span className="text-white text-sm font-medium">{month.registrations}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-5 w-5 text-purple-500" />
          <h2 className="text-xl font-semibold text-gray-900">Thao tác nhanh</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/class/students')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl py-4 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Quản lý SV</span>
          </button>
          
          <button 
            onClick={() => navigate('/class/approvals')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl py-4 hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Clock className="h-5 w-5" />
            <span className="font-medium">Phê duyệt</span>
          </button>
          
          <button 
            onClick={() => navigate('/class/reports')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-4 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <FileText className="h-5 w-5" />
            <span className="font-medium">Báo cáo</span>
          </button>
          
          <button 
            onClick={() => navigate('/class/activities/create')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl py-4 hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Tạo hoạt động</span>
          </button>
        </div>
      </div>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activityId={selectedActivity}
        isOpen={showActivityModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}