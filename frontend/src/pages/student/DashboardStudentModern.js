import React from 'react';
import { useNavigate } from 'react-router-dom';
import useSafeNavigate from '../../hooks/useSafeNavigate';
import { 
  Calendar, Award, TrendingUp, Bell, Clock, MapPin, Users, ChevronRight, 
  Star, BookOpen, Target, Activity, BarChart3, Medal, Trophy, Sparkles,
  Zap, TrendingDown, Eye, Plus, RefreshCw, Filter
} from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function DashboardStudentModern() {
  const navigate = useNavigate();
  const safeNavigate = useSafeNavigate(450);
  
  const [summary, setSummary] = React.useState({ totalPoints: 0, progress: 0, targetPoints: 100, activitiesJoined: 0 });
  const [upcoming, setUpcoming] = React.useState([]);
  const [recentActivities, setRecentActivities] = React.useState([]);
  const [criteriaProgress, setCriteriaProgress] = React.useState([]);
  const [myActivities, setMyActivities] = React.useState([]);
  const [userProfile, setUserProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
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

  const loadDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const legacy = parseSemesterToLegacy(semester);
      const params = {};
      if (semester) {
        params.semester = semester;
        if (legacy.hoc_ky) params.hoc_ky = legacy.hoc_ky;
        if (legacy.nam_hoc) params.nam_hoc = legacy.nam_hoc;
      }
      
      const [dashboardRes, myActivitiesRes, profileRes] = await Promise.allSettled([
        http.get('/dashboard/student', { params }),
        http.get('/dashboard/activities/me', { params }),
        http.get('/users/profile').catch(() => http.get('/auth/profile'))
      ]);
      
      let apiData = {};
      let totalPoints = 0;
      
      if (dashboardRes.status === 'fulfilled') {
        apiData = dashboardRes.value.data.data || {};
        
        if (apiData.tong_quan) {
          totalPoints = apiData.tong_quan.tong_diem || 0;
          setSummary({
            totalPoints: totalPoints,
            progress: apiData.tong_quan.ti_le_hoan_thanh || 0,
            targetPoints: 100,
            activitiesJoined: apiData.tong_quan.tong_hoat_dong || 0
          });
        }
        
        if (apiData.hoat_dong_sap_toi) {
          setUpcoming(apiData.hoat_dong_sap_toi);
        }
        
        if (apiData.hoat_dong_gan_day) {
          setRecentActivities(apiData.hoat_dong_gan_day);
        }
      }

      if (myActivitiesRes.status === 'fulfilled') {
        const myData = myActivitiesRes.value.data?.success && Array.isArray(myActivitiesRes.value.data.data)
          ? myActivitiesRes.value.data.data
          : Array.isArray(myActivitiesRes.value.data)
            ? myActivitiesRes.value.data
            : [];
        setMyActivities(myData);
      }

      if (profileRes.status === 'fulfilled') {
        const profileData = profileRes.value.data?.data || profileRes.value.data || {};
        setUserProfile(profileData);
      }

      const criteriaProgress = apiData.tien_do_tieu_chi || [
        { id: 1, ten_tieu_chi: 'Ý thức và kết quả học tập', diem_hien_tai: totalPoints ? Math.floor(totalPoints * 0.4) : 0, diem_toi_da: 25, mau_sac: '#3B82F6', icon: '📚' },
        { id: 2, ten_tieu_chi: 'Ý thức và kết quả chấp hành nội quy', diem_hien_tai: totalPoints ? Math.floor(totalPoints * 0.3) : 0, diem_toi_da: 25, mau_sac: '#10B981', icon: '⚖️' },
        { id: 3, ten_tieu_chi: 'Hoạt động phong trào, tình nguyện', diem_hien_tai: totalPoints || 0, diem_toi_da: 25, mau_sac: '#F59E0B', icon: '🤝' },
        { id: 4, ten_tieu_chi: 'Phẩm chất công dân và quan hệ xã hội', diem_hien_tai: totalPoints ? Math.floor(totalPoints * 0.2) : 0, diem_toi_da: 20, mau_sac: '#8B5CF6', icon: '🌟' },
        { id: 5, ten_tieu_chi: 'Hoạt động khen thưởng, kỷ luật', diem_hien_tai: totalPoints ? Math.floor(totalPoints * 0.1) : 0, diem_toi_da: 5, mau_sac: '#EF4444', icon: '🏆' }
      ];
      
      setCriteriaProgress(criteriaProgress);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [semester, parseSemesterToLegacy]);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  function getClassification(points) {
    if (points >= 90) return { text: 'Xuất sắc', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Trophy };
    if (points >= 80) return { text: 'Tốt', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Star };
    if (points >= 65) return { text: 'Khá', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: Medal };
    if (points >= 50) return { text: 'Trung bình', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Activity };
    return { text: 'Yếu', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: TrendingDown };
  }

  const classification = getClassification(summary.totalPoints);
  const ClassIcon = classification.icon;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-8">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                Xin chào, {userProfile?.ho_ten || userProfile?.name || 'Sinh viên'}! 
                <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
              </h1>
              <p className="text-blue-100 text-lg">Chào mừng bạn quay trở lại với hệ thống điểm rèn luyện</p>
            </div>
            
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-2xl transition-all duration-300 font-semibold"
            >
              <RefreshCw className="h-5 w-5" />
              Làm mới
            </button>
          </div>

          {/* Quick Stats in Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border-2 border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Tổng điểm</p>
                  <p className="text-3xl font-bold text-white">{summary.totalPoints}</p>
                  <p className="text-white/60 text-xs mt-1">/ {summary.targetPoints} điểm</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border-2 border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Hoạt động</p>
                  <p className="text-3xl font-bold text-white">{summary.activitiesJoined}</p>
                  <p className="text-white/60 text-xs mt-1">Đã tham gia</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border-2 border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Xếp loại</p>
                  <p className="text-2xl font-bold text-white flex items-center gap-2">
                    {classification.text}
                    <ClassIcon className="h-6 w-6" />
                  </p>
                  <p className="text-white/60 text-xs mt-1">{summary.progress}% hoàn thành</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
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

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative inline-block mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-r-indigo-600 absolute inset-0"></div>
            <Zap className="absolute inset-0 m-auto h-6 w-6 text-blue-600 animate-pulse" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">Đang tải dữ liệu...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Criteria Progress */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
            
            <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Tiến độ các tiêu chí
              </h2>
              
              <div className="space-y-4">
                {criteriaProgress.map(criteria => {
                  const percentage = criteria.diem_toi_da > 0 ? (criteria.diem_hien_tai / criteria.diem_toi_da * 100) : 0;
                  return (
                    <div key={criteria.id} className="group/item">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{criteria.icon}</span>
                          <span className="font-semibold text-gray-700">{criteria.ten_tieu_chi}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {criteria.diem_hien_tai} / {criteria.diem_toi_da} điểm
                        </span>
                      </div>
                      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: criteria.mau_sac
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Activities */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
              
              <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    Hoạt động sắp tới
                  </h2>
                  <button
                    onClick={() => navigate('/student/activities')}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                  >
                    Xem tất cả
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {upcoming.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Chưa có hoạt động sắp tới</p>
                    </div>
                  ) : (
                    upcoming.slice(0, 5).map((activity, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl hover:shadow-lg transition-all duration-300 cursor-pointer"
                        onClick={() => navigate(`/activities/${activity.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 flex-1">{activity.ten_hd || activity.name}</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">
                            +{activity.diem_rl || 0}đ
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {activity.ngay_bd ? new Date(activity.ngay_bd).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {activity.dia_diem || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
              
              <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="h-6 w-6 text-purple-600" />
                    Hoạt động gần đây
                  </h2>
                  <button
                    onClick={() => navigate('/student/my-activities')}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1"
                  >
                    Xem tất cả
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {recentActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Chưa có hoạt động nào</p>
                    </div>
                  ) : (
                    recentActivities.slice(0, 5).map((activity, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100 rounded-2xl hover:shadow-lg transition-all duration-300 cursor-pointer"
                        onClick={() => navigate(`/activities/${activity.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 flex-1">{activity.ten_hd || activity.name}</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500 text-white">
                            +{activity.diem_rl || 0}đ
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {activity.ngay_bd ? new Date(activity.ngay_bd).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/student/activities')}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <Calendar className="h-8 w-8 mb-3" />
              <p className="font-semibold text-lg">Xem hoạt động</p>
            </button>

            <button
              onClick={() => navigate('/student/my-activities')}
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <Award className="h-8 w-8 mb-3" />
              <p className="font-semibold text-lg">Hoạt động của tôi</p>
            </button>

            <button
              onClick={() => navigate('/student/scores')}
              className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <Trophy className="h-8 w-8 mb-3" />
              <p className="font-semibold text-lg">Điểm rèn luyện</p>
            </button>

            <button
              onClick={() => navigate('/student/qr-scanner')}
              className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <Target className="h-8 w-8 mb-3" />
              <p className="font-semibold text-lg">Điểm danh QR</p>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
