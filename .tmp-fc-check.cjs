const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check format of sports_player IDs
  const sample = await prisma.sportsPlayerRecord.findMany({
    take: 10,
    select: { id: true, name: true, sport: true, injuryStatus: true },
    orderBy: { lastUpdated: 'desc' },
  });
  console.log('Recent sports_player records:');
  console.log(JSON.stringify(sample, null, 2));

  // Check FantasyCalc cached players to see their Sleeper IDs
  const fcSample = await prisma.fantasycalcValueCache.findMany({
    take: 5,
    select: { playerName: true, sleeperId: true, sport: true, position: true, trend30Day: true },
    orderBy: [{ trend30Day: 'desc' }],
  });
  console.log('\nFantasyCalc cache sample (highest trend):');
  console.log(JSON.stringify(fcSample, null, 2));

  // Find if any FantasyCalc players also have injury status in sports_players
  // Build NFL:sleeperId format and check
  const fcIds = fcSample.map(p => `NFL:${p.sleeperId}`);
  const withInjury = await prisma.sportsPlayerRecord.findMany({
    where: { id: { in: fcIds }, injuryStatus: { not: null } },
    select: { id: true, name: true, injuryStatus: true },
  });
  console.log('\nMatching FC players with injury in sports_players (NFL:sleeperId format):');
  console.log(JSON.stringify(withInjury, null, 2));

  // Also check direct ID format (just sleeperId as id)
  const sleeperIds = fcSample.map(p => p.sleeperId).filter(Boolean);
  const withInjury2 = await prisma.sportsPlayerRecord.findMany({
    where: { id: { in: sleeperIds }, injuryStatus: { not: null } },
    select: { id: true, name: true, injuryStatus: true },
  });
  console.log('\nMatching FC players with injury in sports_players (direct sleeperId format):');
  console.log(JSON.stringify(withInjury2, null, 2));
}

main().catch(e => console.error(String(e))).finally(() => prisma.$disconnect());
