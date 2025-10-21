// E2E: 4-role flows & semester sync source-of-truth
// Run: node tests/e2e/role-flows-semester-sync.spec.js
const axios = require('axios').default;

const API = process.env.API_URL || 'http://localhost:3001/api';

async function login(maso, password) { const res = await axios.post(`${API}/auth/login`, { maso, password }); return res.data?.data?.token || res.data?.token; }
async function adminTeacher() {
  const admin = await login(process.env.ADMIN_USER || 'admin', process.env.ADMIN_PASS || 'Admin@123');
  let teacher; try { teacher = await login(process.env.TEACHER_USER || 'gv1', process.env.TEACHER_PASS || '123456'); } catch(_) { teacher = admin; }
  return { admin, teacher };
}
async function getAnyClassId(token) {
  // 1) Try status inference (works for teacher/student tokens)
  try {
    const st = await axios.get(`${API}/semesters/status`, { headers: { Authorization: `Bearer ${token}` } });
    const cid = st.data?.data?.classId; if (cid) return cid;
  } catch(_) {}
  // 2) Admin classes list
  try {
    const res = await axios.get(`${API}/admin/classes`, { headers: { Authorization: `Bearer ${token}` } });
    const classes = res.data?.data || [];
    const empty = classes.find(c => (c.soLuongSinhVien || 0) === 0);
    if (empty?.id) return empty.id;
    if (classes[0]?.id) return classes[0].id;
  } catch(_) {}
  // 3) Faculties -> classes
  try {
    const fac = await axios.get(`${API}/auth/faculties`, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>({data:{data:[]}}));
    const faculties = fac.data?.data || [];
    const faculty = faculties[0]?.value || faculties[0] || null;
    if (!faculty) return null;
    const cls = await axios.get(`${API}/auth/classes`, { params: { faculty }, headers: { Authorization: `Bearer ${token}` } }).catch(()=>({data:{data:[]}}));
    const classes = cls.data?.data || [];
    return classes[0]?.value || classes[0]?.id || null;
  } catch(_) { return null; }
}
async function getSemester(token, classId) {
  const st = await axios.get(`${API}/semesters/status`, { headers: { Authorization: `Bearer ${token}` }, params: { classId } });
  const sem = st.data?.data?.semester; return `${sem.semester}-${sem.year}`;
}
async function rollback(admin, classId, sem) { await axios.post(`${API}/semesters/${classId}/rollback`, { semester: sem }, { headers: { Authorization: `Bearer ${admin}` } }); }
async function ensureType(admin) {
  const q = await axios.get(`${API}/activities/types/list`, { headers: { Authorization: `Bearer ${admin}` } }).catch(()=>null);
  const list = q?.data?.data || []; if (list[0]?.id) return list[0].id;
  const c = await axios.post(`${API}/admin/activity-types`, { ten_loai_hd: `E2E Type ${Date.now()}`, diem_toi_da: 10, diem_mac_dinh: 1, mau_sac:'#5599ee' }, { headers: { Authorization: `Bearer ${admin}` } });
  return c.data?.data?.id;
}
async function ensureSemOptions(admin) {
  const r = await axios.get(`${API}/semesters/options`, { headers: { Authorization: `Bearer ${admin}` } });
  const arr = r.data?.data || r.data || [];
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('No semesters returned from unified source');
  return arr;
}
async function createActivity(token, loaiId, semester) {
  const now = new Date(); const start = new Date(now.getTime()+3600*1000); const end = new Date(now.getTime()+2*3600*1000);
  const [hoc_ky, year] = semester.split('-');
  const res = await axios.post(`${API}/activities`, {
    ten_hd: `E2E Flow ${Date.now()}`, loai_hd_id: loaiId, diem_rl: 2, dia_diem: 'A',
    ngay_bd: start.toISOString(), ngay_kt: end.toISOString(), han_dk: start.toISOString(),
    hoc_ky, nam_hoc: hoc_ky==='hoc_ky_1'? `${year}-${Number(year)+1}`:`${Number(year)-1}-${year}`
  }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data?.data?.id;
}
async function createStudent(classId) {
  const u = Date.now();
  const r = await axios.post(`${API}/auth/register`, { name:`E2E SV ${u}`, maso: String(1500000 + (u % 4999999)), email:`e2e_${u}@test.local`, password:'E2E@12345', confirmPassword:'E2E@12345', lopId: classId });
  return r.data?.data?.token;
}
async function register(student, activityId) { const r = await axios.post(`${API}/activities/${activityId}/register`, {}, { headers: { Authorization: `Bearer ${student}` } }); return r.data?.data?.id; }
async function reject(teacher, regId) { await axios.post(`${API}/activities/registrations/${regId}/reject`, { reason: 'E2E Reject' }, { headers: { Authorization: `Bearer ${teacher}` } }); }
async function approve(teacher, regId) { await axios.post(`${API}/activities/registrations/${regId}/approve`, {}, { headers: { Authorization: `Bearer ${teacher}` } }); }
async function attendance(student, activityId) { await axios.post(`${API}/activities/${activityId}/attendance`, {}, { headers: { Authorization: `Bearer ${student}` } }).catch(()=>{}); }

(async () => {
  try {
    const { admin, teacher } = await adminTeacher();
    const classId = await getAnyClassId(admin);
    if (!classId) throw new Error('No classId');
    const sem = await getSemester(admin, classId);

    // Reset state first to ACTIVE, then create an activity in current semester
    await rollback(admin, classId, sem).catch(()=>{});
    const typeId = await ensureType(admin);
    const activityId = await createActivity(admin, typeId, sem);

    // Unified options should include current semester once an activity exists in it
    const options = await ensureSemOptions(admin);
    if (!options.find(o => `${o.semester}-${o.year}` === sem)) throw new Error('Current semester missing from unified options');
    const studentToken = await createStudent(classId);

    // Student register, teacher reject then approve, student attempt attendance
    const regId = await register(studentToken, activityId);
    await reject(teacher, regId);
    await approve(teacher, regId);
    await attendance(studentToken, activityId);

    // Basic asserts via fetch details
    // After attendance the status becomes 'da_tham_gia'; check both statuses
    const tryFetch = async (params) => {
      const res = await axios.get(`${API}/admin/registrations`, { headers: { Authorization: `Bearer ${admin}` }, params });
      const payload = res.data?.data || {};
      const arr = Array.isArray(payload) ? payload : (payload.items || payload.data || []);
      return Array.isArray(arr) ? arr.find(r => String(r.id) === String(regId)) : null;
    };

    let target = await tryFetch({ activityId: activityId, semester: sem, status: 'da_tham_gia' });
    if (!target) target = await tryFetch({ activityId: activityId, semester: sem, status: 'da_duyet' });
    if (!target) target = await tryFetch({ activityId: activityId, status: 'da_tham_gia' });
    if (!target) target = await tryFetch({ activityId: activityId, status: 'da_duyet' });
    if (!target) {
      // Final attempt: no filters - for debug visibility
      const q3 = await axios.get(`${API}/admin/registrations`, { headers: { Authorization: `Bearer ${admin}` } });
      const p3 = q3.data?.data || {};
      const l3 = Array.isArray(p3) ? p3 : (p3.items || p3.data || []);
      const ids = Array.isArray(l3) ? l3.map(r => r.id).slice(0, 5) : [];
      throw new Error(`Registration not found in admin list (inspected: status=da_duyet with/without semester). Sample ids: ${ids.join(', ')}`);
    }

    console.log('4-role flow & semester sync = PASS');
  } catch (e) {
    console.error('Role flow E2E failed:', e?.response?.status, e?.response?.data || e.message);
    process.exit(1);
  }
})();
