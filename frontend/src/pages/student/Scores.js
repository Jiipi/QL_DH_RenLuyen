import React from 'react';
import { TrendingUp, Calendar, Award, Target, BookOpen, Users, Heart, Trophy, Medal, BarChart3, PieChart, Filter, Download, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';

export default function Scores(){
  // Unified semester value like: hoc_ky_1-2025 | hoc_ky_2-2025
  const getDefaultSemester = () => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    if (m >= 7 && m <= 11) return `hoc_ky_1-${y}`;
    if (m === 12) return `hoc_ky_2-${y}`;
    if (m >= 1 && m <= 4) return `hoc_ky_2-${y - 1}`;
    return `hoc_ky_1-${y}`;
  };
  const [semester, setSemester] = React.useState(getDefaultSemester());
  const { options: semesterOptions } = useSemesterOptions();
  // Backward-compat local computed values for APIs that still accept hoc_ky + nam_hoc
  const [hocKy, setHocKy] = React.useState('hoc_ky_1');
  const [namHoc, setNamHoc] = React.useState('');
  const [namHocOptions, setNamHocOptions] = React.useState([]);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Derive hoc_ky/nam_hoc from semester whenever it changes
  React.useEffect(() => {
    const m = String(semester || '').match(/^(hoc_ky_1|hoc_ky_2)-(\d{4})$/);
    if (!m) {
      setHocKy('hoc_ky_1');
      setNamHoc('');
      setNamHocOptions([]);
      return;
    }
    const hk = m[1];
    const year = Number(m[2]);
    const nh = hk === 'hoc_ky_1' ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    setHocKy(hk);
    setNamHoc(nh);
    // Also synthesize a small options list from semesterOptions for the legacy year dropdown (kept for UI continuity)
    const years = (semesterOptions || [])
      .map(o => {
        const mm = String(o.value || '').match(/^(hoc_ky_1|hoc_ky_2)-(\d{4})$/);
        if (!mm) return null;
        const y = Number(mm[2]);
        const nhv = mm[1] === 'hoc_ky_1' ? `${y}-${y + 1}` : `${y - 1}-${y}`;
        return nhv;
      })
      .filter(Boolean);
    // De-duplicate and sort desc by start year
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b.split('-')[0]) - Number(a.split('-')[0]));
    setNamHocOptions(uniqueYears.map(v => ({ value: v, label: v })));
  }, [semester, semesterOptions]);

  const loadScores = React.useCallback(async function() {
    if (!semester) return;
    
    setLoading(true);
    setError('');
    
    try {
      const m = String(semester || '').match(/^(hoc_ky_(\d+))-(\d{4})$/);
      const hk = m ? m[1] : 'hoc_ky_1';
      const hkNum = m ? m[2] : '1';
      const year = m ? Number(m[3]) : new Date().getFullYear();
      const nh = hk === 'hoc_ky_1' ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      // Log and pass both legacy and new param for compatibility
      console.log('🔍 Loading scores with params:', { hoc_ky: hkNum, nam_hoc: nh, semester });
      const params = { 
        hoc_ky: hkNum,
        nam_hoc: nh,
        semester
      };
      
      const response = await http.get('/dashboard/scores/detailed', { params });
      
      console.log('✅ Scores API response:', response.data);
      console.log('📊 Scores data:', response.data.data);
      console.log('📊 Total score:', response.data.data?.summary?.total_score);
      console.log('📊 Activities count:', response.data.data?.activities?.length);
      
      setData(response.data.data); // Extract data from API response wrapper
    } catch (err) {
      console.error('❌ Error loading scores:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Không thể tải dữ liệu điểm. Đang hiển thị dữ liệu mẫu.');
      // Fallback to sample data
      setData({
        student_info: {
          ho_ten: "Nguyễn Văn A",
          mssv: "2021001234", 
          lop: "CNTT01"
        },
        summary: {
          total_score: 85,
          total_activities: 12,
          average_points: 7.1,
          rank_in_class: 5,
          total_students_in_class: 45
        },
        criteria_breakdown: [
          { key: 'hoc_tap', name: 'Ý thức và kết quả học tập', current: 20, max: 25, percentage: 80 },
          { key: 'noi_quy', name: 'Ý thức chấp hành nội quy', current: 25, max: 25, percentage: 100 },
          { key: 'tinh_nguyen', name: 'Hoạt động phong trào', current: 15, max: 20, percentage: 75 },
          { key: 'cong_dan', name: 'Quan hệ với cộng đồng', current: 20, max: 25, percentage: 80 },
          { key: 'khen_thuong', name: 'Thành tích đặc biệt', current: 5, max: 5, percentage: 100 }
        ],
        activities: [
          {
            id: 1,
            ten_hd: "Hội thảo công nghệ AI",
            loai: "Học tập và nghiên cứu khoa học",
            diem: 8,
            ngay_bd: "2024-01-15",
            trang_thai: "da_dien_ra"
          },
          {
            id: 2,
            ten_hd: "Hiến máu nhân đạo",
            loai: "Tình nguyện và từ thiện",
            diem: 5,
            ngay_bd: "2024-02-20",
            trang_thai: "da_dien_ra"
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [semester]);

  React.useEffect(function(){ 
    loadScores();
  }, [loadScores]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!data) return { categoryStats: [], totalActivities: 0, averagePoints: 0 };

    const activities = data.activities || [];
    const criteriaBreakdown = data.criteria_breakdown || [];
    
    // Map criteria to display categories
    const categoryStats = criteriaBreakdown.map(criteria => {
      let icon, color;
      if (criteria.key === 'hoc_tap') {
        icon = BookOpen; color = 'blue';
      } else if (criteria.key === 'tinh_nguyen') {
        icon = Heart; color = 'red';
      } else if (criteria.key === 'cong_dan') {
        icon = Users; color = 'purple';
      } else if (criteria.key === 'noi_quy') {
        icon = Trophy; color = 'green';
      } else {
        icon = Medal; color = 'yellow';
      }
      
      return {
        key: criteria.key,
        name: criteria.name,
        icon,
        color,
        points: criteria.current,
        max: criteria.max,
        percentage: criteria.percentage
      };
    });

    return {
      categoryStats,
      totalActivities: data.summary?.total_activities || 0,
      averagePoints: data.summary?.average_points || 0
    };
  }, [data]);

  function ScoreCard({ activity }) {
    const date = activity.ngay_bd ? new Date(activity.ngay_bd) : new Date();
    
    // Determine category based on activity type
    let categoryConfig;
    const loai = (activity.loai || '').toLowerCase();
    
    if (loai.includes('học') || loai.includes('giáo dục')) {
      categoryConfig = { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: BookOpen, color: 'blue' };
    } else if (loai.includes('tình nguyện') || loai.includes('phong trào')) {
      categoryConfig = { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: Heart, color: 'red' };
    } else if (loai.includes('văn hóa') || loai.includes('thể thao')) {
      categoryConfig = { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: Users, color: 'purple' };
    } else {
      categoryConfig = { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: Trophy, color: 'green' };
    }

    const CategoryIcon = categoryConfig.icon;

    // Create safe CSS classes to avoid dynamic Tailwind issues
    const iconBgClass = categoryConfig.color === 'blue' ? 'bg-blue-100' :
                       categoryConfig.color === 'red' ? 'bg-red-100' :
                       categoryConfig.color === 'purple' ? 'bg-purple-100' : 'bg-green-100';
    
    const tagBgClass = categoryConfig.color === 'blue' ? 'bg-blue-100' :
                      categoryConfig.color === 'red' ? 'bg-red-100' :
                      categoryConfig.color === 'purple' ? 'bg-purple-100' : 'bg-green-100';

    return (
      <div className={`${categoryConfig.bg} ${categoryConfig.border} border rounded-lg p-4`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 ${iconBgClass} rounded-lg`}>
              <CategoryIcon className={`h-6 w-6 ${categoryConfig.text}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{activity.ten_hd}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 text-xs rounded-full ${tagBgClass} ${categoryConfig.text}`}>
                  {activity.loai || 'Khác'}
                </span>
                <span className="text-sm text-gray-500">{date.toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              +{activity.diem || 0} điểm
            </div>
            <div className="text-sm text-gray-500">
              {activity.trang_thai === 'da_dien_ra' ? 'Đã tham gia' : 'Đã đăng ký'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ProgressCircle({ percentage, size = 120, strokeWidth = 8 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${percentage * circumference / 100} ${circumference}`;

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="#e5e7eb"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="#3b82f6"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
          <span className="text-xs text-gray-500">mục tiêu</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Điểm rèn luyện</h1>
          <p className="text-orange-100">Theo dõi và phân tích kết quả rèn luyện của bạn</p>
        </div>
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const targetScore = 100;
  const currentScore = data?.summary?.total_score || 0;
  const progressPercentage = Math.min((currentScore / targetScore) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Điểm rèn luyện theo học kỳ</h1>
        <p className="text-orange-100">
          Theo dõi và phân tích kết quả rèn luyện của từng học kỳ
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">{error}</span>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Học kỳ</label>
            <select 
              value={semester} 
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {(semesterOptions || []).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Năm học</label>
            <select 
              value={namHoc} 
              onChange={(e) => {
                const v = e.target.value; // format YYYY-YYYY
                setNamHoc(v);
                const mm = String(semester || '').match(/^(hoc_ky_1|hoc_ky_2)-(\d{4})$/);
                const hkPart = mm ? mm[1] : 'hoc_ky_1';
                const [y1, y2] = String(v).split('-').map(n => Number(n));
                if (y1 && y2) {
                  const yearForSemester = hkPart === 'hoc_ky_1' ? y1 : y2;
                  setSemester(`${hkPart}-${yearForSemester}`);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {namHocOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={loadScores}
              disabled={loading}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Cập nhật
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall Progress */}
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Tổng điểm học kỳ</h3>
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex items-center justify-center mb-4">
                  <ProgressCircle percentage={Math.round(progressPercentage)} />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {currentScore}/{targetScore}
                  </div>
                  <p className="text-gray-600">điểm rèn luyện</p>
                  {data.summary?.xep_loai && (
                    <div className="mt-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        data.summary.xep_loai === 'Xuất sắc' ? 'bg-yellow-100 text-yellow-800' :
                        data.summary.xep_loai === 'Tốt' ? 'bg-blue-100 text-blue-800' :
                        data.summary.xep_loai === 'Khá' ? 'bg-green-100 text-green-800' :
                        data.summary.xep_loai === 'Trung bình' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {data.summary.xep_loai}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Thống kê nhanh</h3>
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Hoạt động tham gia</span>
                  <span className="font-semibold">{stats.totalActivities}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Điểm trung bình</span>
                  <span className="font-semibold">{stats.averagePoints}</span>
                </div>
                {data.summary?.rank_in_class && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Xếp hạng lớp</span>
                    <span className="font-semibold">{data.summary.rank_in_class}/{data.summary.total_students_in_class}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Student Info */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Thông tin sinh viên</h3>
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600 text-sm">Họ tên</span>
                  <div className="font-semibold">{data.student_info?.ho_ten}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">MSSV</span>
                  <div className="font-semibold">{data.student_info?.mssv}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Lớp</span>
                  <div className="font-semibold">{data.student_info?.lop}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Phân tích theo tiêu chí</h3>
              <PieChart className="h-6 w-6 text-purple-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.categoryStats.map(stat => {
                const IconComponent = stat.icon;
                
                // Create safe CSS classes for each color
                const bgClass = stat.color === 'blue' ? 'bg-blue-100' :
                               stat.color === 'red' ? 'bg-red-100' :
                               stat.color === 'purple' ? 'bg-purple-100' :
                               stat.color === 'green' ? 'bg-green-100' : 'bg-yellow-100';
                
                const textClass = stat.color === 'blue' ? 'text-blue-600' :
                                 stat.color === 'red' ? 'text-red-600' :
                                 stat.color === 'purple' ? 'text-purple-600' :
                                 stat.color === 'green' ? 'text-green-600' : 'text-yellow-600';
                
                const percentageTextClass = stat.color === 'blue' ? 'text-blue-600' :
                                           stat.color === 'red' ? 'text-red-600' :
                                           stat.color === 'purple' ? 'text-purple-600' :
                                           stat.color === 'green' ? 'text-green-600' : 'text-yellow-600';
                
                return (
                  <div key={stat.key} className="text-center">
                    <div className={`mx-auto mb-3 p-3 ${bgClass} rounded-full w-16 h-16 flex items-center justify-center`}>
                      <IconComponent className={`h-8 w-8 ${textClass}`} />
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm mb-2">{stat.name}</h4>
                    <div className="text-lg font-bold text-gray-900">{stat.points}/{stat.max}</div>
                    <div className={`text-sm ${percentageTextClass}`}>{stat.percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity History */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Lịch sử hoạt động</h3>
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="space-y-4">
              {data.activities?.length > 0 ? (
                data.activities.map(activity => (
                  <ScoreCard key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Chưa có hoạt động nào trong kỳ này</p>
                </div>
              )}
            </div>
          </div>

          {/* Class Rankings */}
          {data.class_rankings && data.class_rankings.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Bảng xếp hạng lớp</h3>
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hạng</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">MSSV</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Họ tên</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Số HĐ</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tổng điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.class_rankings.map((student, index) => (
                      <tr 
                        key={student.mssv} 
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          student.is_current_user ? 'bg-blue-50 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 mr-2" />}
                            {index === 1 && <Medal className="h-5 w-5 text-gray-400 mr-2" />}
                            {index === 2 && <Medal className="h-5 w-5 text-orange-400 mr-2" />}
                            <span className={student.is_current_user ? 'text-blue-700' : 'text-gray-900'}>
                              #{index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={student.is_current_user ? 'text-blue-700' : 'text-gray-600'}>
                            {student.mssv}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={student.is_current_user ? 'text-blue-900' : 'text-gray-900'}>
                            {student.ho_ten}
                            {student.is_current_user && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                Bạn
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={student.is_current_user ? 'text-blue-700' : 'text-gray-600'}>
                            {student.so_hoat_dong}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-bold ${
                            student.is_current_user ? 'text-blue-700' : 
                            student.tong_diem >= 90 ? 'text-yellow-600' :
                            student.tong_diem >= 80 ? 'text-blue-600' :
                            student.tong_diem >= 65 ? 'text-green-600' :
                            'text-gray-600'
                          }`}>
                            {student.tong_diem} điểm
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <strong>Ghi chú:</strong> Bảng xếp hạng dựa trên tổng điểm rèn luyện của học kỳ này trong lớp.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}