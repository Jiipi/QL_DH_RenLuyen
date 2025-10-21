// Utility functions to normalize various API responses to the shape expected by legacy UI code
// Centralizing this prevents scattered fragile optional-chaining logic everywhere.

/**
 * Normalize users list returned by /admin/users endpoint.
 * Backend shape: { success, message, data: { users: [ { id, maso, hoten, email, role, lop, khoa, sdt, trang_thai, ngay_tao, sinh_vien } , ...], pagination } }
 * Existing UI expects (historically): { ten_dn, ho_ten, vai_tro: { ten_vt }, trang_thai, sinh_vien, ... }
 * We map the new flattened keys back while still exposing the original keys for any newer code.
 */
export function normalizeUsersResponse(apiResponse) {
  if (!apiResponse) return [];
  // Accept already-extracted data segment or full axios response.data
  const container = apiResponse.data?.users ? apiResponse.data : apiResponse;
  const rawUsers = container.users || [];
  if (!Array.isArray(rawUsers)) return [];

  return rawUsers.map(u => {

    // ---- Robust status mapping ----
    const statusRaw = u.trang_thai ?? u.trangThai ?? u.status ?? u.state;
    // Booleans or flags
    const isLocked = u.is_locked === true || u.bi_khoa === true || u.khoa === true || !!u.locked_at;
    const isActiveFlag = u.is_active === true || u.kich_hoat === true;
    let trang_thai;
    if (isLocked) {
      trang_thai = 'khoa';
    } else if (typeof statusRaw === 'string') {
      const s = statusRaw.toLowerCase();
      if (['khoa','locked','bi_khoa','disabled','suspended'].includes(s)) trang_thai = 'khoa';
      else if (['hoat_dong','active','online'].includes(s)) trang_thai = 'hoat_dong';
      else if (['khong_hoat_dong','inactive','offline'].includes(s)) trang_thai = 'khong_hoat_dong';
      else trang_thai = undefined;
    } else if (isActiveFlag) {
      trang_thai = 'hoat_dong';
    }
    // Derive from recent activity if still undefined
    if (!trang_thai) {
      const lastActive = u.last_active || u.lastActive || u.last_login || u.lastLogin || u.loggedAt;
      if (lastActive) {
        const t = new Date(lastActive).getTime();
        const now = Date.now();
        // Consider active if within last 15 minutes
        trang_thai = !isNaN(t) && (now - t) <= 15 * 60 * 1000 ? 'hoat_dong' : 'khong_hoat_dong';
      } else {
        // Safe default: not active
        trang_thai = 'khong_hoat_dong';
      }
    }

    return {
      // Legacy fields
      id: u.id,
      ten_dn: u.maso || u.ten_dn || '',
      ho_ten: u.hoten || u.ho_ten || '',
      email: u.email || '',
      trang_thai,
      vai_tro_id: u.vai_tro_id || u.roleId || null, // ✅ CRITICAL: Map vai_tro_id for role filtering
      vai_tro: u.vai_tro || { ten_vt: u.role || 'Sinh viên' }, // Keep full vai_tro object if present
      sinh_vien: u.sinh_vien || null,
      // Additional convenience / original fields
      maso: u.maso || u.ten_dn || '',
      hoten: u.hoten || u.ho_ten || '',
      role: u.role || u.vai_tro?.ten_vt || 'Sinh viên',
      lop: u.lop || u.sinh_vien?.lop?.ten_lop || '',
      khoa: u.khoa || u.sinh_vien?.lop?.khoa || '',
      sdt: u.sdt || u.sinh_vien?.sdt || '',
      // Likely avatar fields (surface for consumers)
      anh_dai_dien: u.anh_dai_dien || u.avatar || u.profile_image || u.hinh_anh || u.hinh_dai_dien || u.image || u.photo || u.avatar_url || u.sinh_vien?.anh_dai_dien || u.sinh_vien?.avatar,
      // New backend enrichments for non-students
      so_lop_cn: u.so_lop_cn ?? u._count?.lops_chu_nhiem ?? 0,
      so_hd_tao: u.so_hd_tao ?? u._count?.hoat_dong_tao ?? 0,
      quyen_count: u.quyen_count ?? (Array.isArray(u.vai_tro?.quyen_han) ? u.vai_tro.quyen_han.length : undefined),
      ngay_tao: u.ngay_tao || u.createdAt || null,
      original: u
    };
  });
}

