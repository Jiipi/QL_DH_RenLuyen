import React, { useState, useEffect } from 'react';
import { 
  QrCode, Search, Filter, Eye, Users, Calendar, CheckCircle, XCircle,
  MapPin, Clock, User, Activity, Download, RefreshCw, Scan, Plus,
  AlertCircle, FileText, Camera, Upload
} from 'lucide-react';
import http from '../../services/http';
import { extractAttendanceFromAxiosResponse, extractActivitiesFromAxiosResponse } from '../../utils/apiNormalization';

const FixedQRAttendanceManagement = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [qrCodeData, setQrCodeData] = useState('');

  useEffect(() => {
    fetchAttendanceRecords();
    fetchActivities();
  }, []);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
  const response = await http.get('/admin/attendance');
      const normalized = extractAttendanceFromAxiosResponse(response);
      setAttendanceRecords(normalized);
      console.log(`Attendance records loaded: ${normalized.length}`);
    } catch (error) {
      console.error('Lỗi khi tải danh sách điểm danh:', error);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
  const response = await http.get('/admin/activities');
      const normalized = extractActivitiesFromAxiosResponse(response);
      setActivities(normalized);
    } catch (error) {
      console.error('Lỗi khi tải danh sách hoạt động:', error);
      setActivities([]);
    }
  };

  const fetchAttendanceDetails = async (recordId) => {
    try {
      // Chưa có backend -> bỏ qua
      setSelectedRecord(null);
      setShowDetailModal(false);
    } catch (error) {
      console.error('Lỗi khi tải chi tiết điểm danh:', error);
    }
  };

  const generateQRCode = async (activityId) => {
    try {
      // Chưa có backend -> chỉ demo dữ liệu QR
      setQrCodeData('DEMO-QR-' + activityId);
      setSelectedActivity(activities.find(a => a.id === activityId));
      setShowQRModal(true);
    } catch (error) {
      console.error('Lỗi khi tạo mã QR:', error);
      alert('Không thể tạo mã QR. Vui lòng thử lại.');
    }
  };

  const markAttendance = async (activityId, studentId) => {
    try {
      // Chưa có backend -> no-op
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Lỗi khi điểm danh:', error);
    }
  };

  const updateAttendanceStatus = async (recordId, status) => {
    try {
      // Chưa có backend -> no-op
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
    }
  };

  const exportAttendance = async (activityId = null) => {
    try {
      alert('Export attendance chưa được backend hỗ trợ');
    } catch (error) {
      console.error('Lỗi khi xuất báo cáo:', error);
    }
  };

  const filteredRecords = Array.isArray(attendanceRecords) ? attendanceRecords.filter(record => {
    const matchesSearch = (record.sinh_vien?.nguoi_dung?.ho_ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (record.sinh_vien?.ma_sv || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (record.hoat_dong?.ten_hd || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActivity = !activityFilter || record.hoat_dong_id === activityFilter;
    const matchesStatus = !statusFilter || record.trang_thai === statusFilter;
    return matchesSearch && matchesActivity && matchesStatus;
  }) : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'co_mat': return { bg: '#dcfce7', color: '#15803d', text: 'Có mặt', icon: <CheckCircle size={16} /> };
      case 'vang_mat': return { bg: '#fef2f2', color: '#dc2626', text: 'Vắng mặt', icon: <XCircle size={16} /> };
      case 'tre': return { bg: '#fef3c7', color: '#92400e', text: 'Đi trễ', icon: <Clock size={16} /> };
      case 'som': return { bg: '#e0e7ff', color: '#3730a3', text: 'Về sớm', icon: <Clock size={16} /> };
      default: return { bg: '#f3f4f6', color: '#374151', text: 'Chưa xác định', icon: <AlertCircle size={16} /> };
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
        <p>Đang tải dữ liệu điểm danh...</p>
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
            Quản Lý QR Điểm Danh
          </h1>
          <p style={{ color: '#6b7280' }}>
            Quản lý điểm danh bằng QR code theo schema DiemDanh
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchAttendanceRecords}
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
            onClick={() => exportAttendance()}
            style={{
              ...buttonStyle,
              backgroundColor: '#10b981',
              color: 'white'
            }}
          >
            <Download size={20} />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Thao tác nhanh
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div style={{
            padding: '20px',
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.backgroundColor = '#eff6ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
            <QrCode size={32} style={{ margin: '0 auto 12px', color: '#3b82f6' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              Tạo mã QR
            </h4>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Tạo mã QR cho hoạt động để sinh viên điểm danh
            </p>
            <select
              onChange={(e) => e.target.value && generateQRCode(e.target.value)}
              style={{
                ...inputStyle,
                backgroundColor: '#f9fafb'
              }}
            >
              <option value="">Chọn hoạt động</option>
              {activities.filter(a => a.trang_thai === 'da_duyet').map(activity => (
                <option key={activity.id} value={activity.id}>
                  {activity.ten_hd}
                </option>
              ))}
            </select>
          </div>

          <div style={{
            padding: '20px',
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.backgroundColor = '#ecfdf5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
            <Scan size={32} style={{ margin: '0 auto 12px', color: '#10b981' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              Quét QR điểm danh
            </h4>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Quét mã QR để điểm danh cho sinh viên
            </p>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: '#10b981',
                color: 'white',
                justifyContent: 'center',
                width: '100%'
              }}
              onClick={() => {
                // Implement QR scanner functionality
                alert('Tính năng quét QR sẽ được triển khai với camera API');
              }}
            >
              <Camera size={16} />
              Mở camera quét
            </button>
          </div>

          <div style={{
            padding: '20px',
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#f59e0b';
            e.currentTarget.style.backgroundColor = '#fffbeb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
            <Upload size={32} style={{ margin: '0 auto 12px', color: '#f59e0b' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              Import điểm danh
            </h4>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Tải lên file Excel danh sách điểm danh
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="import-file"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  // Implement import functionality
                  alert('Tính năng import sẽ được triển khai');
                }
              }}
            />
            <label
              htmlFor="import-file"
              style={{
                ...buttonStyle,
                backgroundColor: '#f59e0b',
                color: 'white',
                justifyContent: 'center',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              <FileText size={16} />
              Chọn file
            </label>
          </div>
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
              onChange={(e) => setActivityFilter(e.target.value)}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              <option value="co_mat">Có mặt</option>
              <option value="vang_mat">Vắng mặt</option>
              <option value="tre">Đi trễ</option>
              <option value="som">Về sớm</option>
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
          { label: 'Tổng điểm danh', value: attendanceRecords.length, color: '#3b82f6' },
          { 
            label: 'Có mặt', 
            value: attendanceRecords.filter(r => r.trang_thai === 'co_mat').length, 
            color: '#10b981' 
          },
          { 
            label: 'Vắng mặt', 
            value: attendanceRecords.filter(r => r.trang_thai === 'vang_mat').length, 
            color: '#ef4444' 
          },
          { 
            label: 'Đi trễ', 
            value: attendanceRecords.filter(r => r.trang_thai === 'tre').length, 
            color: '#f59e0b' 
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

      {/* Attendance Records Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {filteredRecords.length === 0 ? (
          <div style={{ 
            textAlign: 'center',
            padding: '60px 24px'
          }}>
            <QrCode size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: '#6b7280' }} />
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#6b7280' }}>
              Không tìm thấy bản ghi điểm danh nào
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
                    Thời gian điểm danh
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
                {filteredRecords.map((record, index) => {
                  const statusInfo = getStatusColor(record.trang_thai);
                  
                  return (
                    <tr 
                      key={record.id}
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>
                            {record.sinh_vien?.nguoi_dung?.ho_ten || 'N/A'}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {record.sinh_vien?.ma_sv || 'N/A'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {record.sinh_vien?.lop || 'N/A'}
                          </div>
                        </div>
                      </td>
                      
                      <td style={{ padding: '16px' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>
                            {record.hoat_dong?.ten_hd || 'N/A'}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {record.hoat_dong?.ma_hd || 'N/A'}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px'
                          }}>
                            <MapPin size={12} />
                            {record.hoat_dong?.dia_diem || 'N/A'}
                          </div>
                        </div>
                      </td>
                      
                      <td style={{ padding: '16px' }}>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Clock size={14} />
                          {record.thoi_gian_diem_danh ? 
                            new Date(record.thoi_gian_diem_danh).toLocaleDateString('vi-VN') : 
                            'N/A'
                          }
                        </div>
                        {record.thoi_gian_diem_danh && (
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            {new Date(record.thoi_gian_diem_danh).toLocaleTimeString('vi-VN')}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: statusInfo.bg,
                          color: statusInfo.color,
                          width: 'fit-content'
                        }}>
                          {statusInfo.icon}
                          {statusInfo.text}
                        </span>
                      </td>
                      
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => fetchAttendanceDetails(record.id)}
                            style={{
                              ...buttonStyle,
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              padding: '6px 12px'
                            }}
                            title="Xem chi tiết"
                          >
                            <Eye size={14} />
                          </button>
                          
                          <button 
                            onClick={() => updateAttendanceStatus(record.id, 'co_mat')}
                            style={{
                              ...buttonStyle,
                              backgroundColor: '#10b981',
                              color: 'white',
                              padding: '6px 12px'
                            }}
                            title="Đánh dấu có mặt"
                          >
                            <CheckCircle size={14} />
                          </button>
                          
                          <button 
                            onClick={() => updateAttendanceStatus(record.id, 'vang_mat')}
                            style={{
                              ...buttonStyle,
                              backgroundColor: '#ef4444',
                              color: 'white',
                              padding: '6px 12px'
                            }}
                            title="Đánh dấu vắng mặt"
                          >
                            <XCircle size={14} />
                          </button>
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

      {/* QR Code Modal */}
      {showQRModal && qrCodeData && selectedActivity && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            padding: '32px'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              Mã QR Điểm Danh
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              {selectedActivity.ten_hd}
            </p>
            
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '200px',
                height: '200px',
                backgroundColor: 'white',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                {/* QR Code would be rendered here */}
                <QrCode size={120} style={{ color: '#6b7280' }} />
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '16px', fontFamily: 'monospace' }}>
                {qrCodeData}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  // Download QR code as image
                  alert('Tính năng tải xuống QR sẽ được triển khai');
                }}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#10b981',
                  color: 'white'
                }}
              >
                <Download size={16} />
                Tải xuống
              </button>
              
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setQrCodeData('');
                  setSelectedActivity(null);
                }}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6b7280',
                  color: 'white'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90%',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                Chi tiết điểm danh
              </h2>
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRecord(null);
                }}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6b7280',
                  color: 'white'
                }}
              >
                Đóng
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Student Info */}
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Thông tin sinh viên
                  </h3>
                  <div style={{ space: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Họ tên
                      </label>
                      <div style={{ fontSize: '16px', color: '#111827' }}>
                        {selectedRecord.sinh_vien?.nguoi_dung?.ho_ten || 'N/A'}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Mã sinh viên
                      </label>
                      <div style={{ fontSize: '16px', color: '#111827', fontFamily: 'monospace' }}>
                        {selectedRecord.sinh_vien?.ma_sv || 'N/A'}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Lớp
                      </label>
                      <div style={{ fontSize: '16px', color: '#111827' }}>
                        {selectedRecord.sinh_vien?.lop || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Info */}
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Thông tin hoạt động
                  </h3>
                  <div style={{ space: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Tên hoạt động
                      </label>
                      <div style={{ fontSize: '16px', color: '#111827' }}>
                        {selectedRecord.hoat_dong?.ten_hd || 'N/A'}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Địa điểm
                      </label>
                      <div style={{ fontSize: '16px', color: '#111827' }}>
                        {selectedRecord.hoat_dong?.dia_diem || 'N/A'}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Thời gian hoạt động
                      </label>
                      <div style={{ fontSize: '16px', color: '#111827' }}>
                        {selectedRecord.hoat_dong?.ngay_bd ? 
                          new Date(selectedRecord.hoat_dong.ngay_bd).toLocaleDateString('vi-VN') : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Details */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                  Chi tiết điểm danh
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                      Thời gian điểm danh
                    </label>
                    <div style={{ fontSize: '16px', color: '#111827' }}>
                      {selectedRecord.thoi_gian_diem_danh ? 
                        new Date(selectedRecord.thoi_gian_diem_danh).toLocaleString('vi-VN') : 'N/A'
                      }
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                      Trạng thái
                    </label>
                    <div>
                      {(() => {
                        const statusInfo = getStatusColor(selectedRecord.trang_thai);
                        return (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                            width: 'fit-content'
                          }}>
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {selectedRecord.ghi_chu && (
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                      Ghi chú
                    </label>
                    <div style={{ 
                      fontSize: '16px', 
                      color: '#111827',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {selectedRecord.ghi_chu}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedQRAttendanceManagement;