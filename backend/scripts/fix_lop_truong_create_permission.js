const { prisma } = require('../src/config/database');

(async () => {
  try {
    console.log('=== FIX LOP_TRUONG ACTIVITIES.CREATE PERMISSION ===\n');
    
    // Get current LOP_TRUONG role
    const lopTruong = await prisma.vaiTro.findFirst({ 
      where: { ten_vt: 'LOP_TRUONG' } 
    });
    
    if (!lopTruong) {
      console.log('❌ LOP_TRUONG role not found!');
      process.exit(1);
    }
    
    console.log('Current permissions:', lopTruong.quyen_han.length);
    console.log('Has activities.create?', lopTruong.quyen_han.includes('activities.create'));
    
    // Add activities.create if missing
    if (!lopTruong.quyen_han.includes('activities.create')) {
      const updatedPerms = [...lopTruong.quyen_han, 'activities.create'].sort();
      
      await prisma.vaiTro.update({
        where: { id: lopTruong.id },
        data: { quyen_han: updatedPerms }
      });
      
      console.log('\n✅ Added activities.create permission');
      console.log('New total permissions:', updatedPerms.length);
      console.log('\nUpdated permissions list:');
      updatedPerms.forEach((perm, idx) => {
        const isNew = perm === 'activities.create';
        console.log(`${idx + 1}. ${perm}${isNew ? ' ⬅️ NEW' : ''}`);
      });
    } else {
      console.log('\n✅ activities.create permission already exists');
    }
    
    await prisma.$disconnect();
    console.log('\n✅ Fix completed successfully!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
