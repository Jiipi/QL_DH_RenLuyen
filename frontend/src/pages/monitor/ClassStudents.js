import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Award, TrendingUp, Eye, Mail, Phone, Calendar, User, BookOpen, Trophy, AlertCircle, Download, RefreshCw, Star, Medal, Target, Activity, Sparkles, Crown, ChevronRight, BarChart3 } from 'lucide-react';
import http from '../../services/http';
import { getStudentAvatar, getAvatarGradient } from '../../utils/avatarUtils';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function ClassStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('points_desc');
  
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
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(null);

  // Unified semester options
  const { options: semesterOptions } = useSemesterOptions();

  useEffect(() => {
    loadStudents();
  }, [semester]); // Reload when semester changes

  const loadStudents = async () => {
    try {
      setLoading(true);
      const endpoints = ['/monitor/students', '/class/students', '/teacher/students'];
      let response = null;
      
      // Always send semester parameter
      const params = { semester };
      
      for (const ep of endpoints) {
        try {
          response = await http.get(ep, { params });
          if (response.data) break;
        } catch (e) {
          continue;
        }
      }
      
      const raw = response?.data?.data?.students || response?.data?.students || response?.data?.data || [];
      
      const normalized = (Array.isArray(raw) ? raw : []).map(sv => {
        const nguoiDung = sv.nguoi_dung || {};
        const lop = sv.lop || {};
        
        return {
          id: sv.id,
          mssv: sv.mssv || '',
          ngay_sinh: sv.ngay_sinh,
          gt: sv.gt,
          dia_chi: sv.dia_chi,
          sdt: sv.sdt,
          nguoi_dung: {
            ho_ten: nguoiDung.ho_ten || '',
            email: nguoiDung.email || '',
            anh_dai_dien: nguoiDung.anh_dai_dien || nguoiDung.avatar || nguoiDung.profile_image || nguoiDung.image || sv.anh_dai_dien || sv.avatar || sv.profile_image
          },
          lop: {
            ten_lop: lop.ten_lop || '',
            khoa: lop.khoa || ''
          },
          totalPoints: sv._count?.diem_danh || sv.totalPoints || 0,
          activitiesJoined: sv._count?.dang_ky_hd || sv.activitiesJoined || 0,
          rank: sv.rank || 0,
          status: sv.status || 'active',
          lastActivityDate: sv.lastActivityDate || new Date().toISOString()
        };
      });
      
      // Add ranking
      const sorted = normalized.sort((a, b) => b.totalPoints - a.totalPoints);
      sorted.forEach((student, index) => {
        student.rank = index + 1;
      });
      
      setStudents(sorted);
      setError('');
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Không thể tải danh sách sinh viên');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const headers = ['MSSV', 'Họ tên', 'Email', 'Điểm RL', 'Số hoạt động', 'Xếp hạng'];
    const csvData = students.map(student => [
      student.mssv,
      student.nguoi_dung.ho_ten,
      student.nguoi_dung.email,
      student.totalPoints,
      student.activitiesJoined,
      student.rank
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_sinh_vien_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <Trophy className="h-5 w-5 text-gray-400" />;
  };

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
    return 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700';
  };

  const getPointsColor = (points) => {
    if (points >= 80) return 'text-emerald-600';
    if (points >= 50) return 'text-blue-600';
    if (points >= 30) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getProgressColor = (points) => {
    if (points >= 80) return 'from-emerald-500 to-teal-500';
    if (points >= 50) return 'from-blue-500 to-cyan-500';
    if (points >= 30) return 'from-amber-500 to-orange-500';
    return 'from-rose-500 to-pink-500';
  };

  const sortedStudents = [...students].sort((a, b) => {
    switch (sortBy) {
      case 'points_desc': return b.totalPoints - a.totalPoints;
      case 'points_asc': return a.totalPoints - b.totalPoints;
      case 'name_asc': return a.nguoi_dung.ho_ten.localeCompare(b.nguoi_dung.ho_ten);
      case 'name_desc': return b.nguoi_dung.ho_ten.localeCompare(a.nguoi_dung.ho_ten);
      case 'activities_desc': return b.activitiesJoined - a.activitiesJoined;
      default: return 0;
    }
  });

  const filteredStudents = sortedStudents.filter(student =>
    student.nguoi_dung.ho_ten.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.mssv.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.nguoi_dung.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: students.length,
    avgPoints: students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.totalPoints, 0) / students.length) : 0,
    topPerformers: students.filter(s => s.totalPoints >= 90).length // ✅ Xuất sắc: >= 90 điểm (thống nhất với Dashboard)
  };

  const StudentCard = ({ student }) => {
    const progressPercent = Math.min((student.totalPoints / 100) * 100, 100);
    const isTopRanked = student.rank <= 3;
    const avatar = getStudentAvatar(student);

    return (
      <div className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
        isTopRanked ? 'border-amber-200 shadow-lg shadow-amber-100' : 'border-gray-200'
      }`}>
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        {/* Top performer badge */}
        {isTopRanked && (
          <div className="absolute top-0 right-0">
            <div className={`${getRankBadgeClass(student.rank)} px-4 py-2 rounded-bl-2xl rounded-tr-2xl shadow-lg flex items-center gap-2`}>
              {getRankIcon(student.rank)}
              <span className="text-sm font-bold">#{student.rank}</span>
            </div>
          </div>
        )}

        <div className="p-6 relative z-10">
          {/* Student Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0">
              {avatar.hasValidAvatar ? (
                <img
                  src={avatar.src}
                  alt={avatar.alt}
                  className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                />
              ) : (
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(student.nguoi_dung?.ho_ten || student.mssv)} flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-white`}>
                  {avatar.fallback}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                {student.nguoi_dung.ho_ten}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <User className="h-4 w-4" />
                <span className="font-medium">MSSV: {student.mssv}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span className="truncate">{student.nguoi_dung.email}</span>
              </div>
            </div>
            {!isTopRanked && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                #{student.rank}
              </span>
            )}
          </div>

          {/* Points Display */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Điểm rèn luyện</span>
              <span className={`text-3xl font-bold ${getPointsColor(student.totalPoints)}`}>
                {student.totalPoints}
              </span>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getProgressColor(student.totalPoints)} transition-all duration-500 rounded-full`}
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>100 điểm</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Hoạt động</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{student.activitiesJoined}</p>
            </div>

            <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Mục tiêu</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{Math.max(0, 100 - student.totalPoints)}</p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowDetails(student)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-xl font-semibold"
          >
            <Eye className="h-5 w-5" />
            Xem chi tiết
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
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
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">Sinh Viên Lớp</h1>
                  <p className="text-indigo-100 mt-1">Theo dõi thành tích và tiến độ của sinh viên</p>
                </div>
              </div>
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 font-semibold"
              >
                <Download className="h-5 w-5" />
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total}</div>
            <div className="text-indigo-100 text-sm font-medium">Tổng sinh viên</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Star className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.topPerformers}</div>
            <div className="text-emerald-100 text-sm font-medium">Xuất sắc</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.avgPoints}</div>
            <div className="text-blue-100 text-sm font-medium">Điểm TB</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sinh viên, MSSV, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                />
              </div>
            </div>

            <div className="md:w-64">
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white font-medium"
              >
                {semesterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:w-64">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white font-medium"
              >
                <option value="points_desc">⭐ Điểm cao nhất</option>
                <option value="points_asc">📉 Điểm thấp nhất</option>
                <option value="name_asc">🔤 Tên A-Z</option>
                <option value="name_desc">🔤 Tên Z-A</option>
                <option value="activities_desc">📊 Nhiều hoạt động</option>
              </select>
            </div>

            <button
              onClick={loadStudents}
              className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Students Grid */}
        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map(student => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Không tìm thấy sinh viên</h3>
              <p className="text-gray-600 text-lg">
                Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetails && (
        <StudentDetailModal
          student={showDetails}
          onClose={() => setShowDetails(null)}
        />
      )}
    </div>
  );
}

// Student Detail Modal Component
const StudentDetailModal = ({ student, onClose }) => {
  const progressPercent = Math.min((student.totalPoints / 100) * 100, 100);
  const avatar = getStudentAvatar(student);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Thông tin sinh viên</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            {avatar.hasValidAvatar ? (
              <img
                src={avatar.src}
                alt={avatar.alt}
                className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-white/50"
              />
            ) : (
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(student.nguoi_dung?.ho_ten || student.mssv)} flex items-center justify-center text-3xl font-bold shadow-lg ring-4 ring-white/50`}>
                {avatar.fallback}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold">{student.nguoi_dung.ho_ten}</h3>
              <p className="text-indigo-100">MSSV: {student.mssv}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Points Progress */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-gray-700">Điểm rèn luyện</span>
              <span className="text-4xl font-bold text-indigo-600">{student.totalPoints}</span>
            </div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>0</span>
              <span>{progressPercent.toFixed(0)}%</span>
              <span>100</span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Mail className="h-5 w-5" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <p className="text-gray-900 font-semibold truncate">{student.nguoi_dung.email}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Activity className="h-5 w-5" />
                <span className="text-sm font-medium">Hoạt động</span>
              </div>
              <p className="text-gray-900 font-semibold">{student.activitiesJoined} hoạt động</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-medium">Xếp hạng</span>
              </div>
              <p className="text-gray-900 font-semibold">#{student.rank}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Target className="h-5 w-5" />
                <span className="text-sm font-medium">Còn lại</span>
              </div>
              <p className="text-gray-900 font-semibold">{Math.max(0, 100 - student.totalPoints)} điểm</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
