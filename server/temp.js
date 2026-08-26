require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const p = new PrismaClient({ adapter });
  const u = await p.user.findUnique({
    where: { email: 'avinashsaripalli2000@gmail.com' },
    select: { id: true, email: true, masterPasswordHash: true, masterPasswordHint: true }
  });
  console.log('Has hash:', !!u.masterPasswordHash);
  console.log('Hint:', u.masterPasswordHint);
  const match = await bcrypt.compare('Master@123', u.masterPasswordHash);
  console.log('bcrypt match for Master@123:', match);
  await p.$disconnect();
})();
