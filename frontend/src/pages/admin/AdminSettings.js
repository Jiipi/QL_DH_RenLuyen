import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RefreshCw, Database, Shield, 
  Globe, Mail, Bell, Users, Calendar, Activity
} from 'lucide-react';
import http from '../../services/http';

const SimpleAdminSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await http.get('/admin/settings');
  // settings response
      setSettings(response.data?.data || response.data || {});
    } catch (error) {
      console.error('Lỗi khi tải cài đặt:', error);
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await http.post('/admin/settings', settings);
      alert('Cài đặt đã được lưu thành công!');
    } catch (error) {
      console.error('Lỗi khi lưu cài đặt:', error);
      alert('Có lỗi xảy ra khi lưu cài đặt!');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const tabs = [
    { id: 'general', label: 'Tổng Quan', icon: <Globe size={20} /> },
    { id: 'email', label: 'Email', icon: <Mail size={20} /> },
    { id: 'notifications', label: 'Thông Báo', icon: <Bell size={20} /> },
    { id: 'activities', label: 'Hoạt Động', icon: <Activity size={20} /> },
    { id: 'users', label: 'Người Dùng', icon: <Users size={20} /> },
    { id: 'security', label: 'Bảo Mật', icon: <Shield size={20} /> }
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Đang tải cài đặt hệ thống...</p>
      </div>
    );
  }

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  };

  const renderGeneralTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
          Tên Hệ Thống
        </label>
        <input
          type="text"
          value={settings.system_name || ''}
          onChange={(e) => handleSettingChange('system_name', e.target.value)}
          placeholder="Hệ thống quản lý hoạt động rèn luyện"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
          Mô Tả Hệ Thống
        </label>
        <textarea
          value={settings.system_description || ''}
          onChange={(e) => handleSettingChange('system_description', e.target.value)}
          placeholder="Mô tả về hệ thống..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div>
        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
          URL Logo Hệ Thống
        </label>
        <input
          type="url"
          value={settings.logo_url || ''}
          onChange={(e) => handleSettingChange('logo_url', e.target.value)}
          placeholder="https://example.com/logo.png"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Số Điện Thoại Hỗ Trợ
          </label>
          <input
            type="tel"
            value={settings.support_phone || ''}
            onChange={(e) => handleSettingChange('support_phone', e.target.value)}
            placeholder="0123456789"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Email Hỗ Trợ
          </label>
          <input
            type="email"
            value={settings.support_email || ''}
            onChange={(e) => handleSettingChange('support_email', e.target.value)}
            placeholder="support@example.com"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );

  const renderEmailTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            SMTP Host
          </label>
          <input
            type="text"
            value={settings.smtp_host || ''}
            onChange={(e) => handleSettingChange('smtp_host', e.target.value)}
            placeholder="smtp.gmail.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            SMTP Port
          </label>
          <input
            type="number"
            value={settings.smtp_port || ''}
            onChange={(e) => handleSettingChange('smtp_port', e.target.value)}
            placeholder="587"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Email Gửi
          </label>
          <input
            type="email"
            value={settings.from_email || ''}
            onChange={(e) => handleSettingChange('from_email', e.target.value)}
            placeholder="noreply@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Tên Người Gửi
          </label>
          <input
            type="text"
            value={settings.from_name || ''}
            onChange={(e) => handleSettingChange('from_name', e.target.value)}
            placeholder="Hệ thống Rèn luyện"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.email_enabled || false}
            onChange={(e) => handleSettingChange('email_enabled', e.target.checked)}
          />
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Bật gửi email tự động
          </span>
        </label>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Cài Đặt Thông Báo
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notify_new_activity || false}
              onChange={(e) => handleSettingChange('notify_new_activity', e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Thông báo khi có hoạt động mới
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notify_approval || false}
              onChange={(e) => handleSettingChange('notify_approval', e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Thông báo khi có đăng ký cần phê duyệt
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notify_deadline || false}
              onChange={(e) => handleSettingChange('notify_deadline', e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Nhắc nhở deadline đăng ký
            </span>
          </label>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
          Thời gian nhắc nhở trước deadline (giờ)
        </label>
        <input
          type="number"
          value={settings.reminder_hours || 24}
          onChange={(e) => handleSettingChange('reminder_hours', parseInt(e.target.value))}
          min="1"
          max="168"
          style={inputStyle}
        />
      </div>
    </div>
  );

  const renderActivitiesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Điểm tối đa cho hoạt động
          </label>
          <input
            type="number"
            value={settings.max_activity_points || 100}
            onChange={(e) => handleSettingChange('max_activity_points', parseInt(e.target.value))}
            min="1"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Thời gian đăng ký tối thiểu (giờ)
          </label>
          <input
            type="number"
            value={settings.min_registration_hours || 24}
            onChange={(e) => handleSettingChange('min_registration_hours', parseInt(e.target.value))}
            min="1"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.auto_approve || false}
            onChange={(e) => handleSettingChange('auto_approve', e.target.checked)}
          />
          <span style={{ fontSize: '14px', color: '#374151' }}>
            Tự động phê duyệt đăng ký hoạt động
          </span>
        </label>
      </div>

      <div>
        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
          Quy định tham gia hoạt động
        </label>
        <textarea
          value={settings.activity_rules || ''}
          onChange={(e) => handleSettingChange('activity_rules', e.target.value)}
          placeholder="Nhập quy định tham gia hoạt động..."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.allow_registration || true}
            onChange={(e) => handleSettingChange('allow_registration', e.target.checked)}
          />
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Cho phép đăng ký tài khoản mới
          </span>
        </label>
      </div>

      <div>
        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
          Vai trò mặc định khi đăng ký
        </label>
        <select
          value={settings.default_role || 'SINH_VIEN'}
          onChange={(e) => handleSettingChange('default_role', e.target.value)}
          style={inputStyle}
        >
          <option value="SINH_VIEN">Sinh viên</option>
          <option value="LOP_TRUONG">Lớp trưởng</option>
          <option value="GIANG_VIEN">Giảng viên</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Độ dài mật khẩu tối thiểu
          </label>
          <input
            type="number"
            value={settings.min_password_length || 6}
            onChange={(e) => handleSettingChange('min_password_length', parseInt(e.target.value))}
            min="4"
            max="20"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Thời gian hết hạn session (phút)
          </label>
          <input
            type="number"
            value={settings.session_timeout || 60}
            onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
            min="15"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Cài Đặt Bảo Mật
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.enable_2fa || false}
              onChange={(e) => handleSettingChange('enable_2fa', e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Bật xác thực 2 yếu tố (2FA)
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.force_https || false}
              onChange={(e) => handleSettingChange('force_https', e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Bắt buộc sử dụng HTTPS
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.log_user_activity || true}
              onChange={(e) => handleSettingChange('log_user_activity', e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Ghi log hoạt động người dùng
            </span>
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Số lần đăng nhập sai tối đa
          </label>
          <input
            type="number"
            value={settings.max_login_attempts || 5}
            onChange={(e) => handleSettingChange('max_login_attempts', parseInt(e.target.value))}
            min="3"
            max="10"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
            Thời gian khóa tài khoản (phút)
          </label>
          <input
            type="number"
            value={settings.lockout_duration || 15}
            onChange={(e) => handleSettingChange('lockout_duration', parseInt(e.target.value))}
            min="5"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralTab();
      case 'email': return renderEmailTab();
      case 'notifications': return renderNotificationsTab();
      case 'activities': return renderActivitiesTab();
      case 'users': return renderUsersTab();
      case 'security': return renderSecurityTab();
      default: return renderGeneralTab();
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            Cài Đặt Hệ Thống
          </h1>
          <p style={{ color: '#6b7280' }}>
            Cấu hình và tùy chỉnh các thiết lập hệ thống
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchSettings}
            style={{
              ...buttonStyle,
              backgroundColor: '#6b7280',
              color: 'white'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
          >
            <RefreshCw size={20} />
            Tải lại
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{
              ...buttonStyle,
              backgroundColor: '#10b981',
              color: 'white',
              opacity: saving ? 0.7 : 1
            }}
            onMouseEnter={(e) => !saving && (e.target.style.backgroundColor = '#059669')}
            onMouseLeave={(e) => !saving && (e.target.style.backgroundColor = '#10b981')}
          >
            {saving ? <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={20} />}
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Sidebar Tabs */}
        <div style={{ 
          width: '250px',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          height: 'fit-content'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            Danh Mục
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...buttonStyle,
                  backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#6b7280',
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '12px 16px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ 
          flex: 1,
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>
            {tabs.find(tab => tab.id === activeTab)?.label}
          </h2>
          
          {renderTabContent()}
        </div>
      </div>

      {/* System Status */}
      <div style={{
        marginTop: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Database size={20} style={{ color: '#3b82f6' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
            Trạng Thái Hệ Thống
          </h3>
        </div>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>Database</div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>Kết nối thành công</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>Email Service</div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>Hoạt động bình thường</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>Storage</div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>85% dung lượng còn lại</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAdminSettings;