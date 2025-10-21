const { prisma } = require('./src/config/database');

async function seedSampleActivities() {
  console.log('🌱 Tạo dữ liệu mẫu cho hoạt động và điểm rèn luyện...');

  try {
    // Lấy user 2021003 (Lê Minh Tuấn)
    const user = await prisma.nguoiDung.findUnique({
      where: { ten_dn: '2021003' },
      include: { sinh_vien: true }
    });

    if (!user || !user.sinh_vien) {
      console.error('Không tìm thấy sinh viên 2021003');
      return;
    }

    console.log(`✅ Tìm thấy sinh viên: ${user.ho_ten} (${user.sinh_vien.mssv})`);

    // Tạo loại hoạt động nếu chưa có
    const activityTypes = [
      {
        ten_loai_hd: 'Hoạt động tình nguyện',
        mo_ta: 'Các hoạt động tình nguyện, từ thiện, phục vụ cộng đồng',
        diem_mac_dinh: 10,
        diem_toi_da: 20,
        mau_sac: '#10B981'
      },
      {
        ten_loai_hd: 'Hoạt động học thuật',
        mo_ta: 'Tham gia hội thảo, cuộc thi học thuật, nghiên cứu khoa học',
        diem_mac_dinh: 8,
        diem_toi_da: 15,
        mau_sac: '#3B82F6'
      },
      {
        ten_loai_hd: 'Hoạt động văn nghệ thể thao',
        mo_ta: 'Tham gia các hoạt động văn nghệ, thể thao, giải trí',
        diem_mac_dinh: 6,
        diem_toi_da: 12,
        mau_sac: '#F59E0B'
      },
      {
        ten_loai_hd: 'Sinh hoạt lớp, khoa',
        mo_ta: 'Các hoạt động sinh hoạt tập thể, giao lưu, kỷ niệm',
        diem_mac_dinh: 5,
        diem_toi_da: 10,
        mau_sac: '#8B5CF6'
      }
    ];

    const createdTypes = [];
    for (const type of activityTypes) {
      const existing = await prisma.loaiHoatDong.findFirst({
        where: { ten_loai_hd: type.ten_loai_hd }
      });
      
      if (!existing) {
        const created = await prisma.loaiHoatDong.create({
          data: {
            ...type,
            nguoi_tao_id: user.id
          }
        });
        createdTypes.push(created);
        console.log(`✅ Tạo loại hoạt động: ${created.ten_loai_hd}`);
      } else {
        createdTypes.push(existing);
        console.log(`📋 Loại hoạt động đã tồn tại: ${existing.ten_loai_hd}`);
      }
    }

    // Tạo hoạt động mẫu
    const sampleActivities = [
      {
        ma_hd: 'HD001',
        ten_hd: 'Hiến máu nhân đạo lần thứ 15',
        mo_ta: 'Chương trình hiến máu nhân đạo "Giọt hồng yêu thương" do trường tổ chức',
        loai_hd: 'Hoạt động tình nguyện',
        diem_rl: 15,
        dia_diem: 'Sảnh chính trường Đại học Đà Lạt',
        ngay_bd: new Date('2024-03-15T08:00:00Z'),
        ngay_kt: new Date('2024-03-15T17:00:00Z'),
        han_dk: new Date('2024-03-10T23:59:59Z'),
        sl_toi_da: 200,
        don_vi_to_chuc: 'Trường Đại học Đà Lạt',
        yeu_cau_tham_gia: 'Sinh viên khỏe mạnh, không có bệnh lý về máu',
        trang_thai: 'da_duyet',
        hoc_ky: 'hoc_ky_2',
        nam_hoc: '2023-2024'
      },
      {
        ma_hd: 'HD002',
        ten_hd: 'Hoạt động tình nguyện mùa hè xanh 2024',
        mo_ta: 'Chiến dịch tình nguyện mùa hè xanh tại các vùng khó khăn',
        loai_hd: 'Hoạt động tình nguyện',
        diem_rl: 20,
        dia_diem: 'Huyện Đạ Huoai, Lâm Đồng',
        ngay_bd: new Date('2024-07-10T06:00:00Z'),
        ngay_kt: new Date('2024-07-20T18:00:00Z'),
        han_dk: new Date('2024-07-05T23:59:59Z'),
        sl_toi_da: 50,
        don_vi_to_chuc: 'Đoàn Thanh niên trường',
        yeu_cau_tham_gia: 'Sinh viên có sức khỏe tốt, tinh thần tình nguyện cao',
        trang_thai: 'da_duyet',
        hoc_ky: 'he',
        nam_hoc: '2023-2024'
      },
      {
        ma_hd: 'HD003',
        ten_hd: 'Cuộc thi Olympic Tin học sinh viên',
        mo_ta: 'Cuộc thi lập trình và tin học dành cho sinh viên các khối ngành',
        loai_hd: 'Hoạt động học thuật',
        diem_rl: 12,
        dia_diem: 'Phòng máy tính A1.01',
        ngay_bd: new Date('2024-04-05T08:00:00Z'),
        ngay_kt: new Date('2024-04-05T17:00:00Z'),
        han_dk: new Date('2024-03-30T23:59:59Z'),
        sl_toi_da: 100,
        don_vi_to_chuc: 'Khoa Công nghệ Thông tin',
        yeu_cau_tham_gia: 'Sinh viên có kiến thức cơ bản về lập trình',
        trang_thai: 'da_duyet',
        hoc_ky: 'hoc_ky_2',
        nam_hoc: '2023-2024'
      },
      {
        ma_hd: 'HD004',
        ten_hd: 'Sinh hoạt lớp đầu năm học 2024-2025',
        mo_ta: 'Hoạt động sinh hoạt đầu năm học, làm quen và giao lưu trong lớp',
        loai_hd: 'Sinh hoạt lớp, khoa',
        diem_rl: 5,
        dia_diem: 'Phòng A1.101',
        ngay_bd: new Date('2024-09-01T14:00:00Z'),
        ngay_kt: new Date('2024-09-01T16:00:00Z'),
        han_dk: new Date('2024-08-30T23:59:59Z'),
        sl_toi_da: 45,
        don_vi_to_chuc: 'Lớp 21DTHD5',
        yeu_cau_tham_gia: 'Tất cả sinh viên trong lớp',
        trang_thai: 'da_duyet',
        hoc_ky: 'hoc_ky_1',
        nam_hoc: '2024-2025'
      },
      {
        ma_hd: 'HD005',
        ten_hd: 'Hoạt động văn nghệ chào mừng ngày Quốc tế Phụ nữ 8/3',
        mo_ta: 'Chương trình văn nghệ đặc biệt chào mừng ngày 8/3',
        loai_hd: 'Hoạt động văn nghệ thể thao',
        diem_rl: 10,
        dia_diem: 'Hội trường lớn',
        ngay_bd: new Date('2024-03-08T19:00:00Z'),
        ngay_kt: new Date('2024-03-08T21:30:00Z'),
        han_dk: new Date('2024-03-05T23:59:59Z'),
        sl_toi_da: 300,
        don_vi_to_chuc: 'Hội sinh viên trường',
        yeu_cau_tham_gia: 'Sinh viên có năng khiếu văn nghệ',
        trang_thai: 'da_duyet',
        hoc_ky: 'hoc_ky_2',
        nam_hoc: '2023-2024'
      }
    ];

    const createdActivities = [];
    for (const activity of sampleActivities) {
      // Tìm loại hoạt động
      const activityType = createdTypes.find(t => t.ten_loai_hd === activity.loai_hd);
      if (!activityType) {
        console.error(`Không tìm thấy loại hoạt động: ${activity.loai_hd}`);
        continue;
      }

      const existing = await prisma.hoatDong.findFirst({
        where: { ma_hd: activity.ma_hd }
      });

      if (!existing) {
        const created = await prisma.hoatDong.create({
          data: {
            ma_hd: activity.ma_hd,
            ten_hd: activity.ten_hd,
            mo_ta: activity.mo_ta,
            loai_hd_id: activityType.id,
            diem_rl: activity.diem_rl,
            dia_diem: activity.dia_diem,
            ngay_bd: activity.ngay_bd,
            ngay_kt: activity.ngay_kt,
            han_dk: activity.han_dk,
            sl_toi_da: activity.sl_toi_da,
            don_vi_to_chuc: activity.don_vi_to_chuc,
            yeu_cau_tham_gia: activity.yeu_cau_tham_gia,
            trang_thai: activity.trang_thai,
            nguoi_tao_id: user.id,
            hoc_ky: activity.hoc_ky,
            nam_hoc: activity.nam_hoc,
            co_chung_chi: true
          }
        });
        createdActivities.push(created);
        console.log(`✅ Tạo hoạt động: ${created.ten_hd}`);
      } else {
        createdActivities.push(existing);
        console.log(`📋 Hoạt động đã tồn tại: ${existing.ten_hd}`);
      }
    }

    // Đăng ký sinh viên vào các hoạt động
    for (const activity of createdActivities) {
      const existing = await prisma.dangKyHoatDong.findFirst({
        where: {
          sv_id: user.sinh_vien.id,
          hd_id: activity.id
        }
      });

      if (!existing) {
        await prisma.dangKyHoatDong.create({
          data: {
            sv_id: user.sinh_vien.id,
            hd_id: activity.id,
            ngay_dang_ky: new Date(activity.ngay_bd.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 ngày trước
            trang_thai_dk: 'da_duyet'
          }
        });
        console.log(`✅ Đăng ký sinh viên vào: ${activity.ten_hd}`);

        // Tạo điểm danh cho một số hoạt động (giả lập sinh viên đã tham gia)
        if (activity.ma_hd !== 'HD004') { // Sinh viên vắng mặt ở hoạt động HD004
          await prisma.diemDanh.create({
            data: {
              sv_id: user.sinh_vien.id,
              hd_id: activity.id,
              ngay_dd: activity.ngay_bd,
              co_mat: true,
              ghi_chu: 'Tham gia đầy đủ',
              nguoi_diem_danh_id: user.id
            }
          });
          console.log(`✅ Điểm danh cho: ${activity.ten_hd}`);
        } else {
          await prisma.diemDanh.create({
            data: {
              sv_id: user.sinh_vien.id,
              hd_id: activity.id,
              ngay_dd: activity.ngay_bd,
              co_mat: false,
              ghi_chu: 'Vắng mặt không phép',
              nguoi_diem_danh_id: user.id
            }
          });
          console.log(`❌ Vắng mặt tại: ${activity.ten_hd}`);
        }
      } else {
        console.log(`📋 Đã đăng ký: ${activity.ten_hd}`);
      }
    }

    console.log('🎉 Tạo dữ liệu mẫu thành công!');
    console.log(`📊 Tổng cộng: ${createdTypes.length} loại hoạt động, ${createdActivities.length} hoạt động`);
    
  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu mẫu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSampleActivities();