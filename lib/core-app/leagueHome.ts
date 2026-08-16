import 'server-only'

import { prisma } from '@/lib/prisma'
import { describeAge } from '@/lib/sports-data/freshnessPolicy'

/**
 * Everything the league-selected dashboard (screen 2) renders, read from the
 * database.
 *
 * The handoff's screen shows a season timeline, a live matchup with a win
 * probability, a Draft HQ card, a Commissioner Hub card, standings, Chimmy
 * intelligence and a league buzz feed. Only some of that is computable from what
 * we actually store for an imported league, so each section returns either real
 * values or an explicit unavailable reason — never a placeholder that looks like
 * a reading.
 *
 * This matters more here than on the all-leagues home. A win probability is the
 * single most authoritative-looking number in the product; rendering one from
 * absent data would be the exact failure this codebase keeps having to undo.
 */

export type SectionState<T> =
  | { available: true; data: T }
  | { available: false; reason: string }

/**
 * A section with NO DATA PATH AT ALL — nothing computes it yet, so it is
 * unavailable on every code path, for every league, always.
 *
 * ⚠ THIS IS A DIFFERENT CLAIM FROM `SectionState<T>`, WHICH MEANS "sometimes
 * available". These were written as `SectionState<never>`, which is technically
 * that same union with an uninhabitable success branch — so every screen that read
 * `.reason` off one failed to compile (21 errors), because TypeScript still had to
 * consider an `available: true` case that can never occur. Narrowing each site
 * would have silenced it while leaving the type lying about what exists.
 *
 * Naming it is the point: `UnavailableSection` is a standing inventory of what
 * still needs an engine. When one gets built, its field changes to
 * `SectionState<T>` and the compiler finds every screen that has to handle real
 * data — which is exactly the reminder you want at that moment.
 */
export type UnavailableSection = { available: false; reason: string }

/**
 * A league's display name, with a stated fallback.
 *
 * ⚠ THIS EXISTS BECAUSE `League.name` IS `String?` IN THE SCHEMA WHILE EVERY
 * core-app surface declares `name: string`. That single mismatch produced 38 type
 * errors across seven resolvers and six screens: each resolver's return object
 * failed to satisfy its own *Data type, TypeScript widened the whole object, and
 * the screens then saw `SectionState<never>` and could not narrow `.reason`. One
 * nullable column, thirty-eight errors, none of them where the problem was.
 *
 * Coalescing here rather than loosening the types to `string | null` is
 * deliberate: every consumer needs something renderable, and six screens each
 * inventing their own fallback is how you end up with a league called "undefined"
 * on one tab and blank on another.
 *
 * Measured before choosing the fallback: 0 of 120 production leagues have a null
 * or empty name, so this is a type-safety guard for a case the data does not
 * currently produce — not a label anyone should expect to see.
 */
export function leagueDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed : 'Untitled league'
}

export type LeagueStanding = {
  teamId: string
  teamName: string
  ownerName: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  rank: number | null
  isYou: boolean
}

export type SeasonStage = {
  key: string
  label: string
  when: string
  state: 'past' | 'now' | 'future'
}

export type LeagueHomeData = {
  league: {
    id: string
    name: string
    platform: string
    format: string | null
    sport: string
    season: number | null
    currentWeek: number | null
  }
  /** The signed-in user's own team in this league, when we can identify it. */
  yourTeam: SectionState<{
    teamName: string
    record: string
    rank: number | null
    pointsFor: number
  }>
  standings: SectionState<LeagueStanding[]>
  timeline: SectionState<SeasonStage[]>
  matchup: UnavailableSection
  draftHq: SectionState<{ headline: string; detail: string }>
  commissioner: SectionState<{ openCount: number }>
  buzz: SectionState<Array<{ id: string; actor: string; text: string; at: Date | null }>>
  syncAge: { label: string; stale: boolean }
}

function recordOf(t: { wins: number; losses: number; ties: number }): string {
  return t.ties > 0 ? `${t.wins}-${t.losses}-${t.ties}` : `${t.wins}-${t.losses}`
}

/**
 * The season timeline.
 *
 * Built ONLY from a known current week — the handoff's stages (offseason, rookie
 * draft, trade deadline, playoffs, championship) are league-configured dates we
 * do not store for imported leagues. Rather than invent "Trade deadline in 2
 * days", the timeline shows the phases we can place from the week number alone
 * and says the rest are unconfigured.
 */
