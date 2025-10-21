const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRegistrations() {
  try {
    console.log('🔍 Checking Registration Status...\n');
    
    // Get a sample class
    const sampleStudent = await prisma.sinhVien.findFirst({
      include: { lop: true }
    });
    
    if (!sampleStudent) {
      console.log('❌ No students found');
      return;
    }
    
    const classId = sampleStudent.lop_id;
    const className = sampleStudent.lop?.ten_lop || 'Unknown';
    
    console.log(`📚 Class: ${className} (ID: ${classId})`);
    console.log('📅 Semester: HK1 2025\n');
    
    // Count by status
    const statusCounts = await prisma.dangKyHoatDong.groupBy({
      by: ['trang_thai_dk'],
      _count: true,
      where: {
        sinh_vien: { lop_id: classId },
        hoat_dong: {
          hoc_ky: 'hoc_ky_1',
          nam_hoc: { contains: '2025' }
        }
      }
    });
    
    console.log('=== STATUS DISTRIBUTION ===');
    let total = 0;
    statusCounts.forEach(s => {
      console.log(`  ${s.trang_thai_dk.padEnd(20)}: ${s._count} registrations`);
      total += s._count;
    });
    console.log(`  ${'TOTAL'.padEnd(20)}: ${total} registrations\n`);
    
    // Get sample registrations
    const samples = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: classId },
        hoat_dong: {
          hoc_ky: 'hoc_ky_1',
          nam_hoc: { contains: '2025' }
        }
      },
      include: {
        sinh_vien: {
          select: {
            mssv: true,
            nguoi_dung: { select: { ho_ten: true } }
          }
        },
        hoat_dong: {
          select: {
            ten_hd: true,
            diem_rl: true
          }
        }
      },
      take: 20,
      orderBy: { ngay_dang_ky: 'desc' }
    });
    
    console.log('=== SAMPLE REGISTRATIONS (Latest 20) ===');
    samples.forEach((r, i) => {
      const name = r.sinh_vien.nguoi_dung?.ho_ten || 'N/A';
      const activity = r.hoat_dong.ten_hd?.substring(0, 40) || 'N/A';
      const points = Number(r.hoat_dong.diem_rl || 0);
      const status = r.trang_thai_dk;
      
      const statusIcon = {
        'cho_duyet': '⏳',
        'da_duyet': '✅',
        'tu_choi': '❌',
        'da_tham_gia': '🎯'
      }[status] || '❓';
      
      console.log(`${(i+1).toString().padStart(2)}. ${statusIcon} ${name.padEnd(25)} | ${activity.padEnd(40)} | ${status.padEnd(15)} | ${points}đ`);
    });
    
    // Count students with each status
    const studentsWithStatus = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: classId },
        hoat_dong: {
          hoc_ky: 'hoc_ky_1',
          nam_hoc: { contains: '2025' }
        }
      },
      select: {
        sv_id: true,
        trang_thai_dk: true,
        hoat_dong: {
          select: { diem_rl: true }
        }
      }
    });
    
    const studentPointsMap = new Map();
    const studentStatusMap = new Map();
    
    studentsWithStatus.forEach(r => {
      if (!studentStatusMap.has(r.sv_id)) {
        studentStatusMap.set(r.sv_id, new Set());
      }
      studentStatusMap.get(r.sv_id).add(r.trang_thai_dk);
      
      if (r.trang_thai_dk === 'da_tham_gia') {
        const current = studentPointsMap.get(r.sv_id) || 0;
        studentPointsMap.set(r.sv_id, current + Number(r.hoat_dong.diem_rl || 0));
      }
    });
    
    console.log('\n=== ANALYSIS ===');
    console.log(`Total unique students with registrations: ${studentStatusMap.size}`);
    console.log(`Students with da_tham_gia status: ${studentPointsMap.size}`);
    console.log(`Students with da_duyet only: ${Array.from(studentStatusMap.entries()).filter(([id, statuses]) => statuses.has('da_duyet') && !statuses.has('da_tham_gia')).length}`);
    console.log(`Students with cho_duyet only: ${Array.from(studentStatusMap.entries()).filter(([id, statuses]) => statuses.has('cho_duyet') && !statuses.has('da_duyet') && !statuses.has('da_tham_gia')).length}`);
    
    if (studentPointsMap.size > 0) {
      const totalPoints = Array.from(studentPointsMap.values()).reduce((sum, p) => sum + p, 0);
      const avgPoints = totalPoints / studentPointsMap.size;
      console.log(`\nTotal points: ${totalPoints.toFixed(2)}`);
      console.log(`Average points (attended students): ${avgPoints.toFixed(2)}`);
    } else {
      console.log('\n⚠️  WARNING: No students have da_tham_gia status!');
      console.log('   This means avgPoints will be 0.');
      console.log('   Students need to be marked as da_tham_gia to get points.');
    }
    
    // Total students in class
    const totalStudentsInClass = await prisma.sinhVien.count({
      where: { lop_id: classId }
    });
    
    console.log(`\nTotal students in class: ${totalStudentsInClass}`);
    console.log(`Students with any registration: ${studentStatusMap.size}`);
    console.log(`Participation rate: ${((studentStatusMap.size / totalStudentsInClass) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRegistrations();
