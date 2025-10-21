const { prisma } = require('../src/config/database');

(async () => {
  try {
    const items = await prisma.vaiTro.findMany({ orderBy: { ten_vt: 'asc' } });
    console.log('Roles in DB:');
    for (const r of items) {
      const count = Array.isArray(r.quyen_han) ? r.quyen_han.length : 0;
      console.log(`- ${r.id} | ${r.ten_vt} | perms: ${count}`);
    }
    process.exit(0);
  } catch (e) {
    console.error('list_roles failed:', e);
    process.exit(1);
  }
})();