function buildTimeline(currentWeek: number | null): SectionState<SeasonStage[]> {
  if (currentWeek == null) {
    return { available: false, reason: 'no current week on file for this league' }
  }

  const stages: Array<{ key: string; label: string; when: string; startWeek: number; endWeek: number }> = [
    { key: 'early', label: 'Weeks 1–6', when: 'SEP–OCT', startWeek: 1, endWeek: 6 },
    { key: 'mid', label: 'Weeks 7–13', when: 'OCT–DEC', startWeek: 7, endWeek: 13 },
    { key: 'push', label: 'Playoff push', when: 'WK 14', startWeek: 14, endWeek: 14 },
    { key: 'playoffs', label: 'Playoffs', when: 'WK 15–16', startWeek: 15, endWeek: 16 },
    { key: 'final', label: 'Championship', when: 'WK 17', startWeek: 17, endWeek: 18 },
  ]

  return {
    available: true,
    data: stages.map((s) => ({
      key: s.key,
      label: s.label,
      when: s.when,
      state: currentWeek > s.endWeek ? 'past' : currentWeek >= s.startWeek ? 'now' : 'future',
    })),
  }
}

export async function getLeagueHomeData(
  leagueId: string,
  userId: string
): Promise<LeagueHomeData | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      platform: true,
      sport: true,
      season: true,
      leagueType: true,
      updatedAt: true,
    },
  })
  if (!league) return null

  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId },
    select: {
      id: true,
      teamName: true,
      ownerName: true,
      wins: true,
      losses: true,
      ties: true,
      pointsFor: true,
      currentRank: true,
      claimedByUserId: true,
    },
    orderBy: [{ currentRank: 'asc' }, { wins: 'desc' }, { pointsFor: 'desc' }],
  })

  const yours = teams.find((t) => t.claimedByUserId === userId) ?? null

  // A league whose teams all sit at 0-0 has been imported but never had results
  // read. Showing that as a standings table would present "everyone is 0-0" as a
  // finding rather than as an absence.
  const anyResults = teams.some((t) => t.wins > 0 || t.losses > 0 || t.ties > 0 || t.pointsFor > 0)

  const standings: SectionState<LeagueStanding[]> =
    teams.length === 0
      ? { available: false, reason: 'no teams imported for this league' }
      : !anyResults
        ? { available: false, reason: 'teams imported but no results read yet — every record is 0-0' }
        : {
            available: true,
            data: teams.map((t) => ({
              teamId: t.id,
              teamName: t.teamName,
              ownerName: t.ownerName,
              wins: t.wins,
              losses: t.losses,
              ties: t.ties,
              pointsFor: t.pointsFor,
              rank: t.currentRank,
              isYou: t.id === yours?.id,
            })),
          }

  const yourTeam: SectionState<{ teamName: string; record: string; rank: number | null; pointsFor: number }> =
    yours == null
      ? { available: false, reason: 'we cannot tell which team is yours in this league yet' }
      : // Same test the standings block uses. Without it the header printed a
        // confident "0-0" directly above a panel saying no results had been read
        // — the screen contradicting itself, and "0-0" reading as a real record
        // rather than as the absence of one.
        !anyResults
        ? { available: false, reason: 'no results read for this league yet' }
        : {
          available: true,
          data: {
            teamName: yours.teamName,
            record: recordOf(yours),
            rank: yours.currentRank,
            pointsFor: yours.pointsFor,
          },
        }

  const age = describeAge('roster', league.updatedAt)

  /*
   * Current week comes from the ingested schedule, not from the League row —
   * which has no week column — and not from the calendar, which cannot know a
   * league's own week numbering.
   *
   * This is the first real consumer of the TheSportsDB games ingest: find the
   * next game for this sport and season that has not kicked off, and take its
   * week. If the sport's schedule was never ingested, currentWeek stays null and
   * the timeline reports itself unavailable rather than guessing.
   */
  const nextGame = await prisma.sportsGame
    .findFirst({
      where: {
        sport: String(league.sport ?? 'NFL'),
        ...(league.season != null ? { season: league.season } : {}),
        startTime: { gte: new Date() },
        week: { not: null },
      },
      orderBy: { startTime: 'asc' },
      select: { week: true },
    })
    .catch(() => null)

  const currentWeek = nextGame?.week ?? null

  return {
    league: {
      id: league.id,
      name: leagueDisplayName(league.name),
      platform: String(league.platform ?? 'manual').toLowerCase(),
      format: league.leagueType ?? null,
      sport: String(league.sport ?? 'NFL'),
      season: league.season ?? null,
      currentWeek,
    },
    yourTeam,
    standings,
    timeline: buildTimeline(currentWeek),
    // Live matchup needs per-week scoring for imported leagues, which no writer
    // produces today. The handoff's 71% win probability would be fabricated.
    matchup: { available: false, reason: 'no weekly matchup or scoring data ingested for imported leagues' },
    draftHq: { available: false, reason: 'pick inventory and lottery odds are not ingested' },
    commissioner: { available: false, reason: 'votes and commissioner tasks are not ingested for imported leagues' },
    buzz: { available: false, reason: 'league transactions are not ingested for this platform yet' },
    syncAge: { label: age.label, stale: age.stale },
  }
}