export function extractUsersFromAxiosResponse(axiosResponse) {
  // axiosResponse.data is envelope { success, message, data, statusCode }
  const envelope = axiosResponse?.data;
  const usersArray = envelope?.data?.users || envelope?.data?.items; // Preferred paths (users list or generic items)
  if (Array.isArray(usersArray)) return normalizeUsersResponse({ users: usersArray });
  // Fallbacks for previous experimental shapes
  if (Array.isArray(envelope?.users)) return normalizeUsersResponse({ users: envelope.users });
  return [];
}

// -------- Activities Normalization --------
export function normalizeActivitiesResponse(container) {
  if (!container) return [];
  const raw = container.activities || container.data?.activities || container;
  const list = raw.activities && Array.isArray(raw.activities) ? raw.activities : Array.isArray(raw) ? raw : [];
  return list.map(a => ({
    ...a,
    // Ensure expected fields exist with safe fallbacks
    ten_hd: a.ten_hd || a.name || '',
    ma_hd: a.ma_hd || a.code || '',
    trang_thai: a.trang_thai || a.status || 'cho_duyet',
    diem_rl: a.diem_rl ?? a.points ?? 0,
    loai_hd: a.loai_hd || a.activity_type || null
  }));
}

export function extractActivitiesFromAxiosResponse(resp) {
  const envelope = resp?.data;
  const dataNode = envelope?.data;
  const arr = dataNode?.activities || dataNode?.items || envelope?.activities;
  if (Array.isArray(arr)) return normalizeActivitiesResponse({ activities: arr });
  return normalizeActivitiesResponse(dataNode);
}

// -------- Roles Normalization --------
export function normalizeRolesResponse(container) {
  if (!container) return [];
  const raw = container.roles || container.data?.roles || container;
  const list = raw.roles && Array.isArray(raw.roles) ? raw.roles : Array.isArray(raw) ? raw : [];
  return list.map(r => ({
    ...r,
    id: r.id,
    ten_vai_tro: r.ten_vai_tro || r.ten_vt || r.name || '',
    ten_vt: r.ten_vt || r.ten_vai_tro || r.name || '',
    trang_thai: r.trang_thai || r.status || 'kich_hoat',
    quyen_han: Array.isArray(r.quyen_han) ? r.quyen_han : (Array.isArray(r.permissions) ? r.permissions : []),
    mau_sac: r.mau_sac || r.color || '#3b82f6',
    uu_tien: r.uu_tien ?? r.priority ?? 1
  }));
}

export function extractRolesFromAxiosResponse(resp) {
  const envelope = resp?.data;
  const arr = envelope?.data?.roles || envelope?.data?.items || envelope?.roles;
  if (Array.isArray(arr)) return normalizeRolesResponse({ roles: arr });
  return normalizeRolesResponse(envelope?.data);
}

// -------- Attendance Normalization --------
export function normalizeAttendanceResponse(container) {
  if (!container) return [];
  const raw = container.attendance || container.data?.attendance || container;
  const list = raw.attendance && Array.isArray(raw.attendance) ? raw.attendance : Array.isArray(raw) ? raw : [];
  return list.map(rec => ({
    ...rec,
    trang_thai: rec.trang_thai || rec.status || 'co_mat',
    thoi_gian_diem_danh: rec.thoi_gian_diem_danh || rec.tg_diem_danh || rec.timestamp || null,
    hoat_dong: rec.hoat_dong || rec.activity || null,
    sinh_vien: rec.sinh_vien || rec.student || null
  }));
}

