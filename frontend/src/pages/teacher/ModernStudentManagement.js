import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download,
  Eye,
  Edit,
  Trash2,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  X,
  Calendar,
  BookOpen,
  User,
  Home,
  Save,
  ChevronRight,
  UserCheck,
  TrendingUp,
  Award
} from 'lucide-react';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { getStudentAvatar, getAvatarGradient } from '../../utils/avatarUtils';

export default function ModernStudentManagement() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, confirm } = useNotification();
  
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Class management states
  const [classStatistics, setClassStatistics] = useState({
    totalStudents: 0,
    totalActivities: 0,
    totalParticipants: 0,
    participationRate: 0,
    averageScore: 0
  });
  const [selectedMonitorId, setSelectedMonitorId] = useState('');
  const [assigningMonitor, setAssigningMonitor] = useState(false);
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Form state for add/edit
  const [formData, setFormData] = useState({
    ho_ten: '',
    email: '',
    mssv: '',
    ngay_sinh: '',
    gt: 'nam',
    lop_id: '',
    dia_chi: '',
    sdt: '',
    ten_dn: '',
    mat_khau: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Reload when filters change (debounced) and reset page
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, selectedClass]);

  // Helper: collect and show backend validation errors (400) nicely
  const showValidationErrors = (err, fallback = 'Có lỗi xảy ra') => {
    try {
      const data = err?.response?.data;
      const errors = Array.isArray(data?.errors) ? data.errors : [];
      const messages = errors.map(e => e?.message).filter(Boolean);
      const message = messages.length > 0 ? messages.join('\n') : (data?.message || fallback);
      showError(message);
    } catch (_) {
      showError(fallback);
    }
  };

  // Helper: basic client-side validation mirroring backend constraints
  const validateAddForm = () => {
    const msgs = [];
    const f = formData;
    // Required
    if (!f.ho_ten?.trim()) msgs.push('Họ và tên là bắt buộc');
    if (!f.mssv?.trim()) msgs.push('MSSV là bắt buộc');
    if (!f.email?.trim()) msgs.push('Email là bắt buộc');
    if (!f.ten_dn?.trim()) msgs.push('Tên đăng nhập là bắt buộc');
    if (!f.mat_khau?.trim()) msgs.push('Mật khẩu là bắt buộc');
    if (!f.lop_id) msgs.push('Lớp là bắt buộc');

    // Length constraints
    if (f.mssv && String(f.mssv).trim().length > 10) msgs.push('MSSV tối đa 10 ký tự');
    if (f.email && String(f.email).trim().length > 100) msgs.push('Email tối đa 100 ký tự');
    if (f.ho_ten && String(f.ho_ten).trim().length > 50) msgs.push('Họ tên tối đa 50 ký tự');
    if (f.ten_dn && String(f.ten_dn).trim().length > 50) msgs.push('Tên đăng nhập tối đa 50 ký tự');

    // Phone: digits only <= 10
    if (f.sdt) {
      const digits = String(f.sdt).replace(/\D/g, '');
      if (digits.length > 10) msgs.push('Số điện thoại tối đa 10 chữ số');
    }

    // Date format
    if (f.ngay_sinh) {
      const d = new Date(f.ngay_sinh);
      if (isNaN(d.getTime())) msgs.push('Ngày sinh không hợp lệ (YYYY-MM-DD)');
    }

    return msgs;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (selectedClass) params.set('classFilter', selectedClass);

      const [studentsRes, classesRes] = await Promise.all([
        http.get(`/teacher/students?${params.toString()}`),
        http.get('/teacher/classes')
      ]);
      
      const studentsData = studentsRes.data?.data?.students || [];
      const classesData = classesRes.data?.data?.classes || [];
      
      // Normalize student data to ensure anh_dai_dien is properly mapped
      const normalizedStudents = (Array.isArray(studentsData) ? studentsData : []).map(student => ({
        ...student,
        anh_dai_dien: student.anh_dai_dien || student.avatar || student.profile_image || student.image
      }));
      
      setStudents(normalizedStudents);
      setClasses(Array.isArray(classesData) ? classesData : []);
      
      // Auto-select first class if none selected
      if (!selectedClass && classesData.length > 0) {
        setSelectedClass(classesData[0].id);
        return; // Will reload with selected class
      }
      
      setError('');
      
      // Load class statistics if a specific class is selected
      if (selectedClass) {
        loadClassStatistics(selectedClass);
        
        // Sync monitor selection
        const currentClass = classesData.find(c => c.id === selectedClass);
        if (currentClass?.lop_truong) {
          setSelectedMonitorId(currentClass.lop_truong);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Không thể tải dữ liệu sinh viên');
      showError('Lỗi khi tải dữ liệu sinh viên');
    } finally {
      setLoading(false);
    }
  };
  
  const loadClassStatistics = async (classId) => {
    try {
      const response = await http.get(`/teacher/classes/${classId}/statistics`);
      const stats = response.data?.data || {};
      setClassStatistics({
        totalStudents: stats.totalStudents || 0,
        totalActivities: stats.totalActivities || 0,
        totalParticipants: stats.totalParticipants || 0,
        participationRate: stats.participationRate || 0,
        averageScore: stats.averageScore || 0
      });
    } catch (err) {
      console.error('Load statistics error:', err);
    }
  };
  
  const handleAssignMonitor = async () => {
    if (!selectedMonitorId) {
      showWarning('Vui lòng chọn sinh viên làm lớp trưởng');
      return;
    }
    if (!selectedClass) {
      showWarning('Vui lòng chọn một lớp');
      return;
    }

    setAssigningMonitor(true);
    try {
      await http.patch(`/teacher/classes/${selectedClass}/monitor`, {
        sinh_vien_id: selectedMonitorId
      });
      showSuccess('Gán lớp trưởng thành công');
      await loadData();
    } catch (err) {
      console.error('Assign monitor error:', err);
      showError(err.response?.data?.message || 'Không thể gán lớp trưởng');
    } finally {
      setAssigningMonitor(false);
    }
  };
  
  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setActiveTab('basic');
    setViewModalOpen(true);
  };
  
  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setFormData({
  ho_ten: student.ho_ten || '',
  email: student.email || '',
  mssv: student.sinh_vien?.mssv || '',
  ngay_sinh: student.sinh_vien?.ngay_sinh ? new Date(student.sinh_vien.ngay_sinh).toISOString().split('T')[0] : '',
  gt: student.sinh_vien?.gt || 'nam',
  lop_id: student.sinh_vien?.lop_id || '',
  dia_chi: student.sinh_vien?.dia_chi || '',
  sdt: student.sinh_vien?.sdt || '',
    });
    setEditModalOpen(true);
  };

  const handleAddStudent = () => {
    setFormData({
      ho_ten: '',
      email: '',
      mssv: '',
      ngay_sinh: '',
      gt: 'nam',
      lop_id: classes[0]?.id || '',
      dia_chi: '',
      sdt: '',
      ten_dn: '',
      mat_khau: ''
    });
    setAddModalOpen(true);
  };
  
  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sinh viên này?')) return;
    
    try {
      await http.delete(`/teacher/students/${studentId}`);
      showSuccess('Xóa sinh viên thành công');
      loadData();
    } catch (err) {
      console.error('Delete error:', err);
      showError(err.response?.data?.message || 'Không thể xóa sinh viên');
    }
  };
  
  const handleSaveEdit = async () => {
    try {
      await http.put(`/teacher/students/${selectedStudent.id}`, formData);
      showSuccess('Cập nhật thông tin sinh viên thành công');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Update error:', err);
      showError(err.response?.data?.message || 'Không thể cập nhật sinh viên');
    }
  };
  
  const handleSaveAdd = async () => {
    // Client-side validation first
    const msgs = validateAddForm();
    if (msgs.length > 0) {
      showError(msgs.join('\n'));
      return;
    }
    try {
      // sanitize sdt to avoid surprising 400s
      const payload = { ...formData };
      if (payload.sdt) payload.sdt = String(payload.sdt).replace(/\D/g, '');

      await http.post('/teacher/students', payload);
      showSuccess('Thêm sinh viên thành công');
      setAddModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Add error:', err);
      showValidationErrors(err, 'Không thể thêm sinh viên');
    }
  };
  
  const handleExport = async (fmt = 'xlsx') => {
    try {
      const params = new URLSearchParams();
      params.set('format', fmt);
      if (searchTerm) params.set('search', searchTerm);
      if (selectedClass && selectedClass !== 'all') params.set('classFilter', selectedClass);

      const url = `/teacher/students/export?${params.toString()}`;
      const res = await http.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const href = window.URL.createObjectURL(blob);
      link.href = href;
      const dateStr = new Date().toISOString().slice(0,10);
      link.download = `danh_sach_sinh_vien_${dateStr}.${fmt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(href);
    } catch (err) {
      console.error('Export error:', err);
      showError(err.response?.data?.message || 'Không thể xuất danh sách');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };
  
  const formatGender = (gt) => {
    const genderMap = { 'nam': 'Nam', 'nu': 'Nữ', 'khac': 'Khác' };
    return genderMap[gt] || 'N/A';
  };

  // Pagination logic
  const filteredStudents = students;
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
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
            onClick={loadData}
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý sinh viên & Lớp</h1>
        <p className="text-gray-600">Xem và quản lý danh sách sinh viên, lớp phụ trách</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Class Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h3 className="font-semibold text-gray-900">Danh sách lớp</h3>
              <p className="text-sm text-gray-600">{classes.length} lớp phụ trách</p>
            </div>
            <div className="divide-y divide-gray-200">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls.id)}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedClass === cls.id
                      ? 'bg-indigo-50 border-l-4 border-indigo-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{cls.ten_lop}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{cls.so_sinh_vien || 0} sinh viên</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-8">
          {/* Class Statistics (only when a specific class is selected) */}
          {selectedClass && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {classes.find(c => c.id === selectedClass)?.ten_lop || 'Lớp'}
                  </h2>
                  <p className="text-gray-600">Thống kê lớp học</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-sm text-gray-600">Tổng sinh viên</div>
                  <div className="text-2xl font-bold">{classStatistics.totalStudents}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-sm text-gray-600">Hoạt động</div>
                  <div className="text-2xl font-bold">{classStatistics.totalActivities}</div>
                </div>
              </div>
            </div>
          )}

          {/* Assign Monitor (only when a specific class is selected) */}
          {selectedClass && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Gán lớp trưởng</h3>
              </div>
              <div className="flex gap-3">
                <select
                  value={selectedMonitorId}
                  onChange={(e) => setSelectedMonitorId(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Chọn sinh viên làm lớp trưởng</option>
                  {students.map((student) => (
                    <option key={student.sinh_vien?.id || student.id} value={student.sinh_vien?.id}>
                      {student.ho_ten} - {student.sinh_vien?.mssv}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignMonitor}
                  disabled={assigningMonitor}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningMonitor ? 'Đang xử lý...' : 'Gán lớp trưởng'}
                </button>
              </div>
            </div>
          )}

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm sinh viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedClass || ''}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.ten_lop}</option>
              ))}
            </select>
            <button 
              onClick={handleAddStudent}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm sinh viên
            </button>
            <button 
              onClick={() => navigate('/teacher/students/import')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button 
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Xuất Excel"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách sinh viên</h3>
        </div>
        
        {paginatedStudents.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {paginatedStudents.map(student => {
              const avatar = getStudentAvatar(student);
              
              return (
              <div key={student.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {avatar.hasValidAvatar ? (
                      <img
                        src={avatar.src}
                        alt={avatar.alt}
                        className="w-12 h-12 rounded-full object-cover shadow-md ring-2 ring-white"
                      />
                    ) : (
                      <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(student.ho_ten || student.sinh_vien?.mssv)} rounded-full flex items-center justify-center text-white font-semibold shadow-md`}>
                        {avatar.fallback}
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-900">{student.ho_ten || 'Chưa có tên'}</h4>
                      <p className="text-sm text-gray-600">MSSV: {student.sinh_vien?.mssv || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{student.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{student.sinh_vien?.sdt || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{student.sinh_vien?.lop?.ten_lop || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleViewStudent(student)}
                      className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleEditStudent(student)}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteStudent(student.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">Không có sinh viên nào</h3>
            <p className="text-gray-400">
              {searchTerm 
                ? 'Không tìm thấy sinh viên phù hợp với bộ lọc' 
                : 'Chưa có sinh viên nào trong lớp này'
              }
            </p>
          </div>
        )}
        
        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredStudents.length)} của {filteredStudents.length} sinh viên
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              
              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
              
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                className="ml-2 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={5}>5 / trang</option>
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* View Student Modal */}
      {viewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h2 className="text-2xl font-bold text-gray-900">Thông tin sinh viên</h2>
              <button onClick={() => setViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-3 px-4 font-medium transition-colors ${
                  activeTab === 'basic'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cơ bản
                </div>
              </button>
              <button
                onClick={() => setActiveTab('academic')}
                className={`py-3 px-4 font-medium transition-colors ${
                  activeTab === 'academic'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Học tập
                </div>
              </button>
              <button
                onClick={() => setActiveTab('personal')}
                className={`py-3 px-4 font-medium transition-colors ${
                  activeTab === 'personal'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Cá nhân
                </div>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    {(() => {
                      const avatar = getStudentAvatar(selectedStudent);
                      return avatar.hasValidAvatar ? (
                        <img
                          src={avatar.src}
                          alt={avatar.alt}
                          className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-indigo-100"
                        />
                      ) : (
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(selectedStudent.ho_ten || selectedStudent.sinh_vien?.mssv)} flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-indigo-100`}>
                          {avatar.fallback}
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedStudent.ho_ten || 'N/A'}</h3>
                      <p className="text-indigo-600 font-medium">MSSV: {selectedStudent.sinh_vien?.mssv || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Họ và tên</label>
                      <p className="text-base font-semibold text-gray-900">{selectedStudent.ho_ten || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">MSSV</label>
                      <p className="text-base font-semibold text-gray-900">{selectedStudent.sinh_vien?.mssv || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <p className="text-base text-gray-900">{selectedStudent.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Lớp</label>
                      <p className="text-base text-gray-900">{selectedStudent.sinh_vien?.lop?.ten_lop || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'academic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Lớp</label>
                      <p className="text-base text-gray-900">{selectedStudent.sinh_vien?.lop?.ten_lop || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Khoa</label>
                      <p className="text-base text-gray-900">{selectedStudent.sinh_vien?.lop?.khoa || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Niên khóa</label>
                      <p className="text-base text-gray-900">{selectedStudent.sinh_vien?.lop?.nien_khoa || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Năm nhập học</label>
                      <p className="text-base text-gray-900">{formatDate(selectedStudent.sinh_vien?.lop?.nam_nhap_hoc)}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'personal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Ngày sinh</label>
                      <p className="text-base text-gray-900">{formatDate(selectedStudent.sinh_vien?.ngay_sinh)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Giới tính</label>
                      <p className="text-base text-gray-900">{formatGender(selectedStudent.sinh_vien?.gt)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Số điện thoại</label>
                      <p className="text-base text-gray-900">{selectedStudent.sinh_vien?.sdt || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Địa chỉ</label>
                      <p className="text-base text-gray-900">{selectedStudent.sinh_vien?.dia_chi || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h2 className="text-2xl font-bold text-gray-900">Chỉnh sửa sinh viên</h2>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      value={formData.ho_ten}
                      onChange={(e) => setFormData({...formData, ho_ten: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MSSV *</label>
                    <input
                      type="text"
                      value={formData.mssv}
                      onChange={(e) => setFormData({...formData, mssv: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                    <input
                      type="date"
                      value={formData.ngay_sinh}
                      onChange={(e) => setFormData({...formData, ngay_sinh: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                    <select
                      value={formData.gt}
                      onChange={(e) => setFormData({...formData, gt: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="nam">Nam</option>
                      <option value="nu">Nữ</option>
                      <option value="khac">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
                    <select
                      value={formData.lop_id}
                      onChange={(e) => setFormData({...formData, lop_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.ten_lop}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={formData.sdt}
                      onChange={(e) => setFormData({...formData, sdt: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    <textarea
                      value={formData.dia_chi}
                      onChange={(e) => setFormData({...formData, dia_chi: e.target.value})}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h2 className="text-2xl font-bold text-gray-900">Thêm sinh viên mới</h2>
              <button onClick={() => setAddModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      value={formData.ho_ten}
                      onChange={(e) => setFormData({...formData, ho_ten: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MSSV *</label>
                    <input
                      type="text"
                      value={formData.mssv}
                      onChange={(e) => setFormData({...formData, mssv: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập *</label>
                    <input
                      type="text"
                      value={formData.ten_dn}
                      onChange={(e) => setFormData({...formData, ten_dn: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu *</label>
                    <input
                      type="password"
                      value={formData.mat_khau}
                      onChange={(e) => setFormData({...formData, mat_khau: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                    <input
                      type="date"
                      value={formData.ngay_sinh}
                      onChange={(e) => setFormData({...formData, ngay_sinh: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                    <select
                      value={formData.gt}
                      onChange={(e) => setFormData({...formData, gt: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="nam">Nam</option>
                      <option value="nu">Nữ</option>
                      <option value="khac">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lớp *</label>
                    <select
                      value={formData.lop_id}
                      onChange={(e) => setFormData({...formData, lop_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Chọn lớp</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.ten_lop}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={formData.sdt}
                      onChange={(e) => setFormData({...formData, sdt: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    <textarea
                      value={formData.dia_chi}
                      onChange={(e) => setFormData({...formData, dia_chi: e.target.value})}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setAddModalOpen(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAdd}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm sinh viên
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
