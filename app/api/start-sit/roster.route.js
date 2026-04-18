// app/api/start-sit/roster/route.js
// GET /api/start-sit/roster?leagueId=xxx&sport=nfl&week=current&format=PPR
//
// CASCADE (server-side, keys never exposed to client):
//   1. Platform DB (your own league data)
//   2. Rolling Insights
//   3. TheDataDb
//   4. ClearSports
//   5. Sleeper (free, no key required)
//   6. FantasyPros
//
// All env vars are server-side only (no NEXT_PUBLIC_ prefix).

import { NextResponse } from "next/server";
import { SPORT_CODES, normalizeRoster, timedFetch, getDemoRoster } from "@/lib/startSit/shared";

// ─── API credentials (server-side only) ─────────────────────────────────────
const KEYS = {
  rollingInsights: process.env.ROLLING_INSIGHTS_KEY,
  theDataDb:       process.env.THE_DATA_DB_KEY,
  clearSports:     process.env.CLEARSPORTS_KEY,
  fantasyPros:     process.env.FANTASYPROS_KEY,
};

// ─── Provider fetchers ────────────────────────────────────────────────────────

async function fromRollingInsights({ sport, leagueId, week }) {
  const code = SPORT_CODES[sport]?.rolling ?? sport;
  const data = await timedFetch(
    `https://api.rollinginsights.com/v1/fantasy/roster?sport=${code}&league=${leagueId}&week=${week}`,
    { headers: { "X-API-Key": KEYS.rollingInsights } }
  );
  return normalizeRoster(data.roster ?? data.players ?? [], "Rolling Insights");
}

async function fromTheDataDb({ sport, leagueId, week }) {
  const code = SPORT_CODES[sport]?.datadb ?? sport;
  const data = await timedFetch(
    `https://api.thedatadb.com/v2/sports/${code}/players/projections?week=${week}&league=${leagueId}`,
    { headers: { Authorization: `Bearer ${KEYS.theDataDb}` } }
  );
  return normalizeRoster(data.data ?? data.players ?? [], "TheDataDb");
}

async function fromClearSports({ sport, leagueId, week }) {
  const code = SPORT_CODES[sport]?.rolling ?? sport;
  const data = await timedFetch(
    `https://api.clearsports.io/v1/projections/${code}?leagueId=${leagueId}&week=${week}`,
    { headers: { "cs-api-key": KEYS.clearSports } }
  );
  return normalizeRoster(data.projections ?? data.players ?? [], "ClearSports");
}

async function fromSleeper({ leagueId, sport }) {
  const [rostersRaw, allPlayers, projections] = await Promise.allSettled([
    timedFetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
    timedFetch(`https://api.sleeper.app/v1/players/${SPORT_CODES[sport]?.sleeper ?? "nfl"}`),
    timedFetch(`https://api.sleeper.app/v1/stats/${SPORT_CODES[sport]?.sleeper ?? "nfl"}/projections/regular/2025/current`),
  ]);

  const rosters = rostersRaw.status === "fulfilled" ? rostersRaw.value : [];
  const players = allPlayers.status === "fulfilled" ? allPlayers.value : {};
  const projs   = projections.status === "fulfilled" ? projections.value : {};

  const myRoster = rosters?.[0];
  if (!myRoster?.players?.length) return [];

  return myRoster.players.slice(0, 16).map((id, i) => {
    const p    = players[id] ?? {};
    const proj = projs[id]   ?? {};
    const pts  = parseFloat((proj.pts_ppr ?? proj.pts_std ?? 0).toFixed(1));
    return {
      id,
      name:        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || id,
      position:    p.fantasy_positions?.[0] ?? p.position ?? "FLEX",
      team:        p.team ?? "FA",
      opponent:    "TBD",
      projected:   pts,
      floor:       parseFloat((pts * 0.62).toFixed(1)),
      ceiling:     parseFloat((pts * 1.48).toFixed(1)),
      confidence:  55,
      status:      p.injury_status === "Out" ? "Out" : p.injury_status === "Doubtful" ? "Doubtful" : p.injury_status === "Questionable" ? "Questionable" : "Active",
      trend:       "steady",
      note:        `${p.team ?? "FA"} — projections via Sleeper`,
      matchupRank: 15,
      source:      "Sleeper",
    };
  }).filter((p) => p.name.trim());
}

async function fromFantasyPros({ sport, week, format }) {
  const scoring = format === "PPR" ? "PPR" : format === "Half PPR" ? "HALF" : "STD";
  const data = await timedFetch(
    `https://api.fantasypros.com/v2/json/mobile/${sport.toLowerCase()}/player-projections-week?week=${week}&scoring=${scoring}`,
    { headers: { "x-api-key": KEYS.fantasyPros } }
  );
  return normalizeRoster(data.projections ?? [], "FantasyPros");
}

// ─── Main route handler ────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId") ?? "";
  const sport    = searchParams.get("sport")    ?? "nfl";
  const week     = searchParams.get("week")     ?? "current";
  const format   = searchParams.get("format")   ?? "PPR";

  // ── 1. Your platform's own DB / league data (always first) ──────────────────
  // Uncomment when your DB model is ready:
  //
  // try {
  //   const league = await prisma.league.findUnique({ where: { id: leagueId } });
  //   if (league) {
  //     const rosterData = await prisma.rosterPlayer.findMany({
  //       where: { leagueId, weekNumber: week === "current" ? currentWeek : parseInt(week) },
  //       include: { player: { include: { projections: true } } },
  //     });
  //     if (rosterData.length > 0) {
  //       const normalized = rosterData.map(r => ({
  //         id: r.player.id, name: r.player.fullName, position: r.player.position,
  //         team: r.player.team, opponent: r.matchupOpponent ?? "TBD",
  //         projected: r.player.projections?.[0]?.points ?? 0,
  //         floor: r.player.projections?.[0]?.floor ?? 0,
  //         ceiling: r.player.projections?.[0]?.ceiling ?? 0,
  //         confidence: r.player.projections?.[0]?.confidence ?? 60,
  //         status: r.player.injuryStatus ?? "Active",
  //         trend: r.player.trend ?? "steady",
  //         note: r.player.projections?.[0]?.note ?? "",
  //         matchupRank: r.player.matchupRank ?? 15,
  //         source: "AllFantasy Platform",
  //       }));
  //       return NextResponse.json({ players: normalized, source: "AllFantasy Platform" });
  //     }
  //   }
  // } catch (err) {
  //   console.warn("[roster] DB query failed, falling back to external APIs:", err.message);
  // }

  // ── 2. External API cascade ──────────────────────────────────────────────────
  const cascade = [
    () => fromRollingInsights({ sport, leagueId, week }),
    () => fromTheDataDb({ sport, leagueId, week }),
    () => fromClearSports({ sport, leagueId, week }),
    () => fromSleeper({ leagueId, sport }),
    () => fromFantasyPros({ sport, week, format }),
  ];

  for (const fn of cascade) {
    try {
      const result = await fn();
      if (result?.length > 0) {
        return NextResponse.json(
          { players: result, source: result[0]?.source ?? "External API" },
          { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" } }
        );
      }
    } catch (err) {
      console.warn("[roster cascade]", err.message);
    }
  }

  // ── 3. Demo fallback ─────────────────────────────────────────────────────────
  return NextResponse.json(
    { players: getDemoRoster(sport), source: "Demo" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
