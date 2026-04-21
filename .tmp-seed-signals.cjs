const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Read stale FantasyCalc cache (any dynasty key)
  const cache = await prisma.sportsDataCache.findFirst({
    where: { cacheKey: { startsWith: 'fantasycalc:' } },
    orderBy: { createdAt: 'desc' },
    select: { cacheKey: true, data: true, expiresAt: true },
  });
  if (!cache) { console.log('No FC cache'); return; }
  console.log('Using cache key:', cache.cacheKey);

  const raw = typeof cache.data === 'string' ? JSON.parse(cache.data) : cache.data;
  const players = raw?.players ?? [];
  console.log('Players in cache:', players.length);

  // Sort by trend30Day desc, take top 10
  const sorted = [...players].sort((a, b) => (b.trend30Day ?? 0) - (a.trend30Day ?? 0));
  const top = sorted.slice(0, 10);
  console.log('\nTop 10 by trend30Day:');
  top.forEach(p => {
    const sid = p.player?.sleeperId;
    const name = p.player?.name;
    const pos = p.player?.position;
    const team = p.player?.maybeTeam;
    console.log(`  id=NFL:${sid}  name="${name}" pos=${pos} team=${team} trend30d=${Math.round(p.trend30Day)}`);
  });

  // Upsert top 5 into SportsPlayerRecord with injury status for hybrid badge testing
  const top5 = top.slice(0, 5);
  for (const p of top5) {
    const sid = p.player?.sleeperId;
    if (!sid) continue;
    const id = `NFL:${sid}`;
    await prisma.sportsPlayerRecord.upsert({
      where: { id },
      update: { injuryStatus: 'Questionable' },
      create: {
        id,
        sport: 'NFL',
        name: p.player.name,
        team: p.player.maybeTeam ?? 'UNK',
        position: p.player.position ?? 'UNK',
        stats: {},
        projections: {},
        injuryStatus: 'Questionable',
        dataSource: 'seed',
      },
    });
    console.log(`Upserted sports_player: ${id} (${p.player.name}) injuryStatus=Questionable`);
  }

  // Seed player_meta_trends with NBA players for Real badge testing
  const nbaSeed = [
    { id: 'NBA:lebron-james', name: 'LeBron James', team: 'LAL', position: 'SF' },
    { id: 'NBA:jayson-tatum', name: 'Jayson Tatum', team: 'BOS', position: 'SF' },
    { id: 'NBA:stephen-curry', name: 'Stephen Curry', team: 'GSW', position: 'PG' },
    { id: 'NBA:giannis-antetokounmpo', name: 'Giannis Antetokounmpo', team: 'MIL', position: 'PF' },
    { id: 'NBA:nikola-jokic', name: 'Nikola Jokic', team: 'DEN', position: 'C' },
  ];
  for (const pl of nbaSeed) {
    await prisma.sportsPlayerRecord.upsert({
      where: { id: pl.id },
      update: { name: pl.name, team: pl.team, position: pl.position },
      create: {
        id: pl.id,
        sport: 'NBA',
        name: pl.name,
        team: pl.team,
        position: pl.position,
        stats: {},
        projections: {},
        dataSource: 'seed',
      },
    });
    await prisma.playerMetaTrend.upsert({
      where: { uniq_player_meta_trend_player_sport: { playerId: pl.id, sport: 'NBA' } },
      update: { trendScore: 78 + Math.random() * 15, trendingDirection: 'Rising', addRate: 0.8, tradeInterest: 0.4, lineupStartRate: 0.9 },
      create: {
        playerId: pl.id,
        sport: 'NBA',
        trendScore: 78 + Math.random() * 15,
        trendingDirection: 'Rising',
        addRate: 0.8,
        dropRate: 0.1,
        tradeInterest: 0.4,
        draftFrequency: 0.7,
        lineupStartRate: 0.9,
        injuryImpact: 0.05,
        previousTrendScore: 70,
      },
    });
    console.log(`Seeded NBA player_meta_trends: ${pl.id} (${pl.name})`);
  }

  // Also seed some "falling" NBA players
  const nbaFall = [
    { id: 'NBA:kyrie-irving', name: 'Kyrie Irving', team: 'DAL', position: 'PG' },
    { id: 'NBA:ben-simmons', name: 'Ben Simmons', team: 'PHI', position: 'PG' },
  ];
  for (const pl of nbaFall) {
    await prisma.sportsPlayerRecord.upsert({
      where: { id: pl.id },
      update: { name: pl.name, team: pl.team },
      create: { id: pl.id, sport: 'NBA', name: pl.name, team: pl.team, position: pl.position, stats: {}, projections: {}, dataSource: 'seed' },
    });
    await prisma.playerMetaTrend.upsert({
      where: { uniq_player_meta_trend_player_sport: { playerId: pl.id, sport: 'NBA' } },
      update: { trendScore: 25, trendingDirection: 'Falling', dropRate: 0.6, injuryImpact: 0.3 },
      create: {
        playerId: pl.id, sport: 'NBA', trendScore: 25, trendingDirection: 'Falling',
        addRate: 0.1, dropRate: 0.6, tradeInterest: 0.15, draftFrequency: 0.2, lineupStartRate: 0.35, injuryImpact: 0.3, previousTrendScore: 45,
      },
    });
    console.log(`Seeded NBA falling player_meta_trends: ${pl.id} (${pl.name})`);
  }

  console.log('\nSeeding complete.');
}

main().catch(e => console.error(String(e))).finally(() => prisma.$disconnect());
