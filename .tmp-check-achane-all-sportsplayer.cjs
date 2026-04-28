const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.sportsPlayer.findMany({
    where: { OR: [{ name: { contains: 'Achane', mode: 'insensitive' } }, { name: { contains: "De'von", mode: 'insensitive' } }] },
    select: { sport: true, name: true, position: true, team: true, sleeperId: true, source: true, externalId: true },
    take: 50
  });
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(String(e)); await prisma.$disconnect(); process.exit(1); });
