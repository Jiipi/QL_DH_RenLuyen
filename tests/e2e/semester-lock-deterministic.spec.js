// Deterministic E2E: create real data, lock semester, assert 423s, cleanup
// Run with: node tests/e2e/semester-lock-deterministic.spec.js
// Requires valid credentials and API running locally
const axios = require('axios').default;

const API = process.env.API_URL || 'http://localhost:3001/api';

async function login(maso, password) {
  const res = await axios.post(`${API}/auth/login`, { maso, password });
  return res.data?.data?.token || res.data?.token;
}

async function getAnyClassId(token) {
  // Prefer deriving classId from student status when possible
  try {
    const status = await axios.get(`${API}/semesters/status`, { headers: { Authorization: `Bearer ${token}` } });
    const cid = status.data?.data?.classId;
    if (cid) return cid;
  } catch (_) {}
  // Try admin classes list to pick an isolated class (0 students)
  try {
    const clsRes = await axios.get(`${API}/admin/classes`, { headers: { Authorization: `Bearer ${token}` } });
    const classes = clsRes.data?.data || [];
    const emptyClass = classes.find(c => (c.soLuongSinhVien || 0) === 0);
    if (emptyClass?.id) return emptyClass.id;
    if (classes[0]?.id) return classes[0].id;
  } catch (_) {}
  // Fallback to faculties/classes discovery (admin scope)
  try {
    const fac = await axios.get(`${API}/auth/faculties`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }));
    const faculties = fac.data?.data || [];
    const faculty = faculties[0]?.value || faculties[0] || null;
    if (!faculty) return null;
    const cls = await axios.get(`${API}/auth/classes`, { params: { faculty }, headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }));
    const classes = cls.data?.data || [];
    return classes[0]?.value || classes[0]?.id || null;
  } catch (_) {
    return null;
  }
}

