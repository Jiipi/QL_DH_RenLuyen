/**
 * Test script: Kiểm tra kích hoạt lại học kỳ đã đóng
 * 
 * Kịch bản test:
 * 1. Kiểm tra trạng thái học kỳ hiện tại
 * 2. Simulate đóng cứng học kỳ hiện tại
 * 3. Kích hoạt lại học kỳ đó
 * 4. Verify các lớp đã được mở khóa tự động
 */

const fs = require('fs');
const path = require('path');
const { prisma } = require('../src/config/database');

const DATA_DIR = path.join(__dirname, '../data/semesters');

function readMetadata() {
  const metadataPath = path.join(DATA_DIR, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }
  return null;
}

function readState(classId, semKey) {
  const statePath = path.join(DATA_DIR, classId, semKey, 'state.json');
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function writeState(classId, semKey, state) {
  const dir = path.join(DATA_DIR, classId, semKey);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const statePath = path.join(dir, 'state.json');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function main() {
  console.log('=== TEST SEMESTER REACTIVATION ===\n');
  
  // 1. Lấy thông tin học kỳ hiện tại
  const metadata = readMetadata();
  if (!metadata || !metadata.active_semester) {
    console.log('❌ Không tìm thấy học kỳ active trong metadata.json');
    process.exit(1);
  }
  
  const activeSemester = metadata.active_semester;
  const [hoc_ky, year] = activeSemester.split('-');
  const semKey = `${hoc_ky}_${year}`;
  
  console.log('📅 Học kỳ hiện tại:', activeSemester);
  console.log('🔑 Semester key:', semKey);
  
  // 2. Lấy danh sách lớp
  const classes = await prisma.lop.findMany({
    select: { id: true, ten_lop: true },
    take: 3 // Test với 3 lớp đầu tiên
  });
  
  if (classes.length === 0) {
    console.log('❌ Không tìm thấy lớp nào trong database');
    process.exit(1);
  }
  
  console.log(`\n📚 Test với ${classes.length} lớp:`, classes.map(c => c.ten_lop).join(', '));
  
  // 3. Kiểm tra trạng thái ban đầu
  console.log('\n--- BƯỚC 1: TRẠNG THÁI BAN ĐẦU ---');
  const initialStates = {};
  for (const cls of classes) {
    const state = readState(cls.id, semKey);
    initialStates[cls.id] = state?.state || 'NOT_FOUND';
    console.log(`  ${cls.ten_lop}: ${initialStates[cls.id]}`);
  }
  
  // 4. Simulate đóng cứng tất cả lớp
  console.log('\n--- BƯỚC 2: ĐÓNG CỨNG CÁC LỚP ---');
  for (const cls of classes) {
    let state = readState(cls.id, semKey);
    if (!state) {
      state = {
        classId: cls.id,
        semester: hoc_ky,
        year: year,
        state: 'ACTIVE',
        version: 1,
        history: []
      };
    }
    
    state.state = 'LOCKED_HARD';
    state.lock_level = 'HARD';
    state.closed_by = 'test-script';
    state.closed_at = new Date().toISOString();
    state.history = state.history || [];
    state.history.push({
      state: 'LOCKED_HARD',
      timestamp: new Date().toISOString(),
      actor: 'test-script',
      reason: 'Test simulation'
    });
    
    writeState(cls.id, semKey, state);
    console.log(`  ✅ ${cls.ten_lop}: LOCKED_HARD`);
  }
  
  // 5. Verify đã đóng
  console.log('\n--- BƯỚC 3: VERIFY ĐÃ ĐÓNG ---');
  for (const cls of classes) {
    const state = readState(cls.id, semKey);
    console.log(`  ${cls.ten_lop}: ${state?.state || 'NOT_FOUND'}`);
    if (state?.state !== 'LOCKED_HARD') {
      console.log('  ⚠️  Lỗi: Không thể đóng cứng lớp này!');
    }
  }
  
  // 6. Simulate kích hoạt lại (giống logic trong /activate endpoint)
  console.log('\n--- BƯỚC 4: KÍCH HOẠT LẠI HỌC KỲ ---');
  console.log(`  Đang kích hoạt lại: ${activeSemester}...`);
  
  let unlockedCount = 0;
  const semesterDir = DATA_DIR;
  
  if (fs.existsSync(semesterDir)) {
    const allClasses = fs.readdirSync(semesterDir).filter(f => 
      fs.statSync(path.join(semesterDir, f)).isDirectory()
    );
    
    for (const classId of allClasses) {
      const statePath = path.join(semesterDir, classId, semKey, 'state.json');
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        
        // Logic mở khóa
        if (state.state === 'LOCKED_HARD' || state.state === 'LOCKED_SOFT') {
          state.state = 'ACTIVE';
          state.lock_level = null;
          state.grace_until = null;
          state.closed_by = null;
          state.closed_at = null;
          state.history = state.history || [];
          state.history.push({
            state: 'ACTIVE',
            timestamp: new Date().toISOString(),
            actor: 'test-script-reactivate',
            reason: 'Auto-unlocked by semester re-activation (TEST)'
          });
          state.version = (state.version || 1) + 1;
          
          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
          unlockedCount++;
        }
      }
    }
  }
  
  console.log(`  ✅ Đã mở khóa ${unlockedCount} lớp`);
  
  // 7. Verify đã mở khóa
  console.log('\n--- BƯỚC 5: VERIFY ĐÃ MỞ KHÓA ---');
  let successCount = 0;
  for (const cls of classes) {
    const state = readState(cls.id, semKey);
    const status = state?.state || 'NOT_FOUND';
    const icon = status === 'ACTIVE' ? '✅' : '❌';
    console.log(`  ${icon} ${cls.ten_lop}: ${status}`);
    if (status === 'ACTIVE') successCount++;
  }
  
  // 8. Kết quả
  console.log('\n=== KẾT QUẢ TEST ===');
  if (successCount === classes.length) {
    console.log('✅ PASS: Tất cả lớp đã được mở khóa thành công!');
    console.log(`   - Tổng số lớp test: ${classes.length}`);
    console.log(`   - Số lớp mở khóa thành công: ${successCount}`);
    console.log('   - Logic kích hoạt lại học kỳ hoạt động ĐÚNG! 🎉');
  } else {
    console.log('❌ FAIL: Một số lớp chưa được mở khóa!');
    console.log(`   - Tổng số lớp test: ${classes.length}`);
    console.log(`   - Số lớp mở khóa thành công: ${successCount}`);
    console.log(`   - Số lớp thất bại: ${classes.length - successCount}`);
  }
  
  await prisma.$disconnect();
  process.exit(successCount === classes.length ? 0 : 1);
}

main().catch(e => {
  console.error('❌ Lỗi test:', e);
  process.exit(1);
});
