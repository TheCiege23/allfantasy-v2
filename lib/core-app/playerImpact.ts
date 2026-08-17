import 'server-only'

import { prisma } from '@/lib/prisma'
import { computeLeagueProjectedPoints, extractScoringSettings } from '@/lib/projections/leagueScoring'
import { latestProjectionWeek } from './playerProjections'
import type { SectionState } from './leagueHome'
import { normalizePosition } from './positionNormalization'
import { leagueDisplayName } from './leagueHome'

/**
 * "This player just got downgraded — what do I do, in every league I have him?"
 *
 * This is the game-day path, and it is built first on purpose: a late injury is
 * the moment where the answer has to be right AND fast, and it is the only moment
 * where being slow is the same as being wrong.
 *
 * ⚠ EVERY NUMBER HERE IS LEAGUE-SPECIFIC, BECAUSE THE ANSWER IS. The same swap is
 * correct in one league and wrong in another — a TE-premium league, a 6-point
 * passing TD league and an IDP league price the identical two players
 * differently. Ranking bench options on a generic projection would give confident
 * advice that is wrong in exactly the leagues that differ most from default.
 *
 * ⚠ IT REFUSES RATHER THAN FALLS BACK TO THE GENERIC NUMBER. 78 of 120 leagues
 * carry scoring settings we can read; for the rest this says so. A standard
 * projection silently substituted for a league-specific one is indistinguishable
 * from the real thing on screen, and the whole point of the screen is that the
 * number is yours.
 */

export type ReplacementOption = {
  playerId: string
  name: string
  position: string | null
  team: string | null
  /** Points under THIS league's scoring. Null when we cannot price him. */
  afPoints: number | null
  /** afPoints minus the injured player's, under the same scoring. */
  delta: number | null
  injuryStatus: string | null
  /** Where he sits now — BENCH, IR, TAXI. */
  from: string
}

export type LeagueImpact = {
  leagueId: string
  leagueName: string
  platform: string
  /** STARTER / BENCH / IR SLOT / TAXI — where this player sits in this league. */
  slot: string
  /**
   * ⚠ ONLY A STARTER IS URGENT. A downgraded player on your bench changes
   * nothing about today; presenting both the same way buries the leagues that
   * actually need a decision under the ones that do not.
   */
  isStarting: boolean
  afPoints: SectionState<{
    points: number
    matchedKeys: number
    scoredKeys: number
  }>
  replacements: SectionState<ReplacementOption[]>
}

type PlayerRow = {
  sleeperId: string
  name: string
  position: string | null
  team: string | null
}

/**
 * Which bench players can actually fill the hole.
 *
 * ⚠ SAME POSITION, PLUS FLEX ELIGIBILITY — AND THIS IS AN APPROXIMATION WE NAME
 * RATHER THAN HIDE. We do not reliably hold each league's slot definitions, so
 * "who can legally go in that exact slot" is not answerable today. Same-position
 * is always right; flex widening is right in most leagues and occasionally offers
 * a player the platform will reject. Offering a slightly wide list is recoverable
 * in seconds; omitting the correct answer is not.
 */
const FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])

function canReplace(injuredPosition: string | null, candidatePosition: string | null): boolean {
  if (!injuredPosition || !candidatePosition) return false
  /*
   * ⚠ NORMALISED, NOT UPPERCASED. Comparing the raw strings made this return
   * FALSE for a roster with two quarterbacks, because one row said "Quarterback"
   * and the other said "QB". The failure was silent: "nobody on your bench can
   * fill a Quarterback slot" is a sentence, not an error.
   */
  const a = normalizePosition(injuredPosition)
  const b = normalizePosition(candidatePosition)
  if (!a || !b) return false
  if (a === b) return true
  return FLEX_ELIGIBLE.has(a) && FLEX_ELIGIBLE.has(b)
}

function asIds(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (x == null ? '' : String(x))).filter(Boolean) : []
}

/** Where a player sits, from the roster's own arrays. */
function slotOf(pd: Record<string, unknown>, playerId: string): { slot: string; starting: boolean } | null {
  if (asIds(pd.starters).includes(playerId)) return { slot: 'STARTER', starting: true }
  if (asIds(pd.reserve).includes(playerId)) return { slot: 'IR SLOT', starting: false }
  if (asIds(pd.taxi).includes(playerId)) return { slot: 'TAXI', starting: false }
  if (asIds(pd.players).includes(playerId)) return { slot: 'BENCH', starting: false }
  return null
}

/**
 * Every league where this user rosters this player, with the swap to make.
 *
 * `playerSleeperId` is a Sleeper id because that is the id space both
 * `Roster.playerData` and the projection feed use — the coincidence that makes
 * any of this joinable. A player we hold only under a TheSportsDB id cannot be
 * looked up here at all, which is reported rather than returned as "no leagues".
 */
