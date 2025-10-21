import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Activity, CheckCircle, Clock, TrendingUp, TrendingDown,
  Settings, Bell, BarChart3, PieChart,
  UserCheck, AlertCircle, Award
} from 'lucide-react';
import http from '../../services/http';
import BulkSemesterClosure from '../../components/BulkSemesterClosure';

// Simple Dashboard Component for Admin
const SimpleAdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalActivities: 0,
    pendingApprovals: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
  const response = await http.get('/admin/dashboard');
      const data = response.data?.data || {};
      
      setStats({
        totalUsers: data.totalUsers || 0,
        totalActivities: data.totalActivities || 0,
        pendingApprovals: data.pendingApprovals || 0,
        activeUsers: data.activeUsers || 0
      });
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu dashboard:', error);
    } finally {
      setLoading(false);
    }
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
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  const statCardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderLeft: '4px solid #3b82f6'
  };

  const actionCardStyle = {
    background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    borderRadius: '12px',
    padding: '24px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center'
  };

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
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          Dashboard Quản Trị
        </h1>
        <p style={{ color: '#6b7280' }}>
          Chào mừng trở lại! Đây là tổng quan hệ thống của bạn.
        </p>
      </div>

      {/* Bulk Semester Closure Widget */}
      <div style={{ marginBottom: '32px' }}>
        <BulkSemesterClosure />
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div 
          style={{...statCardStyle, borderLeftColor: '#3b82f6'}}
          onClick={() => navigate('/admin/users')}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Tổng Người Dùng</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{stats.totalUsers}</p>
            </div>
            <div style={{ 
              backgroundColor: '#dbeafe', 
              padding: '12px', 
              borderRadius: '50%',
              color: '#3b82f6'
            }}>
              <Users size={24} />
            </div>
          </div>
        </div>

        <div 
          style={{...statCardStyle, borderLeftColor: '#10b981'}}
          onClick={() => navigate('/admin/activities')}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Hoạt Động</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{stats.totalActivities}</p>
            </div>
            <div style={{ 
              backgroundColor: '#d1fae5', 
              padding: '12px', 
              borderRadius: '50%',
              color: '#10b981'
            }}>
              <Activity size={24} />
            </div>
          </div>
        </div>

        <div 
          style={{...statCardStyle, borderLeftColor: '#f59e0b'}}
          onClick={() => navigate('/admin/approvals')}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Chờ Phê Duyệt</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{stats.pendingApprovals}</p>
            </div>
            <div style={{ 
              backgroundColor: '#fef3c7', 
              padding: '12px', 
              borderRadius: '50%',
              color: '#f59e0b'
            }}>
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div 
          style={{...statCardStyle, borderLeftColor: '#8b5cf6'}}
          onClick={() => navigate('/admin/users')}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Người Dùng Hoạt Động</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{stats.activeUsers}</p>
            </div>
            <div style={{ 
              backgroundColor: '#ede9fe', 
              padding: '12px', 
              borderRadius: '50%',
              color: '#8b5cf6'
            }}>
              <UserCheck size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
          Thao Tác Nhanh
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '24px'
        }}>
          <div 
            style={{...actionCardStyle, background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)'}}
            onClick={() => navigate('/admin/users')}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <Users size={32} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Quản Lý Người Dùng
            </h3>
            <p style={{ opacity: 0.9 }}>
              Thêm, sửa, xóa và phân quyền người dùng
            </p>
          </div>

          <div 
            style={{...actionCardStyle, background: 'linear-gradient(135deg, #10B981, #047857)'}}
            onClick={() => navigate('/admin/approvals')}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <CheckCircle size={32} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Phê Duyệt Đăng Ký
            </h3>
            <p style={{ opacity: 0.9 }}>
              Xem và phê duyệt các đăng ký hoạt động
            </p>
          </div>

          <div 
            style={{...actionCardStyle, background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)'}}
            onClick={() => navigate('/admin/reports')}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <BarChart3 size={32} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Báo Cáo & Thống Kê
            </h3>
            <p style={{ opacity: 0.9 }}>
              Xem báo cáo chi tiết và thống kê hệ thống
            </p>
          </div>

          <div 
            style={{...actionCardStyle, background: 'linear-gradient(135deg, #F59E0B, #D97706)'}}
            onClick={() => navigate('/admin/settings')}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <Settings size={32} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Cài Đặt Hệ Thống
            </h3>
            <p style={{ opacity: 0.9 }}>
              Cấu hình và tùy chỉnh hệ thống
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
          Hoạt Động Gần Đây
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '12px', 
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div style={{ 
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              padding: '8px',
              borderRadius: '50%',
              marginRight: '12px'
            }}>
              <CheckCircle size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '500', color: '#111827' }}>
                Người dùng mới đăng ký: Nguyễn Văn A
              </p>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>5 phút trước</span>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '12px', 
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div style={{ 
              backgroundColor: '#fef3c7',
              color: '#d97706',
              padding: '8px',
              borderRadius: '50%',
              marginRight: '12px'
            }}>
              <AlertCircle size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '500', color: '#111827' }}>
                Hoạt động "Tình nguyện mùa đông" cần phê duyệt
              </p>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>15 phút trước</span>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '12px', 
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div style={{ 
              backgroundColor: '#dbeafe',
              color: '#2563eb',
              padding: '8px',
              borderRadius: '50%',
              marginRight: '12px'
            }}>
              <Clock size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '500', color: '#111827' }}>
                Backup dữ liệu hoàn thành
              </p>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>1 giờ trước</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAdminDashboard;