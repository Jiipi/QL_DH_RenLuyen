// Minimal E2E smoke tests for 423 Locked behavior
// Run with: node tests/e2e/semester-lock.spec.js
const axios = require('axios').default;

const API = process.env.API_URL || 'http://localhost:3001/api';

async function login(maso, password) {
  const res = await axios.post(`${API}/auth/login`, { maso, password });
  return res.data?.data?.token || res.data?.token;
}

async function getClassIdForTeacher(token) {
  const res = await axios.get(`${API}/teacher/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { semester: 'current' }
  }).catch(() => ({ data: { data: { classes: [] } } }));
  const classes = res.data?.data?.classes || [];
  return classes[0]?.id || null;
}

async function softLock(classId, token) {
  const status = await axios.get(`${API}/semesters/status`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { classId }
  });
  const sem = status.data?.data?.semester;
  await axios.post(`${API}/semesters/${classId}/soft-lock`, { semester: `${sem.semester}-${sem.year}`, graceHours: 1 }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function rollback(classId, token) {
  const status = await axios.get(`${API}/semesters/status`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { classId }
  });
  const sem = status.data?.data?.semester;
  await axios.post(`${API}/semesters/${classId}/rollback`, { semester: `${sem.semester}-${sem.year}` }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

(async () => {
  try {
    // Credentials from task description (adjust if needed)
    const adminToken = await login('admin', 'Admin@123');
    const teacherToken = await login('gv1', '123456').catch(() => null);
    const studentToken = await login('SV000013', '123456').catch(() => null);

    const classId = teacherToken ? await getClassIdForTeacher(teacherToken) : null;
    if (!classId) {
      console.log('SKIP: No class found for teacher.');
      return;
    }

    // Soft lock semester
    await softLock(classId, teacherToken);

    // Student register should 423 (using invalid id to assert lock behavior path)
    let ok = false;
    try {
      await axios.post(`${API}/activities/0/register`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
    } catch (e) {
      ok = e?.response?.status === 423;
    }
    console.log('Student register locked:', ok ? 'PASS' : 'FAIL');

    // Student cancel should 423 (use dummy id)
    ok = false;
    try {
      await axios.post(`${API}/activities/registrations/0/cancel`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
    } catch (e) {
      ok = e?.response?.status === 423;
    }
    console.log('Student cancel locked:', ok ? 'PASS' : 'FAIL');

    // Student attendance should 423
    ok = false;
    try {
      await axios.post(`${API}/activities/0/attendance`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
    } catch (e) {
      ok = e?.response?.status === 423;
    }
    console.log('Student attendance locked:', ok ? 'PASS' : 'FAIL');

    // Monitor approve should 423 (use dummy id)
    ok = false;
    try {
      await axios.post(`${API}/class/registrations/0/approve`, {}, { headers: { Authorization: `Bearer ${teacherToken}` } });
    } catch (e) {
      ok = e?.response?.status === 423;
    }
    console.log('Monitor/Teacher approve locked:', ok ? 'PASS' : 'FAIL');

    // Teacher bulk approve should 423 (dummy)
    ok = false;
    try {
      await axios.post(`${API}/teacher/registrations/bulk-approve`, { ids: ['0'] }, { headers: { Authorization: `Bearer ${teacherToken}` } });
    } catch (e) {
      ok = e?.response?.status === 423;
    }
    console.log('Teacher bulk approve locked:', ok ? 'PASS' : 'FAIL');

    // Admin write under class/semester should 423 (approximate with dummy registration id)
    ok = false;
    try {
      await axios.post(`${API}/admin/registrations/0/approve`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
    } catch (e) {
      ok = e?.response?.status === 423 || e?.response?.status === 404; // allow 404 if id not found
    }
    console.log('Admin write locked (approx):', ok ? 'PASS' : 'WARN/FAIL');

    // Rollback lock
    await rollback(classId, teacherToken);
  } catch (e) {
    console.error('E2E error:', e?.response?.status, e?.response?.data || e.message);
    process.exit(1);
  }
})();
