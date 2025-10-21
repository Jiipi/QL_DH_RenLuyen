const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function ensureRole(name, mo_ta) {
  const found = await prisma.vaiTro.findUnique({ where: { ten_vt: name } }).catch(() => null);
  if (found) return found;
  return prisma.vaiTro.create({ data: { ten_vt: name, mo_ta } });
}

async function upsertUser(ten_dn, email, ho_ten, password, roleName) {
  const existing = await prisma.nguoiDung.findUnique({ where: { ten_dn } }).catch(() => null);
  if (existing) return existing;
  const role = await ensureRole(roleName, roleName);
  const hashed = await bcrypt.hash(password, 10);
  return prisma.nguoiDung.create({
    data: {
      ten_dn,
      email,
      ho_ten,
      mat_khau: hashed,
      vai_tro_id: role.id,
      trang_thai: 'hoat_dong',
    },
  });
}

async function main() {
  console.log('Adding demo users...');
  await upsertUser('ADMIN', 'system@local', 'System', 'ignored', 'ADMIN'); // ensure role exists even if not used
  await upsertUser('admin', 'admin@dlu.edu.vn', 'Quản Trị Viên', 'Admin@123', 'ADMIN');
  await upsertUser('gv001', 'nguyenvana@dlu.edu.vn', 'Nguyễn Văn A', 'Teacher@123', 'GIANG_VIEN');
  await upsertUser('lt001', 'tranvanc@dlu.edu.vn', 'Trần Văn C', 'Monitor@123', 'LOP_TRUONG');
  await upsertUser('2021003', '2021003@dlu.edu.vn', 'Lê Minh Tuấn', 'Student@123', 'SINH_VIEN');
  console.log('Done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });


