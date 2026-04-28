const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.playerIdentityMap.findMany({
    where: {
      sport: 'NFL',
      OR: [
        { canonicalName: { contains: 'Russell Wilson', mode: 'insensitive' } },
        { canonicalName: { contains: 'Achane', mode: 'insensitive' } },
        { canonicalName: { contains: 'Marvin Harrison', mode: 'insensitive' } }
      ]
    },
    select: { id: true, canonicalName: true, normalizedName: true, position: true, currentTeam: true, sleeperId: true },
    orderBy: [{ canonicalName: 'asc' }, { position: 'asc' }]
  });
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(String(e)); await prisma.$disconnect(); process.exit(1); });
