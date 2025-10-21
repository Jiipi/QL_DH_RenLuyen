import React, { useState, useEffect } from 'react';
import { Shield, Users, Plus, Edit, Trash2, Eye, Search, X, Save, Crown, Key, Lock } from 'lucide-react';
import http from '../../services/http';
import { extractRolesFromAxiosResponse, extractUsersFromAxiosResponse } from '../../utils/apiNormalization';
import { getUserAvatar, getStudentAvatar } from '../../utils/avatarUtils';

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [roleCounts, setRoleCounts] = useState({});
  const [roleFilter, setRoleFilter] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(10);
  const [userTotal, setUserTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  // Test-only: toggle to use canonical backend slugs in UI
  const [useCanonicalSlugs, setUseCanonicalSlugs] = useState(false);
  // Backup original permissions per role to allow restore after testing
  const [permsBackupByRoleId, setPermsBackupByRoleId] = useState({});
  // Removed status filter per request
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const buttonStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14
  };

  const getRoleIcon = (roleName) => {
    const name = (roleName || '').toLowerCase();
    if (name.includes('admin')) return <Crown size={18} style={{ color: '#f59e0b' }} />;
    if (name.includes('giảng viên')) return <Key size={18} style={{ color: '#3b82f6' }} />;
    if (name.includes('lớp trưởng')) return <Shield size={18} style={{ color: '#8b5cf6' }} />;
    return <Users size={18} style={{ color: '#10b981' }} />;
  };

  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = String(fullName).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    (async () => {
      try {
        setLoadingRoles(true);
        setAuthError(false);
        const resp = await http.get('/admin/roles');
        const rs = extractRolesFromAxiosResponse(resp);
        setRoles(rs);
        if (rs.length > 0) setRoleFilter(rs[0]);
        fetchRoleCounts(rs);
      } catch (e) {
        if (e.response?.status === 401 || e.response?.status === 403) setAuthError(true);
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!roleFilter) return;
    fetchUsers({ page: userPage, limit: userLimit, role: roleFilter.ten_vt, search: searchApplied });
  }, [roleFilter?.id, userPage, userLimit, searchApplied]);

  async function fetchRoleCounts(list) {
    const arr = Array.isArray(list) ? list : roles;
    if (!arr || arr.length === 0) return;
    try {
      const pairs = await Promise.all(
        arr.map(async (r) => {
          try {
            const resp = await http.get('/admin/users', { params: { role: r.ten_vt, page: 1, limit: 1 } });
            const total = resp?.data?.data?.pagination?.total ?? 0;
            return [r.id, total];
          } catch {
            return [r.id, 0];
          }
        })
      );
      const map = {};
      pairs.forEach(([id, total]) => (map[id] = total));
      setRoleCounts(map);
    } catch (e) {
      console.error('Lỗi đếm số người dùng theo vai trò', e?.message);
    }
  }

  async function openCreateRole() {
    setIsCreate(true);
    setEditingRole({ ten_vt: '', mo_ta: '', quyen_han: [] });
    setShowRoleModal(true);
  }

  async function openEditRole(roleId) {
    try {
      const resp = await http.get(`/admin/roles/${roleId}`);
      const data = resp?.data?.data || resp?.data || {};
      if (!Array.isArray(data.quyen_han)) data.quyen_han = [];
      setIsCreate(false);
      setEditingRole(data);
      setShowRoleModal(true);
    } catch (e) {
      console.error('Lỗi tải chi tiết vai trò', e.response?.data || e.message);
    }
  }

  async function saveRole() {
    if (!editingRole) return;
    const payload = {
      ten_vt: editingRole.ten_vt?.trim() || '',
      mo_ta: editingRole.mo_ta || '',
      quyen_han: Array.isArray(editingRole.quyen_han) ? editingRole.quyen_han : []
    };
    try {
      if (isCreate) await http.post('/admin/roles', payload);
      else await http.put(`/admin/roles/${editingRole.id}`, payload);
      setShowRoleModal(false);
      setEditingRole(null);
      const rs = extractRolesFromAxiosResponse(await http.get('/admin/roles'));
      setRoles(rs);
      if (!roleFilter && rs[0]) setRoleFilter(rs[0]);
      fetchRoleCounts(rs);
    } catch (e) {
      console.error('Lưu vai trò thất bại', e.response?.data || e.message);
    }
  }

  async function deleteRole(roleId) {
    if (!window.confirm('Bạn có chắc muốn xóa vai trò này?')) return;
    try {
      await http.delete(`/admin/roles/${roleId}`);
      const rs = extractRolesFromAxiosResponse(await http.get('/admin/roles'));
      setRoles(rs);
      if (!rs.find(r => r.id === roleFilter?.id)) setRoleFilter(rs[0] || null);
      fetchRoleCounts(rs);
    } catch (e) {
      console.error('Xóa vai trò thất bại', e.response?.data || e.message);
    }
  }

  // Legacy slugs (current UI)
  const LEGACY_PERMISSION_SLUGS = [
    'users.read','users.write','users.delete',
    'activities.read','activities.write','activities.delete','activities.approve',
    'registrations.read','registrations.write','registrations.delete',
    'attendance.read','attendance.write','attendance.delete',
    'reports.read','reports.export','roles.read','roles.write','roles.delete',
    'notifications.read','notifications.write','notifications.delete',
    'students.read','students.update','classmates.read','classmates.assist',
    'profile.read','profile.update','scores.read',
    'system.manage','system.configure',
    'activityTypes.read','activityTypes.write','activityTypes.delete'
  ];

  // Canonical slugs (backend aligned) for testing
  const CANONICAL_PERMISSION_SLUGS = [
    'users.read','users.write','users.delete',
    'activities.view','activities.create','activities.update','activities.delete','activities.approve','activities.reject',
    'registrations.register','registrations.cancel','registrations.approve','registrations.reject',
    'attendance.view','attendance.mark',
    'reports.read','reports.export','roles.read','roles.write','roles.delete',
    'notifications.view','notifications.create','notifications.manage',
    'students.read','students.update','classmates.read','classmates.assist',
    'profile.read','profile.update','scores.read',
    'system.manage','system.configure',
    'activityTypes.read','activityTypes.write','activityTypes.delete'
  ];

  // Mapping legacy UI slugs to canonical slugs for display in test mode
  const LEGACY_TO_CANONICAL = {
    'activities.read': ['activities.view'],
    'activities.write': ['activities.update'],
    'activities.delete': ['activities.delete'],
    'activities.approve': ['activities.approve'],
    'registrations.read': [],
    'registrations.write': ['registrations.approve','registrations.reject'],
    'registrations.delete': [],
    'attendance.read': ['attendance.view'],
    'attendance.write': ['attendance.mark'],
    'attendance.delete': [],
    'notifications.read': ['notifications.view'],
    'notifications.write': ['notifications.create'],
    'notifications.delete': ['notifications.manage'],
    // passthroughs
    'users.read': ['users.read'], 'users.write': ['users.write'], 'users.delete': ['users.delete'],
    'reports.read': ['reports.read'], 'reports.export': ['reports.export'],
    'roles.read': ['roles.read'], 'roles.write': ['roles.write'], 'roles.delete': ['roles.delete'],
    'students.read': ['students.read'], 'students.update': ['students.update'],
    'classmates.read': ['classmates.read'], 'classmates.assist': ['classmates.assist'],
    'profile.read': ['profile.read'], 'profile.update': ['profile.update'],
    'scores.read': ['scores.read'],
    'system.manage': ['system.manage'], 'system.configure': ['system.configure'],
    'activityTypes.read': ['activityTypes.read'], 'activityTypes.write': ['activityTypes.write'], 'activityTypes.delete': ['activityTypes.delete']
  };

  // Project current role permissions into canonical space (for display only)
  const toCanonicalSet = (list) => {
    const set = new Set();
    (Array.isArray(list) ? list : []).forEach((p) => {
      if (CANONICAL_PERMISSION_SLUGS.includes(p)) set.add(p);
      else if (LEGACY_TO_CANONICAL[p]) LEGACY_TO_CANONICAL[p].forEach((q) => set.add(q));
    });
    return set;
  };

  const roleNotes = [
    { key: 'ADMIN', name: 'ADMIN', icon: getRoleIcon('ADMIN'), color: '#fff7ed', items: [
      'Quản trị hệ thống, người dùng, vai trò',
      'Quản lý loại hoạt động'
    ] },
    { key: 'GIANG_VIEN', name: 'GIẢNG VIÊN', icon: getRoleIcon('GIANG_VIEN'), color: '#eff6ff', items: [
      'Tạo và quản lý hoạt động',
      'Điểm danh, theo dõi đăng ký'
    ] },
    { key: 'LOP_TRUONG', name: 'LỚP TRƯỞNG', icon: getRoleIcon('LOP_TRUONG'), color: '#f5f3ff', items: [
      'Theo dõi hoạt động lớp',
      'Hỗ trợ điểm danh'
    ] },
    { key: 'SINH_VIEN', name: 'SINH VIÊN', icon: getRoleIcon('SINH_VIEN'), color: '#f0fdf4', items: [
      'Đăng ký tham gia hoạt động',
      'Xem điểm rèn luyện'
    ] }
  ];

  if (authError) {
    return (
      <div style={{ padding: 24 }}>Bạn không có quyền truy cập hoặc phiên đã hết hạn.</div>
    );
  }

  const roleNameLower = (roleFilter?.ten_vt || '').toLowerCase();
  const isStudent = roleNameLower.includes('sinh');
  const isAdmin = roleNameLower.includes('admin');

  function applySearch() {
    setSearchApplied(searchTerm.trim());
    setUserPage(1);
  }

  async function fetchUsers({ page = 1, limit = 10, role = '', search = '' } = {}) {
    try {
      setUsersLoading(true);
      const resp = await http.get('/admin/users', { params: { page, limit, role, search } });
      const list = extractUsersFromAxiosResponse(resp);
      setUsers(list);
      const total = resp?.data?.data?.pagination?.total;
      setUserTotal(typeof total === 'number' ? total : list.length);
    } catch (e) {
      console.error('Lỗi tải người dùng', e.response?.data || e.message);
      setUsers([]);
      setUserTotal(0);
    } finally {
      setUsersLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Vai trò & Quyền</h2>
  <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm theo tên/email" style={{ ...inputStyle, paddingLeft: 32, width: 260 }} />
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          </div>
          <button onClick={applySearch} style={buttonStyle}>Tìm</button>
          <button onClick={() => {
            setUseCanonicalSlugs((prev) => {
              const next = !prev;
              if (next && roleFilter && !permsBackupByRoleId[roleFilter.id]) {
                setPermsBackupByRoleId((m) => ({ ...m, [roleFilter.id]: Array.isArray(roleFilter.quyen_han) ? [...roleFilter.quyen_han] : [] }));
              }
              return next;
            });
          }}
            title="Bật tạm thời để test với slug chuẩn 1-1 backend"
            style={{ ...buttonStyle, background: useCanonicalSlugs ? '#dcfce7' : '#eef2ff', borderColor: useCanonicalSlugs ? '#86efac' : '#c7d2fe', color: useCanonicalSlugs ? '#166534' : '#4338ca' }}>
            <Lock size={16} /> {useCanonicalSlugs ? 'TEST: Slug chuẩn' : 'Dùng slug chuẩn (test)'}
          </button>
          <button onClick={openCreateRole} style={{ ...buttonStyle, background: '#eef2ff', borderColor: '#c7d2fe', color: '#4338ca' }}>
            <Plus size={16} /> Tạo vai trò
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {roles.map((r) => {
          const active = roleFilter?.id === r.id;
          return (
            <button key={r.id} onClick={() => { setRoleFilter(r); setUserPage(1); }}
              style={{ ...buttonStyle, borderColor: active ? '#3b82f6' : '#e5e7eb', background: active ? '#eff6ff' : 'white', color: active ? '#1d4ed8' : '#374151' }}>
              {getRoleIcon(r.ten_vt)} <span>{r.ten_vt}</span>
              <span style={{ color: '#6b7280' }}> ({roleCounts[r.id] ?? 0})</span>
            </button>
          );
        })}
      </div>

      {/* Permission editor for selected role */}
      {roleFilter && (
        <RolePermissionEditor
          role={useCanonicalSlugs ? { ...roleFilter, quyen_han: Array.from(toCanonicalSet(roleFilter.quyen_han)) } : roleFilter}
          allPermissions={useCanonicalSlugs ? CANONICAL_PERMISSION_SLUGS : LEGACY_PERMISSION_SLUGS}
          useCanonical={useCanonicalSlugs}
          onRestoreOriginal={useCanonicalSlugs && permsBackupByRoleId[roleFilter.id]?.length ? async () => {
            try {
              const orig = permsBackupByRoleId[roleFilter.id] || [];
              await http.put(`/admin/roles/${roleFilter.id}`, { ten_vt: roleFilter.ten_vt, mo_ta: roleFilter.mo_ta, quyen_han: orig });
              const rs = extractRolesFromAxiosResponse(await http.get('/admin/roles'));
              setRoles(rs);
              const cur = rs.find(r => r.id === roleFilter.id) || rs[0] || null;
              setRoleFilter(cur);
              fetchRoleCounts(rs);
            } catch (e) {
              console.error('Khôi phục quyền cũ thất bại', e.response?.data || e.message);
            }
          } : null}
          onSaved={async (updated) => {
            try {
              await http.put(`/admin/roles/${roleFilter.id}`, {
                ten_vt: updated.ten_vt,
                mo_ta: updated.mo_ta,
                quyen_han: updated.quyen_han,
              });
              // Refresh roles & counts and keep selection
              const rs = extractRolesFromAxiosResponse(await http.get('/admin/roles'));
              setRoles(rs);
              const cur = rs.find(r => r.id === roleFilter.id) || rs[0] || null;
              setRoleFilter(cur);
              fetchRoleCounts(rs);
            } catch (e) {
              console.error('Cập nhật quyền vai trò lỗi', e.response?.data || e.message);
            }
          }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.6fr', padding: '8px 10px', background: '#f9fafb', color: '#6b7280', fontWeight: 600, borderRadius: 8 }}>
        <div>Thông tin</div>
        <div>Email</div>
        {isStudent ? (<><div>Lớp</div><div>Khoa</div></>) : isAdmin ? (<><div>Quyền</div><div>HĐ tạo</div></>) : (<><div>Lớp CN</div><div>HĐ tạo</div></>)}
        <div>Trạng thái</div>
      </div>

      {usersLoading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Đang tải người dùng...</div>
      ) : users.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Không có người dùng</div>
      ) : (
        users.map((u) => {
          const avatar = u?.sinh_vien ? getStudentAvatar(u.sinh_vien) : getUserAvatar(u);
          const roleName = u?.vai_tro?.ten_vt || roleFilter?.ten_vt || '';
          const roleClr = (() => {
            const name = String(roleName || '').toLowerCase();
            if (name.includes('admin')) return { bg: '#fef2f2', color: '#dc2626' };
            if (name.includes('giảng') || name.includes('giang')) return { bg: '#fef3c7', color: '#92400e' };
            if (name.includes('lớp') || name.includes('lop')) return { bg: '#dbeafe', color: '#1e40af' };
            if (name.includes('sinh')) return { bg: '#dcfce7', color: '#15803d' };
            return { bg: '#f3f4f6', color: '#374151' };
          })();
          return (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.6fr', padding: '10px 12px', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {avatar.hasValidAvatar ? (
                  <img src={avatar.src} alt={avatar.alt}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid ' + roleClr.bg }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                ) : null}
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: roleClr.bg, color: roleClr.color, display: avatar.hasValidAvatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  {avatar.fallback}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.ho_ten || u.hoten || ''}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{u.maso || u.ten_dn || ''}</div>
                </div>
              </div>
              <div>{u.email || ''}</div>
              {isStudent ? (
                <>
                  <div>{u.lop || ''}</div>
                  <div>{u.khoa || ''}</div>
                </>
              ) : isAdmin ? (
                <>
                  <div>{u.quyen_count ?? 0}</div>
                  <div>{u.so_hd_tao ?? 0}</div>
                </>
              ) : (
                <>
                  <div>{u.so_lop_cn ?? 0}</div>
                  <div>{u.so_hd_tao ?? 0}</div>
                </>
              )}
              <div>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 9999, background: u.trang_thai === 'hoat_dong' ? '#dcfce7' : '#fee2e2', color: u.trang_thai === 'hoat_dong' ? '#166534' : '#991b1b' }}>
                  {u.trang_thai === 'hoat_dong' ? 'Hoạt động' : 'Khóa'}
                </span>
              </div>
            </div>
          );
        })
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <div style={{ color: '#6b7280', fontSize: 13 }}>
          Đang hiển thị {users.length ? (userPage - 1) * userLimit + 1 : 0} - {Math.min(userPage * userLimit, userTotal)} / {userTotal}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={userPage <= 1} onClick={() => setUserPage(p => Math.max(1, p - 1))} style={{ ...buttonStyle, opacity: userPage <= 1 ? 0.6 : 1 }}>Trước</button>
          <div style={{ alignSelf: 'center', color: '#6b7280', fontSize: 13 }}>Trang {userPage} / {Math.max(1, Math.ceil(userTotal / userLimit))}</div>
          <button disabled={userPage >= Math.ceil(userTotal / userLimit)} onClick={() => setUserPage(p => Math.min(Math.ceil(userTotal / userLimit), p + 1))} style={{ ...buttonStyle, opacity: userPage >= Math.ceil(userTotal / userLimit) ? 0.6 : 1 }}>Tiếp</button>
        </div>
      </div>

      {showRoleModal && editingRole && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 12, width: '92%', maxWidth: 780, maxHeight: '90%', overflow: 'auto', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: 0 }}>{isCreate ? 'Tạo vai trò mới' : 'Chỉnh sửa vai trò'}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveRole} style={{ ...buttonStyle, background: '#10b981', color: 'white', borderColor: '#10b981' }}>
                  <Save size={16} /> Lưu
                </button>
                <button onClick={() => { setShowRoleModal(false); setEditingRole(null); }} style={{ ...buttonStyle }}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Tên vai trò</label>
                <input value={editingRole.ten_vt || ''} onChange={(e) => setEditingRole({ ...editingRole, ten_vt: e.target.value })} style={inputStyle} placeholder="VD: ADMIN, GIANG_VIEN" />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Mô tả</label>
                <textarea value={editingRole.mo_ta || ''} onChange={(e) => setEditingRole({ ...editingRole, mo_ta: e.target.value })} style={{ ...inputStyle, minHeight: 80 }} placeholder="Mô tả vai trò" />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Quyền hạn</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {(useCanonicalSlugs ? CANONICAL_PERMISSION_SLUGS : LEGACY_PERMISSION_SLUGS).map(p => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={useCanonicalSlugs
                          ? Array.from(toCanonicalSet(editingRole.quyen_han)).includes(p)
                          : (Array.isArray(editingRole.quyen_han) && editingRole.quyen_han.includes(p))}
                        onChange={(e) => {
                          const base = useCanonicalSlugs
                            ? Array.from(toCanonicalSet(editingRole.quyen_han))
                            : (Array.isArray(editingRole.quyen_han) ? editingRole.quyen_han : []);
                          const next = new Set(base);
                          if (e.target.checked) next.add(p); else next.delete(p);
                          setEditingRole({ ...editingRole, quyen_han: Array.from(next) });
                        }}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RolePermissionEditor({ role, allPermissions, onSaved, useCanonical, onRestoreOriginal }) {
  const [name, setName] = React.useState(role.ten_vt || '');
  const [desc, setDesc] = React.useState(role.mo_ta || '');
  const [setDirty, setSetDirty] = React.useState(false);
  const [selected, setSelected] = React.useState(Array.isArray(role.quyen_han) ? new Set(role.quyen_han) : new Set());

  React.useEffect(() => {
    setName(role.ten_vt || '');
    setDesc(role.mo_ta || '');
    setSelected(new Set(Array.isArray(role.quyen_han) ? role.quyen_han : []));
    setSetDirty(false);
  }, [role?.id]);

  const buttonStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14
  };

  const toggle = (perm) => {
    const next = new Set(selected);
    if (next.has(perm)) next.delete(perm); else next.add(perm);
    setSelected(next);
    setSetDirty(true);
  };

  const save = () => {
    onSaved?.({ ten_vt: name.trim(), mo_ta: desc, quyen_han: Array.from(selected) });
    setSetDirty(false);
  };

  const reset = () => {
    setName(role.ten_vt || '');
    setDesc(role.mo_ta || '');
    setSelected(new Set(Array.isArray(role.quyen_han) ? role.quyen_han : []));
    setSetDirty(false);
  };

  return (
    <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa', display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Tên vai trò</label>
          <input style={inputStyle} value={name} onChange={(e) => { setName(e.target.value); setSetDirty(true); }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Mô tả</label>
          <input style={inputStyle} value={desc} onChange={(e) => { setDesc(e.target.value); setSetDirty(true); }} />
        </div>
      </div>
      <div style={{ fontWeight: 600 }}>Quyền của vai trò: {role.ten_vt} {useCanonical ? '(slug chuẩn - test)' : ''}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {allPermissions.map((p) => {
          const active = selected.has(p);
          return (
            <button key={p} onClick={() => toggle(p)}
              style={{ ...buttonStyle, borderColor: active ? '#c7d2fe' : '#e5e7eb', background: active ? '#eef2ff' : 'white', color: active ? '#4338ca' : '#374151' }}>
              {p}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {useCanonical && typeof onRestoreOriginal === 'function' ? (
          <button onClick={onRestoreOriginal} style={{ ...buttonStyle, background: '#fff7ed', borderColor: '#fdba74', color: '#b45309' }}>Khôi phục quyền gốc</button>
        ) : null}
        <button disabled={!setDirty} onClick={reset} style={{ ...buttonStyle, opacity: setDirty ? 1 : 0.6 }}>Hoàn tác</button>
        <button disabled={!setDirty} onClick={save} style={{ ...buttonStyle, background: setDirty ? '#10b981' : '#d1d5db', color: 'white', borderColor: setDirty ? '#10b981' : '#d1d5db', cursor: setDirty ? 'pointer' : 'not-allowed' }}>Lưu</button>
      </div>
    </div>
  );
}
