const { prisma } = require('../src/config/database');

(async () => {
  try {
    const lopTruong = await prisma.vaiTro.findFirst({ 
      where: { ten_vt: 'LOP_TRUONG' } 
    });
    
    if (!lopTruong) {
      console.log('❌ LOP_TRUONG role not found!');
      process.exit(1);
    }
    
    console.log('=== LOP_TRUONG ROLE ===');
    console.log('ID:', lopTruong.id);
    console.log('Name:', lopTruong.ten_vt);
    console.log('Description:', lopTruong.mo_ta);
    console.log('\n=== PERMISSIONS ===');
    
    if (Array.isArray(lopTruong.quyen_han)) {
      lopTruong.quyen_han.sort().forEach((perm, idx) => {
        console.log(`${idx + 1}. ${perm}`);
      });
      
      console.log(`\nTotal: ${lopTruong.quyen_han.length} permissions`);
      
      // Check specifically for activities.create
      const hasCreate = lopTruong.quyen_han.includes('activities.create');
      console.log('\n=== CRITICAL CHECK ===');
      console.log('Has activities.create?', hasCreate ? '✅ YES' : '❌ NO');
      
      if (!hasCreate) {
        console.log('\n⚠️  PROBLEM: LOP_TRUONG does not have activities.create permission!');
        console.log('This is why the error occurs.');
      }
    } else {
      console.log('❌ quyen_han is not an array:', lopTruong.quyen_han);
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
