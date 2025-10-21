/**
 * FIX ATTENDANCE - Ensure every student has >= 10 attendance records
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🔧 FIXING ATTENDANCE DATA\n');
  console.log('================================================\n');

  const students = await prisma.sinhVien.findMany({
    include: {
      nguoi_dung: true
    }
  });

  console.log(`📋 Processing ${students.length} students...\n`);

  let fixed = 0;
  let added = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    if (i % 50 === 0) {
      console.log(`Progress: ${i}/${students.length}...`);
    }

    // Count current attendance
    const currentAtt = await prisma.diemDanh.count({
      where: { sv_id: student.id }
    });

    if (currentAtt < 10) {
      const needed = 10 - currentAtt;
      
      // Get approved registrations that don't have attendance yet
      const approvedRegsWithoutAtt = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: student.id,
          trang_thai_dk: 'da_duyet',
          hoat_dong: {
            diem_danh: {
              none: {
                sv_id: student.id
              }
            }
          }
        },
        include: {
          hoat_dong: true
        },
        take: needed + 5
      });

      // Create attendance for these registrations
      for (let j = 0; j < needed && j < approvedRegsWithoutAtt.length; j++) {
        const reg = approvedRegsWithoutAtt[j];
        
        try {
          await prisma.diemDanh.create({
            data: {
              nguoi_diem_danh_id: reg.hoat_dong.nguoi_tao_id,
              sv_id: student.id,
              hd_id: reg.hd_id,
              tg_diem_danh: randomDate(reg.hoat_dong.ngay_bd, reg.hoat_dong.ngay_kt),
              phuong_thuc: 'qr',
              trang_thai_tham_gia: 'co_mat',
              xac_nhan_tham_gia: true
            }
          });
          added++;
        } catch (error) {
          // Skip duplicates
        }
      }
      
      fixed++;
    }
  }

  console.log(`\n✓ Fixed ${fixed} students`);
  console.log(`✓ Added ${added} attendance records\n`);

  // Verification
  console.log('🔍 VERIFICATION (Random 10 Students):\n');
  const randomStudents = students.sort(() => 0.5 - Math.random()).slice(0, 10);

  let allPass = true;
  for (const student of randomStudents) {
    const att = await prisma.diemDanh.count({
      where: { sv_id: student.id }
    });

    const status = att >= 10 ? '✅' : '❌';
    console.log(`${status} ${student.mssv}: ${att} attendance records`);
    
    if (att < 10) allPass = false;
  }

  console.log('\n================================================');
  if (allPass) {
    console.log('✅ ALL VERIFIED STUDENTS HAVE >= 10 ATTENDANCE');
  } else {
    console.log('⚠️  SOME STUDENTS STILL HAVE < 10 ATTENDANCE');
  }
  console.log('================================================\n');

  const totalAtt = await prisma.diemDanh.count();
  console.log(`📊 Total attendance records: ${totalAtt}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