async function ensureActivityType(adminToken) {
  // 1) Try general list via any allowed role (admin token first)
  try {
    const res = await axios.get(`${API}/activities/types/list`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const list = res.data?.data || [];
    if (Array.isArray(list) && list.length > 0) return list[0].id;
  } catch (_) {}

  // 2) Try create via Admin endpoint (if DB grants activityTypes.write)
  try {
    const create = await axios.post(`${API}/admin/activity-types`, {
      ten_loai_hd: `E2E Type ${Date.now()}`,
      mo_ta: 'E2E created type',
      diem_toi_da: 10,
      diem_mac_dinh: 1,
      mau_sac: '#66cc66'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    const id = create.data?.data?.id;
    if (id) return id;
  } catch (_) {}

  // 3) Fallback: use a Teacher to create one via /teacher/activity-types
  const teacherToken = await getTeacherTokenOrProvision(adminToken);
  const tCreate = await axios.post(`${API}/teacher/activity-types`, {
    ten_loai_hd: `E2E Type ${Date.now()}`,
    mo_ta: 'E2E created type via teacher',
    diem_toi_da: 10,
    diem_mac_dinh: 1,
    mau_sac: '#33aaff'
  }, { headers: { Authorization: `Bearer ${teacherToken}` } });
  return tCreate.data?.data?.id;
}

async function getTeacherTokenOrProvision(adminToken) {
  // Try to discover a demo teacher first
  try {
    const demo = await axios.get(`${API}/auth/demo-accounts`).catch(() => null);
    const list = demo?.data?.data || [];
    for (const acc of list) {
      const maso = acc?.username;
      const password = acc?.password;
      if (!maso || !password) continue;
      try {
        const token = await login(maso, password);
        // Verify teacher access by calling a teacher endpoint
        await axios.get(`${API}/teacher/activity-types`, { headers: { Authorization: `Bearer ${token}` } });
        return token; // success: this is a teacher
      } catch (_) {
        // not a teacher or cannot access -> try next
      }
    }
  } catch (_) {}

  // Provision a teacher via Admin API
  const uniq = Date.now();
  const maso = `e2e_gv_${uniq}`;
  const email = `${maso}@dlu.edu.vn`;
  const password = 'Teacher@12345';
  try {
    await axios.post(`${API}/admin/users`, {
      maso,
      hoten: 'E2E Teacher',
      email,
      password,
      role: 'GIANG_VIEN'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
  } catch (e) {
    // If user already exists we still try to login below
  }
  // Login with the newly created teacher
  return await login(maso, password);
}

async function createClassActivity(token, loai_hd_id, semesterStr) {
  const now = new Date();
  const start = new Date(now.getTime() + 24 * 3600 * 1000); // tomorrow
  const end = new Date(now.getTime() + 2 * 24 * 3600 * 1000); // day after
  const [hoc_ky, year] = semesterStr.split('-');
  const res = await axios.post(`${API}/activities`, {
    ten_hd: `E2E SoftLock ${Date.now()}`,
    mo_ta: 'Test activity for lock E2E',
    loai_hd_id,
    diem_rl: 5,
    dia_diem: 'Khu A',
    ngay_bd: start.toISOString(),
    ngay_kt: end.toISOString(),
    han_dk: start.toISOString(),
    sl_toi_da: 10,
    hoc_ky,
    nam_hoc: year
  }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data?.data?.id || res.data?.data?.id;
}

async function getCurrentSemester(token, classId) {
  const status = await axios.get(`${API}/semesters/status`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { classId }
  });
  const sem = status.data?.data?.semester;
  return `${sem.semester}-${sem.year}`;
}

async function softLock(token, classId, semesterStr) {
  await axios.post(`${API}/semesters/${classId}/soft-lock`, { semester: semesterStr, graceHours: 1 }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
async function proposeClose(token, classId, semesterStr) {
  await axios.post(`${API}/semesters/${classId}/propose-close`, { semester: semesterStr }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function rollback(token, classId, semesterStr) {
  await axios.post(`${API}/semesters/${classId}/rollback`, { semester: semesterStr }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function approveRegistration(approverToken, regId) {
  await axios.post(`${API}/activities/registrations/${regId}/approve`, {}, {
    headers: { Authorization: `Bearer ${approverToken}` }
  });
}

(async () => {
  // Preferred creds from user instruction
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin@123';
  const TEACHER_USER = process.env.TEACHER_USER || 'gv1';
  const TEACHER_PASS = process.env.TEACHER_PASS || '123456';
  // Intentionally do not reuse an existing student for deterministic isolation

  try {
    const adminToken = await login(ADMIN_USER, ADMIN_PASS);

    // Try login as predefined teacher; if fails, provision via admin
    let teacherToken;
    try {
      teacherToken = await login(TEACHER_USER, TEACHER_PASS);
    } catch (_) {
      teacherToken = await getTeacherTokenOrProvision(adminToken);
    }

    // Determine classId using admin, prefer an empty class to avoid pending checklist
    let classId = await getAnyClassId(adminToken);
    if (!classId) {
      console.log('SKIP: No class found via status/faculties');
      return;
    }

    const semesterStr = await getCurrentSemester(adminToken, classId);
    const loai_hd_id = await ensureActivityType(adminToken);

    // Best-effort cleanup: ensure semester is ACTIVE before proceeding
    try {
      await rollback(adminToken, classId, semesterStr);
    } catch (_) {}

    // Create an activity by teacher if possible (else admin), within current semester
    const creatorToken = teacherToken || adminToken;
    const activityId = await createClassActivity(creatorToken, loai_hd_id, semesterStr);

    // Provision a fresh student in this isolated class
    let studentToken = null;
    const uniq = Date.now();
    const regUser = await axios.post(`${API}/auth/register`, {
      name: `E2E Student ${uniq}`,
      maso: String(1000000 + (uniq % 8999999)),
      email: `e2e_${uniq}@test.local`,
      password: 'E2E@12345',
      confirmPassword: 'E2E@12345',
      lopId: classId
    });
    studentToken = regUser.data?.data?.token;
    if (!studentToken) throw new Error('Failed to provision student');

    // Student registers (before lock)
    const regRes = await axios.post(`${API}/activities/${activityId}/register`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
    const regId = regRes.data?.data?.id;

    // Approve registration to avoid pending checklist during soft-lock
    const approver = teacherToken || adminToken;
    if (regId) {
      await approveRegistration(approver, regId);
    }

    // Propose closing semester (lighter precondition), then try soft-lock if needed
    try {
      await proposeClose(adminToken, classId, semesterStr);
    } catch (_) {}
    try {
      await softLock(adminToken, classId, semesterStr);
    } catch (e) {
      // Ignore checklist failure here; CLOSING state already enforces 423
    }

    // Student cancel should 423
    let got423 = false;
    try {
      await axios.post(`${API}/activities/${activityId}/cancel`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
    } catch (e) {
      console.log('Cancel error status:', e?.response?.status, 'body:', e?.response?.data);
      got423 = e?.response?.status === 423;
    }
    console.log('Cancel locked =', got423 ? 'PASS' : 'FAIL');

    // Student attendance should 423
    got423 = false;
    try {
      await axios.post(`${API}/activities/${activityId}/attendance`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
    } catch (e) {
      console.log('Attendance error status:', e?.response?.status, 'body:', e?.response?.data);
      got423 = e?.response?.status === 423;
    }
    console.log('Attendance locked =', got423 ? 'PASS' : 'FAIL');

    // Cleanup: rollback
    await rollback(adminToken, classId, semesterStr);
  } catch (e) {
    console.error('Deterministic E2E failed:', e?.response?.status, e?.response?.data || e.message);
    process.exit(1);
  }
})();
