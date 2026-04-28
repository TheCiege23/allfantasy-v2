const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.sportsPlayer.findMany({
    where: {
      sport: 'NFL',
      sleeperId: { not: null },
      OR: [
        { name: { contains: 'Russell Wilson', mode: 'insensitive' } },
        { name: { contains: 'Achane', mode: 'insensitive' } },
        { name: { contains: 'Marvin Harrison', mode: 'insensitive' } }
      ]
    },
    select: { name: true, position: true, team: true, sleeperId: true, source: true, externalId: true }
  });
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(String(e)); await prisma.$disconnect(); process.exit(1); });
