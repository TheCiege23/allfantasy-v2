import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, LeagueSport } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshUserRankingsContext } from "@/lib/rankings/refreshUserContext";
import { sleeperAvatarUrl } from "@/lib/sleeper-avatar";
import { resolveOrCreateLegacyUser } from "@/lib/legacy-user-resolver";
import { linkAfUserToLegacy } from "@/lib/legacy/linkAfUserToLegacy";
import { syncLegacyLeagueFromSleeper } from "@/lib/legacy-import";
import { computeAndSaveRank } from "@/lib/ranking/computeAndSaveRank";
import { runWithConcurrency } from "@/lib/async-utils";
import type { SleeperLeague as SleeperLeagueApi } from "@/lib/sleeper-client";
import { copyLegacyStatsToImportedLeague } from "@/lib/leagues/copyLegacyStatsToImportedLeague";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Vercel Pro / Enterprise: extend serverless timeout for multi-year Sleeper scans + legacy roster sync. */
export const maxDuration = 120;

const LAUNCH_YEAR = 2017;
const SPORTS = ["nfl", "nba"] as const;

type SleeperUserApi = {
  user_id?: string;
  display_name?: string;
  username?: string;
  avatar?: string | null;
};

interface SleeperLeagueRow {
  league_id?: string | number;
  name?: string;
  sport?: string;
  season?: string | number;
  status?: string | null;
  avatar?: string | null;
  settings?: {
    num_teams?: number;
    type?: number;
    scoring_settings?: Record<string, number>;
  } | null;
  _sport?: string;
  _year?: number;
}

function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function mapSport(league: SleeperLeagueRow): LeagueSport {
  const raw = String(league.sport || league._sport || "nfl").toLowerCase();
  if (raw === "nba") return LeagueSport.NBA;
  return LeagueSport.NFL;
}

function scoringFromSettings(ss?: Record<string, number> | null): string {
  if (!ss) return "standard";
  const rec = Number(ss.rec ?? 0);
  if (rec >= 1) return "ppr";
  if (rec >= 0.5) return "half-ppr";
  return "standard";
}

