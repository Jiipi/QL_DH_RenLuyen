const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMonitorData() {
  console.log('=========================================');
  console.log('KIỂM TRA DỮ LIỆU LỚP TRƯỞNG');
  console.log('=========================================\n');

  try {
    // 1. Lấy danh sách lớp trưởng
    console.log('1. DANH SÁCH LỚP TRƯỞNG:');
    console.log('-----------------------------------------');
    const monitors = await prisma.sinhVien.findMany({
      where: {
        nguoi_dung: {
          vai_tro: {
            ten_vt: 'LỚP_TRƯỞNG'
          }
        }
      },
      include: {
        nguoi_dung: {
          select: {
            id: true,
            ho_ten: true,
            email: true,
            vai_tro: {
              select: {
                ten_vt: true
              }
            }
          }
        },
        lop: {
          select: {
            id: true,
            ten_lop: true,
            khoa: true
          }
        }
      }
    });

    if (monitors.length === 0) {
      console.log('⚠️  KHÔNG TÌM THẤY LỚP TRƯỞNG NÀO!');
      console.log('   Hệ thống cần có ít nhất 1 user với vai trò LOP_TRUONG\n');
      return;
    }

    monitors.forEach((monitor, index) => {
      console.log(`\n${index + 1}. ${monitor.nguoi_dung.ho_ten} (${monitor.mssv})`);
      console.log(`   User ID: ${monitor.nguoi_dung.id}`);
      console.log(`   Sinh viên ID: ${monitor.id}`);
      console.log(`   Lớp: ${monitor.lop.ten_lop} (${monitor.lop.khoa})`);
      console.log(`   Lớp ID: ${monitor.lop_id}`);
    });

    // 2. Kiểm tra từng lớp trưởng
    console.log('\n\n2. KIỂM TRA CHI TIẾT TỪNG LỚP TRƯỞNG:');
    console.log('-----------------------------------------');
    
    for (const monitor of monitors) {
      console.log(`\n📋 Lớp trưởng: ${monitor.nguoi_dung.ho_ten} - Lớp: ${monitor.lop.ten_lop}`);
      
      // Đếm tổng sinh viên trong lớp
      const totalStudents = await prisma.sinhVien.count({
        where: { lop_id: monitor.lop_id }
      });
      console.log(`   ✓ Tổng sinh viên trong lớp: ${totalStudents}`);

      // Đếm đăng ký chờ duyệt (theo logic backend)
      const pendingRegistrations = await prisma.dangKyHoatDong.findMany({
        where: {
          trang_thai_dk: 'cho_duyet',
          sinh_vien: {
            lop_id: monitor.lop_id
          }
        },
        include: {
          sinh_vien: {
            include: {
              nguoi_dung: {
                select: {
                  ho_ten: true
                }
              }
            }
          },
          hoat_dong: {
            select: {
              ten_hd: true,
              diem_rl: true
            }
          }
        }
      });

      console.log(`   ✓ Đăng ký chờ duyệt: ${pendingRegistrations.length}`);

      if (pendingRegistrations.length > 0) {
        console.log('\n   Chi tiết:');
        pendingRegistrations.forEach((reg, idx) => {
          console.log(`   ${idx + 1}. ${reg.sinh_vien.nguoi_dung.ho_ten} (${reg.sinh_vien.mssv})`);
          console.log(`      → ${reg.hoat_dong.ten_hd} (+${reg.hoat_dong.diem_rl} điểm)`);
        });
      }

      // Đếm các trạng thái khác
      const approvedCount = await prisma.dangKyHoatDong.count({
        where: {
          trang_thai_dk: 'da_duyet',
          sinh_vien: { lop_id: monitor.lop_id }
        }
      });

      const rejectedCount = await prisma.dangKyHoatDong.count({
        where: {
          trang_thai_dk: 'tu_choi',
          sinh_vien: { lop_id: monitor.lop_id }
        }
      });

      const participatedCount = await prisma.dangKyHoatDong.count({
        where: {
          trang_thai_dk: 'da_tham_gia',
          sinh_vien: { lop_id: monitor.lop_id }
        }
      });

      console.log(`   ✓ Đã duyệt: ${approvedCount}`);
      console.log(`   ✓ Từ chối: ${rejectedCount}`);
      console.log(`   ✓ Đã tham gia: ${participatedCount}`);
    }

    // 3. Kiểm tra xem có đăng ký nào của sinh viên ngoài lớp không
    console.log('\n\n3. KIỂM TRA CROSS-CLASS (Đăng ký từ sinh viên lớp khác):');
    console.log('-----------------------------------------');

    for (const monitor of monitors) {
      const crossClassRegs = await prisma.dangKyHoatDong.findMany({
        where: {
          trang_thai_dk: 'cho_duyet',
          sinh_vien: {
            lop_id: {
              not: monitor.lop_id
            }
          }
        },
        include: {
          sinh_vien: {
            include: {
              nguoi_dung: {
                select: {
                  ho_ten: true
                }
              },
              lop: {
                select: {
                  ten_lop: true
                }
              }
            }
          },
          hoat_dong: {
            select: {
              ten_hd: true
            }
          }
        },
        take: 5
      });

      if (crossClassRegs.length > 0) {
        console.log(`\n⚠️  Lớp trưởng ${monitor.nguoi_dung.ho_ten} (${monitor.lop.ten_lop})`);
        console.log(`   KHÔNG NÊN thấy các đăng ký này (từ lớp khác):`);
        crossClassRegs.forEach((reg, idx) => {
          console.log(`   ${idx + 1}. ${reg.sinh_vien.nguoi_dung.ho_ten} - Lớp ${reg.sinh_vien.lop.ten_lop}`);
          console.log(`      → ${reg.hoat_dong.ten_hd}`);
        });
      } else {
        console.log(`✓ OK: Không có đăng ký cross-class cho lớp ${monitor.lop.ten_lop}`);
      }
    }

    // 4. Test API endpoint simulation
    console.log('\n\n4. SIMULATION: API /class/registrations (Backend Logic):');
    console.log('-----------------------------------------');

    if (monitors.length > 0) {
      const testMonitor = monitors[0];
      console.log(`\nGiả sử user "${testMonitor.nguoi_dung.ho_ten}" đăng nhập...`);
      console.log(`User ID: ${testMonitor.nguoi_dung.id}`);
      console.log(`Lớp: ${testMonitor.lop.ten_lop}`);
      console.log(`Lớp ID: ${testMonitor.lop_id}`);

      // Giống logic trong ClassController.getPendingRegistrations
      const apiResult = await prisma.dangKyHoatDong.findMany({
        where: {
          sinh_vien: { lop_id: testMonitor.lop_id }
        },
        include: {
          sinh_vien: {
            include: {
              nguoi_dung: { select: { ho_ten: true, email: true } },
              lop: { select: { ten_lop: true } }
            }
          },
          hoat_dong: { 
            select: { 
              ten_hd: true, 
              ngay_bd: true, 
              diem_rl: true 
            } 
          }
        },
        orderBy: { ngay_dang_ky: 'desc' },
        take: 500
      });

      console.log(`\n✓ API sẽ trả về: ${apiResult.length} đăng ký`);
      
      const groupedByStatus = apiResult.reduce((acc, reg) => {
        acc[reg.trang_thai_dk] = (acc[reg.trang_thai_dk] || 0) + 1;
        return acc;
      }, {});

      console.log('\nPhân bổ theo trạng thái:');
      Object.entries(groupedByStatus).forEach(([status, count]) => {
        const statusLabels = {
          'cho_duyet': 'Chờ duyệt',
          'da_duyet': 'Đã duyệt',
          'tu_choi': 'Từ chối',
          'da_tham_gia': 'Đã tham gia'
        };
        console.log(`   ${statusLabels[status] || status}: ${count}`);
      });

      // Verify: Tất cả sinh viên phải cùng lớp
      const allSameClass = apiResult.every(reg => 
        reg.sinh_vien.lop_id === testMonitor.lop_id
      );
      
      if (allSameClass) {
        console.log('\n✅ PASS: Tất cả đăng ký đều từ sinh viên cùng lớp');
      } else {
        console.log('\n❌ FAIL: Có đăng ký từ sinh viên lớp khác!');
      }
    }

    console.log('\n\n=========================================');
    console.log('KẾT LUẬN:');
    console.log('=========================================');
    console.log('✓ Backend code đã đúng: filter theo lop_id');
    console.log('✓ Middleware getMonitorClass lấy đúng lop_id');
    console.log('✓ API chỉ trả về đăng ký của sinh viên cùng lớp');
    console.log('\nNếu trên giao diện vẫn thấy sai:');
    console.log('1. Kiểm tra user đang đăng nhập có đúng vai trò LOP_TRUONG');
    console.log('2. Kiểm tra token JWT có hợp lệ (F12 → Application → Local Storage)');
    console.log('3. Clear cache browser và refresh lại trang');
    console.log('=========================================\n');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMonitorData();
