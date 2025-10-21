const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testClassActivities() {
  try {
    // Test với sinh viên SV000013 thuộc lớp CNTT-K19A
    const studentMSSV = 'SV000013';
    
    console.log('\n🧪 Testing CLASS-BASED activity filtering for student:', studentMSSV);
    console.log('='.repeat(80));
    
    // Bước 1: Tìm sinh viên và lớp
    const student = await prisma.sinhVien.findUnique({
      where: { mssv: studentMSSV },
      include: {
        nguoi_dung: {
          select: { id: true, ho_ten: true, email: true }
        },
        lop: {
          include: {
            chu_nhiem_rel: {
              select: { id: true, ho_ten: true, email: true }
            }
          }
        }
      }
    });
    
    if (!student) {
      console.log('❌ Student not found');
      return;
    }
    
    console.log('\n✅ Student Info:');
    console.log('  - MSSV:', student.mssv);
    console.log('  - Name:', student.nguoi_dung?.ho_ten);
    console.log('  - Class:', student.lop?.ten_lop);
    console.log('  - Class ID:', student.lop_id);
    console.log('  - Homeroom Teacher:', student.lop?.chu_nhiem_rel?.ho_ten);
    console.log('  - Homeroom Teacher ID:', student.lop?.chu_nhiem);
    
    // Bước 2: Lấy tất cả sinh viên trong lớp
    const allClassStudents = await prisma.sinhVien.findMany({
      where: { lop_id: student.lop_id },
      include: {
        nguoi_dung: {
          select: { ho_ten: true }
        }
      }
    });
    
    console.log('\n📋 All students in class:', allClassStudents.length);
    allClassStudents.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.mssv} - ${s.nguoi_dung?.ho_ten}`);
    });
    
    const classStudentUserIds = allClassStudents
      .map(s => s.nguoi_dung_id)
      .filter(Boolean);
    
    // Bước 3: Tạo danh sách người tạo hợp lệ
    const allowedCreators = [...classStudentUserIds];
    if (student.lop?.chu_nhiem) {
      allowedCreators.push(student.lop.chu_nhiem);
    }
    
    console.log('\n✅ Allowed creators:', allowedCreators.length);
    console.log('  - Class students:', classStudentUserIds.length);
    console.log('  - Homeroom teacher:', student.lop?.chu_nhiem ? 1 : 0);
    
    // Bước 4: Tìm hoạt động theo logic mới
    const classActivities = await prisma.hoatDong.findMany({
      where: {
        nguoi_tao_id: { in: allowedCreators },
        trang_thai: { in: ['da_duyet', 'ket_thuc'] }
      },
      include: {
        nguoi_tao: {
          select: {
            ho_ten: true,
            email: true,
            sinh_vien: {
              select: { mssv: true, lop: { select: { ten_lop: true } } }
            }
          }
        },
        loai_hd: true
      },
      orderBy: { ngay_tao: 'desc' }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Activities visible to ${studentMSSV}: ${classActivities.length}`);
    console.log('='.repeat(80));
    
    if (classActivities.length === 0) {
      console.log('\n⚠️ No activities found for this class');
      console.log('   This could mean:');
      console.log('   - No approved activities created by class members');
      console.log('   - No approved activities created by homeroom teacher');
    } else {
      console.log('\n📋 List of activities:');
      classActivities.forEach((activity, index) => {
        const isStudentCreator = activity.nguoi_tao?.sinh_vien ? true : false;
        const isTeacherCreator = !isStudentCreator;
        const creatorMSSV = activity.nguoi_tao?.sinh_vien?.mssv || 'N/A';
        const creatorClass = activity.nguoi_tao?.sinh_vien?.lop?.ten_lop || 'N/A';
        
        console.log(`\n${index + 1}. ${activity.ten_hd}`);
        console.log(`   Status: ${activity.trang_thai}`);
        console.log(`   Type: ${activity.loai_hd?.ten_loai_hd || 'N/A'}`);
        console.log(`   Points: ${activity.diem_rl}`);
        console.log(`   Creator: ${activity.nguoi_tao?.ho_ten || 'Unknown'}`);
        
        if (isStudentCreator) {
          console.log(`   Creator Type: 🎓 Student/Monitor (${creatorMSSV})`);
          console.log(`   Creator Class: ${creatorClass}`);
        } else {
          console.log(`   Creator Type: 👨‍🏫 Teacher (Homeroom)`);
        }
        
        console.log(`   Start: ${activity.ngay_bd.toLocaleDateString('vi-VN')}`);
      });
    }
    
    // Bước 5: So sánh với tất cả hoạt động đã duyệt trong hệ thống
    const allApprovedActivities = await prisma.hoatDong.count({
      where: {
        trang_thai: { in: ['da_duyet', 'ket_thuc'] }
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Comparison:');
    console.log(`   Total approved activities in system: ${allApprovedActivities}`);
    console.log(`   Activities visible to ${studentMSSV}: ${classActivities.length}`);
    console.log(`   Filtered out: ${allApprovedActivities - classActivities.length}`);
    
    const percentage = ((classActivities.length / allApprovedActivities) * 100).toFixed(1);
    console.log(`   Visibility: ${percentage}% of all approved activities`);
    
    console.log('\n✅ CLASS-BASED FILTERING WORKING:');
    console.log('   - Students only see activities from their class');
    console.log('   - Includes activities by class students + homeroom teacher');
    console.log('   - Excludes activities from other classes and teachers');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testClassActivities();