export function extractAttendanceFromAxiosResponse(resp) {
  const envelope = resp?.data;
  const arr = envelope?.data?.attendance || envelope?.data?.items || envelope?.attendance;
  if (Array.isArray(arr)) return normalizeAttendanceResponse({ attendance: arr });
  return normalizeAttendanceResponse(envelope?.data);
}

// -------- Registrations Normalization --------
export function normalizeRegistrationsResponse(container) {
  if (!container) return [];
  const raw = container.registrations || container.data?.registrations || container;
  const list = raw.registrations && Array.isArray(raw.registrations) ? raw.registrations : Array.isArray(raw) ? raw : [];
  return list.map(r => ({
    ...r,
    trang_thai: r.trang_thai || r.status || 'cho_duyet',
    hoat_dong: r.hoat_dong || r.activity || null,
    sinh_vien: r.sinh_vien || r.student || null
  }));
}

export function extractRegistrationsFromAxiosResponse(resp) {
  const envelope = resp?.data;
  const arr = envelope?.data?.registrations || envelope?.data?.items || envelope?.registrations;
  if (Array.isArray(arr)) return normalizeRegistrationsResponse({ registrations: arr });
  return normalizeRegistrationsResponse(envelope?.data);
}

// -------- Activity Types Normalization --------
export function normalizeActivityTypesResponse(container) {
  if (!container) return [];
  const raw = container.activityTypes || container.data?.activityTypes || container;
  const list = raw.activityTypes && Array.isArray(raw.activityTypes) ? raw.activityTypes : Array.isArray(raw) ? raw : [];
  return list.map(t => ({
    ...t,
    ten_loai_hd: t.ten_loai_hd || t.name || '',
    ma_loai: t.ma_loai || t.code || '',
    trang_thai: t.trang_thai || t.status || 'kich_hoat'
  }));
}

export function extractActivityTypesFromAxiosResponse(resp) {
  const envelope = resp?.data;
  const arr = envelope?.data?.activityTypes || envelope?.data?.items || envelope?.activityTypes;
  if (Array.isArray(arr)) return normalizeActivityTypesResponse({ activityTypes: arr });
  return normalizeActivityTypesResponse(envelope?.data);
}

// -------- Notifications Normalization --------
export function normalizeNotificationsResponse(container) {
  if (!container) return [];
  const raw = container.notifications || container.data?.notifications || container;
  const list = raw.notifications && Array.isArray(raw.notifications) ? raw.notifications : Array.isArray(raw) ? raw : [];
  return list.map(n => ({
    ...n,
    tieu_de: n.tieu_de || n.title || '',
    noi_dung: n.noi_dung || n.content || '',
    trang_thai: n.trang_thai || n.status || 'draft'
  }));
}

export function extractNotificationsFromAxiosResponse(resp) {
  const envelope = resp?.data;
  const arr = envelope?.data?.notifications || envelope?.data?.items || envelope?.notifications;
  if (Array.isArray(arr)) return normalizeNotificationsResponse({ notifications: arr });
  return normalizeNotificationsResponse(envelope?.data);
}

// -------- Reports Normalization (generic list or object) --------
export function normalizeReportsResponse(container) {
  if (!container) return container;
  // Often reports are objects with aggregates; just return as-is but ensure arrays within are arrays.
  const clone = { ...container };
  ['activities','users','registrations','attendance'].forEach(k => {
    if (clone[k] && !Array.isArray(clone[k])) {
      clone[k] = Array.isArray(clone[k].data) ? clone[k].data : []; // fallback
    }
  });
  return clone;
}

export function extractReportsFromAxiosResponse(resp) {
  const envelope = resp?.data;
  return normalizeReportsResponse(envelope?.data || envelope);
}
