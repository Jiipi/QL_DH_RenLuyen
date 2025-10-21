import React from 'react';
import { Plus, Edit2, Trash2, Search, Tag, FileText, Award, Image as ImageIcon, X, Check, Upload, Filter, Grid3x3, List, TrendingUp } from 'lucide-react';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';

// Danh sách ảnh mặc định
const DEFAULT_IMAGES = [
  { id: 'academic', path: '/images/activity-academic.svg', label: 'Học thuật', color: 'from-blue-500 to-indigo-600' },
  { id: 'sports', path: '/images/activity-sports.svg', label: 'Thể thao', color: 'from-green-500 to-emerald-600' },
  { id: 'cultural', path: '/images/activity-cultural.svg', label: 'Văn hóa', color: 'from-purple-500 to-pink-600' },
  { id: 'volunteer', path: '/images/activity-volunteer.svg', label: 'Tình nguyện', color: 'from-orange-500 to-red-600' },
  { id: 'default', path: '/images/default-activity.svg', label: 'Mặc định', color: 'from-gray-500 to-slate-600' }
];

export default function ActivityTypeManagement() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = React.useState('newest'); // 'newest', 'oldest', 'name'
  const [form, setForm] = React.useState({ 
    id: null, 
    ten_loai_hd: '', 
    mo_ta: '',
    diem_mac_dinh: 0,
    diem_toi_da: 10,
    hinh_anh: '/images/default-activity.svg'
  });
  const [imageMode, setImageMode] = React.useState('default'); // 'default' or 'upload'
  const [uploadedImage, setUploadedImage] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const { showSuccess, showError, confirm } = useNotification();

  async function load() {
    setLoading(true);
    try {
      const res = await http.get('/teacher/activity-types').catch(()=>({ data:{ data: { items: [] } } }));
      const data = res.data?.data?.items || res.data?.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading activity types:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(function(){ load(); }, []);

  function resetForm(){ 
    setForm({ 
      id: null, 
      ten_loai_hd: '', 
      mo_ta: '',
      diem_mac_dinh: 0,
      diem_toi_da: 10,
      hinh_anh: '/images/default-activity.svg',
      shortId: null,
      uploadFile: null
    }); 
    setImageMode('default');
    setUploadedImage(null);
    setShowModal(false);
  }

  function handleImageSelect(imagePath) {
    setForm({...form, hinh_anh: imagePath, shortId: null, uploadFile: null});
    setImageMode('default');
    setUploadedImage(null);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Vui lòng chọn file ảnh (JPG, PNG, GIF, SVG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    // Store file object and create preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setUploadedImage(dataUrl);
      // Store the file object to upload later when submitting
      setForm({...form, hinh_anh: dataUrl, uploadFile: file});
      setImageMode('upload');
    };
    reader.readAsDataURL(file);
  }

  async function submit(e){
    e.preventDefault();
    
    if (!form.ten_loai_hd.trim()) {
      showError('Vui lòng nhập tên loại hoạt động');
      return;
    }

    setLoading(true);
    try {
      let shortId = form.shortId;
      let imagePath = form.hinh_anh;
      
      // If user selected a file to upload, upload it first
      if (form.uploadFile) {
        const formData = new FormData();
        formData.append('image', form.uploadFile);
        
        const uploadResponse = await http.post('/teacher/activity-types/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const uploadData = uploadResponse.data?.data || uploadResponse.data;
        shortId = uploadData.shortId;
        imagePath = uploadData.path;
      }
      
      // Prepare data to send
      const dataToSend = {
        ten_loai_hd: form.ten_loai_hd,
        mo_ta: form.mo_ta,
        diem_mac_dinh: form.diem_mac_dinh,
        diem_toi_da: form.diem_toi_da,
        hinh_anh: imagePath,
        shortId: shortId
      };
      
      if (form.id) {
        await http.put(`/teacher/activity-types/${form.id}`, dataToSend);
        showSuccess('Cập nhật loại hoạt động thành công!');
      } else {
        await http.post('/teacher/activity-types', dataToSend);
        showSuccess('Tạo loại hoạt động thành công!');
      }
      
      // Reset form and close modal first
      resetForm();
      
      // Then reload data to show updated image
      await load();
      
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Không thể thực hiện thao tác');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id){
    const confirmed = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc muốn xóa loại hoạt động này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      await http.delete(`/teacher/activity-types/${id}`);
      showSuccess('Xóa loại hoạt động thành công!');
      load();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Không thể xóa loại hoạt động');
    } finally {
      setLoading(false);
    }
  }

  function edit(item){ 
    const value = item.hinh_anh || item.mau_sac;
    const imagePath = isImagePath(value) ? value : '/images/default-activity.svg';
    
    setForm({ 
      id: item.id, 
      ten_loai_hd: item.ten_loai_hd || '', 
      mo_ta: item.mo_ta || '',
      diem_mac_dinh: item.diem_mac_dinh || 0,
      diem_toi_da: item.diem_toi_da || 10,
      hinh_anh: imagePath
    });
    
    // Check if it's a default image or uploaded
    const isDefaultImage = DEFAULT_IMAGES.some(img => img.path === imagePath);
    if (isDefaultImage || imagePath.startsWith('/images/')) {
      setImageMode('default');
      setUploadedImage(null);
    } else {
      setImageMode('upload');
      setUploadedImage(imagePath);
    }
    
    setShowModal(true);
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  const filtered = items.filter(function(it){
    if (!search) return true;
    return (it.ten_loai_hd || '').toLowerCase().includes(search.toLowerCase());
  });

  // Sort items
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.ngay_tao) - new Date(a.ngay_tao);
    if (sortBy === 'oldest') return new Date(a.ngay_tao) - new Date(b.ngay_tao);
    if (sortBy === 'name') return (a.ten_loai_hd || '').localeCompare(b.ten_loai_hd || '');
    return 0;
  });

  // Helper function to check if string is an image path
  function isImagePath(str) {
    if (!str) return false;
    return str.startsWith('/') || str.startsWith('http') || str.startsWith('data:');
  }

  // Helper function to get image or fallback
  function getImageUrl(item) {
    const value = item.hinh_anh || item.mau_sac;
    if (isImagePath(value)) {
      return value;
    }
    return '/images/default-activity.svg';
  }

  // Get gradient color for item
  function getGradientColor(item) {
    const imagePath = getImageUrl(item);
    const defaultImg = DEFAULT_IMAGES.find(img => img.path === imagePath);
    return defaultImg?.color || 'from-indigo-500 to-purple-600';
  }

  const stats = {
    total: items.length,
    maxPoints: items.reduce((max, item) => Math.max(max, item.diem_toi_da || 0), 0),
    avgPoints: items.length > 0 ? (items.reduce((sum, item) => sum + (parseFloat(item.diem_mac_dinh) || 0), 0) / items.length).toFixed(1) : 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="space-y-6">
        {/* Modern Header với gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Tag className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-white drop-shadow-lg mb-1">
                    Quản lý Loại Hoạt Động
                  </h1>
                  <p className="text-blue-100 text-lg">
                    Tạo và quản lý danh mục hoạt động rèn luyện
                  </p>
                </div>
              </div>
              <button
                onClick={openCreateModal}
                disabled={loading}
                className="group flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl hover:bg-blue-50 transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 hover:scale-105 font-bold text-lg disabled:opacity-50"
              >
                <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                Thêm mới
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards với animation */}
        <div className="grid grid-cols-1 gap-6">
          <div className="group bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-indigo-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="text-4xl font-black text-gray-900 mb-1">{stats.total}</div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tổng loại hoạt động</div>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                placeholder="Tìm kiếm theo tên loại hoạt động..." 
                value={search} 
                onChange={e=>setSearch(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white font-medium"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-10 pr-8 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 hover:bg-white font-medium cursor-pointer appearance-none"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="name">Tên A-Z</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Xem dạng lưới"
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Xem dạng danh sách"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Hiển thị <span className="font-bold text-indigo-600">{sorted.length}</span> trong tổng số <span className="font-bold text-indigo-600">{stats.total}</span> loại hoạt động
            </p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent absolute top-0 left-0"></div>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(function(item){ return (
              <div key={item.id} className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
                {/* Activity Image - Like TeacherRegistrationApprovalsModern */}
                <div className="relative w-full h-48 overflow-hidden">
                  <img 
                    src={getImageUrl(item)} 
                    alt={item.ten_loai_hd}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => { e.target.src = '/images/default-activity.svg'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                </div>

                <div className="p-6">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {item.ten_loai_hd}
                  </h3>

                  {/* Description */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
                      {item.mo_ta || 'Phẩm chất công dân'}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs text-gray-600 font-medium">Mặc định</span>
                      </div>
                      <p className="text-2xl font-black text-indigo-600">
                        {item.diem_mac_dinh || 0}
                      </p>
                    </div>

                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs text-gray-600 font-medium">Tối đa</span>
                      </div>
                      <p className="text-2xl font-black text-emerald-600">
                        {item.diem_toi_da || 10}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => edit(item)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md hover:shadow-lg font-semibold"
                    >
                      <Edit2 className="h-4 w-4" />
                      Sửa
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all shadow-md hover:shadow-lg font-semibold"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ); })}
          </div>
        ) : (
          /* List View - Horizontal Layout */
          <div className="space-y-4">
            {sorted.map(function(item){ return (
              <div key={item.id} className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-300 hover:shadow-xl overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Image Section - Left side */}
                  <div className="relative w-full md:w-64 h-48 md:h-auto overflow-hidden flex-shrink-0">
                    <img 
                      src={getImageUrl(item)} 
                      alt={item.ten_loai_hd}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { e.target.src = '/images/default-activity.svg'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  </div>

                  {/* Content Section - Right side */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      {/* Title */}
                      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {item.ten_loai_hd}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {item.mo_ta || 'Phẩm chất công dân'}
                      </p>

                      {/* Stats - Inline */}
                      <div className="flex gap-4 mb-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                          <Award className="h-4 w-4 text-indigo-600" />
                          <span className="text-sm text-gray-600 font-medium">Mặc định:</span>
                          <span className="text-lg font-bold text-indigo-600">{item.diem_mac_dinh || 0}</span>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                          <Award className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-gray-600 font-medium">Tối đa:</span>
                          <span className="text-lg font-bold text-emerald-600">{item.diem_toi_da || 10}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => edit(item)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md hover:shadow-lg font-semibold"
                      >
                        <Edit2 className="h-4 w-4" />
                        Sửa
                      </button>
                      <button
                        onClick={() => remove(item.id)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all shadow-md hover:shadow-lg font-semibold"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ); })}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="bg-white rounded-3xl border-2 border-dashed border-gray-300 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Tag className="h-16 w-16 text-indigo-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Plus className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {search ? 'Không tìm thấy kết quả' : 'Chưa có loại hoạt động nào'}
              </h3>
              <p className="text-gray-600 text-lg mb-8">
                {search 
                  ? `Không tìm thấy loại hoạt động nào khớp với "${search}"`
                  : 'Hãy tạo loại hoạt động đầu tiên để bắt đầu phân loại các hoạt động rèn luyện'}
              </p>
              {!search && (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-xl hover:shadow-2xl hover:scale-105 font-bold text-lg"
                >
                  <Plus className="h-6 w-6" />
                  Tạo loại hoạt động mới
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">
                    {form.id ? 'Chỉnh sửa loại hoạt động' : 'Tạo loại hoạt động mới'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <form onSubmit={submit} className="p-6 space-y-6">
                {/* Tên loại hoạt động */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Tag className="h-4 w-4 text-indigo-600" />
                    Tên loại hoạt động
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ten_loai_hd}
                    onChange={e => setForm({...form, ten_loai_hd: e.target.value})}
                    placeholder="Ví dụ: Đoàn - Hội, Thể thao, Văn nghệ..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>

                {/* Mô tả */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Mô tả
                  </label>
                  <textarea
                    value={form.mo_ta}
                    onChange={e => setForm({...form, mo_ta: e.target.value})}
                    placeholder="Mô tả chi tiết về loại hoạt động này..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                {/* Điểm */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Award className="h-4 w-4 text-indigo-600" />
                      Điểm mặc định
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.diem_mac_dinh}
                      onChange={e => setForm({...form, diem_mac_dinh: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Award className="h-4 w-4 text-emerald-600" />
                      Điểm tối đa
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.diem_toi_da}
                      onChange={e => setForm({...form, diem_toi_da: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Hình ảnh */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <ImageIcon className="h-4 w-4 text-indigo-600" />
                    Hình ảnh đại diện
                    <span className="text-rose-500">*</span>
                  </label>
                  
                  {/* Tab selector */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setImageMode('default')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        imageMode === 'default'
                          ? 'bg-indigo-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Ảnh mặc định
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        imageMode === 'upload'
                          ? 'bg-indigo-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Tải lên
                    </button>
                  </div>
                  
                  {/* Default images grid */}
                  {imageMode === 'default' && (
                    <div className="grid grid-cols-3 gap-3">
                      {DEFAULT_IMAGES.map(img => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => handleImageSelect(img.path)}
                          className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
                            form.hinh_anh === img.path
                              ? 'border-indigo-500 bg-indigo-50 shadow-lg ring-2 ring-indigo-500'
                              : 'border-gray-200 bg-white hover:border-indigo-300'
                          }`}
                        >
                          <img 
                            src={img.path} 
                            alt={img.label}
                            className="w-full h-20 object-contain mb-2"
                            onError={(e) => { e.target.src = '/images/default-activity.svg'; }}
                          />
                          <p className="text-xs font-medium text-gray-600 text-center">
                            {img.label}
                          </p>
                          {form.hinh_anh === img.path && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Upload image */}
                  {imageMode === 'upload' && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              {loading ? 'Đang tải lên...' : 'Nhấn để chọn ảnh'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              JPG, PNG, GIF, WebP (tối đa 5MB)
                            </p>
                          </div>
                        </div>
                      </button>
                      
                      {uploadedImage && (
                        <div className="mt-4 relative">
                          <img 
                            src={uploadedImage} 
                            alt="Preview"
                            className="w-full h-48 object-contain rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedImage(null);
                              setForm({...form, hinh_anh: '/images/default-activity.svg', shortId: null, uploadFile: null});
                              setImageMode('default');
                            }}
                            className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Xem trước:</p>
                  <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-200">
                    <div className="h-40 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
                      <img 
                        src={form.hinh_anh || '/images/default-activity.svg'} 
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => { e.target.src = '/images/default-activity.svg'; }}
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-gray-900 mb-1">
                        {form.ten_loai_hd || 'Tên loại hoạt động'}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {form.mo_ta || 'Mô tả loại hoạt động'}
                      </p>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold">
                          {form.diem_mac_dinh} điểm mặc định
                        </span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">
                          {form.diem_toi_da} điểm tối đa
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50"
                  >
                    <Check className="h-5 w-5" />
                    {form.id ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
