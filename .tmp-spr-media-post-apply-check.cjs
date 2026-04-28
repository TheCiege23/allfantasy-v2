const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const whereSport = { sport: 'NFL' };
  const [total, nullHeadshot, nullLogo, dataUriHeadshot, dataUriLogo, dataUriFromBackfillSource] = await Promise.all([
    prisma.sportsPlayerRecord.count({ where: whereSport }),
    prisma.sportsPlayerRecord.count({ where: { ...whereSport, headshotUrl: null } }),
    prisma.sportsPlayerRecord.count({ where: { ...whereSport, logoUrl: null } }),
    prisma.sportsPlayerRecord.count({ where: { ...whereSport, headshotUrl: { startsWith: 'data:image' } } }),
    prisma.sportsPlayerRecord.count({ where: { ...whereSport, logoUrl: { startsWith: 'data:image' } } }),
    prisma.sportsPlayerRecord.count({ where: { ...whereSport, headshotSource: 'draft_pool_cache', OR: [ { headshotUrl: { startsWith: 'data:image' } }, { logoUrl: { startsWith: 'data:image' } } ] } }),
  ]);
  console.log(JSON.stringify({ total, nullHeadshot, nullLogo, dataUriHeadshot, dataUriLogo, dataUriFromBackfillSource }, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(String(e)); await prisma.$disconnect(); process.exit(1); });
