const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check sports_players with injury_status
  const injured = await prisma.sportsPlayerRecord.count({
    where: { injuryStatus: { not: null } },
  });
  const total = await prisma.sportsPlayerRecord.count();
  const sample = await prisma.sportsPlayerRecord.findMany({
    where: { injuryStatus: { not: null } },
    take: 5,
    select: { id: true, name: true, injuryStatus: true, position: true, sport: true, team: true },
  });
  console.log('sports_players: injured:', injured, '/ total:', total);
  console.log(JSON.stringify(sample, null, 2));

  // Check player_meta_trends
  const metaCount = await prisma.playerMetaTrend.count();
  const metaSample = await prisma.playerMetaTrend.findMany({
    take: 5,
    select: { playerId: true, sport: true, trendingDirection: true, trendScore: true },
  });
  console.log('\nplayer_meta_trends rows:', metaCount);
  console.log(JSON.stringify(metaSample, null, 2));

  // Check trending_players
  const tpCount = await prisma.trendingPlayer.count();
  const now = new Date();
  const tpExpired = await prisma.trendingPlayer.count({ where: { expiresAt: { lte: now } } });
  const tpActive = await prisma.trendingPlayer.count({ where: { expiresAt: { gt: now } } });
  console.log('\ntrending_players rows:', tpCount, 'active:', tpActive, 'expired:', tpExpired);
}

main().catch(e => console.error(String(e))).finally(() => prisma.$disconnect());
