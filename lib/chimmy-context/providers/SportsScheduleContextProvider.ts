/**
 * Phase 2D — SportsScheduleContextProvider
 *
 * Fetches today's sports schedule from the existing live-scores infrastructure
 * (DB-first → Rolling Insights → ESPN fallback). Runs 5 sports in parallel
 * with Promise.allSettled so no single sport failure blocks the bundle.
 *
 * hasRealData: true  → at least one sport returned games → prompt includes schedule
 * hasRealData: false → all sports returned empty / errored → prompt includes
 *                      "no live schedule connected" guardrail instead
 *
 * The PromptComposer only includes this section for `sports_schedule` intent,
 * so it does not inflate prompt budget for unrelated fantasy questions.
 */

import { getLiveScoresForSport, type LiveScoreRow } from "@/lib/sports-live-scores-service"
import type {
  ChimmyContextProvider,
  ChimmyContextRequest,
  ProviderResult,
  SportsScheduleGame,
  SportsScheduleSlice,
} from "@/lib/chimmy-context/types"

const SPORTS_TO_FETCH = ["NFL", "NBA", "NHL", "MLB", "SOCCER"] as const

function normalizeStatus(
  status: string | null | undefined
): SportsScheduleGame["status"] {
  if (!status) return "unknown"
  const s = status.toLowerCase()
  if (s === "final" || s === "ft" || s === "f" || s === "f/ot" || s === "f/so") return "final"
  if (
    s === "in_progress" ||
    s === "live" ||
    s === "in progress" ||
    s === "1h" ||
    s === "2h" ||
    s === "ht" ||
    s === "et" ||
    s === "p"
  )
    return "in_progress"
  if (s === "scheduled" || s === "pre" || s === "ns" || s === "tbd" || s === "scheduled")
    return "scheduled"
  return "unknown"
}

function rowToGame(row: LiveScoreRow, sport: string): SportsScheduleGame {
  return {
    sport,
    homeTeam: row.homeTeamFull || row.homeTeam || "Home",
    awayTeam: row.awayTeamFull || row.awayTeam || "Away",
    startTime: row.startTime ?? null,
    status: normalizeStatus(row.status),
    homeScore: row.homeScore ?? null,
    awayScore: row.awayScore ?? null,
  }
}

export class SportsScheduleContextProvider
  implements ChimmyContextProvider<SportsScheduleSlice>
{
  readonly name = "sportsSchedule"
  /** Short TTL — schedule changes frequently during game days. */
  readonly defaultTtlMs = 60 * 1000

  async load(
    _request: ChimmyContextRequest
  ): Promise<ProviderResult<SportsScheduleSlice>> {
    const startedAt = Date.now()
    const fetchedAt = new Date().toISOString()

    try {
      const results = await Promise.allSettled(
        SPORTS_TO_FETCH.map((sport) =>
          getLiveScoresForSport({ sport, forceRefresh: false })
            .then((res) => ({ sport, scores: res.scores ?? [] }))
            .catch(() => ({ sport, scores: [] as LiveScoreRow[] }))
        )
      )

      const games: SportsScheduleGame[] = []
      for (const outcome of results) {
        if (outcome.status !== "fulfilled") continue
        const { sport, scores } = outcome.value
        for (const row of scores) {
          games.push(rowToGame(row, sport))
        }
      }

      const date = new Date().toISOString().slice(0, 10)

      return {
        ok: true,
        data: {
          date,
          games,
          hasRealData: games.length > 0,
        },
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    } catch (err) {
      return {
        ok: false,
        data: {
          date: new Date().toISOString().slice(0, 10),
          games: [],
          hasRealData: false,
        },
        error: err instanceof Error ? err.message : "Unknown schedule error",
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    }
  }
}
