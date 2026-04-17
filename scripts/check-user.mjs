import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const u = await prisma.appUser.findFirst({
  where: { OR: [{ username: 'TheCiege24' }, { email: 'cjabar.henson@gmail.com' }] },
  select: { id: true, username: true, email: true, passwordHash: true, emailVerified: true }
});
console.log(JSON.stringify(u, null, 2));
if (u?.passwordHash) {
  const bcrypt = await import('bcryptjs');
  const match = await bcrypt.compare('AFtemp!2026', u.passwordHash);
  console.log('Password match:', match);
}
await prisma.$disconnect();
