import React, { useState, useEffect } from 'react';
import { User, Edit3, Save, X, Eye, EyeOff, Key, Shield, Calendar, Mail, Phone, MapPin, Clock, CheckCircle, GraduationCap, Hash, Award, Crown } from 'lucide-react';
import http from '../../services/http';
import { useAppStore } from '../../store/useAppStore';
import { useNotification } from '../../contexts/NotificationContext';
import { formatDateVN } from '../../utils/dateFormat';
import AvatarUpload from '../../components/AvatarUpload';

export default function MonitorMyProfile() {
  const { showSuccess, showError } = useNotification();
  const { user } = useAppStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [stats, setStats] = useState({ totalActivities: 0, totalPoints: 0, completedActivities: 0 });
  
  const [formData, setFormData] = useState({
    ho_ten: '',
    email: '',
    anh_dai_dien: '',
    mssv: '',
    ngay_sinh: '',
    gt: '',
    dia_chi: '',
    sdt: '',
    lop: '',
    khoa: '',
    nienkhoa: ''
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

  useEffect(() => { 
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      let response;
      try {
        response = await http.get(`/users/profile?_t=${timestamp}`);
      } catch (e) {
        response = await http.get(`/auth/profile?_t=${timestamp}`);
      }
      
      const raw = response?.data?.data || response?.data || {};
      const nguoiDung = raw.nguoi_dung || raw.user || raw || {};
      const sinhVien = raw.sinh_vien || raw.student || {};
      const lopObj = sinhVien.lop || sinhVien.class || raw.lop || {};

      const normalized = {
        id: nguoiDung.id || raw.id,
        ten_dn: nguoiDung.ten_dn || nguoiDung.username || raw.ten_dn,
        email: nguoiDung.email || raw.email,
        ho_ten: nguoiDung.ho_ten || nguoiDung.name || raw.ho_ten || raw.name,
        vai_tro: nguoiDung.vai_tro || raw.vai_tro,
        roleLabel: raw.roleLabel || 'Lớp trưởng',
        trang_thai: nguoiDung.trang_thai || nguoiDung.trangthai || raw.trang_thai,
        ngay_tao: nguoiDung.ngay_tao || nguoiDung.createdAt || raw.ngay_tao,
        ngay_cap_nhat: nguoiDung.ngay_cap_nhat || nguoiDung.updatedAt || raw.ngay_cap_nhat,
        lan_cuoi_dn: nguoiDung.lan_cuoi_dn || raw.lan_cuoi_dn,
        anh_dai_dien: nguoiDung.anh_dai_dien || raw.anh_dai_dien,
        mssv: sinhVien.mssv || raw.mssv || nguoiDung.mssv,
        ngay_sinh: sinhVien.ngay_sinh || raw.ngay_sinh || raw.ngaysinh,
        gt: sinhVien.gt || raw.gt,
        sdt: sinhVien.sdt || raw.sdt,
        dia_chi: sinhVien.dia_chi || raw.dia_chi,
        lop: lopObj.ten_lop || raw.lop,
        khoa: lopObj.khoa || raw.khoa,
        nienkhoa: lopObj.nien_khoa || raw.nien_khoa || raw.nienkhoa,
      };

      console.log('✅ Monitor profile (normalized):', normalized);
      setProfile(normalized);
      setFormData({
        ho_ten: normalized.ho_ten || '',
        email: normalized.email || '',
        anh_dai_dien: normalized.anh_dai_dien || '',
        mssv: normalized.mssv || '',
        ngay_sinh: normalized.ngay_sinh ? new Date(normalized.ngay_sinh).toISOString().split('T')[0] : '',
        gt: normalized.gt || '',
        dia_chi: normalized.dia_chi || '',
        sdt: normalized.sdt || '',
        lop: normalized.lop || '',
        khoa: normalized.khoa || '',
        nienkhoa: normalized.nienkhoa || ''
      });
    } catch (error) {
      console.error('❌ Profile load error:', error);
      showError('Không thể tải thông tin profile');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await http.get('/dashboard/activities/me');
      const registrations = response.data?.data || [];
      
      const totalActivities = registrations.length;
      const completedActivities = registrations.filter(r => r.trang_thai_dk === 'da_tham_gia').length;
      const totalPoints = registrations
        .filter(r => r.trang_thai_dk === 'da_tham_gia')
        .reduce((sum, r) => sum + (parseFloat(r.hoat_dong?.diem_rl) || 0), 0);
      
      setStats({ totalActivities, completedActivities, totalPoints });
    } catch (error) {
      console.error('Stats load error:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        ho_ten: formData.ho_ten,
        email: formData.email,
        anh_dai_dien: formData.anh_dai_dien || undefined
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
      
      showSuccess('Cập nhật thông tin thành công');
    } catch (error) {
      showError('Lỗi cập nhật: ' + (error.response?.data?.message || error.message));
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
      showSuccess('Đổi mật khẩu thành công');
    } catch (error) {
      showError('Lỗi đổi mật khẩu: ' + (error.response?.data?.message || error.message));
    }
  };

  const getGenderDisplay = (gt) => {
    if (!gt) return 'Chưa cập nhật';
    const genderMap = {
      'nam': '👨 Nam',
      'nu': '👩 Nữ',
      'khac': '🧑 Khác'
    };
    return genderMap[gt?.toLowerCase()] || gt;
  };

  const getStatusText = (status) => {
    const statusMap = {
      'hoat_dong': '✅ Hoạt động',
      'khoa': '🔒 Đã khóa',
      'cho_duyet': '⏳ Chờ duyệt'
    };
    return statusMap[status] || status;
  };

  const renderField = (label, value, formatter, icon) => {
    const val = typeof formatter === 'function' ? formatter(value) : value;
    if (val === undefined || val === null || val === '') return null;
    return (
      <div className="flex items-start gap-3">
        {icon && <div className="text-gray-400 mt-1">{icon}</div>}
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-500">{label}</label>
          <p className="mt-1 text-sm text-gray-900">{val}</p>
        </div>
      </div>
    );
  };

  const isValidImageUrl = (url) => {
    if (!url) return false;
    if (url.startsWith('data:image/') || 
        url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
        url.includes('i.pinimg.com') ||
        url.includes('images.unsplash.com') ||
        url.includes('cdn') ||
        url.includes('imgur.com') ||
        url.includes('googleusercontent.com')) {
      return true;
    }
    return false;
  };

  const getDirectImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('data:image/')) return url;
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const avatarUrl = getDirectImageUrl(profile?.anh_dai_dien);
  const hasValidAvatar = isValidImageUrl(avatarUrl);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Role Badge */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {hasValidAvatar ? (
              <img
                src={avatarUrl}
                alt={profile?.ho_ten || 'Avatar'}
                className="w-24 h-24 rounded-full border-4 border-white/50 object-cover shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/50 flex items-center justify-center shadow-xl">
                <User className="h-12 w-12 text-white" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{profile?.ho_ten || 'Không có tên'}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-blue-100">
              <span className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                {profile?.mssv || 'N/A'}
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {profile?.lop || 'N/A'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400/20 border border-yellow-400/50 rounded-full font-semibold text-yellow-100">
                <Crown className="h-4 w-4" />
                Lớp trưởng
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center min-w-[100px]">
              <div className="text-2xl font-bold">{stats.totalPoints.toFixed(1)}</div>
              <div className="text-xs text-blue-100 mt-1">Điểm RL</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center min-w-[100px]">
              <div className="text-2xl font-bold">{stats.completedActivities}</div>
              <div className="text-xs text-blue-100 mt-1">Hoàn thành</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border rounded-lg">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === 'info'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="h-5 w-5" />
              Thông tin cá nhân
            </div>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === 'security'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5" />
              Bảo mật
            </div>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {editing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
                    <input
                      type="text"
                      value={formData.ho_ten}
                      onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Ảnh đại diện</label>
                    <AvatarUpload
                      value={formData.anh_dai_dien}
                      onChange={(url) => setFormData({ ...formData, anh_dai_dien: url })}
                      size={200}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
                    >
                      <Save className="h-4 w-4" />
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          ho_ten: profile?.ho_ten || '',
                          email: profile?.email || '',
                          anh_dai_dien: profile?.anh_dai_dien || ''
                        });
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all"
                    >
                      <X className="h-4 w-4" />
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Student Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Thông tin sinh viên
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderField('Họ và tên', profile?.ho_ten, null, <User className="h-4 w-4" />)}
                      {renderField('MSSV', profile?.mssv, null, <Hash className="h-4 w-4" />)}
                      {renderField('Lớp', profile?.lop, null, <GraduationCap className="h-4 w-4" />)}
                      {renderField('Khoa', profile?.khoa, null, <GraduationCap className="h-4 w-4" />)}
                      {renderField('Niên khóa', profile?.nienkhoa, null, <Calendar className="h-4 w-4" />)}
                      {renderField('Ngày sinh', profile?.ngay_sinh, formatDateVN, <Calendar className="h-4 w-4" />)}
                      {renderField('Giới tính', profile?.gt, getGenderDisplay, <User className="h-4 w-4" />)}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Mail className="h-5 w-5 text-green-600" />
                      Thông tin liên hệ
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderField('Email', profile?.email, null, <Mail className="h-4 w-4" />)}
                      {renderField('Số điện thoại', profile?.sdt, null, <Phone className="h-4 w-4" />)}
                      {renderField('Địa chỉ', profile?.dia_chi, null, <MapPin className="h-4 w-4" />)}
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                      Thông tin tài khoản
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderField('Tên đăng nhập', profile?.ten_dn, null, <User className="h-4 w-4" />)}
                      {renderField('Vai trò', profile?.roleLabel || 'Lớp trưởng', null, <Crown className="h-4 w-4" />)}
                      {renderField('Trạng thái', profile?.trang_thai, getStatusText, <CheckCircle className="h-4 w-4" />)}
                      {renderField('Ngày tạo', profile?.ngay_tao, formatDateVN, <Clock className="h-4 w-4" />)}
                      {renderField('Lần đăng nhập cuối', profile?.lan_cuoi_dn, formatDateVN, <Clock className="h-4 w-4" />)}
                    </div>
                  </div>

                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
                  >
                    <Edit3 className="h-4 w-4" />
                    Chỉnh sửa thông tin
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {changingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu hiện tại *</label>
                    <div className="relative">
                      <input
                        type={showPasswords.old ? 'text' : 'password'}
                        value={passwordData.old_password}
                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới *</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu mới *</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
                    >
                      <Save className="h-4 w-4" />
                      Đổi mật khẩu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChangingPassword(false);
                        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
                        setShowPasswords({ old: false, new: false, confirm: false });
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all"
                    >
                      <X className="h-4 w-4" />
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 rounded-lg p-3">
                        <Key className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">Mật khẩu</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Đổi mật khẩu thường xuyên để bảo vệ tài khoản của bạn
                        </p>
                        <button
                          onClick={() => setChangingPassword(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
                        >
                          <Key className="h-4 w-4" />
                          Đổi mật khẩu
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
