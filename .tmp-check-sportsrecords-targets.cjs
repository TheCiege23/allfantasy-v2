const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.sportsPlayerRecord.findMany({
    where: {
      sport: 'NFL',
      OR: [
        { name: { contains: 'Russell Wilson', mode: 'insensitive' } },
        { name: { contains: 'Achane', mode: 'insensitive' } },
        { name: { contains: 'Marvin Harrison', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, position: true, team: true, dataSource: true, lastUpdated: true }
  });
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(String(e)); await prisma.$disconnect(); process.exit(1); });
