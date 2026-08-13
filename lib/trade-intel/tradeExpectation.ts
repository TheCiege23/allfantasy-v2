import type { LeagueContextEnvelope } from '@/lib/league-context/leagueContextService'
import type { MarketValuesPayload } from '@/lib/trade-intel/marketValueService'
import type { GradedTrade, TradeSideGrade } from '@/lib/trade-intel/sleeperTradeGradeService'

/**
 * tradeExpectation — what we can honestly say about a trade BEFORE it has
 * produced any points.
 *
 * The realized grade (sleeperTradeGradeService) can only speak once points
 * accrue: net = credited in − credited out. Before kickoff every net is 0, so
 * every trade lands mid-C and reports a tie. That is not "average", it is
 * "unknown", and the email used to launder one into the other.
 *
 * There is still plenty that is genuinely knowable on day one, and none of it
 * requires guessing the future:
 *
 *  - LEAGUE SETTINGS. Superflex, dynasty/keeper, team count and roster shape
 *    all change what an asset is worth. They come from the league itself.
 *  - SCORING SETTINGS. A TE-premium full-PPR league scores a tight end very
 *    differently from the generic PPR number a stat feed hands you. We rescore
 *    real stat lines with the league's own weights and say which mode we used.
 *  - PREVIOUS PERFORMANCE. Last season actually happened. Rescored under this
 *    league's rules, with games played shown so a 12-game season is never
 *    silently compared against a 17-game one.
 *  - ROSTER NEEDS. Whether a side now has enough bodies to fill its required
 *    starting slots is a fact about the roster, not a projection.
 *
 * Everything here is measured or absent. When an input is missing it is named
 * in `missing` and the corresponding number is null — never zero, because zero
 * is a claim and null is an admission.
 *
 * This module is pure. loadTradeExpectation() in tradeExpectationLoader does
 * the I/O so this stays testable without a network.
 */

export type AssetExpectation = {
  key: string
  name: string
  position: string | null
  isPick: boolean
  /** League-settings-aware market value (superflex/teams/ppr/dynasty). Null when unpriced. */
  marketValue: number | null
  /** Last completed season, rescored with THIS league's scoring settings. */
  priorPoints: number | null
  priorGames: number | null
  priorPerGame: number | null
}

export type StarterGap = {
  position: string
  required: number
  rostered: number
}

export type SideExpectation = {
  rosterId: number
  managerName: string
  assetsIn: AssetExpectation[]
  assetsOut: AssetExpectation[]
  marketIn: number | null
  marketOut: number | null
  marketNet: number | null
  priorIn: number | null
  priorOut: number | null
  priorNet: number | null
  /** Net change in rostered bodies per position, from this trade alone. */
  positionDelta: Record<string, number>
  /** Required starting slots this side cannot currently fill. Null when rosters unavailable. */
  starterGaps: StarterGap[] | null
}

export type TradeExpectation = {
  /** False when nothing could be measured at all — the email then says only that. */
  available: boolean
  /** Plain-language league shape, e.g. "12-team superflex dynasty · full PPR · TE premium". */
  leagueNote: string
  priorSeason: string | null
  /** Whether prior points used the league's own weights or a format approximation. */
  scoringMode: 'league-scored' | 'format-approx' | null
  sides: SideExpectation[]
  /** Anything upstream refused to give us, named rather than papered over. */
  missing: string[]
}

const FLEX_SLOTS = new Set(['FLEX', 'SUPER_FLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX'])
const NON_STARTER = new Set(['BN', 'TAXI', 'IR'])

/**
 * Human-readable league shape. This is the "league settings" the manager never
 * sees stated anywhere, and it is why two identical trades grade differently in
 * two leagues.
 */
export function describeLeague(context: {
  teams: number
  variant: { superflex: boolean; dynasty: boolean; keeper: boolean; bestBall: boolean; idp: boolean }
  scoring: { format: 'ppr' | 'half_ppr' | 'std'; settings: Record<string, number> }
}): string {
  const bits: string[] = []
  const shape = [
    `${context.teams}-team`,
    context.variant.superflex ? 'superflex' : null,
    context.variant.dynasty ? 'dynasty' : context.variant.keeper ? 'keeper' : 'redraft',
  ]
    .filter(Boolean)
    .join(' ')
  bits.push(shape)

  bits.push(
    context.scoring.format === 'ppr'
      ? 'full PPR'
      : context.scoring.format === 'half_ppr'
        ? 'half PPR'
        : 'standard scoring',
  )

  // TE premium is the single most commonly missed setting when judging a trade.
  const tePremium = context.scoring.settings.bonus_rec_te ?? 0
  if (tePremium > 0) bits.push(`TE premium (+${tePremium}/rec)`)
  if (context.variant.idp) bits.push('IDP')
  if (context.variant.bestBall) bits.push('best ball')

  return bits.join(' · ')
}

/** Required starters per position from roster_positions, flex slots kept separate. */
export function requiredStarters(rosterPositions: string[]): Record<string, number> {
  const required: Record<string, number> = {}
  for (const slot of rosterPositions) {
    if (NON_STARTER.has(slot)) continue
    const key = FLEX_SLOTS.has(slot) ? 'FLEX' : slot
    required[key] = (required[key] ?? 0) + 1
  }
  return required
}

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => typeof v === 'number')
  if (present.length === 0) return null
  return Math.round(present.reduce((a, b) => a + b, 0) * 10) / 10
}

function netOrNull(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null
  return Math.round(((a ?? 0) - (b ?? 0)) * 10) / 10
}

