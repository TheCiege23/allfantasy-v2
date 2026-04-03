import { prisma } from "@/lib/prisma";

function modeString(values: string[]): string | null {
  if (!values.length) return null;
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = k;
    }
  }
  return best;
}

/**
 * Rebuilds aggregated rankings / AI context from the user's imported leagues.
 * Call after Sleeper (or other) league import completes.
 */
export async function refreshUserRankingsContext(userId: string): Promise<void> {
  const leagues = await prisma.league.findMany({
    where: { userId },
    select: {
      settings: true,
      season: true,
      sport: true,
      leagueSize: true,
      scoring: true,
    },
  });

  const scoringFormats = leagues.map((l) => {
    const s = l.scoring;
    if (s === "ppr") return "ppr";
    if (s === "half-ppr") return "half_ppr";
    return "standard";
  });

  const primaryFormat = modeString(scoringFormats) ?? "ppr";

  const sizes = leagues.map((l) => l.leagueSize).filter((n): n is number => typeof n === "number");
  const avgSize = sizes.length
    ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length)
    : 12;

  const yearsActive = [...new Set(leagues.map((l) => l.season))].sort((a, b) => a - b);
  const sports = [...new Set(leagues.map((l) => l.sport))];

  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      rankingsContext: {
        primaryScoringFormat: primaryFormat,
        avgLeagueSize: avgSize,
        totalLeagues: leagues.length,
        sports,
        yearsActive,
        updatedAt: new Date().toISOString(),
      },
    },
    create: {
      userId,
      rankingsContext: {
        primaryScoringFormat: primaryFormat,
        avgLeagueSize: avgSize,
        totalLeagues: leagues.length,
        sports,
        yearsActive,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}
