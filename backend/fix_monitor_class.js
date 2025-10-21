const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fix monitor class assignment
 * This script will:
 * 1. Find all LOP_TRUONG users without proper class assignment
 * 2. Assign them to a class (or create SinhVien record if needed)
 */
async function fixMonitorClass() {
  try {
    console.log('\n🔧 Fixing Monitor Class Assignments...\n');

    // Get all LOP_TRUONG users
    const monitors = await prisma.nguoiDung.findMany({
      where: {
        vai_tro: {
          ten_vt: 'LOP_TRUONG'
        }
      },
      select: {
        id: true,
        ho_ten: true,
        email: true
      }
    });

    console.log(`Found ${monitors.length} LOP_TRUONG users\n`);

    for (const monitor of monitors) {
      console.log(`Processing: ${monitor.ho_ten} (${monitor.email})`);

      // Check existing SinhVien record
      let sinhVien = await prisma.sinhVien.findFirst({
        where: { nguoi_dung_id: monitor.id },
        include: { lop: true }
      });

      if (!sinhVien) {
        // Create new SinhVien record
        console.log(`  ❌ No SinhVien record found`);
        
        // Find a class to assign (prefer classes without a monitor)
        const availableClass = await prisma.lop.findFirst({
          orderBy: { ten_lop: 'asc' }
        });

        if (!availableClass) {
          console.log(`  ⚠️  No classes available in database`);
          continue;
        }

        // Generate MSSV
        const lastStudent = await prisma.sinhVien.findFirst({
          where: { mssv: { startsWith: 'LT' } },
          orderBy: { mssv: 'desc' }
        });
        
        let newMssv = 'LT000001';
        if (lastStudent) {
          const lastNum = parseInt(lastStudent.mssv.slice(2)) || 0;
          newMssv = `LT${String(lastNum + 1).padStart(6, '0')}`;
        }

        sinhVien = await prisma.sinhVien.create({
          data: {
            nguoi_dung_id: monitor.id,
            mssv: newMssv,
            lop_id: availableClass.id
          },
          include: { lop: true }
        });

        console.log(`  ✅ Created SinhVien record`);
        console.log(`     MSSV: ${sinhVien.mssv}`);
        console.log(`     Class: ${sinhVien.lop?.ten_lop}`);
      } else if (!sinhVien.lop_id) {
        // Update existing SinhVien with class assignment
        console.log(`  ⚠️  SinhVien exists but no lop_id`);
        
        const availableClass = await prisma.lop.findFirst({
          orderBy: { ten_lop: 'asc' }
        });

        if (!availableClass) {
          console.log(`  ⚠️  No classes available`);
          continue;
        }

        sinhVien = await prisma.sinhVien.update({
          where: { id: sinhVien.id },
          data: { lop_id: availableClass.id },
          include: { lop: true }
        });

        console.log(`  ✅ Updated with class: ${sinhVien.lop?.ten_lop}`);
      } else {
        console.log(`  ✅ Already assigned to: ${sinhVien.lop?.ten_lop}`);
      }

      console.log('');
    }

    console.log('✅ All monitors processed!\n');

    // Summary
    const fixedMonitors = await prisma.sinhVien.findMany({
      where: {
        nguoi_dung: {
          vai_tro: {
            ten_vt: 'LOP_TRUONG'
          }
        },
        lop_id: { not: null }
      },
      include: {
        nguoi_dung: { select: { ho_ten: true, email: true } },
        lop: { select: { ten_lop: true } }
      }
    });

    console.log('📊 Summary:');
    console.log(`   Total monitors with class: ${fixedMonitors.length}\n`);
    
    fixedMonitors.forEach(m => {
      console.log(`   ✅ ${m.nguoi_dung.ho_ten} → ${m.lop.ten_lop}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixMonitorClass();
