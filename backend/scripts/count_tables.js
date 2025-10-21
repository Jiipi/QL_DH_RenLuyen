// Utility script to print row counts for core tables after (re)seeding
// Run inside backend container: `node scripts/count_tables.js`
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tables = [
  'vai_tro',
  'nguoi_dung',
  'loai_hoat_dong',
  'loai_thong_bao',
  'lop',
  'sinh_vien',
  'hoat_dong',
  'dang_ky_hoat_dong',
  'diem_danh',
  'thong_bao'
];

async function main() {
  console.log('--- Table Counts ---');
  for (const t of tables) {
    try {
      const [{ c }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM ${t}`);
      console.log(`${t.padEnd(18)} ${c}`);
    } catch (e) {
      console.error(`Error counting ${t}:`, e.code || e.message);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
