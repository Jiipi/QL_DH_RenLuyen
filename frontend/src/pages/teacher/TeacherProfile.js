import React, { useState, useEffect } from 'react';
import { User, Edit3, Save, X, Eye, EyeOff, Key, Shield, Calendar, Mail, Phone, MapPin, Clock, CheckCircle, BookOpen } from 'lucide-react';
import http from '../../services/http';
import { useAppStore } from '../../store/useAppStore';
import { useNotification } from '../../contexts/NotificationContext';
import { formatDateVN } from '../../utils/dateFormat';
import AvatarUpload from '../../components/AvatarUpload';

export default function TeacherProfile() {
  const { showSuccess, showError } = useNotification();
  const { user } = useAppStore();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState({
    ho_ten: '',
    email: '',
    anh_dai_dien: '',
    ngay_sinh: '',
    gt: '',
    dia_chi: '',
    sdt: ''
  });
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      let response;
      try {
        response = await http.get('/users/profile');
      } catch (e) {
        response = await http.get('/auth/profile');
      }
      
      // Load classes for teacher
      let classesResponse;
      try {
        classesResponse = await http.get('/teacher/classes');
        const classesData = classesResponse?.data?.data?.classes || [];
        setClasses(Array.isArray(classesData) ? classesData : []);
      } catch (e) {
        console.log('Could not load classes:', e);
        setClasses([]);
      }
      
      const profileData = response?.data?.data || response?.data || {};
      setProfile(profileData);
      setFormData({
        ho_ten: profileData.ho_ten || '',
        email: profileData.email || '',
        anh_dai_dien: profileData.anh_dai_dien || '',
        ngay_sinh: profileData.ngay_sinh ? new Date(profileData.ngay_sinh).toISOString().split('T')[0] : '',
        gt: profileData.gt || '',
        dia_chi: profileData.dia_chi || '',
        sdt: profileData.sdt || ''
      });
    } catch (error) {
      showError('Không thể tải thông tin profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      // Giảng viên chỉ có thể cập nhật 3 trường trong bảng nguoi_dung
      const updateData = {
        ho_ten: formData.ho_ten,
        email: formData.email,
        anh_dai_dien: formData.anh_dai_dien
      };
      
      await http.put('/users/profile', updateData);
      setEditing(false);
      loadProfile();
      
      // Dispatch event to update header avatar
      const updatedProfile = { ...profile, ...updateData };
      setProfile(updatedProfile);
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { profile: updatedProfile } 
      }));
      
      showSuccess('Cập nhật thông tin thành công', 'Thành công', 8000);
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      if (errorMessage.includes('quá dài')) {
        showError('URL ảnh đại diện quá dài. Vui lòng sử dụng URL ngắn hơn hoặc ảnh có kích thước nhỏ hơn.');
      } else {
        showError('Lỗi cập nhật: ' + errorMessage);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      showError('Mật khẩu mới và xác nhận không khớp');
      return;
    }
    try {
      await http.put('/users/change-password', passwordData);
      setChangingPassword(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      showSuccess('Đổi mật khẩu thành công', 'Thành công', 8000);
    } catch (error) {
      showError('Lỗi đổi mật khẩu: ' + (error.response?.data?.message || error.message));
    }
  };

  const getGenderText = (gender) => {
    const genderMap = {
      'nam': 'Nam',
      'nu': 'Nữ', 
      'khac': 'Khác'
    };
    return genderMap[gender] || '';
  };

  const getStatusText = (status) => {
    const statusMap = {
      'hoat_dong': 'Hoạt động',
      'khong_hoat_dong': 'Không hoạt động',
      'khoa': 'Khóa'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'hoat_dong': 'text-green-600 bg-green-100',
      'khong_hoat_dong': 'text-yellow-600 bg-yellow-100',
      'khoa': 'text-red-600 bg-red-100'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-100';
  };

  const renderField = (label, value, formatter, icon) => {
    const val = typeof formatter === 'function' ? formatter(value) : value;
    if (val === undefined || val === null || val === '') return null;
    return (
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        {icon && <div className="text-gray-500 mt-0.5">{icon}</div>}
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-500 block mb-1">{label}</label>
          <p className="text-sm text-gray-900">{val}</p>
        </div>
      </div>
    );
  };

  const renderBasicInfo = () => {
    // Debug: log avatar URL
    console.log('Avatar URL:', profile.anh_dai_dien);
    
    // Check if URL is valid for image display
    const isValidImageUrl = (url) => {
      if (!url) return false;
      
      // Check if it's a direct image URL or data URL
      if (url.startsWith('data:image/') || 
          url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
          url.includes('i.pinimg.com') ||
          url.includes('images.unsplash.com') ||
          url.includes('cdn') ||
          url.includes('imgur.com') ||
          url.includes('googleusercontent.com') ||
          url.includes('drive.google.com') ||
          url.includes('photos.google.com')) {
        return true;
      }
      
      // Check if it's a Google redirect URL that might contain an image
      if (url.includes('google.com/url') && url.includes('url=')) {
        return true; // We'll handle this in getDirectImageUrl
      }
      
      // Check if it's Google Images URL
      if (url.includes('google.com/imgres')) {
        return true;
      }
      
      return false;
    };
    
    // Function to convert Google Images URL to direct image URL with HD quality
    const getDirectImageUrl = (url) => {
      if (!url) return url;
      
      console.log('Original URL:', url);
      
      // Handle Google redirect URL
      if (url.includes('google.com/url') && url.includes('url=')) {
        const match = url.match(/url=([^&]+)/);
        if (match) {
          let decodedUrl = decodeURIComponent(match[1]);
          console.log('Extracted URL from Google redirect:', decodedUrl);
          
          // Check if the extracted URL is a Facebook page (not an image)
          if (decodedUrl.includes('facebook.com')) {
            console.log('Facebook page detected, cannot display as image');
            return null;
          }
          
          // Upgrade to HD quality if possible
          decodedUrl = upgradeToHDQuality(decodedUrl);
          return decodedUrl;
        }
      }
      
      // Handle Google Images URL
      if (url.includes('google.com/imgres')) {
        const match = url.match(/imgurl=([^&]+)/);
        if (match) {
          let decodedUrl = decodeURIComponent(match[1]);
          console.log('Extracted image URL from Google Images:', decodedUrl);
          
          // Upgrade to HD quality
          decodedUrl = upgradeToHDQuality(decodedUrl);
          return decodedUrl;
        }
      }
      
      // Handle Google Drive URL
      if (url.includes('drive.google.com')) {
        const fileId = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (fileId) {
          // Use high quality parameter for Drive
          const driveUrl = `https://drive.google.com/uc?export=view&id=${fileId[1]}&sz=2000`;
          console.log('Converted Google Drive URL (HD):', driveUrl);
          return driveUrl;
        }
      }
      
      // Upgrade direct URLs to HD if possible
      const hdUrl = upgradeToHDQuality(url);
      console.log('Using URL:', hdUrl);
      return hdUrl;
    };
    
    // Helper function to upgrade image URLs to HD quality
    const upgradeToHDQuality = (url) => {
      if (!url) return url;
      
      // Pinterest: Remove size restrictions, get original
      if (url.includes('pinimg.com')) {
        // Replace any size parameters with originals
        url = url.replace(/\/\d+x\d+\//, '/originals/')
                 .replace(/\/236x\//, '/originals/')
                 .replace(/\/474x\//, '/originals/')
                 .replace(/\/736x\//, '/originals/');
        console.log('Upgraded Pinterest to HD:', url);
      }
      
      // Imgur: Request original size
      if (url.includes('imgur.com')) {
        // Remove size suffixes (s, m, l, t, b, h)
        url = url.replace(/([a-zA-Z0-9]+)[smlthb]\.([a-z]+)$/, '$1.$2');
        console.log('Upgraded Imgur to original:', url);
      }
      
      // Unsplash: Request high quality
      if (url.includes('unsplash.com') || url.includes('images.unsplash.com')) {
        // Remove or upgrade quality parameters
        if (url.includes('?')) {
          url = url.split('?')[0] + '?q=85&w=2000&fit=max';
        } else {
          url = url + '?q=85&w=2000&fit=max';
        }
        console.log('Upgraded Unsplash to HD:', url);
      }
      
      // Google User Content: Request high quality
      if (url.includes('googleusercontent.com')) {
        // Remove size restrictions
        url = url.replace(/=s\d+-c/, '=s2000')
                 .replace(/=w\d+-h\d+/, '=w2000')
                 .replace(/-rw$/, '');
        console.log('Upgraded Google content to HD:', url);
      }
      
      // Generic CDN: Try to request larger size
      if (url.includes('cdn') && url.includes('resize')) {
        url = url.replace(/resize=\d+x\d+/i, 'resize=2000x2000');
        console.log('Upgraded CDN to HD:', url);
      }
      
      return url;
    };
    
    const hasValidAvatar = profile.anh_dai_dien && isValidImageUrl(profile.anh_dai_dien);
    const directImageUrl = getDirectImageUrl(profile.anh_dai_dien);
    const canDisplayImage = hasValidAvatar && directImageUrl && !directImageUrl.includes('facebook.com');
    
    // Format classes for display
    const classNames = classes.length > 0 
      ? classes.map(c => c.ten_lop).join(', ')
      : '—';
    
    console.log('Avatar debug:', {
      originalUrl: profile.anh_dai_dien,
      hasValidAvatar,
      directImageUrl,
      canDisplayImage
    });
    
    return (
    <div className="space-y-6">
      {/* Avatar và thông tin cơ bản */}
      <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
        <div className="w-24 h-24 rounded-full shadow-lg overflow-hidden relative">
          {canDisplayImage ? (
            <img 
              src={directImageUrl} 
              alt="Ảnh đại diện" 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('Image load error:', e.target.src);
                console.log('Original URL:', profile.anh_dai_dien);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', directImageUrl);
              }}
            />
          ) : null}
          <div 
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white"
            style={{ display: canDisplayImage ? 'none' : 'flex' }}
          >
            {(profile.ho_ten || profile.email || 'G').slice(0,1).toUpperCase()}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{profile.ho_ten || 'Chưa cập nhật'}</h3>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            <span className="text-lg font-medium text-indigo-600">{profile.vai_tro?.ten_vt || 'Giảng viên'}</span>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(profile.trang_thai)}`}>
            <CheckCircle className="h-4 w-4 mr-1" />
            {getStatusText(profile.trang_thai)}
          </div>
        </div>
      </div>

      {/* Thông tin chi tiết */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField('Họ và tên', profile.ho_ten, null, <User className="h-5 w-5" />)}
        {renderField('Email', profile.email, null, <Mail className="h-5 w-5" />)}
        {renderField('Tên đăng nhập', profile.ten_dn, null, <User className="h-5 w-5" />)}
        {renderField('Vai trò', profile.vai_tro?.ten_vt, null, <Shield className="h-5 w-5" />)}
        {renderField('Lớp phụ trách', classNames, null, <BookOpen className="h-5 w-5" />)}
        {renderField('Ngày tạo tài khoản', profile.ngay_tao, formatDateVN, <Calendar className="h-5 w-5" />)}
        {renderField('Cập nhật lần cuối', profile.ngay_cap_nhat, formatDateVN, <Clock className="h-5 w-5" />)}
        {renderField('Lần đăng nhập cuối', profile.lan_cuoi_dn, formatDateVN, <Clock className="h-5 w-5" />)}
        {renderField('Trạng thái tài khoản', getStatusText(profile.trang_thai), null, <CheckCircle className="h-5 w-5" />)}
      </div>

    </div>
    );
  };

  const renderBasicEditForm = () => {
    // Check if URL is valid for image display
    const isValidImageUrl = (url) => {
      if (!url) return false;
      
      // Check if it's a direct image URL or data URL
      if (url.startsWith('data:image/') || 
          url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
          url.includes('i.pinimg.com') ||
          url.includes('images.unsplash.com') ||
          url.includes('cdn') ||
          url.includes('imgur.com') ||
          url.includes('googleusercontent.com') ||
          url.includes('drive.google.com') ||
          url.includes('photos.google.com')) {
        return true;
      }
      
      // Check if it's a Google redirect URL that might contain an image
      if (url.includes('google.com/url') && url.includes('url=')) {
        return true; // We'll handle this in getDirectImageUrl
      }
      
      // Check if it's Google Images URL
      if (url.includes('google.com/imgres')) {
        return true;
      }
      
      return false;
    };
    
    return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
        <input 
          type="text" 
          value={formData.ho_ten} 
          onChange={e => setFormData(p => ({...p, ho_ten: e.target.value}))} 
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <input 
          type="email" 
          value={formData.email} 
          onChange={e => setFormData(p => ({...p, email: e.target.value}))} 
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">Ảnh đại diện</label>
        <AvatarUpload
          value={formData.anh_dai_dien}
          onChange={(url) => setFormData(p => ({...p, anh_dai_dien: url}))}
          size={200}
        />
      </div>
    </div>
    );
  };

  const renderEditForm = () => (
    <form onSubmit={handleUpdateProfile} className="space-y-6">
      {activeTab === 'info' && renderBasicEditForm()}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button 
          type="button" 
          onClick={() => setEditing(false)} 
          className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <X className="h-4 w-4" /> Hủy
        </button>
        <button 
          type="submit" 
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Save className="h-4 w-4" /> Lưu thay đổi
        </button>
      </div>
    </form>
  );

  const renderTabContent = () => (editing ? renderEditForm() : renderBasicInfo());

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="text-center py-8">
          <p className="text-gray-500">Không thể tải thông tin profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <User className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Thông tin cá nhân</h1>
              <p className="text-gray-600 mt-1">Quản lý thông tin tài khoản giảng viên</p>
            </div>
          </div>
          {!editing && !changingPassword && (
            <div className="flex gap-3">
              <button 
                onClick={() => setChangingPassword(true)} 
                className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors shadow-sm"
              >
                <Key className="h-4 w-4" /> Đổi mật khẩu
              </button>
              <button 
                onClick={() => setEditing(true)} 
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Edit3 className="h-4 w-4" /> Chỉnh sửa
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button 
                onClick={() => setActiveTab('info')} 
                className={`flex flex-col items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'info' 
                    ? 'border-indigo-500 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span>Thông tin cơ bản</span>
                </div>
                <span className="text-xs text-gray-400 font-normal">Họ tên, email, ảnh đại diện</span>
              </button>
            </nav>
          </div>
          <div className="p-8">{renderTabContent()}</div>
        </div>

        {/* Change Password Modal */}
        {changingPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Key className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Đổi mật khẩu</h3>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input 
                      type={showPasswords.old ? 'text' : 'password'} 
                      value={passwordData.old_password} 
                      onChange={e => setPasswordData(p => ({...p, old_password: e.target.value}))} 
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPasswords(p => ({...p, old: !p.old}))} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.old ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới</label>
                  <div className="relative">
                    <input 
                      type={showPasswords.new ? 'text' : 'password'} 
                      value={passwordData.new_password} 
                      onChange={e => setPasswordData(p => ({...p, new_password: e.target.value}))} 
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPasswords(p => ({...p, new: !p.new}))} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <input 
                      type={showPasswords.confirm ? 'text' : 'password'} 
                      value={passwordData.confirm_password} 
                      onChange={e => setPasswordData(p => ({...p, confirm_password: e.target.value}))} 
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPasswords(p => ({...p, confirm: !p.confirm}))} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setChangingPassword(false)} 
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Đổi mật khẩu
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
