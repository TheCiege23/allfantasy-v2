// app/api/start-sit/matchups/route.js
// GET /api/start-sit/matchups?sport=nfl&week=current

import { NextResponse } from "next/server";
import { SPORT_CODES, timedFetch, getDemoMatchups } from "@/lib/startSit/shared";

const KEYS = {
  clearSports: process.env.CLEARSPORTS_KEY,
  theDataDb:   process.env.THE_DATA_DB_KEY,
  rolling:     process.env.ROLLING_INSIGHTS_KEY,
};

function normalizeMatchups(raw) {
  return (raw ?? []).map((m) => ({
    position:  m.position ?? m.pos ?? "POS",
    rankLabel: m.rankLabel ?? m.rank_label ?? `#${m.rank ?? 15}`,
    opponent:  m.opponent ?? m.opp ?? m.opposingTeam ?? "—",
    score:     Math.min(100, Math.max(5, m.score ?? m.matchupScore ?? 50)),
  }));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport") ?? "nfl";
  const week  = searchParams.get("week")  ?? "current";
  const code  = SPORT_CODES[sport]?.rolling ?? sport;

  const cascade = [
    async () => {
      if (!KEYS.clearSports) throw new Error("No ClearSports key");
      const d = await timedFetch(
        `https://api.clearsports.io/v1/matchups/${code}?week=${week}`,
        { headers: { "cs-api-key": KEYS.clearSports } }
      );
      return normalizeMatchups(d.matchups);
    },
    async () => {
      if (!KEYS.theDataDb) throw new Error("No TheDataDb key");
      const datadbCode = SPORT_CODES[sport]?.datadb ?? sport;
      const d = await timedFetch(
        `https://api.thedatadb.com/v2/sports/${datadbCode}/matchup-rankings?week=${week}`,
        { headers: { Authorization: `Bearer ${KEYS.theDataDb}` } }
      );
      return normalizeMatchups(d.data ?? d.matchups);
    },
    async () => {
      if (!KEYS.rolling) throw new Error("No Rolling Insights key");
      const d = await timedFetch(
        `https://api.rollinginsights.com/v1/matchups/${code}?week=${week}`,
        { headers: { "X-API-Key": KEYS.rolling } }
      );
      return normalizeMatchups(d.matchups ?? d.data);
    },
  ];

  for (const fn of cascade) {
    try {
      const r = await fn();
      if (r?.length > 0) {
        return NextResponse.json(
          { matchups: r },
          { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
        );
      }
    } catch (err) {
      console.warn("[matchups cascade]", err.message);
    }
  }

  return NextResponse.json({ matchups: getDemoMatchups(sport) });
}
