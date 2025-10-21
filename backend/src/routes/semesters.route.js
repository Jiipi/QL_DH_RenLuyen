const { Router } = require('express');
const { auth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const SemesterClosure = require('../services/semesterClosure.service');
const { prisma } = require('../config/database');
const { determineSemesterFromDate } = require('../utils/semester');

const router = Router();
router.use(auth);

// Log all requests to this router
router.use((req, res, next) => {
  console.log(`[SEMESTER] ${req.method} ${req.path}`);
  next();
});

// Ensure we have a valid activity type ID to use for system placeholder records
async function ensureSystemActivityTypeId() {
  // Try common names first
  const existing = await prisma.loaiHoatDong.findFirst({
    where: { ten_loai_hd: { in: ['Hệ thống', 'He thong', 'System', 'SYSTEM'] } },
    select: { id: true }
  });
  if (existing?.id) return existing.id;

  // Or just pick any available type if it exists
  const anyType = await prisma.loaiHoatDong.findFirst({ select: { id: true } });
  if (anyType?.id) return anyType.id;

  // As a last resort, create a default type (safe: optional fields have defaults)
  const created = await prisma.loaiHoatDong.create({
    data: {
      ten_loai_hd: 'Hệ thống',
      mo_ta: 'Loại hoạt động mặc định cho các bản ghi hệ thống'
    },
    select: { id: true }
  });
  return created.id;
}

// Unified options for semester filters across UI, based on DB activities
router.get('/options', async (req, res) => {
  try {
    // Fetch distinct semesters from DB only (ground truth)
    const rows = await prisma.hoatDong.findMany({
      select: { hoc_ky: true, nam_hoc: true },
      distinct: ['hoc_ky', 'nam_hoc'],
    });

    // Map to normalized value/label using academic year
    const options = rows
      .filter(r => /(\d{4})-(\d{4})/.test(r.nam_hoc || ''))
      .map(r => {
        const [, y1, y2] = (r.nam_hoc || '').match(/(\d{4})-(\d{4})/);
        const year = r.hoc_ky === 'hoc_ky_1' ? y1 : y2;
        return {
          value: `${r.hoc_ky}-${year}`,
          label: `${r.hoc_ky === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${y1}-${y2})`,
          semester: r.hoc_ky,
          year,
          nam_hoc: `${y1}-${y2}`
        };
      })
      .filter((v, i, a) => a.findIndex(x => x.value === v.value) === i);

    options.sort((a, b) => {
      const ya = parseInt((a.nam_hoc || '').slice(0, 4), 10) || 0;
      const yb = parseInt((b.nam_hoc || '').slice(0, 4), 10) || 0;
      if (ya !== yb) return yb - ya;
      const order = { hoc_ky_1: 0, hoc_ky_2: 1 };
      return (order[a.semester] || 0) - (order[b.semester] || 0);
    });

    return res.json({ success: true, data: options });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Không lấy được danh sách học kỳ', error: e.message });
  }
});

// GET status for current or specific semester (semesters?classId=...&semester=hoc_ky_1-2025)
router.get('/status', async (req, res) => {
  try {
    const { classId, semester } = req.query;
    let cid = classId;
    if (!cid) {
      const { prisma } = require('../config/database');
      // 1) Infer from teacher's homeroom classes
      if (String(req.user?.role || '').toUpperCase().includes('GIANG')) {
        const cls = await prisma.lop.findFirst({ where: { chu_nhiem: req.user.sub }, select: { id: true } });
        cid = cls?.id || cid;
      }
      // 2) Fallback: infer from student record (monitor/student)
      if (!cid) {
        const sv = await prisma.sinhVien.findFirst({ where: { nguoi_dung_id: req.user.sub }, select: { lop_id: true } });
        cid = sv?.lop_id;
      }
    }
    // Graceful: no class found -> return success with null to let FE hide widget instead of error chip
    if (!cid) return res.json({ success: true, data: null, message: 'Chưa có lớp phụ trách hoặc chưa gán lớp' });
    const { semInfo, state } = SemesterClosure.getStatus(cid, semester);
    return res.json({ success: true, data: { classId: cid, semester: semInfo, state } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// LT/GVCN propose closing: ACTIVE -> CLOSING
router.post('/:classId/propose-close', requirePermission('semester.close.propose'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { semester } = req.body || {};
    const state = await SemesterClosure.proposeClose({ classId, actorId: req.user.sub, semesterStr: semester });
    return res.json({ success: true, data: state });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
});

// GVCN/Admin soft lock with grace
router.post('/:classId/soft-lock', requirePermission('semester.lock.soft'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { semester, graceHours } = req.body || {};
    const state = await SemesterClosure.softLock({ classId, actorId: req.user.sub, semesterStr: semester, graceHours: parseInt(graceHours || 72) });
    return res.json({ success: true, data: state });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
});

// GVCN/Admin rollback during grace
router.post('/:classId/rollback', requirePermission('semester.lock.rollback'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { semester } = req.body || {};
    const state = await SemesterClosure.rollback({ classId, actorId: req.user.sub, semesterStr: semester });
    return res.json({ success: true, data: state });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
});

// Admin hard lock
router.post('/:classId/hard-lock', requirePermission('semester.lock.hard'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { semester } = req.body || {};
    const state = await SemesterClosure.hardLock({ classId, actorId: req.user.sub, semesterStr: semester });
    return res.json({ success: true, data: state });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
});

// GET học kỳ hiện tại (từ metadata.json hoặc auto-detect)
router.get('/current', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 1. Đọc từ metadata.json
    const metadataPath = path.join(__dirname, '../../data/semesters/metadata.json');
    let activeSemester = null;
    
    try {
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        activeSemester = metadata.active_semester;
      }
    } catch (e) {
      console.log('[SEMESTER /current] No metadata found');
    }
    
    // 2. Nếu có active semester từ metadata
    if (activeSemester) {
      const [hoc_ky, year] = activeSemester.split('-');
      const label = `${hoc_ky === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${year}-${parseInt(year) + 1})`;
      const nam_hoc = hoc_ky === 'hoc_ky_1' 
        ? `${year}-${parseInt(year) + 1}`
        : `${parseInt(year) - 1}-${year}`;
      
      return res.json({
        success: true,
        data: {
          value: activeSemester,
          label,
          hoc_ky,
          year,
          nam_hoc,
          is_active: true
        }
      });
    }
    
    // 3. Fallback: tìm hoạt động gần nhất
    const recentActivity = await prisma.hoatDong.findFirst({
      orderBy: { ngay_tao: 'desc' },
      select: { hoc_ky: true, nam_hoc: true }
    });
    
    if (recentActivity) {
      const year = (recentActivity.nam_hoc || '').match(/\d{4}/)?.[0] || '';
      const value = `${recentActivity.hoc_ky}-${year}`;
      const label = `${recentActivity.hoc_ky === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${recentActivity.nam_hoc})`;
      
      return res.json({
        success: true,
        data: {
          value,
          label,
          hoc_ky: recentActivity.hoc_ky,
          year,
          nam_hoc: recentActivity.nam_hoc,
          is_active: false
        }
      });
    }
    
    // 4. Fallback cuối: auto-detect từ ngày hiện tại
    const auto = determineSemesterFromDate(new Date());
    const value = `${auto.semester}-${auto.year}`;
    const label = `${auto.semester === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${auto.year}-${parseInt(auto.year) + 1})`;
    
    return res.json({
      success: true,
      data: {
        value,
        label,
        hoc_ky: auto.semester,
        year: auto.year,
        nam_hoc: `${auto.year}-${parseInt(auto.year) + 1}`,
        is_active: false
      }
    });
  } catch (e) {
    console.error('[SEMESTER /current] Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// GET danh sách tất cả học kỳ (admin)
router.get('/list', requirePermission('admin.semesters.manage'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 1. Lấy tất cả học kỳ từ DB
    const rows = await prisma.hoatDong.findMany({
      select: { hoc_ky: true, nam_hoc: true },
      distinct: ['hoc_ky', 'nam_hoc'],
    });
    
    console.log('[SEMESTER /list] Raw data from DB:', rows);
    
    // 2. Đọc học kỳ active từ metadata.json
    const metadataPath = path.join(__dirname, '../../data/semesters/metadata.json');
    let activeSemester = null;
    try {
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        activeSemester = metadata.active_semester;
      }
    } catch (e) {
      console.log('[SEMESTER] No metadata found, no active semester');
    }
    
    // 3. Map và thêm status (lọc bỏ bản ghi nam_hoc không hợp lệ)
    const semesters = rows
      .filter(r => /(\d{4})-(\d{4})/.test(r.nam_hoc || ''))
      .map(r => {
        const yearMatch = (r.nam_hoc || '').match(/(\d{4})-(\d{4})/);
        const [_, year1, year2] = yearMatch;
        const year = r.hoc_ky === 'hoc_ky_1' ? year1 : year2;
        const displayYear = `${year1}-${year2}`;

        const value = `${r.hoc_ky}-${year}`;
        const label = `${r.hoc_ky === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${displayYear})`;
        const is_active = value === activeSemester;
        
        // Check if locked (any class has this semester locked)
        let status = null;
        const semesterDir = path.join(__dirname, '../../data/semesters');
        const tryState = (p) => {
          if (fs.existsSync(p)) {
            try {
              const st = JSON.parse(fs.readFileSync(p, 'utf8'));
              return st?.state || null;
            } catch {}
          }
          return null;
        };
        try {
          if (fs.existsSync(semesterDir)) {
            const classes = fs.readdirSync(semesterDir).filter(f => 
              fs.statSync(path.join(semesterDir, f)).isDirectory()
            );
            for (const classId of classes) {
              const legacy = path.join(semesterDir, classId, `${r.hoc_ky}_${year}`, 'state.json');
              const modern = path.join(semesterDir, classId, `${r.hoc_ky === 'hoc_ky_1' ? 'HK1' : 'HK2'}-${year}`, 'state.json');
              const st = tryState(legacy) || tryState(modern);
              if (st === 'LOCKED_HARD') { status = 'LOCKED_HARD'; break; }
              if (st === 'LOCKED_SOFT') { status = status || 'LOCKED_SOFT'; }
            }
          }
        } catch (e) { /* ignore */ }
        
        return {
          value,
          label,
          hoc_ky: r.hoc_ky,
          nam_hoc: displayYear,
          is_active,
          status
        };
      });
    
    console.log('[SEMESTER /list] Mapped semesters:', semesters);
    console.log('[SEMESTER /list] Active semester from metadata:', activeSemester);
    
    // 4. Remove duplicates by value and sort by year desc
    const uniqueSemesters = [];
    const seenValues = new Set();
    
    for (const sem of semesters) {
      if (!seenValues.has(sem.value)) {
        seenValues.add(sem.value);
        uniqueSemesters.push(sem);
      }
    }
    
    uniqueSemesters.sort((a, b) => {
      const ya = parseInt((a.nam_hoc || '').match(/\d{4}/)?.[0] || '0', 10);
      const yb = parseInt((b.nam_hoc || '').match(/\d{4}/)?.[0] || '0', 10);
      if (ya !== yb) return yb - ya;
      const order = { hoc_ky_1: 0, hoc_ky_2: 1 };
      return (order[a.hoc_ky] || 0) - (order[b.hoc_ky] || 0);
    });
    
    return res.json({ success: true, data: uniqueSemesters });
  } catch (e) {
    console.error('[SEMESTER /list] Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// POST kích hoạt học kỳ mới (admin)
router.post('/activate', requirePermission('admin.semesters.manage'), async (req, res) => {
  try {
    const { semester } = req.body;
    
    if (!semester || !/^hoc_ky_[12]-\d{4}$/.test(semester)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Format học kỳ không hợp lệ. Ví dụ: hoc_ky_1-2024' 
      });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    // 1. Đọc học kỳ cũ
    const metadataPath = path.join(__dirname, '../../data/semesters/metadata.json');
    let oldActive = null;
    try {
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        oldActive = metadata.active_semester;
      }
    } catch (e) {
      // ignore
    }
    
    // 2. Cập nhật metadata.json
    const metadataDir = path.dirname(metadataPath);
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }
    
    fs.writeFileSync(metadataPath, JSON.stringify({
      active_semester: semester,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.sub || 'admin'
    }, null, 2));
    
    // 3. Khóa cứng tất cả lớp có học kỳ cũ ở trạng thái ACTIVE
    let lockedCount = 0;
    if (oldActive) {
      const [hoc_ky, year] = oldActive.split('-');
      const semKey = `${hoc_ky}_${year}`;
      const semesterDir = path.join(__dirname, '../../data/semesters');
      
      try {
        if (fs.existsSync(semesterDir)) {
          const classes = fs.readdirSync(semesterDir).filter(f => 
            fs.statSync(path.join(semesterDir, f)).isDirectory()
          );
          
          for (const classId of classes) {
            const statePath = path.join(semesterDir, classId, semKey, 'state.json');
            if (fs.existsSync(statePath)) {
              const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
              if (state.state === 'ACTIVE' || state.state === 'CLOSING' || state.state === 'LOCKED_SOFT') {
                state.state = 'LOCKED_HARD';
                state.history = state.history || [];
                state.history.push({
                  state: 'LOCKED_HARD',
                  timestamp: new Date().toISOString(),
                  actor: req.user?.sub || 'admin',
                  reason: 'Auto-locked by semester activation'
                });
                fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
                lockedCount++;
              }
            }
          }
        }
      } catch (e) {
        console.error('[SEMESTER /activate] Error locking classes:', e);
      }
    }
    
    console.log(`[SEMESTER] Activated ${semester}, locked ${lockedCount} classes`);
    
    return res.json({
      success: true,
      message: 'Kích hoạt học kỳ thành công',
      data: {
        new_active: semester,
        old_active: oldActive,
        locked_classes: lockedCount
      }
    });
  } catch (e) {
    console.error('[SEMESTER /activate] Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// POST tạo học kỳ mới tự động (admin)
router.post('/create-next', async (req, res) => {
  try {
    console.log('[SEMESTER /create-next] Starting...');
    console.log('[SEMESTER /create-next] User:', req.user);
    
    // Check permission manually
    const userRole = req.user?.role || req.user?.vai_tro;
    if (!userRole || !['ADMIN', 'QUẢN_TRỊ_VIÊN'].includes(userRole.toUpperCase().replace(/\s/g, '_'))) {
      console.log('[SEMESTER /create-next] Permission denied for role:', userRole);
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }
    
    console.log('[SEMESTER /create-next] Permission OK, proceeding...');
    
    // 1. Lấy học kỳ gần nhất từ danh sách distinct hợp lệ (ưu tiên metadata nếu có)
    const fs = require('fs');
    const path = require('path');
    const metadataPath = path.join(__dirname, '../../data/semesters/metadata.json');
    let latestSemester = null;
    try {
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (metadata.active_semester && /^hoc_ky_[12]-\d{4}$/.test(metadata.active_semester)) {
          const [hk, y] = metadata.active_semester.split('-');
          const y1 = hk === 'hoc_ky_1' ? parseInt(y) : parseInt(y) - 1;
          const y2 = hk === 'hoc_ky_1' ? parseInt(y) + 1 : parseInt(y);
          latestSemester = { hoc_ky: hk, nam_hoc: `${y1}-${y2}` };
        }
      }
    } catch { /* ignore */ }

    if (!latestSemester) {
      const rows = await prisma.hoatDong.findMany({
        select: { hoc_ky: true, nam_hoc: true },
        distinct: ['hoc_ky', 'nam_hoc']
      });
      const valid = rows.filter(r => /(\d{4})-(\d{4})/.test(r.nam_hoc || ''));
      if (valid.length > 0) {
        // Tính chỉ số thứ tự: index = (baseYear * 2) + (hoc_ky === hk2 ? 1 : 0)
        const withIndex = valid.map(r => {
          const [, y1, y2] = (r.nam_hoc || '').match(/(\d{4})-(\d{4})/);
          const baseYear = r.hoc_ky === 'hoc_ky_1' ? parseInt(y1) : parseInt(y2);
          const idx = baseYear * 2 + (r.hoc_ky === 'hoc_ky_2' ? 1 : 0);
          return { ...r, idx };
        });
        withIndex.sort((a, b) => b.idx - a.idx);
        latestSemester = { hoc_ky: withIndex[0].hoc_ky, nam_hoc: withIndex[0].nam_hoc };
      }
    }

    console.log('[SEMESTER /create-next] Latest semester (normalized):', latestSemester);

    if (!latestSemester) {
      // Nếu chưa có dữ liệu, tạo HK1 năm hiện tại
      const currentYear = new Date().getFullYear();
      const newHocKy = 'hoc_ky_1';
      const newNamHoc = `${currentYear}-${currentYear + 1}`;
      
      // Tạo hoạt động placeholder (để có dữ liệu trong DB)
      const typeId = await ensureSystemActivityTypeId();
      await prisma.hoatDong.create({
        data: {
          ten_hd: `[SYSTEM] Học kỳ ${newHocKy === 'hoc_ky_1' ? '1' : '2'} năm học ${newNamHoc}`,
          mo_ta: 'Hoạt động hệ thống để đánh dấu học kỳ mới',
          hoc_ky: newHocKy,
          nam_hoc: newNamHoc,
          ngay_bd: new Date(`${currentYear}-09-01`),
          ngay_kt: new Date(`${currentYear + 1}-01-31`),
          ngay_tao: new Date(),
          loai_hd_id: typeId,
          nguoi_tao_id: req.user?.sub || 'admin',
          trang_thai: 'da_duyet'
        }
      });
      
      return res.json({
        success: true,
        message: `Đã tạo học kỳ mới: ${newHocKy === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${newNamHoc})`,
        data: {
          hoc_ky: newHocKy,
          nam_hoc: newNamHoc,
          value: `${newHocKy}-${currentYear}`
        }
      });
    }
    
    // 2. Tính học kỳ tiếp theo
  const currentHocKy = latestSemester.hoc_ky;
  const yearMatch = (latestSemester.nam_hoc || '').match(/(\d{4})-(\d{4})/);
    
    console.log('[SEMESTER /create-next] Current semester:', {
      hoc_ky: currentHocKy,
      nam_hoc: latestSemester.nam_hoc,
      yearMatch
    });
    
    let newHocKy, newNamHoc, newYear, startDate, endDate;
    
  if (currentHocKy === 'hoc_ky_1') {
      // HK1 (2025-2026) → HK2 (2025-2026) cùng năm học
      newHocKy = 'hoc_ky_2';
      if (yearMatch) {
        const [_, year1, year2] = yearMatch;
        newNamHoc = latestSemester.nam_hoc; // Giữ nguyên: 2025-2026
        newYear = parseInt(year2); // 2026
        startDate = new Date(`${year2}-02-01`);
        endDate = new Date(`${year2}-06-30`);
      } else {
        const year = parseInt((latestSemester.nam_hoc || '').match(/\d{4}/)?.[0] || new Date().getFullYear());
        newYear = year + 1;
        newNamHoc = `${year}-${newYear}`;
        startDate = new Date(`${newYear}-02-01`);
        endDate = new Date(`${newYear}-06-30`);
      }
  } else {
      // HK2 (2025-2026) → HK1 (2026-2027) năm học mới
      newHocKy = 'hoc_ky_1';
      if (yearMatch) {
        const [_, year1, year2] = yearMatch;
        // year1 = 2025, year2 = 2026
        // Năm học mới bắt đầu từ year2: 2026-2027
        const nextYear1 = parseInt(year2); // 2026
        const nextYear2 = nextYear1 + 1;   // 2027
        newYear = nextYear1; // 2026 (for value key)
        newNamHoc = `${nextYear1}-${nextYear2}`; // 2026-2027
        startDate = new Date(`${nextYear1}-09-01`); // 2026-09-01
        endDate = new Date(`${nextYear2}-01-31`);   // 2027-01-31
      } else {
        const year = parseInt((latestSemester.nam_hoc || '').match(/\d{4}/)?.[0] || new Date().getFullYear());
        newYear = year + 1;
        newNamHoc = `${newYear}-${newYear + 1}`;
        startDate = new Date(`${newYear}-09-01`);
        endDate = new Date(`${newYear + 1}-01-31`);
      }
    }
    
    console.log('[SEMESTER /create-next] New semester calculated:', {
      newHocKy,
      newNamHoc,
      newYear,
      startDate,
      endDate
    });
    
    // 3. Kiểm tra xem học kỳ này đã tồn tại chưa
    const existing = await prisma.hoatDong.findFirst({
      where: {
        hoc_ky: newHocKy,
        nam_hoc: newNamHoc
      }
    });
    
    console.log('[SEMESTER /create-next] Checking existing:', { newHocKy, newNamHoc, exists: !!existing });
    
    if (existing) {
      console.log('[SEMESTER /create-next] Semester already exists!');
      return res.status(400).json({
        success: false,
        message: `Học kỳ ${newHocKy === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${newNamHoc}) đã tồn tại`
      });
    }
    
    // 4. Tạo hoạt động placeholder cho học kỳ mới
    const typeId = await ensureSystemActivityTypeId();
    await prisma.hoatDong.create({
      data: {
        ten_hd: `[SYSTEM] Học kỳ ${newHocKy === 'hoc_ky_1' ? '1' : '2'} năm học ${newNamHoc}`,
        mo_ta: 'Hoạt động hệ thống để đánh dấu học kỳ mới',
        hoc_ky: newHocKy,
        nam_hoc: newNamHoc,
        ngay_bd: startDate,
        ngay_kt: endDate,
        ngay_tao: new Date(),
        loai_hd_id: typeId,
        nguoi_tao_id: req.user?.sub || 'admin',
        trang_thai: 'da_duyet'
      }
    });
    
    console.log(`[SEMESTER] Created new semester: ${newHocKy} ${newNamHoc}`);
    
    return res.json({
      success: true,
      message: `Đã tạo học kỳ mới: ${newHocKy === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${newNamHoc})`,
      data: {
        hoc_ky: newHocKy,
        nam_hoc: newNamHoc,
        value: `${newHocKy}-${newYear}`
      }
    });
  } catch (e) {
    console.error('[SEMESTER /create-next] Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// POST tạo học kỳ mới thủ công (admin)
router.post('/create', async (req, res) => {
  try {
    console.log('[SEMESTER /create] Starting...', req.body);

    const userRole = req.user?.role || req.user?.vai_tro;
    if (!userRole || !['ADMIN', 'QUẢN_TRỊ_VIÊN'].includes(userRole.toUpperCase().replace(/\s/g, '_'))) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    const { hoc_ky, nam_hoc } = req.body || {};
    if (!hoc_ky || !/^hoc_ky_[12]$/.test(hoc_ky) || !/(\d{4})-(\d{4})/.test(nam_hoc || '')) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ. Ví dụ: { hoc_ky: "hoc_ky_1", nam_hoc: "2026-2027" }' });
    }

    const exists = await prisma.hoatDong.findFirst({ where: { hoc_ky, nam_hoc } });
    if (exists) {
      return res.status(400).json({ success: false, message: `Học kỳ ${(hoc_ky === 'hoc_ky_1' ? 'HK1' : 'HK2')} (${nam_hoc}) đã tồn tại` });
    }

    // Tạo placeholder
    const [, y1, y2] = (nam_hoc || '').match(/(\d{4})-(\d{4})/);
    const startDate = hoc_ky === 'hoc_ky_1' ? new Date(`${y1}-09-01`) : new Date(`${y2}-02-01`);
    const endDate = hoc_ky === 'hoc_ky_1' ? new Date(`${y2}-01-31`) : new Date(`${y2}-06-30`);

    const typeId2 = await ensureSystemActivityTypeId();
    await prisma.hoatDong.create({
      data: {
        ten_hd: `[SYSTEM] Học kỳ ${hoc_ky === 'hoc_ky_1' ? '1' : '2'} năm học ${nam_hoc}`,
        mo_ta: 'Hoạt động hệ thống để đánh dấu học kỳ mới',
        hoc_ky,
        nam_hoc,
        ngay_bd: startDate,
        ngay_kt: endDate,
        ngay_tao: new Date(),
        loai_hd_id: typeId2,
        nguoi_tao_id: req.user?.sub || 'admin',
        trang_thai: 'da_duyet'
      }
    });

    return res.json({ success: true, message: `Đã tạo học kỳ mới: ${(hoc_ky === 'hoc_ky_1' ? 'HK1' : 'HK2')} (${nam_hoc})` });
  } catch (e) {
    console.error('[SEMESTER /create] Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// GET học kỳ tiếp theo (để admin chuẩn bị)
router.get('/next', async (req, res) => {
  try {
    // 1. Lấy học kỳ hiện tại từ hoạt động gần nhất
    const currentRes = await prisma.hoatDong.findFirst({
      orderBy: { ngay_tao: 'desc' },
      select: { hoc_ky: true, nam_hoc: true }
    });
    
    if (!currentRes) {
      // Fallback: auto-detect
      const auto = determineSemesterFromDate(new Date());
      const nextSem = auto.semester === 'hoc_ky_1' ? 'hoc_ky_2' : 'hoc_ky_1';
      const nextYear = auto.semester === 'hoc_ky_1' ? parseInt(auto.year) + 1 : parseInt(auto.year) + 1;
      const nextNamHoc = nextSem === 'hoc_ky_1' 
        ? `${nextYear}-${nextYear + 1}`
        : `${nextYear - 1}-${nextYear}`;
      
      return res.json({
        success: true,
        data: {
          value: `${nextSem}-${nextYear}`,
          label: `${nextSem === 'hoc_ky_1' ? 'HK1' : 'HK2'} - ${nextYear}`,
          semester: nextSem,
          year: nextYear,
          nam_hoc: nextNamHoc,
          suggestion: {
            ngay_bat_dau: nextSem === 'hoc_ky_1' ? `${nextYear}-09-01` : `${nextYear}-02-01`,
            ngay_ket_thuc: nextSem === 'hoc_ky_1' ? `${nextYear + 1}-01-31` : `${nextYear}-06-30`
          }
        }
      });
    }
    
    // 2. Tính học kỳ tiếp theo
    const currentSemester = currentRes.hoc_ky;
    const yearMatch = (currentRes.nam_hoc || '').match(/\d{4}/);
    const currentYear = parseInt(yearMatch?.[0] || new Date().getFullYear());
    
    let nextSemester, nextYear, nextNamHoc;
    
    if (currentSemester === 'hoc_ky_1') {
      // HK1 → HK2 cùng năm học
      nextSemester = 'hoc_ky_2';
      nextYear = currentYear + 1; // HK2 năm sau
      nextNamHoc = `${currentYear}-${currentYear + 1}`;
    } else {
      // HK2 → HK1 năm học mới
      nextSemester = 'hoc_ky_1';
      nextYear = currentYear + 1;
      nextNamHoc = `${nextYear}-${nextYear + 1}`;
    }
    
    const nextValue = `${nextSemester}-${nextYear}`;
    const nextLabel = `${nextSemester === 'hoc_ky_1' ? 'HK1' : 'HK2'} - ${nextYear}`;
    
    return res.json({
      success: true,
      data: {
        value: nextValue,
        label: nextLabel,
        semester: nextSemester,
        year: nextYear,
        nam_hoc: nextNamHoc,
        suggestion: {
          ngay_bat_dau: nextSemester === 'hoc_ky_1' ? `${nextYear}-09-01` : `${nextYear}-02-01`,
          ngay_ket_thuc: nextSemester === 'hoc_ky_1' ? `${nextYear + 1}-01-31` : `${nextYear}-06-30`
        }
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// POST Admin xác nhận mở học kỳ mới
router.post('/activate-next', requirePermission('admin.semester.activate'), async (req, res) => {
  try {
    const { semester, year, nam_hoc } = req.body;
    
    // 1. Validate input
    if (!semester || !year || !nam_hoc) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin học kỳ' });
    }
    
    // 2. Đóng cứng học kỳ hiện tại (tất cả các lớp)
    const allClasses = await prisma.lop.findMany({ select: { id: true } });
    
    let lockedCount = 0;
    for (const cls of allClasses) {
      try {
        // Get current semester for this class
        const currentSem = SemesterClosure.getCurrentSemesterInfo();
        await SemesterClosure.hardLock({
          classId: cls.id,
          actorId: req.user.sub,
          semesterStr: `${currentSem.semester}-${currentSem.year}`
        });
        lockedCount++;
      } catch (e) {
        // Ignore if already locked or error
        console.log(`Cannot lock class ${cls.id}:`, e.message);
      }
    }
    
    // 3. Log action
    console.log(`[SEMESTER] Admin ${req.user.sub} activated new semester: ${semester}-${year} (${nam_hoc})`);
    console.log(`[SEMESTER] Locked ${lockedCount}/${allClasses.length} classes`);
    
    return res.json({
      success: true,
      message: `Đã kích hoạt học kỳ mới: ${semester === 'hoc_ky_1' ? 'HK1' : 'HK2'} ${nam_hoc}. Đã khóa ${lockedCount} lớp.`,
      data: { semester, year, nam_hoc, lockedClasses: lockedCount }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
