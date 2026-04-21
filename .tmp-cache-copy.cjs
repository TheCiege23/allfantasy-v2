const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Copy dynasty:1:qbs:1:teams:12:ppr:0 to common redraft variants
  const source = await prisma.sportsDataCache.findUnique({
    where: { cacheKey: 'fantasycalc:values:dynasty:1:qbs:1:teams:12:ppr:0' },
  });
  if (!source) { console.log('Source cache not found'); return; }
  console.log('Source cache found, player count:', JSON.parse(JSON.stringify(source.data))?.players?.length);

  const now = new Date();
  const ttl = 1000 * 60 * 60 * 24; // 24h TTL
  const newExpiry = new Date(now.getTime() + ttl);

  const variants = [
    { isDynasty: false, numQbs: 1, numTeams: 12, ppr: 1 },
    { isDynasty: false, numQbs: 1, numTeams: 10, ppr: 1 },
    { isDynasty: false, numQbs: 1, numTeams: 12, ppr: 0.5 },
    { isDynasty: false, numQbs: 1, numTeams: 12, ppr: 0 },
    { isDynasty: true, numQbs: 2, numTeams: 12, ppr: 1 },
    { isDynasty: true, numQbs: 1, numTeams: 12, ppr: 1 },
  ];

  for (const v of variants) {
    const key = `fantasycalc:values:dynasty:${v.isDynasty ? '1' : '0'}:qbs:${v.numQbs}:teams:${v.numTeams}:ppr:${v.ppr}`;
    await prisma.sportsDataCache.upsert({
      where: { cacheKey: key },
      update: { data: source.data, expiresAt: newExpiry },
      create: { cacheKey: key, data: source.data, expiresAt: newExpiry },
    });
    console.log('Upserted cache key:', key);
  }
  console.log('Done.');
}

main().catch(e => console.error(String(e))).finally(() => prisma.$disconnect());
