import "server-only"
import { buildTheSportsDbV1Url } from "@/lib/providers/theSportsDbUrls"
import { normalizeWorldCupStatus } from "../apiSportsWorldCup"
import {
  coerceNormalizedLiveMatch,
  inferPeriodFromApiFootballShort,
} from "../worldCupLiveScoreNormalizer"
import type {
  NormalizedWorldCupLiveMatch,
  WorldCupLiveScoreAdapter,
} from "./worldCupLiveProviderTypes"

function tsdbKey(): string {
  return process.env.THESPORTSDB_API_KEY?.trim() || ""
}

function tsdbLeagueId(): string {
  return process.env.THESPORTSDB_WORLD_CUP_LEAGUE_ID?.trim() || ""
}

/** Maps common TheSportsDB `strStatus` phrases toward API-Football-like shorts when possible. */
function tsdbStrStatusToShort(strStatus?: string | null): string | null {
  if (!strStatus) return null
  const s = strStatus.toLowerCase()
  if (s.includes("half")) return "HT"
  if (s.includes("extra")) return "ET"
  if (s.includes("penalt")) return "P"
  if (s.includes("finish") || s.includes("full")) return "FT"
  if (s.includes("live") || s.includes("progress")) return "1H"
  if (s.includes("not started") || s.includes("scheduled")) return "NS"
  return null
}

function theSportsDbEventToNormalized(e: Record<string, unknown>): NormalizedWorldCupLiveMatch | null {
  const strStatus = typeof e.strStatus === "string" ? e.strStatus : null
  const apiShort = tsdbStrStatusToShort(strStatus)

  let minute: number | null = null
  if (e.intTimeElapsed != null) minute = Number(e.intTimeElapsed)
  else if (typeof e.strProgress === "string" && /^\d+$/.test(e.strProgress.trim())) {
    minute = Number(e.strProgress.trim())
  }

  const merged: Record<string, unknown> = {
    ...e,
    providerMatchId: e.idEvent ?? e.idAPIfootball ?? e.id,
    apiStatusShort: apiShort,
    strLong: strStatus,
    homeTeamName: e.strHomeTeam ?? e.homeTeamName,
    awayTeamName: e.strAwayTeam ?? e.awayTeamName,
    homeTeamId: e.idHomeTeam,
    awayTeamId: e.idAwayTeam,
    homeScore: e.intHomeScore ?? e.homeScore,
    awayScore: e.intAwayScore ?? e.awayScore,
    startsAt: e.strTimestamp ?? e.dateEvent,
    minute,
  }

  const base = coerceNormalizedLiveMatch(merged)
  if (!base) return null

  const periodOverride = inferPeriodFromApiFootballShort(apiShort)

  return {
    ...base,
    period: periodOverride ?? base.period,
    status: normalizeWorldCupStatus(apiShort, strStatus),
    apiStatusShort: apiShort,
    raw: e,
  }
}

/**
 * TheSportsDB — secondary fallback; requires league id for the FIFA WC competition in your account.
 */
export class TheSportsDbWorldCupLiveProvider implements WorldCupLiveScoreAdapter {
  readonly id = "thesportsdb" as const
  readonly label = "TheSportsDB"

  isConfigured(): boolean {
    return Boolean(tsdbKey() && tsdbLeagueId())
  }

  async fetchLiveMatches(seasonYear: number): Promise<NormalizedWorldCupLiveMatch[]> {
    if (!this.isConfigured()) return []

    const season =
      process.env.THESPORTSDB_WORLD_CUP_SEASON?.trim() ||
      `${seasonYear}-${seasonYear + 1}`

    const url = buildTheSportsDbV1Url("eventsSeason", {
      apiKey: tsdbKey(),
      params: { id: tsdbLeagueId(), s: season },
    })

    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      throw new Error(`TheSportsDB eventsSeason failed: ${res.status}`)
    }
    const payload = (await res.json()) as { events?: unknown[] | null }
    const events = Array.isArray(payload.events) ? payload.events : []
    const out: NormalizedWorldCupLiveMatch[] = []
    for (const ev of events) {
      if (ev && typeof ev === "object") {
        const n = theSportsDbEventToNormalized(ev as Record<string, unknown>)
        if (n) out.push(n)
      }
    }
    return out
  }
}
