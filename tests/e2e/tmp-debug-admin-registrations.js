const axios = require('axios').default;
const API = process.env.API_URL || 'http://localhost:3001/api';

async function login(maso, password) {
  const res = await axios.post(`${API}/auth/login`, { maso, password });
  return res.data?.data?.token || res.data?.token;
}

async function run() {
  try {
    const admin = await login('admin', 'Admin@123');
    const headers = { Authorization: `Bearer ${admin}` };
    const classes = await axios.get(`${API}/admin/classes`, { headers });
    const classId = classes.data?.data?.[0]?.id;
    if (!classId) throw new Error('No classId');
    const st = await axios.get(`${API}/semesters/status`, { headers, params: { classId } });
    const sem = `${st.data?.data?.semester?.semester}-${st.data?.data?.semester?.year}`;

    const types = await axios.get(`${API}/activities/types/list`, { headers });
    const typeId = types.data?.data?.[0]?.id;
    if (!typeId) throw new Error('No typeId');

    const now = new Date();
    const start = new Date(now.getTime()+3600*1000);
    const end = new Date(now.getTime()+2*3600*1000);
    const [hoc_ky, year] = sem.split('-');
    const nam_hoc = hoc_ky==='hoc_ky_1'? `${year}-${Number(year)+1}` : `${Number(year)-1}-${year}`;

    const act = await axios.post(`${API}/activities`, { ten_hd:`E2E Debug ${Date.now()}`, loai_hd_id:typeId, diem_rl:1, dia_diem:'A', ngay_bd:start.toISOString(), ngay_kt:end.toISOString(), han_dk:start.toISOString(), hoc_ky, nam_hoc }, { headers });
    const activityId = act.data?.data?.id;
    console.log('activityId:', activityId);

    const studentReg = await axios.post(`${API}/auth/register`, { name:`E2E SV ${Date.now()}`, maso:'1234567', email:`e2e_${Date.now()}@test.local`, password:'E2E@12345', confirmPassword:'E2E@12345', lopId: classId });
    const student = studentReg.data?.data?.token;

    const reg = await axios.post(`${API}/activities/${activityId}/register`, {}, { headers: { Authorization: `Bearer ${student}` } });
    const regId = reg.data?.data?.id;
    console.log('regId:', regId);

    // Approve to da_duyet
    await axios.post(`${API}/activities/registrations/${regId}/approve`, {}, { headers });

    const details = await axios.get(`${API}/admin/registrations`, { headers, params: { activityId, semester: sem, status: 'da_duyet' } });
    console.log('admin registrations payload keys:', Object.keys(details.data?.data || {}));
    console.log('items length:', details.data?.data?.items?.length);
    console.log('first item sample:', details.data?.data?.items?.[0]);
  } catch (e) {
    console.error('DEBUG ERROR:', e?.response?.status, e?.response?.data || e.message);
    process.exit(1);
  }
}

run();
