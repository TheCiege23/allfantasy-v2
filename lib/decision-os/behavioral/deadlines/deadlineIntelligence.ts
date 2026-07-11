/**
 * Decision OS — Phase 3.3 Deadline Intelligence.
 *
 * Deterministic scheduling facts for a league — no fabricated dates. Every
 * field traces to a real, already-stored value:
 *   - trade deadline / playoffs start: `League.tradeDeadlineWeek` /
 *     `League.playoffStartWeek`, compared against the current week via the
 *     app's own existing `resolveCurrentWeek` (reused, not duplicated —
 *     see `lib/chimmy-context/providers/_helpers/currentWeek.ts`).
 *   - draft: `LeagueSettings.draftDateUtc`, a real stored absolute datetime.
 *   - next waiver processing: `League.waiverProcessTime` ("HH:MM"), the next
 *     UTC occurrence of that time-of-day.
 *
 * Known, documented limitation: waiver-processing time is interpreted in
 * UTC, not the league's own `timezone`. This app has Date→localized-string
 * formatters (`lib/preferences/TimezoneFormattingResolver.ts`) but no
 * existing "time-of-day + IANA timezone → next UTC instant" utility to
 * reuse, and hand-writing DST-aware conversion here risked a subtly wrong
 * deadline — worse than an honestly-scoped, clearly-documented one.
 * `League.waiverSchedule` (a loosely-typed JSON blob with no established
 * parsing convention anywhere else in this app) is deliberately not parsed
 * for the same reason — guessing its shape risks a wrong answer, not just
 * an incomplete one.
 *
 * A week-based milestone and a time-based milestone aren't on the same
 * scale; `nextActionableEvent` ranks them by an approximate shared
 * distance (1 week ≈ 7 days) — a reasonable ordering heuristic, not a
 * precision guarantee.
 */
import { resolveCurrentWeek } from '@/lib/chimmy-context/providers/_helpers/currentWeek'
import { prisma as defaultPrisma } from '@/lib/prisma'

export interface WeekMilestone {
  label: 'trade_deadline' | 'playoffs_start'
  week: number
  weeksAway: number
  hasPassed: boolean
}

export interface TimeMilestone {
  label: 'draft' | 'next_waiver_processing'
  at: string
  hasPassed: boolean
}

export type LeagueMilestone = WeekMilestone | TimeMilestone

export interface LeagueDeadlineIntelligence {
  leagueId: string
  season: number
  currentWeek: number
  tradeDeadline: WeekMilestone | null
  playoffsStart: WeekMilestone | null
  draft: TimeMilestone | null
  nextWaiverProcessing: TimeMilestone | null
  nextActionableEvent: LeagueMilestone | null
  derivedAt: string
}

export interface LeagueDeadlineFields {
  tradeDeadlineWeek: number | null
  playoffStartWeek: number | null
  waiverProcessTime: string | null
  draftDateUtc: string | null
}

export interface LeagueDeadlineDeps {
  getLeagueDeadlineFields(leagueId: string): Promise<LeagueDeadlineFields | null>
  resolveCurrentWeek(leagueId: string): Promise<{ week: number; season: number }>
}

const defaultDeps: LeagueDeadlineDeps = {
  async getLeagueDeadlineFields(leagueId) {
    const [league, settings] = await Promise.all([
      defaultPrisma.league.findUnique({
        where: { id: leagueId },
        select: { tradeDeadlineWeek: true, playoffStartWeek: true, waiverProcessTime: true },
      }),
      defaultPrisma.leagueSettings.findUnique({
        where: { leagueId },
        select: { draftDateUtc: true },
      }),
    ])
    if (!league) return null
    return {
      tradeDeadlineWeek: league.tradeDeadlineWeek ?? null,
      playoffStartWeek: league.playoffStartWeek ?? null,
      waiverProcessTime: league.waiverProcessTime ?? null,
      draftDateUtc: settings?.draftDateUtc ? settings.draftDateUtc.toISOString() : null,
    }
  },
  async resolveCurrentWeek(leagueId) {
    const resolved = await resolveCurrentWeek({ leagueId })
    return { week: resolved.week, season: resolved.season }
  },
}

function weekMilestone(
  label: 'trade_deadline' | 'playoffs_start',
  targetWeek: number | null,
  currentWeek: number,
): WeekMilestone | null {
  if (targetWeek == null) return null
  return {
    label,
    week: targetWeek,
    weeksAway: targetWeek - currentWeek,
    hasPassed: currentWeek > targetWeek,
  }
}

function nextUtcOccurrence(hhmm: string, now: Date): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null

  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0))
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1)
  }
  return candidate
}

function distanceMs(m: LeagueMilestone, now: Date): number {
  return 'week' in m ? m.weeksAway * 7 * 24 * 60 * 60 * 1000 : new Date(m.at).getTime() - now.getTime()
}

function pickNearest(candidates: LeagueMilestone[], now: Date): LeagueMilestone | null {
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => distanceMs(a, now) - distanceMs(b, now))[0]
}

export async function deriveLeagueDeadlineIntelligence(
  leagueId: string,
  deps: LeagueDeadlineDeps = defaultDeps,
  now: Date = new Date(),
): Promise<LeagueDeadlineIntelligence | null> {
  const [fields, weekInfo] = await Promise.all([
    deps.getLeagueDeadlineFields(leagueId),
    deps.resolveCurrentWeek(leagueId),
  ])
  if (!fields) return null

  const tradeDeadline = weekMilestone('trade_deadline', fields.tradeDeadlineWeek, weekInfo.week)
  const playoffsStart = weekMilestone('playoffs_start', fields.playoffStartWeek, weekInfo.week)

  const draft: TimeMilestone | null = fields.draftDateUtc
    ? { label: 'draft', at: fields.draftDateUtc, hasPassed: new Date(fields.draftDateUtc).getTime() <= now.getTime() }
    : null

  let nextWaiverProcessing: TimeMilestone | null = null
  if (fields.waiverProcessTime) {
    const at = nextUtcOccurrence(fields.waiverProcessTime, now)
    if (at) nextWaiverProcessing = { label: 'next_waiver_processing', at: at.toISOString(), hasPassed: false }
  }

  const candidates: LeagueMilestone[] = []
  if (tradeDeadline && !tradeDeadline.hasPassed) candidates.push(tradeDeadline)
  if (playoffsStart && !playoffsStart.hasPassed) candidates.push(playoffsStart)
  if (draft && !draft.hasPassed) candidates.push(draft)
  if (nextWaiverProcessing) candidates.push(nextWaiverProcessing)

  return {
    leagueId,
    season: weekInfo.season,
    currentWeek: weekInfo.week,
    tradeDeadline,
    playoffsStart,
    draft,
    nextWaiverProcessing,
    nextActionableEvent: pickNearest(candidates, now),
    derivedAt: now.toISOString(),
  }
}
