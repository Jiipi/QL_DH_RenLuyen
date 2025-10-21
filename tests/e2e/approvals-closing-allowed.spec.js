// E2E: Approvals allowed during CLOSING (semester propose-close)
// Run with: node tests/e2e/approvals-closing-allowed.spec.js
const axios = require('axios').default;

const API = process.env.API_URL || 'http://localhost:3001/api';

async function login(maso, password) {
  const res = await axios.post(`${API}/auth/login`, { maso, password });
  return res.data?.data?.token || res.data?.token;
}

async function getAdminTeacher() {
  const admin = await login(process.env.ADMIN_USER || 'admin', process.env.ADMIN_PASS || 'Admin@123');
  let teacher;
  try {
    teacher = await login(process.env.TEACHER_USER || 'gv1', process.env.TEACHER_PASS || '123456');
  } catch (_) {
    teacher = admin; // fallback: admin can approve
  }
  return { admin, teacher };
}

async function getAnyClassId(token) {
  // 1) Try status inference
  try {
    const status = await axios.get(`${API}/semesters/status`, { headers: { Authorization: `Bearer ${token}` } });
    const cid = status.data?.data?.classId;
    if (cid) return cid;
  } catch (_) {}
  // 2) Try admin classes
  try {
    const res = await axios.get(`${API}/admin/classes`, { headers: { Authorization: `Bearer ${token}` } });
    const classes = res.data?.data || [];
    const empty = classes.find(c => (c.soLuongSinhVien || 0) === 0);
    if (empty?.id) return empty.id;
    if (classes[0]?.id) return classes[0].id;
  } catch (_) {}
  // 3) Fallback via faculties/classes
  try {
    const fac = await axios.get(`${API}/auth/faculties`, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>({data:{data:[]}}));
    const faculties = fac.data?.data || [];
    const faculty = faculties[0]?.value || faculties[0] || null;
    if (!faculty) return null;
    const cls = await axios.get(`${API}/auth/classes`, { params: { faculty }, headers: { Authorization: `Bearer ${token}` } }).catch(()=>({data:{data:[]}}));
    const classes = cls.data?.data || [];
    return classes[0]?.value || classes[0]?.id || null;
  } catch (_) { return null; }
}

async function getCurrentSemester(token, classId) {
  const status = await axios.get(`${API}/semesters/status`, { headers: { Authorization: `Bearer ${token}` }, params: { classId } });
  const sem = status.data?.data?.semester;
  return `${sem.semester}-${sem.year}`;
}

async function proposeClose(admin, classId, semesterStr) {
  await axios.post(`${API}/semesters/${classId}/propose-close`, { semester: semesterStr }, { headers: { Authorization: `Bearer ${admin}` } });
}

async function rollback(admin, classId, semesterStr) {
  await axios.post(`${API}/semesters/${classId}/rollback`, { semester: semesterStr }, { headers: { Authorization: `Bearer ${admin}` } });
}

async function createActivity(token, loaiId, semesterStr) {
  const now = new Date();
  const start = new Date(now.getTime() + 2*3600*1000);
  const end = new Date(now.getTime() + 4*3600*1000);
  const [hoc_ky, year] = semesterStr.split('-');
  const res = await axios.post(`${API}/activities`, {
    ten_hd: `E2E Approvals CLOSING ${Date.now()}`,
    loai_hd_id: loaiId,
    diem_rl: 1,
    ngay_bd: start.toISOString(),
    ngay_kt: end.toISOString(),
    han_dk: start.toISOString(),
    dia_diem: 'Hall',
    hoc_ky,
    nam_hoc: hoc_ky === 'hoc_ky_1' ? `${year}-${Number(year)+1}` : `${Number(year)-1}-${year}`
  }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data?.data?.id;
}

async function ensureActivityType(token) {
  try {
    const res = await axios.get(`${API}/activities/types/list`, { headers: { Authorization: `Bearer ${token}` } });
    const arr = res.data?.data || [];
    if (arr[0]?.id) return arr[0].id;
  } catch (_) {}
  // fallback: try create via admin
  const create = await axios.post(`${API}/admin/activity-types`, {
    ten_loai_hd: `E2E Type ${Date.now()}`,
    mo_ta: 'E2E type',
    diem_toi_da: 10,
    diem_mac_dinh: 1,
    mau_sac: '#3388ee'
  }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  return create?.data?.data?.id;
}

async function registerStudent(classId) {
  const uniq = Date.now();
  const reg = await axios.post(`${API}/auth/register`, {
    name: `E2E SV ${uniq}`,
    maso: String(1000000 + (uniq % 8999999)),
    email: `e2e_${uniq}@test.local`,
    password: 'E2E@12345',
    confirmPassword: 'E2E@12345',
    lopId: classId
  });
  return reg.data?.data?.token;
}

async function registerActivity(student, activityId) {
  const res = await axios.post(`${API}/activities/${activityId}/register`, {}, { headers: { Authorization: `Bearer ${student}` } });
  return res.data?.data?.id;
}

async function approve(teacher, regId) {
  const res = await axios.post(`${API}/activities/registrations/${regId}/approve`, {}, { headers: { Authorization: `Bearer ${teacher}` } });
  return res.status;
}

(async () => {
  try {
    const { admin, teacher } = await getAdminTeacher();
  const classId = await getAnyClassId(admin);
    if (!classId) throw new Error('No classId available');
    const sem = await getCurrentSemester(admin, classId);

    // Ensure ACTIVE state
    await rollback(admin, classId, sem).catch(()=>{});

    const loaiId = await ensureActivityType(admin);
    const actId = await createActivity(admin, loaiId, sem);
    const student = await registerStudent(classId);
    const regId = await registerActivity(student, actId);

    // Move to CLOSING (propose-close)
    await proposeClose(admin, classId, sem);

    // Approve should be allowed (200)
    const status = await approve(teacher, regId);
    if (status !== 200) throw new Error(`Approve in CLOSING failed: ${status}`);
    console.log('Approve-in-CLOSING = PASS');

    // Cleanup
    await rollback(admin, classId, sem).catch(()=>{});
  } catch (e) {
    console.error('E2E Approvals-in-CLOSING failed:', e?.response?.status, e?.response?.data || e.message);
    process.exit(1);
  }
})();
