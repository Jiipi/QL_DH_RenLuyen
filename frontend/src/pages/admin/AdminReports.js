import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Activity, Award, Download, Calendar,
  FileText, PieChart, Filter, RefreshCw, ArrowUpRight, CheckCircle,
  XCircle, Clock, AlertCircle
} from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';

const RealDataReportsManagement = () => {
  const [overview, setOverview] = useState({
    totalStudents: 0,
    totalActivities: 0,
    totalRegistrations: 0,
    pendingApprovals: 0,
    byStatus: [],
    topActivities: [],
    dailyRegs: []
  });
  const [loading, setLoading] = useState(true);
  // Unified semester select
  const getDefaultSemester = () => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    if (m >= 7 && m <= 11) return `hoc_ky_1-${y}`;
    if (m === 12) return `hoc_ky_2-${y}`;
    if (m >= 1 && m <= 4) return `hoc_ky_2-${y - 1}`;
    return `hoc_ky_1-${y}`;
  };
  const [semester, setSemester] = useState(getDefaultSemester());
  const { options: semesterOptions } = useSemesterOptions();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchRealData();
  }, [semester]);

  const fetchRealData = async () => {
    try {
      setLoading(true);
  // semester already in the right format: hoc_ky_1-YYYY
      
      // Fetch từ nhiều endpoints để lấy dữ liệu thực
      const [
        studentsRes,
        activitiesRes,
        registrationsRes,
        overviewRes
      ] = await Promise.all([
        http.get('/admin/users', { params: { limit: 1 } }).catch(() => ({ data: { data: { total: 0 } } })),
  http.get('/admin/activities', { params: { limit: 1, semester } }).catch(() => ({ data: { data: { total: 0 } } })),
  http.get('/admin/registrations', { params: { limit: 1, semester } }).catch(() => ({ data: { data: { total: 0 } } })),
  http.get('/admin/reports/overview', { params: { semester } }).catch(() => ({ data: { data: {} } }))
      ]);

      // Parse dữ liệu
      const studentsData = studentsRes.data?.data || {};
      const activitiesData = activitiesRes.data?.data || {};
      const registrationsData = registrationsRes.data?.data || {};
      const overviewData = overviewRes.data?.data || {};

      // Count students (sinh viên role)
      const totalStudents = studentsData.total || studentsData.items?.length || 0;
      const totalActivities = activitiesData.total || activitiesData.items?.length || 0;
      const totalRegistrations = registrationsData.total || registrationsData.items?.length || 0;

      // Parse byStatus từ backend
      const byStatus = overviewData.byStatus || [];
      const pendingCount = byStatus.find(s => s.trang_thai === 'cho_duyet')?._count?._all || 0;
      const approvedCount = byStatus.find(s => s.trang_thai === 'da_duyet')?._count?._all || 0;
      const rejectedCount = byStatus.find(s => s.trang_thai === 'tu_choi')?._count?._all || 0;

      setOverview({
        totalStudents,
        totalActivities,
        totalRegistrations,
        pendingApprovals: pendingCount,
        approvedCount,
        rejectedCount,
        byStatus,
        topActivities: overviewData.topActivities || [],
        dailyRegs: overviewData.dailyRegs || []
      });
    } catch (error) {
      console.error('Error fetching real data:', error);
      setOverview({
        totalStudents: 0,
        totalActivities: 0,
        totalRegistrations: 0,
        pendingApprovals: 0,
        byStatus: [],
        topActivities: [],
        dailyRegs: []
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type) => {
    try {
      setExporting(true);
      const currentSemester = semester;
      const response = await http.get(`/admin/reports/export/${type}`, {
        params: { semester: currentSemester },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'text/csv;charset=utf-8' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
  const filename = `bao-cao-${type}-${currentSemester}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Xuất báo cáo thất bại: ' + (error.response?.data?.message || error.message));
    } finally {
      setExporting(false);
    }
  };

  const buttonStyle = {
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    opacity: exporting ? 0.6 : 1,
    pointerEvents: exporting ? 'none' : 'auto'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
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
          width: '48px',
          height: '48px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Đang tải dữ liệu thực...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
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
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            Báo Cáo Tổng Hợp
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Thống kê và báo cáo hoạt động rèn luyện sinh viên (Dữ liệu thực từ database)
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchRealData}
            disabled={loading}
            style={{
              ...buttonStyle,
              backgroundColor: '#6b7280',
              color: 'white'
            }}
          >
            <RefreshCw size={18} />
            Làm mới
          </button>
          <button 
            onClick={() => exportReport('activities')}
            disabled={exporting}
            style={{
              ...buttonStyle,
              backgroundColor: '#10b981',
              color: 'white'
            }}
          >
            <Download size={18} />
            {exporting ? 'Đang xuất...' : 'Xuất Hoạt động'}
          </button>
          <button 
            onClick={() => exportReport('registrations')}
            disabled={exporting}
            style={{
              ...buttonStyle,
              backgroundColor: '#3b82f6',
              color: 'white'
            }}
          >
            <Download size={18} />
            {exporting ? 'Đang xuất...' : 'Xuất Đăng ký'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        ...cardStyle,
        marginBottom: '24px'
      }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
              Học kỳ
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              {(semesterOptions || []).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Tổng Sinh viên */}
        <div style={{
          ...cardStyle,
          borderLeft: '4px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
                Tổng sinh viên
              </p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>
                {overview.totalStudents}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Đang hoạt động
              </p>
            </div>
            <Users size={40} style={{ color: '#3b82f6', opacity: 0.7 }} />
          </div>
        </div>

        {/* Tổng Hoạt động */}
        <div style={{
          ...cardStyle,
          borderLeft: '4px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
                Tổng hoạt động
              </p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
                {overview.totalActivities}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Đã tạo trong hệ thống
              </p>
            </div>
            <Activity size={40} style={{ color: '#10b981', opacity: 0.7 }} />
          </div>
        </div>

        {/* Tổng Đăng ký */}
        <div style={{
          ...cardStyle,
          borderLeft: '4px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
                Tổng đăng ký
              </p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
                {overview.totalRegistrations}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Lượt đăng ký hoạt động
              </p>
            </div>
            <FileText size={40} style={{ color: '#f59e0b', opacity: 0.7 }} />
          </div>
        </div>

        {/* Đang chờ duyệt */}
        <div style={{
          ...cardStyle,
          borderLeft: '4px solid #8b5cf6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
                Đang chờ duyệt
              </p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#8b5cf6' }}>
                {overview.pendingApprovals}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Hoạt động chờ phê duyệt
              </p>
            </div>
            <Clock size={40} style={{ color: '#8b5cf6', opacity: 0.7 }} />
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Trạng thái Hoạt động */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={20} />
            Trạng thái Hoạt động
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {overview.byStatus.map((status, idx) => {
              const labels = {
                'cho_duyet': { text: 'Chờ duyệt', color: '#f59e0b', icon: <Clock size={16} /> },
                'da_duyet': { text: 'Đã duyệt', color: '#10b981', icon: <CheckCircle size={16} /> },
                'tu_choi': { text: 'Từ chối', color: '#ef4444', icon: <XCircle size={16} /> },
                'da_huy': { text: 'Đã hủy', color: '#6b7280', icon: <XCircle size={16} /> },
                'ket_thuc': { text: 'Kết thúc', color: '#3b82f6', icon: <CheckCircle size={16} /> }
              };
              const info = labels[status.trang_thai] || { text: status.trang_thai, color: '#9ca3af', icon: <AlertCircle size={16} /> };
              const percentage = overview.totalActivities > 0 
                ? Math.round((status._count._all / overview.totalActivities) * 100) 
                : 0;

              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: info.color }}>{info.icon}</div>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      {info.text}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: info.color }}>
                      {status._count._all}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
            {overview.byStatus.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        {/* Top Hoạt động */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} />
            Top Hoạt động (Đăng ký nhiều nhất)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview.topActivities.slice(0, 5).map((activity, idx) => (
              <div key={activity.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                borderLeft: '3px solid #3b82f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: idx < 3 ? '#3b82f6' : '#e5e7eb',
                    color: idx < 3 ? 'white' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {idx + 1}
                  </div>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {activity.ten_hd || 'Không có tên'}
                  </span>
                </div>
                <div style={{
                  padding: '4px 12px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {activity.count} lượt
                </div>
              </div>
            ))}
            {overview.topActivities.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} />
          Xu hướng đăng ký theo ngày
        </h3>
        <div style={{
          height: '300px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #d1d5db'
        }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <BarChart3 size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
              Biểu đồ xu hướng đăng ký
            </p>
            <p style={{ fontSize: '12px' }}>
              {overview.dailyRegs.length > 0 
                ? `${overview.dailyRegs.length} ngày có đăng ký` 
                : 'Chưa có dữ liệu đăng ký'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealDataReportsManagement;