function deltaFor(assetsIn: AssetExpectation[], assetsOut: AssetExpectation[]): Record<string, number> {
  const delta: Record<string, number> = {}
  for (const a of assetsIn) {
    if (a.isPick || !a.position) continue
    delta[a.position] = (delta[a.position] ?? 0) + 1
  }
  for (const a of assetsOut) {
    if (a.isPick || !a.position) continue
    delta[a.position] = (delta[a.position] ?? 0) - 1
  }
  for (const k of Object.keys(delta)) if (delta[k] === 0) delete delta[k]
  return delta
}

/**
 * Starting slots a side cannot fill with the bodies it actually rosters.
 *
 * Deliberately counts bodies, not quality — "you have two TEs for one TE slot"
 * is a fact; "your TE room is bad" is an opinion we have not earned. Flex slots
 * are excluded because any skill position fills them, so a flex is never a hole.
 */
export function starterGapsFor(
  rosteredByPosition: Record<string, number>,
  required: Record<string, number>,
): StarterGap[] {
  const gaps: StarterGap[] = []
  for (const [position, count] of Object.entries(required)) {
    if (position === 'FLEX') continue
    const rostered = rosteredByPosition[position] ?? 0
    if (rostered < count) gaps.push({ position, required: count, rostered })
  }
  return gaps.sort((a, b) => a.position.localeCompare(b.position))
}

export type BuildParams = {
  trade: GradedTrade
  context: Pick<LeagueContextEnvelope, 'teams' | 'variant' | 'scoring' | 'roster'>
  marketValues: MarketValuesPayload | null
  /** Prior-season league-scored totals keyed by Sleeper player id. */
  priorSeason: {
    season: string
    mode: 'league-scored' | 'format-approx'
    byPlayerId: Record<string, { points: number; games: number | null }>
  } | null
  /** Rostered players by position per rosterId, AFTER the trade. Null when unavailable. */
  rosteredByPosition: Record<number, Record<string, number>> | null
  /** Round-average pick values keyed `${season}:${round}`. */
  pickValueLookup?: (season: string, round: number) => number | null
}

function assetFromPlayer(
  playerId: string,
  name: string,
  position: string | null,
  params: BuildParams,
): AssetExpectation {
  const market = params.marketValues?.bySleeperId[playerId]?.value ?? null
  const prior = params.priorSeason?.byPlayerId[playerId] ?? null
  const games = prior?.games ?? null
  return {
    key: playerId,
    name,
    position,
    isPick: false,
    marketValue: typeof market === 'number' ? market : null,
    priorPoints: prior ? Math.round(prior.points * 10) / 10 : null,
    priorGames: games,
    priorPerGame:
      prior && games && games > 0 ? Math.round((prior.points / games) * 10) / 10 : null,
  }
}

function assetFromPick(
  label: string,
  season: string,
  round: number,
  params: BuildParams,
): AssetExpectation {
  return {
    // Keyed by the label the grade payload already uses, so a renderer can look
    // an asset up without re-deriving it.
    key: label,
    name: label,
    position: null,
    isPick: true,
    // A pick has a market price long before it is drafted — that is the whole
    // point of trading one, and treating it as 0 is what made the old grade wrong.
    marketValue: params.pickValueLookup?.(season, round) ?? null,
    priorPoints: null,
    priorGames: null,
    priorPerGame: null,
  }
}

function sideFrom(side: TradeSideGrade, params: BuildParams): SideExpectation {
  const assetsIn: AssetExpectation[] = [
    ...side.playersIn.map((p) => assetFromPlayer(p.playerId, p.name, p.position, params)),
    ...side.picksIn.map((p) => assetFromPick(p.label, p.season, p.round, params)),
  ]
  const assetsOut: AssetExpectation[] = [
    ...side.playersOut.map((p) => assetFromPlayer(p.playerId, p.name, p.position, params)),
    ...side.picksOut.map((p) => assetFromPick(p.label, p.season, p.round, params)),
  ]

  const marketIn = sumOrNull(assetsIn.map((a) => a.marketValue))
  const marketOut = sumOrNull(assetsOut.map((a) => a.marketValue))
  const priorIn = sumOrNull(assetsIn.map((a) => a.priorPoints))
  const priorOut = sumOrNull(assetsOut.map((a) => a.priorPoints))

  const required = requiredStarters(params.context.roster.positions)
  const rostered = params.rosteredByPosition?.[side.rosterId] ?? null

  return {
    rosterId: side.rosterId,
    managerName: side.managerName,
    assetsIn,
    assetsOut,
    marketIn,
    marketOut,
    marketNet: netOrNull(marketIn, marketOut),
    priorIn,
    priorOut,
    priorNet: netOrNull(priorIn, priorOut),
    positionDelta: deltaFor(assetsIn, assetsOut),
    starterGaps: rostered ? starterGapsFor(rostered, required) : null,
  }
}

export function buildTradeExpectation(params: BuildParams): TradeExpectation {
  const missing: string[] = []
  if (!params.marketValues) missing.push('market values unavailable')
  if (!params.priorSeason) missing.push('prior-season stats unavailable')
  if (!params.rosteredByPosition) missing.push('rosters unavailable — roster needs not assessed')

  const sides = params.trade.sides.map((s) => sideFrom(s, params))
  const measuredSomething = sides.some(
    (s) => s.marketNet != null || s.priorNet != null || s.starterGaps != null,
  )

  return {
    available: measuredSomething,
    leagueNote: describeLeague(params.context),
    priorSeason: params.priorSeason?.season ?? null,
    scoringMode: params.priorSeason?.mode ?? null,
    sides,
    missing,
  }
}
