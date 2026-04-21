const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get the FantasyCalc cache and extract top trending players
  const cache = await prisma.sportsDataCache.findFirst({
    where: { cacheKey: { startsWith: 'fc:' } },
    orderBy: { expiresAt: 'desc' },
    select: { cacheKey: true, data: true, expiresAt: true, createdAt: true },
  });
  if (!cache) {
    console.log('No FantasyCalc cache found');
    return;
  }
  console.log('Cache key:', cache.cacheKey, 'expires:', cache.expiresAt, 'created:', cache.createdAt);

  let parsed;
  try {
    parsed = typeof cache.data === 'string' ? JSON.parse(cache.data) : cache.data;
  } catch (e) {
    console.log('Failed to parse cache data:', e.message);
    return;
  }

  const players = parsed?.players ?? [];
  console.log('Total players:', players.length);

  // Sort by trend30Day descending
  const sorted = [...players].sort((a, b) => (b.trend30Day ?? 0) - (a.trend30Day ?? 0));
  const top10 = sorted.slice(0, 10);
  console.log('Top 10 trending players (sleeperId, name):');
  top10.forEach(p => {
    console.log(`  sleeperId=${p.player.sleeperId} name="${p.player.name}" pos=${p.player.position} team=${p.player.maybeTeam} trend30d=${p.trend30Day}`);
  });

  // Check if these sleeper IDs exist in sports_players (NFL:{id} format)
  const sleeperIds = top10.map(p => `NFL:${p.player.sleeperId}`);
  const existing = await prisma.sportsPlayerRecord.findMany({
    where: { id: { in: sleeperIds } },
    select: { id: true, name: true, injuryStatus: true },
  });
  console.log('\nExisting in sports_players (NFL:{sleeperId}):', existing.length);
  console.log(JSON.stringify(existing, null, 2));
}

main().catch(e => console.error(String(e))).finally(() => prisma.$disconnect());
