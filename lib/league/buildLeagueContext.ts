import type { LeagueSeason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeAllTimeStandings, parseTeamRecords, type ManagerAllTime } from "@/lib/league/history-aggregates";

function buildManagerProfile(name: string, allSeasons: LeagueSeason[]): string {
  const norm = name.trim().toLowerCase();
  const relevant = allSeasons.filter((s) => {
    const recs = parseTeamRecords(s.teamRecords);
    return recs.some((r) => r.managerName.trim().toLowerCase() === norm);
  });
  const years = [...new Set(relevant.map((s) => s.season))].sort((a, b) => a - b);
  const titles = relevant.filter((s) => {
    const recs = parseTeamRecords(s.teamRecords);
    return recs.some((r) => r.managerName.trim().toLowerCase() === norm && r.isChampion);
  });
  const champYears = titles.map((s) => s.season);
  const last3 = relevant
    .filter((s) => s.season >= new Date().getFullYear() - 2)
    .sort((a, b) => b.season - a.season);
  let wins = 0;
  let losses = 0;
  for (const s of relevant) {
    const recs = parseTeamRecords(s.teamRecords);
    const row = recs.find((r) => r.managerName.trim().toLowerCase() === norm);
    if (row) {
      wins += row.wins;
      losses += row.losses;
    }
  }
  const denom = wins + losses;
  const pct = denom > 0 ? Math.round((wins / denom) * 100) : 50;
  const lastPts = last3.map((s) => {
    const recs = parseTeamRecords(s.teamRecords);
    const row = recs.find((r) => r.managerName.trim().toLowerCase() === norm);
    return row?.pointsFor ?? 0;
  });
  let trend: "improving" | "declining" | "stable" = "stable";
  if (lastPts.length >= 2) {
    const a = lastPts[0] ?? 0;
    const b = lastPts[lastPts.length - 1] ?? 0;
    if (a > b * 1.05) trend = "improving";
    else if (a < b * 0.95) trend = "declining";
  }
  const recentChamp = champYears.some((y) => y >= new Date().getFullYear() - 1);
  const tier = recentChamp ? "HIGH" : pct >= 55 ? "MEDIUM" : "LOW";

  return [
    `- Championships: ${titles.length}${champYears.length ? ` (years: ${champYears.join(", ")})` : ""}`,
    `- Win rate: ${pct}% over ${years.length} seasons in this league history`,
    `- Points trend (recent seasons): ${trend}`,
    `- Competitive tier estimate for trade leverage: ${tier}`,
    `- NOTE: Factor this manager's historical performance when judging offer fairness.`,
  ].join("\n");
}

/**
 * Text block for Chimmy trade prompts — league history + all-time standings.
 */
export async function buildLeagueContext(leagueId: string, tradingManagerName?: string): Promise<string> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      name: true,
      leagueSize: true,
      scoring: true,
      isDynasty: true,
      season: true,
    },
  });
  if (!league) return "";

  const seasons = await prisma.leagueSeason.findMany({
    where: { leagueId },
    orderBy: { season: "asc" },
  });

  if (seasons.length === 0) {
    return "";
  }

  const standings = computeAllTimeStandings(seasons);
  const earliest = seasons[0]?.season;
  const latest = seasons[seasons.length - 1]?.season;
  const scoring =
    league.scoring === "ppr" || league.scoring === "half-ppr"
      ? league.scoring
      : league.scoring ?? "standard";

  const top = standings.slice(0, 10);
  const last3 = [...seasons].sort((a, b) => b.season - a.season).slice(0, 3);

  const lines: string[] = [
    `LEAGUE HISTORY CONTEXT for ${league.name ?? "League"}:`,
    `- Format: ${league.isDynasty ? "Dynasty" : "Redraft"}, ${league.leagueSize ?? "?"} teams, ${scoring} scoring`,
    `- Earliest season on record: ${earliest}, latest: ${latest}`,
    `- ${seasons.length} season snapshot(s) available`,
    "",
    "ALL-TIME STANDINGS (by titles, then win %):",
    ...top.map(
      (m: ManagerAllTime) =>
        `- ${m.managerName}: ${m.championships} title(s), ${m.totalWins}W-${m.totalLosses}L (${(m.winPct * 100).toFixed(0)}% win rate, ${m.avgPointsPerSeason.toFixed(1)} avg pts/season)`
    ),
    "",
    "RECENT CHAMPIONS:",
    ...last3.map((s) => `- ${s.season}: ${s.championName ?? "Unknown"} won the championship`),
  ];

  if (tradingManagerName?.trim()) {
    lines.push(
      "",
      `TRADING MANAGER PROFILE — ${tradingManagerName}:`,
      buildManagerProfile(tradingManagerName, seasons)
    );
  }

  lines.push(
    "",
    "TRADE EVALUATION HEURISTICS:",
    "- If the trading manager is reigning champion or won in the last 2 seasons, treat their offers as potentially low-ball; note championship leverage.",
    "- If the trading manager has a weak historical record (< 40% win rate), they may be motivated sellers — but could also be rebuilding.",
    "- Always mention competitive tier of both managers when relevant."
  );

  return lines.join("\n");
}