export async function getPlayerImpact(
  playerSleeperId: string,
  userId: string
): Promise<LeagueImpact[]> {
  const at = await latestProjectionWeek()
  if (!at) return []

  /*
   * The user's leagues, via the same claimed-team predicate My Team uses. Rosters
   * are matched on platformUserId, externalId OR our own User uuid — that third
   * candidate is not optional: without it this found a roster for only 38 of 106
   * claimed teams.
   */
  const teams = await prisma.leagueTeam.findMany({
    where: { claimedByUserId: userId },
    select: {
      leagueId: true,
      platformUserId: true,
      externalId: true,
      league: { select: { id: true, name: true, platform: true, settings: true } },
    },
  })
  if (teams.length === 0) return []

  const out: LeagueImpact[] = []

  for (const t of teams) {
    const candidates = [t.platformUserId, t.externalId, userId].filter(Boolean) as string[]
    const roster = await prisma.roster.findFirst({
      where: { leagueId: t.leagueId, platformUserId: { in: candidates } },
      select: { playerData: true },
    })
    if (!roster) continue

    const pd = (roster.playerData ?? {}) as Record<string, unknown>
    const placed = slotOf(pd, playerSleeperId)
    // Not on this roster — not a league that needs an answer.
    if (!placed) continue

    const scoring = extractScoringSettings(t.league?.settings)

    // Everyone on the roster, so bench options can be priced in one pass.
    const rosterIds = [
      ...new Set([...asIds(pd.players), ...asIds(pd.starters), ...asIds(pd.reserve), ...asIds(pd.taxi)]),
    ]
    const [players, projections] = await Promise.all([
      prisma.sportsPlayer.findMany({
        where: { sleeperId: { in: rosterIds } },
        select: { sleeperId: true, name: true, position: true, team: true },
      }),
      prisma.fantasyProjection.findMany({
        where: { playerId: { in: rosterIds }, season: at.season, week: at.week },
        select: { playerId: true, stats: true },
      }),
    ])

    const playerById = new Map<string, PlayerRow>(
      players.filter((p) => p.sleeperId).map((p) => [p.sleeperId as string, p as PlayerRow])
    )
    const statsById = new Map(
      projections.map((p) => {
        // The feed nests component stats one level down; the outer object is
        // metadata (name/team/week) and scoring it would be meaningless.
        const s = (p.stats ?? {}) as Record<string, unknown>
        return [p.playerId, (s.stats ?? null) as Record<string, unknown> | null]
      })
    )

    const priceOf = (id: string): { points: number; matchedKeys: number; scoredKeys: number } | null => {
      if (!scoring) return null
      const raw = statsById.get(id)
      if (!raw) return null
      const r = computeLeagueProjectedPoints(raw, scoring)
      if (!r) return null
      return { points: Math.round(r.points * 100) / 100, matchedKeys: r.coverage.matchedKeys, scoredKeys: r.coverage.scoredKeys }
    }

    const mine = priceOf(playerSleeperId)
    const injured = playerById.get(playerSleeperId)

    /*
     * Candidates are drawn from bench, IR and taxi — never from the current
     * starters. Suggesting a swap with someone already starting does not fill the
     * hole, it moves it.
     */
    const benchIds = [
      ...asIds(pd.reserve).map((id) => [id, 'IR'] as const),
      ...asIds(pd.taxi).map((id) => [id, 'TAXI'] as const),
      ...asIds(pd.players)
        .filter((id) => !asIds(pd.starters).includes(id) && !asIds(pd.reserve).includes(id) && !asIds(pd.taxi).includes(id))
        .map((id) => [id, 'BENCH'] as const),
    ]

    const replacements: ReplacementOption[] = []
    for (const [id, from] of benchIds) {
      const row = playerById.get(id)
      if (!row) continue
      if (!canReplace(injured?.position ?? null, row.position)) continue
      const priced = priceOf(id)
      replacements.push({
        playerId: id,
        name: row.name,
        position: row.position,
        team: row.team,
        afPoints: priced?.points ?? null,
        delta: priced && mine ? Math.round((priced.points - mine.points) * 100) / 100 : null,
        injuryStatus: null,
        from,
      })
    }

    /*
     * ⚠ UNPRICED OPTIONS SORT LAST, NEVER AS ZERO. A bench player the feed does
     * not carry is unknown, not worthless — sorting him as 0.0 would bury a
     * legitimate option beneath every priced one, which on game day means we hid
     * the right answer.
     */
    replacements.sort((a, b) => {
      if (a.afPoints == null && b.afPoints == null) return a.name.localeCompare(b.name)
      if (a.afPoints == null) return 1
      if (b.afPoints == null) return -1
      return b.afPoints - a.afPoints
    })

    out.push({
      leagueId: t.leagueId,
      leagueName: leagueDisplayName(t.league?.name ?? null),
      platform: String(t.league?.platform ?? 'manual').toLowerCase(),
      slot: placed.slot,
      isStarting: placed.starting,
      afPoints: mine
        ? { available: true, data: mine }
        : {
            available: false,
            reason: scoring
              ? 'this week’s projection feed does not carry this player'
              : 'we hold no scoring settings for this league, and a generic projection would not be yours',
          },
      replacements:
        replacements.length > 0
          ? { available: true, data: replacements }
          : {
              available: false,
              reason: injured?.position
                ? `nobody on your bench can fill a ${normalizePosition(injured.position)} slot`
                : 'we could not resolve this player’s position, so we cannot tell who could replace him',
            },
    })
  }

  /*
   * Leagues where he is STARTING come first — those are the ones with a decision
   * to make in the next few minutes. Within that, the biggest drop-off first: the
   * league where the swap is worth the most points is the one to act on.
   */
  return out.sort((a, b) => {
    if (a.isStarting !== b.isStarting) return a.isStarting ? -1 : 1
    const ad = a.replacements.available ? (a.replacements.data[0]?.delta ?? 0) : 0
    const bd = b.replacements.available ? (b.replacements.data[0]?.delta ?? 0) : 0
    return bd - ad
  })
}
