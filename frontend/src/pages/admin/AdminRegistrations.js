import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Search, Filter, Eye, CheckCircle, XCircle, AlertCircle,
  Calendar, Activity, Clock, Download, Award, RefreshCw, UserCheck
} from 'lucide-react';
import http from '../../services/http';
import { extractRegistrationsFromAxiosResponse, extractActivitiesFromAxiosResponse } from '../../utils/apiNormalization';
import { getUserAvatar } from '../../utils/avatarUtils';
import { getBestActivityImage } from '../../utils/activityImages';
import ActivityDetailModal from '../../components/ActivityDetailModal';

const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState('pending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [displayMode, setDisplayMode] = useState('list');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [exporting, setExporting] = useState(false);

  const getStatusFromViewMode = useCallback(() => {
    switch (viewMode) {
      case 'pending': return 'cho_duyet';
      case 'approved': return 'da_duyet';
      case 'rejected': return 'tu_choi';
      case 'participated': return 'da_tham_gia';
      default: return undefined;
    }
  }, [viewMode]);

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const params = { 
        status: statusFilter || undefined,
        activityId: activityFilter || undefined,
        classId: classId || undefined
      };
      const res = await http.get('/admin/registrations', { params });
      const items = extractRegistrationsFromAxiosResponse(res);
      setRegistrations(items);
      console.log(`[AdminRegistrations] Loaded: ${items.length} registrations`);
    } catch (error) {
      console.error('Lỗi khi tải danh sách đăng ký:', error);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, activityFilter, classId]);

  useEffect(() => {
    fetchRegistrations();
    fetchActivities();
    fetchClasses();
  }, [fetchRegistrations]);

  const fetchActivities = async () => {
    try {
      const res = await http.get('/admin/activities');
      const list = extractActivitiesFromAxiosResponse(res);
      setActivities(list);
    } catch (error) {
      console.error('Lỗi khi tải danh sách hoạt động:', error);
      setActivities([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await http.get('/admin/classes');
      const list = Array.isArray(res?.data?.data) ? res.data.data : (res?.data || []);
      setClasses(list);
    } catch (error) {
      console.error('Lỗi khi tải danh sách lớp:', error);
      setClasses([]);
    }
  };

  const fetchRegistrationDetails = (id) => {
    const reg = registrations.find(r => r.id === id);
    if (reg) {
      setSelectedRegistration(reg);
      setShowDetailModal(true);
    }
  };

  const handleViewActivity = (activity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một đăng ký');
      return;
    }
    if (!window.confirm(`Phê duyệt ${selectedIds.length} đăng ký đã chọn?`)) return;
    try {
      await http.post('/admin/registrations/bulk', { 
        ids: selectedIds, 
        action: 'approve' 
      });
      setSelectedIds([]);
      await fetchRegistrations();
    } catch (error) {
      console.error('Lỗi khi phê duyệt hàng loạt:', error);
      alert('Có lỗi xảy ra khi phê duyệt');
    }
  };

  const handleApproveRegistration = async (registrationId) => {
    if (!window.confirm('Xác nhận phê duyệt đăng ký này?')) return;
    try {
      await http.post(`/admin/registrations/${registrationId}/approve`);
      await fetchRegistrations();
    } catch (error) {
      console.error('Lỗi khi phê duyệt đăng ký:', error);
      alert('Có lỗi xảy ra khi phê duyệt');
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    const reason = prompt('Lý do từ chối:') || '';
    if (!reason) return;
    try {
      await http.post(`/admin/registrations/${registrationId}/reject`, { reason });
      await fetchRegistrations();
    } catch (error) {
      console.error('Lỗi khi từ chối đăng ký:', error);
      alert('Có lỗi xảy ra khi từ chối');
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        status: statusFilter || '',
        classId: classId || ''
      });
      const baseURL = (typeof window !== 'undefined' && window.location)
        ? window.location.origin.replace(/\/$/, '') + '/api'
        : (process.env.REACT_APP_API_URL || 'http://dacn_backend_dev:3001/api');
      window.location.href = `${baseURL}/admin/registrations/export?${params}`;
    } catch (error) {
      console.error('Lỗi khi xuất Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel');
    } finally {
      setTimeout(() => setExporting(false), 2000);
    }
  };

  const handleViewModeChange = (newMode) => {
    if (newMode === viewMode) return;
    setIsTransitioning(true);
    setViewMode(newMode);
    setSelectedIds([]);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const filteredRegistrations = Array.isArray(registrations) ? registrations.filter(registration => {
    const matchesSearch = (registration.sinh_vien?.nguoi_dung?.ho_ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (registration.sinh_vien?.mssv || registration.sinh_vien?.ma_sv || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (registration.hoat_dong?.ten_hd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (registration.hoat_dong?.ma_hd || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActivity = !activityFilter || registration.hd_id === activityFilter || registration.hoat_dong_id === activityFilter;
    return matchesSearch && matchesActivity;
  }) : [];

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => (r.trang_thai_dk || r.trang_thai) === 'cho_duyet').length,
    approved: registrations.filter(r => (r.trang_thai_dk || r.trang_thai) === 'da_duyet').length,
    rejected: registrations.filter(r => (r.trang_thai_dk || r.trang_thai) === 'tu_choi').length,
    participated: registrations.filter(r => (r.trang_thai_dk || r.trang_thai) === 'da_tham_gia').length
  };

  const getStatusColor = (statusRaw) => {
    const status = statusRaw || 'cho_duyet';
    switch (status) {
      case 'da_duyet': return { bg: '#dcfce7', color: '#15803d', text: 'Đã duyệt', icon: <CheckCircle size={16} /> };
      case 'cho_duyet': return { bg: '#fef3c7', color: '#92400e', text: 'Chờ duyệt', icon: <Clock size={16} /> };
      case 'tu_choi': return { bg: '#fef2f2', color: '#dc2626', text: 'Từ chối', icon: <XCircle size={16} /> };
      default: return { bg: '#f3f4f6', color: '#374151', text: status, icon: <AlertCircle size={16} /> };
    }
  };

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
        <p>Đang tải danh sách đăng ký...</p>
      </div>
    );
  }

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
            Quản Lý Đăng Ký
          </h1>
          <p style={{ color: '#6b7280' }}>
            Quản lý đăng ký hoạt động theo schema DangKyHoatDong
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchRegistrations}
            style={{
              ...buttonStyle,
              backgroundColor: '#6b7280',
              color: 'white'
            }}
          >
            <RefreshCw size={20} />
            Làm mới
          </button>
          
          <button 
            onClick={handleExportExcel}
            style={{
              ...buttonStyle,
              backgroundColor: '#10b981',
              color: 'white'
            }}
          >
            <Download size={20} />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{ position: 'relative' }}>
            <Search 
              size={20} 
              style={{ 
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} 
            />
            <input
              type="text"
              placeholder="Tìm kiếm sinh viên, hoạt động..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Filter 
              size={20} 
              style={{ 
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} 
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchRegistrations(); }}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="cho_duyet">Chờ duyệt</option>
              <option value="da_duyet">Đã duyệt</option>
              <option value="tu_choi">Từ chối</option>
              <option value="da_tham_gia">Đã tham gia</option>
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <Activity 
              size={20} 
              style={{ 
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} 
            />
            <select
              value={activityFilter}
              onChange={(e) => { setActivityFilter(e.target.value); fetchRegistrations(); }}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Tất cả hoạt động</option>
              {activities.map(activity => (
                <option key={activity.id} value={activity.id}>
                  {activity.ten_hd}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <Filter 
              size={20} 
              style={{ 
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} 
            />
            <select
              value={classId}
              onChange={(e) => { setClassId(e.target.value); fetchRegistrations(); }}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Tất cả lớp</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.ten_lop || cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Tổng đăng ký', value: registrations.length, color: '#3b82f6' },
          { 
            label: 'Chờ duyệt', 
            value: registrations.filter(r => (r.trang_thai_dk||r.trang_thai) === 'cho_duyet').length, 
            color: '#f59e0b' 
          },
          { 
            label: 'Đã duyệt', 
            value: registrations.filter(r => (r.trang_thai_dk||r.trang_thai) === 'da_duyet').length, 
            color: '#10b981' 
          },
          { 
            label: 'Từ chối', 
            value: registrations.filter(r => (r.trang_thai_dk||r.trang_thai) === 'tu_choi').length, 
            color: '#ef4444' 
          }
        ].map((stat, index) => (
          <div 
            key={index}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              borderLeft: `4px solid ${stat.color}`
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Registrations Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {filteredRegistrations.length === 0 ? (
          <div style={{ 
            textAlign: 'center',
            padding: '60px 24px'
          }}>
            <UserCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: '#6b7280' }} />
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#6b7280' }}>
              Không tìm thấy đăng ký nào
            </p>
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Sinh viên
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Hoạt động
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Ngày đăng ký
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Trạng thái
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((r, index) => {
                  const statusInfo = getStatusColor(r.trang_thai_dk || r.trang_thai);
                  return (
                    <tr 
                      key={r.id}
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>
                            {r.sinh_vien?.nguoi_dung?.ho_ten || ''}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {r.sinh_vien?.mssv || r.sinh_vien?.ma_sv || ''}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {r.sinh_vien?.lop?.ten_lop || r.sinh_vien?.lop || ''}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>
                            {r.hoat_dong?.ten_hd || ''}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {r.hoat_dong?.ma_hd || ''}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} />
                          {r.ngay_dang_ky || r.ngay_dk ? new Date(r.ngay_dang_ky || r.ngay_dk).toLocaleDateString('vi-VN') : 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '500', backgroundColor: statusInfo.bg, color: statusInfo.color, width: 'fit-content' }}>
                          {statusInfo.icon}
                          {statusInfo.text}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => fetchRegistrationDetails(r.id)} style={{ ...buttonStyle, backgroundColor: '#3b82f6', color: 'white', padding: '6px 12px' }} title="Xem chi tiết">
                            <Eye size={14} />
                          </button>
                          {(r.trang_thai_dk || r.trang_thai) === 'cho_duyet' && (
                            <>
                              <button onClick={() => handleApproveRegistration(r.id)} style={{ ...buttonStyle, backgroundColor: '#10b981', color: 'white', padding: '6px 12px' }} title="Phê duyệt">
                                <CheckCircle size={14} />
                              </button>
                              <button onClick={() => handleRejectRegistration(r.id)} style={{ ...buttonStyle, backgroundColor: '#ef4444', color: 'white', padding: '6px 12px' }} title="Từ chối">
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRegistration && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90%', overflow: 'auto', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                Chi tiết đăng ký
              </h2>
              <button onClick={() => { setShowDetailModal(false); setSelectedRegistration(null); }} style={{ ...buttonStyle, backgroundColor: '#6b7280', color: 'white' }}>
                Đóng
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Thông tin sinh viên
                  </h3>
                  <div>
                    <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Họ tên</label><div style={{ fontSize: '16px', color: '#111827' }}>{selectedRegistration.sinh_vien?.nguoi_dung?.ho_ten || 'N/A'}</div></div>
                    <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Mã sinh viên</label><div style={{ fontSize: '16px', color: '#111827', fontFamily: 'monospace' }}>{selectedRegistration.sinh_vien?.mssv || selectedRegistration.sinh_vien?.ma_sv || 'N/A'}</div></div>
                    <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Lớp</label><div style={{ fontSize: '16px', color: '#111827' }}>{selectedRegistration.sinh_vien?.lop?.ten_lop || selectedRegistration.sinh_vien?.lop || 'N/A'}</div></div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Thông tin hoạt động
                  </h3>
                  <div>
                    <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Tên hoạt động</label><div style={{ fontSize: '16px', color: '#111827' }}>{selectedRegistration.hoat_dong?.ten_hd || 'N/A'}</div></div>
                    <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Mã hoạt động</label><div style={{ fontSize: '16px', color: '#111827', fontFamily: 'monospace' }}>{selectedRegistration.hoat_dong?.ma_hd || 'N/A'}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRegistrations;