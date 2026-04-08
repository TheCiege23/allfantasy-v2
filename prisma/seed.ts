import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.appUser.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      username: "testuser",
    },
  });

  console.log("Seeded user:", user.id);

  const league = await prisma.league.upsert({
    where: {
      userId_platform_platformLeagueId_season: {
        userId: user.id,
        platform: "sleeper",
        platformLeagueId: "test-league-001",
        season: 2025,
      },
    },
    update: {},
    create: {
      userId: user.id,
      platform: "sleeper",
      platformLeagueId: "test-league-001",
      name: "Test Fantasy League",
      sport: "NFL",
      season: 2025,
    },
  });

  console.log("Seeded league:", league.id);

  const team = await prisma.leagueTeam.upsert({
    where: {
      leagueId_externalId: {
        leagueId: league.id,
        externalId: "roster-1",
      },
    },
    update: {},
    create: {
      leagueId: league.id,
      externalId: "roster-1",
      ownerName: "testuser",
      teamName: "Test Team",
    },
  });

  console.log("Seeded league team:", team.id);

  const performance = await prisma.teamPerformance.upsert({
    where: {
      teamId_season_week: {
        teamId: team.id,
        season: 2025,
        week: 1,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      season: 2025,
      week: 1,
      points: 112.4,
      opponent: "Opponent Team",
      result: "W",
    },
  });

  console.log("Seeded team performance:", performance.id);

  const leagueSeason = await prisma.leagueSeason.upsert({
    where: {
      leagueId_season: {
        leagueId: league.id,
        season: 2025,
      },
    },
    update: {},
    create: {
      leagueId: league.id,
      season: 2025,
      platformLeagueId: "test-league-001",
      championTeamId: team.id,
      championName: "testuser",
      status: "complete",
    },
  });

  console.log("Seeded league season:", leagueSeason.id);

  const leagueAuth = await prisma.leagueAuth.upsert({
    where: {
      userId_platform: {
        userId: user.id,
        platform: "sleeper",
      },
    },
    update: {},
    create: {
      userId: user.id,
      platform: "sleeper",
    },
  });

  console.log("Seeded league auth:", leagueAuth.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });