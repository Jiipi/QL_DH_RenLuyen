const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
function done(){p.();}
function run(){p.sinhVien.findFirst().then(r=>{if(!r){console.log('no rows');}else{console.log(Object.keys(r));} done();}).catch(e=>{console.error(e); done();});}
run();
