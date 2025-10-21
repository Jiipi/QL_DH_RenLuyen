const { prisma } = require('../src/config/database');

(async () => {
  try {
    const username = process.argv[2] || 'SV000013';
    const user = await prisma.nguoiDung.findFirst({
      where: { ten_dn: username },
      include: { vai_tro: true, sinh_vien: { include: { lop: true } } }
    });
    if (!user) {
      console.log('User not found:', username);
      process.exit(0);
    }
    console.log({
      id: user.id,
      ten_dn: user.ten_dn,
      ho_ten: user.ho_ten,
      roleId: user.vai_tro_id,
      roleName: user.vai_tro?.ten_vt,
      sinh_vien: !!user.sinh_vien,
      lop: user.sinh_vien?.lop?.ten_lop || null,
      khoa: user.sinh_vien?.lop?.khoa || null,
    });
    process.exit(0);
  } catch (e) {
    console.error('inspect_user failed:', e);
    process.exit(1);
  }
})();
