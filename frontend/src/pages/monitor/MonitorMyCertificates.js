import React, { useState, useEffect } from 'react';
import { Award, Calendar, MapPin, Download, Search, Filter, X, CheckCircle, Trophy, FileText, BookOpen } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import http from '../../services/http';

export default function MonitorMyCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ semester: '', year: '', category: '' });
  const [activityTypes, setActivityTypes] = useState([]);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadActivityTypes();
    loadCertificates();
  }, []);

  const loadActivityTypes = () => {
    http.get('/activities/types/list')
      .then(res => {
        const types = res.data?.data || [];
        setActivityTypes(types);
      })
      .catch(() => setActivityTypes([]));
  };

  const loadCertificates = () => {
    setLoading(true);
    http.get('/dashboard/activities/me')
      .then(res => {
        const data = res.data?.data || [];
        // Only show completed activities
        const completed = data.filter(reg => reg.trang_thai_dk === 'da_tham_gia');
        setCertificates(completed);
      })
      .catch(() => setCertificates([]))
      .finally(() => setLoading(false));
  };

  const handleDownloadCertificate = async (activity) => {
    try {
      showSuccess('Chức năng đang phát triển. Tạm thời hiển thị thông tin chứng nhận.', 'Thông báo', 5000);
      // TODO: Implement PDF generation
      // const response = await http.get(`/activities/${activity.id}/certificate`, { responseType: 'blob' });
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', `chung-nhan-${activity.ten_hd}.pdf`);
      // document.body.appendChild(link);
      // link.click();
      // link.remove();
    } catch (error) {
      showError('Không thể tải chứng nhận');
    }
  };

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  const formatDate = (dateStr) => {
    const date = parseDateSafe(dateStr);
    return date ? date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : '—';
  };

  const getSemesterFromDate = (dateStr) => {
    const date = parseDateSafe(dateStr);
    if (!date) return '—';
    const month = date.getMonth() + 1;
    // Học kỳ 1: tháng 9-12, Học kỳ 2: tháng 1-5
    return month >= 9 ? 'Học kỳ 1' : 'Học kỳ 2';
  };

  const getAcademicYear = (dateStr) => {
    const date = parseDateSafe(dateStr);
    if (!date) return '—';
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    // Nếu tháng >= 9, năm học là year-year+1, ngược lại year-1-year
    return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  const getFilteredCertificates = () => {
    let filtered = certificates;

    // Search filter
    if (searchText) {
      filtered = filtered.filter(cert =>
        cert.hoat_dong?.ten_hd?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Semester filter
    if (filters.semester) {
      filtered = filtered.filter(cert => {
        const semester = getSemesterFromDate(cert.hoat_dong?.ngay_bd);
        return semester === filters.semester;
      });
    }

    // Year filter
    if (filters.year) {
      filtered = filtered.filter(cert => {
        const year = getAcademicYear(cert.hoat_dong?.ngay_bd);
        return year === filters.year;
      });
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(cert =>
        cert.hoat_dong?.loai_hd_id === filters.category
      );
    }

    return filtered;
  };

  const getTotalPoints = () => {
    return certificates.reduce((sum, cert) => {
      return sum + (parseFloat(cert.hoat_dong?.diem_rl) || 0);
    }, 0);
  };

  const getUniqueYears = () => {
    const years = certificates.map(cert => getAcademicYear(cert.hoat_dong?.ngay_bd));
    return [...new Set(years)].filter(y => y !== '—').sort().reverse();
  };

  const clearFilters = () => {
    setFilters({ semester: '', year: '', category: '' });
    setSearchText('');
  };

  const filteredCertificates = getFilteredCertificates();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Chứng nhận của tôi</h1>
            <p className="text-blue-100">Tổng hợp các chứng nhận hoạt động đã hoàn thành</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{certificates.length}</div>
              <div className="text-sm text-blue-100 mt-1">Chứng nhận</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{getTotalPoints().toFixed(1)}</div>
              <div className="text-sm text-blue-100 mt-1">Tổng điểm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoạt động..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả học kỳ</option>
              <option value="Học kỳ 1">Học kỳ 1</option>
              <option value="Học kỳ 2">Học kỳ 2</option>
            </select>

            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả năm học</option>
              {getUniqueYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả loại hoạt động</option>
              {activityTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>

            {(filters.semester || filters.year || filters.category || searchText) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all"
              >
                <X className="h-4 w-4" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Certificates List */}
      {filteredCertificates.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center">
          <Trophy className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">
            {certificates.length === 0 
              ? 'Chưa có chứng nhận nào' 
              : 'Không tìm thấy chứng nhận phù hợp'}
          </p>
          {(filters.semester || filters.year || filters.category || searchText) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCertificates.map((cert) => {
            const activity = cert.hoat_dong || {};
            const semester = getSemesterFromDate(activity.ngay_bd);
            const year = getAcademicYear(activity.ngay_bd);

            return (
              <div key={cert.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300">
                {/* Certificate Header */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full p-3 shadow-lg">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                          <CheckCircle className="h-3 w-3" />
                          Hoàn thành
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-lg font-bold text-amber-600">
                      <Award className="h-5 w-5" />
                      {activity.diem_rl} điểm
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                    {activity.ten_hd}
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {activity.loai_hd?.ten_loai_hd || 'Khác'}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                      {semester}
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                      {year}
                    </span>
                  </div>
                </div>

                {/* Certificate Body */}
                <div className="p-6 space-y-3">
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-700">Thời gian:</span> {formatDate(activity.ngay_bd)}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-700">Địa điểm:</span> {activity.dia_diem || 'Chưa xác định'}
                    </div>
                  </div>

                  {activity.don_vi_to_chuc && (
                    <div className="flex items-start gap-3 text-sm text-gray-600">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-700">Đơn vị:</span> {activity.don_vi_to_chuc}
                      </div>
                    </div>
                  )}

                  {cert.ngay_duyet && (
                    <div className="flex items-start gap-3 text-sm text-emerald-600">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Hoàn thành:</span> {formatDate(cert.ngay_duyet)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Certificate Footer */}
                <div className="border-t bg-gray-50 p-4">
                  <button
                    onClick={() => handleDownloadCertificate(activity)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all shadow-lg hover:shadow-xl"
                  >
                    <Download className="h-4 w-4" />
                    Tải chứng nhận
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {filteredCertificates.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{filteredCertificates.length}</div>
              <div className="text-sm text-gray-600 mt-1">Tổng số chứng nhận</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600">
                {filteredCertificates.reduce((sum, cert) => sum + (parseFloat(cert.hoat_dong?.diem_rl) || 0), 0).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Tổng điểm đạt được</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {[...new Set(filteredCertificates.map(c => c.hoat_dong?.loai_hd_id))].length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Loại hoạt động</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-pink-600">
                {[...new Set(filteredCertificates.map(c => getSemesterFromDate(c.hoat_dong?.ngay_bd)))].length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Học kỳ tham gia</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