function seasonOf(league: SleeperLeagueRow): number {
  const raw = league.season ?? league._year;
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const raw =
      (typeof body.username === "string" && body.username) ||
      (typeof body.sleeperUsername === "string" && body.sleeperUsername) ||
      "";
    const username = raw.trim();
    if (!username) {
      return NextResponse.json({ error: "Sleeper username is required" }, { status: 400 });
    }

    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string };
    } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be logged in to import" }, { status: 401 });
    }
    const userId = session.user.id;

    let sleeperUser: SleeperUserApi | null = null;
    try {
      const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`, {
        signal: abortAfter(8000),
        headers: { "User-Agent": "AllFantasy/1.0", Accept: "application/json" },
      });
      if (r.ok) {
        sleeperUser = (await r.json()) as SleeperUserApi;
      }
    } catch (e: unknown) {
      console.error("[import] Sleeper user lookup failed:", e);
    }

    if (!sleeperUser?.user_id) {
      return NextResponse.json(
        {
          error: `Sleeper account "${username}" not found. Double-check your username at sleeper.app.`,
        },
        { status: 404 }
      );
    }

    const sleeperId = sleeperUser.user_id;
    console.log("[import] Found Sleeper user:", sleeperId, "for username:", username);

    try {
      await prisma.userProfile.upsert({
        where: { userId },
        update: {
          sleeperUserId: sleeperId,
          sleeperUsername: sleeperUser.username ?? username,
          sleeperLinkedAt: new Date(),
        },
        create: {
          userId,
          sleeperUserId: sleeperId,
          sleeperUsername: sleeperUser.username ?? username,
          sleeperLinkedAt: new Date(),
        },
      });
    } catch (e: unknown) {
      console.warn("[import] Could not save sleeperUserId:", e);
    }

    const resolvedLegacy = await resolveOrCreateLegacyUser(username);
    if (!resolvedLegacy) {
      return NextResponse.json(
        { error: "Could not resolve Sleeper legacy profile for this username." },
        { status: 502 },
      );
    }
    const linkedLegacy = await linkAfUserToLegacy(userId, resolvedLegacy, { skipComputeRank: true });
    if (!linkedLegacy.ok) {
      return linkedLegacy.response;
    }

    const thisYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = LAUNCH_YEAR; y <= thisYear + 1; y++) years.push(y);

    console.log(`[import] Fetching ${SPORTS.length * years.length} year/sport combos concurrently`);

    const fetchPromises = SPORTS.flatMap((sport) =>
      years.map((year) =>
        fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperId)}/leagues/${sport}/${year}`, {
          signal: abortAfter(8000),
          headers: { "User-Agent": "AllFantasy/1.0", Accept: "application/json" },
        })
          .then((res) => (res.ok ? res.json() : Promise.resolve([])))
          .then((leagues: unknown) => {
            if (!Array.isArray(leagues)) return [] as SleeperLeagueRow[];
            return leagues.map((l) => ({ ...(l as object), _sport: sport, _year: year })) as SleeperLeagueRow[];
          })
          .catch(() => [] as SleeperLeagueRow[])
      )
    );

    const results = await Promise.allSettled(fetchPromises);
    const allLeagues = results
      .filter((r): r is PromiseFulfilledResult<SleeperLeagueRow[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .filter((l) => Boolean(l?.league_id));

    console.log(`[import] Found ${allLeagues.length} total league rows`);

    const currentYear = new Date().getFullYear();
    const historicalLeagues = allLeagues.filter((l) => {
      const s = seasonOf(l);
      return Number.isFinite(s) && s < currentYear;
    });
    const currentEraLeagues = allLeagues.filter((l) => {
      const s = seasonOf(l);
      return Number.isFinite(s) && s >= currentYear;
    });

    const uniqueCurrentByLeagueId = new Map<string, SleeperLeagueRow>();
    for (const l of currentEraLeagues) {
      const id = String(l.league_id);
      if (!uniqueCurrentByLeagueId.has(id)) uniqueCurrentByLeagueId.set(id, l);
    }

    const commissionerChecks = await Promise.allSettled(
      [...uniqueCurrentByLeagueId.values()].map(async (league) => {
        try {
          const usersRes = await fetch(
            `https://api.sleeper.app/v1/league/${encodeURIComponent(String(league.league_id))}/users`,
            { signal: abortAfter(5000), headers: { Accept: "application/json" } }
          );
          const users: unknown = usersRes.ok ? await usersRes.json() : [];
          const arr = Array.isArray(users) ? users : [];
          const currentUser = arr.find(
            (u: { user_id?: string }) => String(u.user_id) === String(sleeperId)
          ) as { is_owner?: boolean } | undefined;
          const isCommissioner = currentUser?.is_owner === true;
          return { leagueId: String(league.league_id), isCommissioner };
        } catch {
          return { leagueId: String(league.league_id), isCommissioner: false };
        }
      })
    );

    const commissionerIds = new Set<string>();
    for (const r of commissionerChecks) {
      if (r.status !== "fulfilled") continue;
      if (r.value.isCommissioner) commissionerIds.add(r.value.leagueId);
    }

    const leaguesToImport = allLeagues.filter((l) => {
      const s = seasonOf(l);
      if (!Number.isFinite(s)) return false;
      if (s < currentYear) return true;
      return commissionerIds.has(String(l.league_id));
    });

    const commissionerLeagueCount = commissionerIds.size;
    const skippedNotCommissioner = [...uniqueCurrentByLeagueId.values()].filter(
      (l) => !commissionerIds.has(String(l.league_id)),
    ).length;

    console.log(
      `[import] Filter: historical rows=${historicalLeagues.length}, current-era rows=${currentEraLeagues.length}, commissioner league ids=${commissionerLeagueCount}, skipped not commissioner=${skippedNotCommissioner}, import rows=${leaguesToImport.length}`
    );

    const sportCounts: Record<string, number> = {};
    const skipped: string[] = [];

    async function upsertOne(league: SleeperLeagueRow): Promise<{ ok: true; sport: string } | { ok: false }> {
      const sportEnum = mapSport(league);
      const sportLabel = sportEnum === LeagueSport.NBA ? "NBA" : "NFL";
      const rawSeason = league.season ?? league._year;
      const season = typeof rawSeason === "number" ? rawSeason : parseInt(String(rawSeason ?? ""), 10);
      if (!Number.isFinite(season)) {
        skipped.push(String(league.league_id ?? ""));
        return { ok: false };
      }

      const ss = league.settings?.scoring_settings ?? undefined;
      const scoring = scoringFromSettings(ss ?? null);
      const isDynasty = (league.settings?.type ?? 0) === 2;
      const platformLeagueId = String(league.league_id);
      const settingsJson: Prisma.InputJsonValue =
        (league.settings as Prisma.InputJsonValue) ?? ({} as Prisma.InputJsonValue);

      const resolvedAvatarUrl = sleeperAvatarUrl(league.avatar);
      const isImporterCommissioner =
        Number.isFinite(season) && season >= currentYear && commissionerIds.has(platformLeagueId);

      const numTeamsFromSettings = league.settings?.num_teams;
      const leagueSize =
        typeof numTeamsFromSettings === "number" &&
        Number.isFinite(numTeamsFromSettings) &&
        numTeamsFromSettings >= 1
          ? numTeamsFromSettings
          : 12;

      await prisma.league.upsert({
        where: {
          userId_platform_platformLeagueId_season: {
            userId,
            platform: "sleeper",
            platformLeagueId,
            season,
          },
        },
        update: {
          userId,
          name: league.name || "Unnamed League",
          status: league.status || "pre_draft",
          settings: settingsJson,
          scoring,
          leagueSize,
          isDynasty,
          sport: sportEnum,
          leagueVariant: isDynasty ? "dynasty" : "redraft",
          isCommissioner: isImporterCommissioner,
          ...(resolvedAvatarUrl ? { avatarUrl: resolvedAvatarUrl } : {}),
        },
        create: {
          userId,
          platformLeagueId,
          name: league.name || "Unnamed League",
          sport: sportEnum,
          season,
          platform: "sleeper",
          leagueVariant: isDynasty ? "dynasty" : "redraft",
          scoring,
          leagueSize,
          isDynasty,
          status: league.status || "pre_draft",
          settings: settingsJson,
          isCommissioner: isImporterCommissioner,
          ...(resolvedAvatarUrl ? { avatarUrl: resolvedAvatarUrl } : {}),
        },
      });

      return { ok: true, sport: sportLabel };
    }

    const upsertResults = await Promise.allSettled(leaguesToImport.map((l) => upsertOne(l)));
    let importedCount = 0;
    for (const r of upsertResults) {
      if (r.status === "rejected") {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.warn("[import] upsert failed:", msg);
        continue;
      }
      const v = r.value;
      if (v.ok) {
        importedCount += 1;
        sportCounts[v.sport] = (sportCounts[v.sport] || 0) + 1;
      }
    }

    console.log(`[import] Done. Imported: ${importedCount}, Skipped: ${skipped.length}`);

    await runWithConcurrency(leaguesToImport, 4, async (league) => {
      try {
        const s = seasonOf(league);
        if (!Number.isFinite(s)) return;
        const lid = String(league.league_id ?? "");
        await syncLegacyLeagueFromSleeper(
          resolvedLegacy.id,
          sleeperId,
          league as SleeperLeagueApi,
          s,
        );
        await copyLegacyStatsToImportedLeague(userId, resolvedLegacy.id, sleeperId, lid, s);
      } catch (e: unknown) {
        console.warn("[import] legacy league sync failed for", league?.league_id, e);
      }
    });

    try {
      await computeAndSaveRank(userId);
    } catch (e: unknown) {
      console.warn("[import] computeAndSaveRank failed (non-fatal):", e);
    }

    try {
      await refreshUserRankingsContext(userId);
    } catch (e: unknown) {
      console.warn("[import] rankings refresh failed (non-fatal):", e);
    }

    const uniqueSeasons = new Set(
      leaguesToImport.map((l) => {
        const raw = l.season ?? l._year;
        return typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
      })
    ).size;

    const yearNums = [
      ...new Set(
        leaguesToImport
          .map((l) => {
            const raw = l.season ?? l._year;
            const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
            return Number.isFinite(n) ? n : null;
          })
          .filter((n): n is number => n != null)
      ),
    ].sort((a, b) => a - b);

    return NextResponse.json({
      success: true,
      imported: importedCount,
      seasons: uniqueSeasons,
      sports: sportCounts,
      years: yearNums,
      sleeperUserId: sleeperId,
      displayName: sleeperUser?.display_name || sleeperUser?.username || username,
      skipped: skipped.length,
      commissionerLeagues: commissionerLeagueCount,
      skippedNotCommissioner,
      historicalLeagues: historicalLeagues.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[import] Fatal error:", message);
    return NextResponse.json({ error: message || "Import failed" }, { status: 500 });
  }
}
