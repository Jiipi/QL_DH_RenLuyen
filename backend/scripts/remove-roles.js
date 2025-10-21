/*
  Hard purge specific role IDs and all related data.
  - Identify all users (nguoi_dung) having these roles.
  - Nullify references (e.g., lop.lop_truong) and DELETE all dependent data:
    * sinh_vien of those users
    * dang_ky_hoat_dong for those sinh_vien or activities created by those users
    * diem_danh for those sinh_vien or marked by those users
    * hoat_dong created by those users (and their related records)
    * thong_bao where they are sender/receiver
  - Finally DELETE the users and DELETE the roles.

  Usage (inside backend container):
  node scripts/remove-roles.js <roleId1> <roleId2> <roleId3>
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ errorFormat: 'pretty' });

function parseArgs() {
  const args = process.argv.slice(2);
  const roleIds = args.filter(a => !a.startsWith('--'));
  const fallbackUserArg = args.find(a => a.startsWith('--fallback-user='));
  const fallbackUserId = fallbackUserArg ? fallbackUserArg.split('=')[1] : null;
  return { roleIds, fallbackUserId };
}

async function main() {
  const { roleIds, fallbackUserId } = parseArgs();
  if (!roleIds.length) {
    console.error('No role IDs provided. Example: node scripts/remove-roles.js <id1> <id2> <id3>');
    process.exit(1);
  }

  console.log('Removing roles:', roleIds.join(', '));

  // Check which roles exist
  const roles = await prisma.vaiTro.findMany({ where: { id: { in: roleIds } } });
  if (!roles.length) {
    console.log('No matching roles found. Nothing to delete.');
    return;
  }
  console.table(roles.map(r => ({ id: r.id, ten_vt: r.ten_vt })));

  // Find all users with these roles
  const users = await prisma.nguoiDung.findMany({ where: { vai_tro_id: { in: roleIds } }, select: { id: true } });
  const userIds = users.map(u => u.id);
  console.log(`Users to DELETE: ${userIds.length}`);

  // Find sinh_vien linked to these users
  const sinhViens = await prisma.sinhVien.findMany({ where: { nguoi_dung_id: { in: userIds } }, select: { id: true } });
  const svIds = sinhViens.map(sv => sv.id);
  console.log(`SinhVien to DELETE: ${svIds.length}`);

  // 1) Nullify Lop.lop_truong pointing to those sv ids
  if (svIds.length) {
    await prisma.lop.updateMany({ where: { lop_truong: { in: svIds } }, data: { lop_truong: null } });
    console.log('Nullified lop.lop_truong where needed');
  }

  // 2) Delete DiemDanh linked to those sv or marked by those users
  if (svIds.length) {
    const del1 = await prisma.diemDanh.deleteMany({ where: { sv_id: { in: svIds } } });
    console.log('Deleted diem_danh by sv:', del1.count);
  }
  if (userIds.length) {
    const del2 = await prisma.diemDanh.deleteMany({ where: { nguoi_diem_danh_id: { in: userIds } } });
    console.log('Deleted diem_danh marked by users:', del2.count);
  }

  // 3) Delete DangKyHoatDong linked to those sv
  if (svIds.length) {
    const del3 = await prisma.dangKyHoatDong.deleteMany({ where: { sv_id: { in: svIds } } });
    console.log('Deleted dang_ky_hoat_dong by sv:', del3.count);
  }

  // 4) Delete HoatDong created by those users and related records
  if (userIds.length) {
    const activities = await prisma.hoatDong.findMany({ where: { nguoi_tao_id: { in: userIds } }, select: { id: true } });
    const hdIds = activities.map(h => h.id);
    console.log('Activities to DELETE:', hdIds.length);
    if (hdIds.length) {
      const del4a = await prisma.dangKyHoatDong.deleteMany({ where: { hd_id: { in: hdIds } } });
      const del4b = await prisma.diemDanh.deleteMany({ where: { hd_id: { in: hdIds } } });
      const del4c = await prisma.hoatDong.deleteMany({ where: { id: { in: hdIds } } });
      console.log('Deleted related of hoat_dong - dang_ky:', del4a.count, 'diem_danh:', del4b.count, 'hoat_dong:', del4c.count);
    }
  }

  // 5) Delete ThongBao where they are sender or receiver
  if (userIds.length) {
    const del5a = await prisma.thongBao.deleteMany({ where: { nguoi_gui_id: { in: userIds } } });
    const del5b = await prisma.thongBao.deleteMany({ where: { nguoi_nhan_id: { in: userIds } } });
    console.log('Deleted thong_bao sent:', del5a.count, 'received:', del5b.count);
  }

  // 6) Delete SinhVien rows
  if (svIds.length) {
    const del6 = await prisma.sinhVien.deleteMany({ where: { id: { in: svIds } } });
    console.log('Deleted sinh_vien:', del6.count);
  }

  // 7) Reassign Lop.chu_nhiem for classes referencing these users (non-nullable FK)
  if (userIds.length) {
    // Determine fallback user id
    let fallbackUser = null;
    if (fallbackUserId) {
      fallbackUser = await prisma.nguoiDung.findUnique({ where: { id: fallbackUserId } });
      if (!fallbackUser) {
        throw new Error(`Provided --fallback-user=${fallbackUserId} not found`);
      }
    } else {
      // Try to find any existing user not in deletion list, prefer ADMIN role if available
      fallbackUser = await prisma.nguoiDung.findFirst({
        where: { id: { notIn: userIds }, vai_tro: { ten_vt: 'ADMIN' } },
        select: { id: true }
      });
      if (!fallbackUser) {
        fallbackUser = await prisma.nguoiDung.findFirst({ where: { id: { notIn: userIds } }, select: { id: true } });
      }
    }
    if (!fallbackUser) {
      throw new Error('No fallback user available to reassign lop.chu_nhiem. Create an ADMIN user or pass --fallback-user=<id>.');
    }
    const reassigned = await prisma.lop.updateMany({ where: { chu_nhiem: { in: userIds } }, data: { chu_nhiem: fallbackUser.id } });
    console.log('Reassigned lop.chu_nhiem rows:', reassigned.count);
  }

  // 8) Delete NguoiDung rows
  if (userIds.length) {
    const del7 = await prisma.nguoiDung.deleteMany({ where: { id: { in: userIds } } });
    console.log('Deleted nguoi_dung:', del7.count);
  }

  // 9) Finally, delete the roles
  const deleted = await prisma.vaiTro.deleteMany({ where: { id: { in: roleIds } } });
  console.log('Deleted roles count:', deleted.count);

  console.log('Hard purge complete.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
