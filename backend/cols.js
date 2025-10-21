const {PrismaClient}=require('@prisma/client');
(async()=>{const p=new PrismaClient();try{const rows=await p.(