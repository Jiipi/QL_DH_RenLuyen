// Verify teacher vs class-leader activities parity for a semester
// Usage (inside backend-dev container):
//   node /app/scripts/verify-parity.mjs [semester|scan] [--teacher USER] [--tpass PASS] [--monitor USER] [--mpass PASS] [--api URL] [--ttoken TOKEN] [--mtoken TOKEN]
// Or via env vars: API_BASE, TEACHER_USER, TEACHER_PASS, MONITOR_USER, MONITOR_PASS

let API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
let TEACHER_CRED = { maso: process.env.TEACHER_USER || 'gv001', password: process.env.TEACHER_PASS || 'Teacher@123' };
// Default monitor account aligns with seed data (lop truong CTK46A has username MSSV 2021001)
let MONITOR_CRED = { maso: process.env.MONITOR_USER || '2021001', password: process.env.MONITOR_PASS || 'Monitor@123' };

function parseArgs(argv) {
  const out = { teacher: null, tpass: null, monitor: null, mpass: null, api: null, ttoken: null, mtoken: null, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--teacher': out.teacher = argv[++i]; break;
      case '--tpass': out.tpass = argv[++i]; break;
      case '--monitor': out.monitor = argv[++i]; break;
      case '--mpass': out.mpass = argv[++i]; break;
      case '--ttoken': out.ttoken = argv[++i]; break;
      case '--mtoken': out.mtoken = argv[++i]; break;
      case '--api': out.api = argv[++i]; break;
      default: out.positional.push(a);
    }
  }
  return out;
}

function computeCurrentSemester() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 7 && m <= 11) return `hoc_ky_1-${y}`; // Jul-Nov
  if (m === 12) return `hoc_ky_2-${y}`;          // Dec
  if (m >= 1 && m <= 4) return `hoc_ky_2-${y - 1}`; // Jan-Apr belongs to previous year's HK2
  return `hoc_ky_1-${y}`; // May-Jun: default HK1 of current year
}

const parsed = parseArgs(process.argv.slice(2));
const arg = parsed.positional[0];
const semester = (!arg || arg === 'scan') ? computeCurrentSemester() : arg;

// Apply CLI overrides if provided
if (parsed.api) API_BASE = parsed.api;
if (parsed.teacher) TEACHER_CRED.maso = parsed.teacher;
if (parsed.tpass) TEACHER_CRED.password = parsed.tpass;
if (parsed.monitor) MONITOR_CRED.maso = parsed.monitor;
if (parsed.mpass) MONITOR_CRED.password = parsed.mpass;

const tPresetToken = parsed.ttoken || null;
const mPresetToken = parsed.mtoken || null;

async function login({ maso, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maso, password })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Login failed for ${maso}: ${res.status} ${res.statusText} — ${txt}`);
  }
  const data = await res.json();
  const payload = data?.data || data;
  const token = payload?.token || payload?.data?.token;
  if (!token) throw new Error(`No token received for ${maso}`);
  const user = payload?.user || payload?.data?.user;
  return { token, user };
}

async function fetchActivities(token, semesterKey) {
  const url = `${API_BASE}/activities?semester=${encodeURIComponent(semesterKey)}&limit=all`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Fetch activities failed: ${res.status} ${res.statusText} — ${txt}`);
  }
  const json = await res.json();
  const data = json?.data || json;
  const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
  return items;
}

function summarize(items) {
  const ids = new Set(items.map(a => a.id));
  return { count: items.length, ids };
}

function setDiff(a, b) {
  const out = [];
  for (const x of a) if (!b.has(x)) out.push(x);
  return out;
}

async function main() {
  console.log(`[verify-parity] API: ${API_BASE}`);

  let tAuth, mAuth;
  if (tPresetToken) {
    tAuth = { token: tPresetToken, user: { ho_ten: '(token provided)', vai_tro: 'GIANG_VIEN' } };
  } else {
    console.log(`[verify-parity] Logging in as teacher (${TEACHER_CRED.maso})...`);
    tAuth = await login(TEACHER_CRED);
  }
  if (mPresetToken) {
    mAuth = { token: mPresetToken, user: { ho_ten: '(token provided)', vai_tro: 'LOP_TRUONG' } };
  } else {
    console.log(`[verify-parity] Logging in as monitor (${MONITOR_CRED.maso})...`);
    mAuth = await login(MONITOR_CRED);
  }
  console.log(`[verify-parity] Teacher user: ${(tAuth.user?.ho_ten || tAuth.user?.username || tAuth.user?.ten_dn || 'N/A')} (${tAuth.user?.role || tAuth.user?.vai_tro || 'unknown'})`);
  console.log(`[verify-parity] Monitor user: ${(mAuth.user?.ho_ten || mAuth.user?.username || mAuth.user?.ten_dn || 'N/A')} (${mAuth.user?.role || mAuth.user?.vai_tro || 'unknown'})`);

  const testSemesters = [];
  if (arg === 'scan') {
    const now = new Date();
    const startYear = now.getFullYear();
    for (let y = startYear; y >= startYear - 3; y--) {
      testSemesters.push(`hoc_ky_1-${y}`);
      testSemesters.push(`hoc_ky_2-${y}`);
    }
  } else {
    testSemesters.push(semester);
  }

  let allOk = true;
  for (const sem of testSemesters) {
    console.log(`\n[verify-parity] Semester: ${sem}`);
    console.log('[verify-parity] Fetching activities for both roles...');
    const [tItems, mItems] = await Promise.all([
      fetchActivities(tAuth.token, sem),
      fetchActivities(mAuth.token, sem)
    ]);

    const tSum = summarize(tItems);
    const mSum = summarize(mItems);
    const tMinusM = setDiff(tSum.ids, mSum.ids);
    const mMinusT = setDiff(mSum.ids, tSum.ids);

    console.log('--- Summary ---');
    console.log(`Teacher total: ${tSum.count}`);
    console.log(`Monitor total: ${mSum.count}`);
    if (tMinusM.length) console.log(`Only in Teacher (first 10): ${tMinusM.slice(0, 10).join(', ')}`);
    if (mMinusT.length) console.log(`Only in Monitor (first 10): ${mMinusT.slice(0, 10).join(', ')}`);

    if (tSum.count === mSum.count && tMinusM.length === 0 && mMinusT.length === 0) {
      console.log('[verify-parity] ✅ Parity OK for this semester');
    } else {
      console.log('[verify-parity] ❗ Parity mismatch for this semester');
      allOk = false;
    }
  }

  process.exit(allOk ? 0 : 2);
}

main().catch(err => {
  console.error('[verify-parity] ERROR:', err.message);
  process.exit(1);
});
