import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Edit, Trash2, Eye, Filter, X,
  User, Mail, Calendar, Award, CheckCircle, XCircle,
  Phone, MapPin, GraduationCap, Star, Settings, Save,
  UserPlus, Activity, Clock, Target, Heart, Shield
} from 'lucide-react';
import http from '../../services/http';
import sessionStorageManager from '../../services/sessionStorageManager';
import { extractUsersFromAxiosResponse, extractRolesFromAxiosResponse } from '../../utils/apiNormalization';
import { getUserAvatar, getStudentAvatar } from '../../utils/avatarUtils';

const IntegratedUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [userPoints, setUserPoints] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [createRoleTab, setCreateRoleTab] = useState('Admin');
  const [classes, setClasses] = useState([]);

  useEffect(() => {
  // fetch trigger
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await http.get('/admin/users');
      const normalized = extractUsersFromAxiosResponse(response);
      setUsers(normalized);
      console.log(`Users loaded: ${normalized.length}`);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await http.get('/admin/roles');
      const list = extractRolesFromAxiosResponse(response);
      setRoles(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách vai trò:', error);
      setRoles([]);
    }
  };

  useEffect(() => {
    // Load classes for student/monitor creation
    const loadClasses = async () => {
      try {
        const res = await http.get('/admin/classes');
        const data = res.data?.data || res.data || [];
        setClasses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn('Không thể tải danh sách lớp', e);
        setClasses([]);
      }
    };
    loadClasses();
  }, []);

  const fetchUserDetails = async (userId) => {
    try {
      const response = await http.get(`/admin/users/${userId}`);
      const userData = response.data?.data || response.data;
      setSelectedUser(userData);
      
      // Fetch points if user is student
      if (userData?.sinh_vien) {
        const pointsResponse = await http.get(`/admin/users/${userId}/points`);
        const pr = pointsResponse.data?.data || pointsResponse.data;
        // Backend shape: { summary, details, attendance }
        let pointsArray = [];
        if (Array.isArray(pr)) {
          pointsArray = pr; // Unexpected direct array fallback
        } else if (Array.isArray(pr?.details)) {
          pointsArray = pr.details.map(d => ({
            activity_name: d.name || d.activity || 'Hoạt động',
            date: d.date,
            points: d.points || 0,
            raw: d
          }));
        } else if (Array.isArray(pr?.attendance)) {
          // Fallback: build from attendance if details empty
            pointsArray = pr.attendance.map(a => ({
              activity_name: a.activity || 'Điểm danh',
              date: a.date,
              points: a.points || 0,
              raw: a
            }));
        }
        setUserPoints(pointsArray);
      }
      
      setShowDetailModal(true);
    } catch (error) {
      console.error('Lỗi khi tải chi tiết người dùng:', error);
    }
  };

  const handleSaveUser = async () => {
    setFormError('');
    setSubmitLoading(true);
    try {
      if (selectedUser.id) {
        // Map to backend update schema: { hoten?, email?, password?, role? }
        const payload = {};
        if (selectedUser.ho_ten && selectedUser.ho_ten.trim()) payload.hoten = selectedUser.ho_ten.trim();
        if (selectedUser.email && selectedUser.email.trim()) payload.email = selectedUser.email.trim();
        if (selectedUser.mat_khau && String(selectedUser.mat_khau).length >= 6) payload.password = selectedUser.mat_khau;
        // Only 'ADMIN' is currently accepted by backend schema
        if (selectedUser.vai_tro?.ten_vt === 'ADMIN') payload.role = 'ADMIN';

        await http.put(`/admin/users/${selectedUser.id}`, payload);
      } else {
        // Client-side validation aligned with backend zod schema
        const maso = (selectedUser.ten_dn || '').trim();
        const hoten = (selectedUser.ho_ten || '').trim();
        const email = (selectedUser.email || '').trim();
        const password = selectedUser.mat_khau || '';
        if (!maso || maso.length < 3) throw new Error('Mã số phải có ít nhất 3 ký tự');
        if (!hoten || hoten.length < 2) throw new Error('Họ tên phải có ít nhất 2 ký tự');
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email không hợp lệ');
        if (!email.endsWith('@dlu.edu.vn')) throw new Error('Email phải có domain @dlu.edu.vn');
        if (!password || String(password).length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự');

        // Send selected role from UI
        const role = selectedUser.role || createRoleTab || 'Admin';
        const payload = { maso, hoten, email, password, role };
        // Optional fields if we ever collect them
        if (selectedUser.khoa) payload.khoa = selectedUser.khoa;
        if (selectedUser.lop) payload.lop = selectedUser.lop;
        if (selectedUser.sdt) payload.sdt = selectedUser.sdt;

        // Student-specific fields
        if (role === 'Sinh viên' || role === 'Lớp trưởng') {
          const mssv = (selectedUser.mssv || '').trim();
          const lop_id = selectedUser.lop_id || '';
          if (!mssv) throw new Error('Vui lòng nhập MSSV');
          if (!lop_id) throw new Error('Vui lòng chọn lớp');
          payload.mssv = mssv;
          payload.lop_id = lop_id;
          if (selectedUser.ngay_sinh) payload.ngay_sinh = selectedUser.ngay_sinh;
          if (selectedUser.gt) payload.gt = selectedUser.gt;
          if (selectedUser.dia_chi) payload.dia_chi = selectedUser.dia_chi;
          if (selectedUser.sdt) payload.sdt = selectedUser.sdt;
          if (role === 'Lớp trưởng' && selectedUser.set_lop_truong) payload.set_lop_truong = true;
        }

        await http.post('/admin/users', payload);
      }
      await fetchUsers();
      setShowDetailModal(false);
      setShowCreateModal(false);
      setSelectedUser(null);
      setEditMode(false);
    } catch (error) {
      console.error('Lỗi khi lưu người dùng:', error);
      // Try to extract server-side error message
      const serverMsg = error?.response?.data?.message || error?.response?.data?.msg || error?.message;
      setFormError(serverMsg || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    
    try {
      await http.delete(`/admin/users/${userId}`);
      await fetchUsers();
    } catch (error) {
      console.error('Lỗi khi xóa người dùng:', error);
    }
  };

  // Build active identifiers from multi-session sources (all tabs)
  const getActiveAccountIdentifiers = () => {
    const ids = new Set();
    const codes = new Set();
    try {
      // 1) Active tabs registry
      const tabs = sessionStorageManager.getActiveTabs?.() || [];
      const now = Date.now();
      tabs.forEach(t => {
        const fresh = typeof t.timeSinceActivity === 'number' ? t.timeSinceActivity < 2 * 60 * 1000 : ((now - (t.lastActivity || 0)) < 2 * 60 * 1000);
        if (fresh && t.isActive && t.hasSession) {
          if (t.userId) ids.add(String(t.userId));
          if (t.userCode) codes.add(String(t.userCode));
        }
      });
      // 2) multi_session_data (used by header)
      const msRaw = localStorage.getItem('multi_session_data');
      if (msRaw) {
        const ms = JSON.parse(msRaw);
        Object.values(ms || {}).forEach(sess => {
          const hasToken = !!sess?.token;
          const isActive = sess?.isActive === true; // explicit active
          const last = sess?.lastActivity || sess?.timestamp;
          const fresh = last ? (now - last) < 2 * 60 * 1000 : false;
          if (hasToken && isActive && fresh) {
            const u = sess.user || {};
            if (u.id) ids.add(String(u.id));
            if (u.maso) codes.add(String(u.maso));
            if (u.ten_dn) codes.add(String(u.ten_dn));
          }
        });
      }
    } catch (_) {}
    return { ids, codes };
  };

  const { ids: activeIds, codes: activeCodes } = getActiveAccountIdentifiers();

  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    const needle = searchTerm.toLowerCase();
    const matchesSearch = !needle ||
      user.ho_ten?.toLowerCase().includes(needle) ||
      user.ten_dn?.toLowerCase().includes(needle) ||
      user.email?.toLowerCase().includes(needle) ||
      user.sinh_vien?.mssv?.toLowerCase().includes(needle);
    // Compute derived status: any logged-in sessions across tabs are 'hoat_dong' unless locked
    const sameId = user.id && activeIds.has(String(user.id));
    const sameCode = (user.maso && activeCodes.has(String(user.maso))) ||
      (user.ten_dn && activeCodes.has(String(user.ten_dn))) ||
      (user.sinh_vien?.mssv && activeCodes.has(String(user.sinh_vien.mssv)));
    const locked = user.trang_thai === 'khoa' || user.khoa === true;
    const derivedStatus = locked ? 'khoa' : (sameId || sameCode ? 'hoat_dong' : 'khong_hoat_dong');
    const matchesRole = !roleFilter || user.vai_tro?.ten_vt === roleFilter;
    const matchesStatus = !statusFilter || derivedStatus === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }) : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'hoat_dong': return { bg: '#dcfce7', color: '#15803d', text: 'Hoạt động' };
      case 'khong_hoat_dong': return { bg: '#f3f4f6', color: '#374151', text: 'Không hoạt động' };
      case 'khoa': return { bg: '#fef2f2', color: '#dc2626', text: 'Bị khóa' };
      default: return { bg: '#fef3c7', color: '#92400e', text: 'Chưa xác định' };
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return { bg: '#fef2f2', color: '#dc2626' };
      case 'Giảng viên': return { bg: '#fef3c7', color: '#92400e' };
      case 'Lớp trưởng': return { bg: '#dbeafe', color: '#1e40af' };
      case 'Sinh viên': return { bg: '#dcfce7', color: '#15803d' };
      default: return { bg: '#f3f4f6', color: '#374151' };
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
        <p>Đang tải danh sách người dùng...</p>
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
            Quản Lý Tài Khoản Tích Hợp
          </h1>
          <p style={{ color: '#6b7280' }}>
            Quản lý tài khoản, thông tin cá nhân và điểm rèn luyện trong một giao diện
          </p>
        </div>
        
        <button 
          onClick={() => {
            setSelectedUser({
              ten_dn: '',
              email: '',
              ho_ten: '',
              role: roles?.[0]?.ten_vt || 'Admin',
              sinh_vien: null
            });
            setShowCreateModal(true);
          }}
          style={{
            ...buttonStyle,
            backgroundColor: '#3b82f6',
            color: 'white'
          }}
        >
          <UserPlus size={20} />
          Thêm Người Dùng
        </button>
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
          {/* Search */}
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
              placeholder="Tìm kiếm người dùng..."
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

          {/* Role Filter */}
          <div style={{ position: 'relative' }}>
            <Shield 
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
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
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
              <option value="">Tất cả vai trò</option>
              {roles.map(role => (
                <option key={role.id} value={role.ten_vt}>{role.ten_vt}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
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
              <option value="hoat_dong">Hoạt động</option>
              <option value="khong_hoat_dong">Không hoạt động</option>
              <option value="khoa">Bị khóa</option>
            </select>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setStatusFilter('')}
            style={{
              ...buttonStyle,
              backgroundColor: statusFilter === '' ? '#3b82f6' : '#f3f4f6',
              color: statusFilter === '' ? 'white' : '#374151',
              flex: 1
            }}
          >
            <Users size={18} />
            Tất cả ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter('hoat_dong')}
            style={{
              ...buttonStyle,
              backgroundColor: statusFilter === 'hoat_dong' ? '#10b981' : '#f3f4f6',
              color: statusFilter === 'hoat_dong' ? 'white' : '#374151',
              flex: 1
            }}
          >
            <CheckCircle size={18} />
            {(() => { const active = users.filter(u => (u.trang_thai === 'khoa' || u.khoa === true) ? false : ( (u.id && activeIds.has(String(u.id))) || (u.maso && activeCodes.has(String(u.maso))) || (u.ten_dn && activeCodes.has(String(u.ten_dn))) || (u.sinh_vien?.mssv && activeCodes.has(String(u.sinh_vien.mssv))) ) ).length; return `Hoạt động (${active})`; })()}
          </button>
          <button
            onClick={() => setStatusFilter('khoa')}
            style={{
              ...buttonStyle,
              backgroundColor: statusFilter === 'khoa' ? '#ef4444' : '#f3f4f6',
              color: statusFilter === 'khoa' ? 'white' : '#374151',
              flex: 1
            }}
          >
            <XCircle size={18} />
            {(() => { const locked = users.filter(u => u.trang_thai === 'khoa' || u.khoa === true).length; return `Bị khóa (${locked})`; })()}
          </button>
        </div>
      </div>

      {/* Role quick filters */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setRoleFilter('')}
            style={{
              ...buttonStyle,
              backgroundColor: roleFilter === '' ? '#2563eb' : '#f3f4f6',
              color: roleFilter === '' ? '#fff' : '#374151',
              padding: '6px 12px'
            }}
          >
            Tất cả vai trò
          </button>
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.ten_vt)}
              style={{
                ...buttonStyle,
                backgroundColor: roleFilter === r.ten_vt ? '#2563eb' : '#f3f4f6',
                color: roleFilter === r.ten_vt ? '#fff' : '#374151',
                padding: '6px 12px'
              }}
            >
              {r.ten_vt}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {filteredUsers.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 24px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: '#6b7280' }} />
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#6b7280' }}>
              Không tìm thấy người dùng nào
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const avatarInfo = user.sinh_vien ? getStudentAvatar(user.sinh_vien) : getUserAvatar(user);
            const sameId = user.id && activeIds.has(String(user.id));
            const sameCode = (user.maso && activeCodes.has(String(user.maso))) || (user.ten_dn && activeCodes.has(String(user.ten_dn)));
            const locked = user.trang_thai === 'khoa' || user.khoa === true;
            const derivedStatus = locked ? 'khoa' : (sameId || sameCode ? 'hoat_dong' : 'khong_hoat_dong');
            const statusInfo = getStatusColor(derivedStatus);
            const roleInfo = getRoleColor(user.vai_tro?.ten_vt);
            
            return (
              <div 
                key={user.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* User Avatar & Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  {avatarInfo.hasValidAvatar ? (
                    <img 
                      src={avatarInfo.src} 
                      alt={avatarInfo.alt}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid ' + roleInfo.bg
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallbackEl = e.currentTarget.nextSibling;
                        if (fallbackEl) fallbackEl.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      backgroundColor: roleInfo.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: roleInfo.color,
                      fontWeight: '600',
                      fontSize: '18px'
                    }}>
                      {avatarInfo.fallback}
                    </div>
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                      {user.ho_ten || 'Chưa có tên'}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: roleInfo.bg,
                        color: roleInfo.color
                      }}>
                        {user.vai_tro?.ten_vt || 'Chưa xác định'}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color
                      }}>
                        {statusInfo.text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                    <Mail size={14} />
                    {user.email || 'Chưa có email'}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                    <User size={14} />
                    {user.ten_dn || 'Chưa có username'}
                  </div>

                  {user.sinh_vien && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                        <GraduationCap size={14} />
                        MSSV: {user.sinh_vien.mssv}
                      </div>
                      
                      {user.sinh_vien.lop && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                          <Users size={14} />
                          Lớp: {user.sinh_vien.lop.ten_lop}
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
                    <Calendar size={14} />
                    Tham gia: {user.ngay_tao ? new Date(user.ngay_tao).toLocaleDateString('vi-VN') : 'Không xác định'}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <button 
                    onClick={() => fetchUserDetails(user.id)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      flex: 1,
                      justifyContent: 'center'
                    }}
                  >
                    <Eye size={16} />
                    Chi tiết
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#ef4444',
                      color: 'white',
                      padding: '8px 12px'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedUser && (
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
                {editMode ? 'Chỉnh sửa người dùng' : 'Chi tiết người dùng'}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!editMode ? (
                  <button 
                    onClick={() => setEditMode(true)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#10b981',
                      color: 'white'
                    }}
                  >
                    <Edit size={16} />
                    Chỉnh sửa
                  </button>
                ) : (
                  <button 
                    onClick={handleSaveUser}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#10b981',
                      color: 'white'
                    }}
                  >
                    <Save size={16} />
                    Lưu
                  </button>
                )}
                <button 
                  onClick={() => {
                    setShowDetailModal(false);
                    setEditMode(false);
                    setSelectedUser(null);
                  }}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#6b7280',
                    color: 'white'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div style={{ 
              padding: '0 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0'
            }}>
              {[
                { id: 'account', label: 'Tài khoản', icon: <User size={16} /> },
                { id: 'personal', label: 'Thông tin cá nhân', icon: <Settings size={16} /> },
                { id: 'points', label: 'Điểm rèn luyện', icon: <Award size={16} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...buttonStyle,
                    backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#6b7280',
                    borderRadius: '0',
                    borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                    paddingBottom: '16px',
                    marginBottom: '-1px'
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              {activeTab === 'account' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Tên đăng nhập
                    </label>
                    <input
                      type="text"
                      value={selectedUser.ten_dn || ''}
                      onChange={(e) => editMode && setSelectedUser({...selectedUser, ten_dn: e.target.value})}
                      disabled={!editMode}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={selectedUser.email || ''}
                      onChange={(e) => editMode && setSelectedUser({...selectedUser, email: e.target.value})}
                      disabled={!editMode}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Họ tên
                    </label>
                    <input
                      type="text"
                      value={selectedUser.ho_ten || ''}
                      onChange={(e) => editMode && setSelectedUser({...selectedUser, ho_ten: e.target.value})}
                      disabled={!editMode}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Vai trò
                    </label>
                    <select
                      value={selectedUser.vai_tro_id || ''}
                      onChange={(e) => editMode && setSelectedUser({...selectedUser, vai_tro_id: e.target.value})}
                      disabled={!editMode}
                      style={inputStyle}
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.ten_vt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Trạng thái
                    </label>
                    <select
                      value={selectedUser.trang_thai || ''}
                      onChange={(e) => editMode && setSelectedUser({...selectedUser, trang_thai: e.target.value})}
                      disabled={!editMode}
                      style={inputStyle}
                    >
                      <option value="hoat_dong">Hoạt động</option>
                      <option value="khong_hoat_dong">Không hoạt động</option>
                      <option value="khoa">Bị khóa</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'personal' && selectedUser.sinh_vien && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      MSSV
                    </label>
                    <input
                      type="text"
                      value={selectedUser.sinh_vien.mssv || ''}
                      onChange={(e) => editMode && setSelectedUser({
                        ...selectedUser, 
                        sinh_vien: {...selectedUser.sinh_vien, mssv: e.target.value}
                      })}
                      disabled={!editMode}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={selectedUser.sinh_vien.ngay_sinh ? new Date(selectedUser.sinh_vien.ngay_sinh).toISOString().split('T')[0] : ''}
                      onChange={(e) => editMode && setSelectedUser({
                        ...selectedUser, 
                        sinh_vien: {...selectedUser.sinh_vien, ngay_sinh: e.target.value}
                      })}
                      disabled={!editMode}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Giới tính
                    </label>
                    <select
                      value={selectedUser.sinh_vien.gt || ''}
                      onChange={(e) => editMode && setSelectedUser({
                        ...selectedUser, 
                        sinh_vien: {...selectedUser.sinh_vien, gt: e.target.value}
                      })}
                      disabled={!editMode}
                      style={inputStyle}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="nam">Nam</option>
                      <option value="nu">Nữ</option>
                      <option value="khac">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={selectedUser.sinh_vien.sdt || ''}
                      onChange={(e) => editMode && setSelectedUser({
                        ...selectedUser, 
                        sinh_vien: {...selectedUser.sinh_vien, sdt: e.target.value}
                      })}
                      disabled={!editMode}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                      Địa chỉ
                    </label>
                    <textarea
                      value={selectedUser.sinh_vien.dia_chi || ''}
                      onChange={(e) => editMode && setSelectedUser({
                        ...selectedUser, 
                        sinh_vien: {...selectedUser.sinh_vien, dia_chi: e.target.value}
                      })}
                      disabled={!editMode}
                      rows={3}
                      style={{...inputStyle, resize: 'vertical'}}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'points' && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Điểm Rèn Luyện
                  </h3>
                  {!Array.isArray(userPoints) || userPoints.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: '#6b7280' }} />
                      <p style={{ color: '#6b7280' }}>Chưa có điểm rèn luyện</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {userPoints.map((point, index) => (
                        <div key={index} style={{
                          padding: '16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>
                              {point.activity_name || 'Hoạt động'}
                            </h4>
                            <p style={{ fontSize: '14px', color: '#6b7280' }}>
                              {point.date ? new Date(point.date).toLocaleDateString('vi-VN') : 'N/A'}
                            </p>
                          </div>
                          <div style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: point.points > 0 ? '#10b981' : '#ef4444'
                          }}>
                            {point.points || 0} điểm
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                <UserPlus size={24} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                Tạo Người Dùng Mới
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedUser(null);
                }}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#f3f4f6',
                  color: '#374151'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Create tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {['Admin','Giảng viên','Lớp trưởng','Sinh viên'].map(tab => (
                  <button key={tab} onClick={() => { setCreateRoleTab(tab); setSelectedUser({ ...selectedUser, role: tab }); }}
                    style={{
                      ...buttonStyle,
                      padding: '6px 12px',
                      backgroundColor: createRoleTab === tab ? '#2563eb' : '#f3f4f6',
                      color: createRoleTab === tab ? '#fff' : '#374151'
                    }}
                  >{tab}</button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                    Tên đăng nhập *
                  </label>
                  <input
                    type="text"
                    value={selectedUser.ten_dn || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, ten_dn: e.target.value })}
                    placeholder="Nhập tên đăng nhập"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    value={selectedUser.ho_ten || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, ho_ten: e.target.value })}
                    placeholder="Nhập họ và tên"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={selectedUser.email || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    placeholder="Nhập email"
                    style={inputStyle}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>Chỉ chấp nhận email @dlu.edu.vn</p>
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                    Mật khẩu *
                  </label>
                  <input
                    type="password"
                    value={selectedUser.mat_khau || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, mat_khau: e.target.value })}
                    placeholder="Nhập mật khẩu"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>Vai trò</label>
                  <input type="text" value={createRoleTab} readOnly style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280' }} />
                </div>

                {/* Role-specific fields */}
                {(createRoleTab === 'Sinh viên' || createRoleTab === 'Lớp trưởng') && (
                  <>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>MSSV *</label>
                      <input type="text" value={selectedUser.mssv || ''} onChange={(e) => setSelectedUser({ ...selectedUser, mssv: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>Lớp *</label>
                      <select value={selectedUser.lop_id || ''} onChange={(e) => setSelectedUser({ ...selectedUser, lop_id: e.target.value })} style={inputStyle}>
                        <option value="">Chọn lớp</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.ten_lop} - {c.khoa}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>Ngày sinh</label>
                      <input type="date" value={selectedUser.ngay_sinh || ''} onChange={(e) => setSelectedUser({ ...selectedUser, ngay_sinh: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>Giới tính</label>
                      <select value={selectedUser.gt || ''} onChange={(e) => setSelectedUser({ ...selectedUser, gt: e.target.value })} style={inputStyle}>
                        <option value="">Chọn giới tính</option>
                        <option value="nam">Nam</option>
                        <option value="nu">Nữ</option>
                        <option value="khac">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>SĐT</label>
                      <input type="tel" value={selectedUser.sdt || ''} onChange={(e) => setSelectedUser({ ...selectedUser, sdt: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>Địa chỉ</label>
                      <input type="text" value={selectedUser.dia_chi || ''} onChange={(e) => setSelectedUser({ ...selectedUser, dia_chi: e.target.value })} style={inputStyle} />
                    </div>
                    {createRoleTab === 'Lớp trưởng' && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151' }}>
                          <input type="checkbox" checked={!!selectedUser.set_lop_truong} onChange={(e) => setSelectedUser({ ...selectedUser, set_lop_truong: e.target.checked })} />
                          Đặt làm lớp trưởng cho lớp đã chọn
                        </label>
                      </div>
                    )}
                  </>
                )}

                {createRoleTab === 'Giảng viên' && (
                  <>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>Khoa</label>
                      <input type="text" value={selectedUser.khoa || ''} onChange={(e) => setSelectedUser({ ...selectedUser, khoa: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>SĐT</label>
                      <input type="tel" value={selectedUser.sdt || ''} onChange={(e) => setSelectedUser({ ...selectedUser, sdt: e.target.value })} style={inputStyle} />
                    </div>
                  </>
                )}

                {/* Removed trạng thái for create - backend sets default */}
              </div>
              {formError && (
                <div style={{
                  marginTop: '16px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  {String(formError)}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedUser(null);
                }}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#f3f4f6',
                  color: '#374151'
                }}
                disabled={submitLoading}
              >
                <X size={18} />
                Hủy
              </button>
              <button
                onClick={handleSaveUser}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#10b981',
                  color: 'white'
                }}
                disabled={submitLoading}
              >
                <Save size={18} />
                {submitLoading ? 'Đang tạo...' : 'Tạo Người Dùng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegratedUserManagement;