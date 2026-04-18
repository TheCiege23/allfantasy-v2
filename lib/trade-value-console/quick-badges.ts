import type { TradeConsoleLeagueSnapshot } from './types'

export function buildQuickModeBadges(league: {
  isDynasty: boolean
  leagueType: string | null
  leagueVariant: string | null
  bestBallMode: boolean | null
  taxiSlots: number | null
  settings: Record<string, unknown> | null
  scoring: string | null
} | null): string[] {
  if (!league) return ['Non-league analysis']

  const badges: string[] = []
  const variant = (league.leagueVariant ?? '').toLowerCase()
  const lt = (league.leagueType ?? '').toLowerCase()

  if (league.isDynasty) badges.push('Dynasty')
  else if (lt.includes('keeper') || variant.includes('keeper')) badges.push('Keeper')
  else if (league.bestBallMode || variant.includes('best_ball') || variant.includes('bestball')) badges.push('Best Ball')
  else badges.push('Redraft')

  if (variant.includes('devy') || lt.includes('devy')) badges.push('Devy')
  if (variant.includes('c2c') || lt.includes('c2c')) badges.push('C2C')
  if (variant.includes('salary') || lt.includes('salary')) badges.push('Salary Cap')
  if (variant.includes('idp') || lt.includes('idp')) badges.push('IDP')

  const starters = league.settings?.starters
  if (Array.isArray(starters)) {
    const joined = starters.map(String).join(',')
    if (joined.includes('SUPER_FLEX') || joined.includes('SFLEX') || joined.includes('SUPERFLEX')) {
      badges.push('Superflex')
    }
    if (joined.split(',').filter((x) => x.includes('QB')).length >= 2) {
      badges.push('2QB')
    }
  }

  const tep =
    typeof league.settings?.tePremium === 'number' && (league.settings.tePremium as number) > 0
  if (tep) badges.push('TE Premium')

  if (typeof league.taxiSlots === 'number' && league.taxiSlots > 0) badges.push('Taxi')

  const sc = (league.scoring ?? '').toLowerCase()
  if (sc.includes('ppr') && !sc.includes('half')) badges.push('PPR')
  else if (sc.includes('half') || sc.includes('0.5')) badges.push('Half-PPR')

  return badges.length ? badges : ['Standard']
}

export function snapshotFromLoaded(
  loaded: import('./league-loader').LoadedTradeLeague,
): TradeConsoleLeagueSnapshot {
  const snap: TradeConsoleLeagueSnapshot = {
    id: loaded.id,
    name: loaded.name ?? 'League',
    sport: loaded.sport,
    leagueSize: loaded.leagueSize,
    isDynasty: loaded.isDynasty,
    leagueType: loaded.leagueType,
    scoring: loaded.scoring,
    isSuperFlexHint: false,
    tePremiumHint: false,
    waiverBudget: loaded.waiverBudget,
    taxiSlots: loaded.taxiSlots,
    leagueVariant: loaded.leagueVariant,
    bestBallMode: loaded.bestBallMode,
    settings: loaded.settings,
    quickModeBadges: buildQuickModeBadges({
      isDynasty: loaded.isDynasty,
      leagueType: loaded.leagueType,
      leagueVariant: loaded.leagueVariant,
      bestBallMode: loaded.bestBallMode,
      taxiSlots: loaded.taxiSlots,
      settings: loaded.settings,
      scoring: loaded.scoring,
    }),
  }

  const starters = loaded.starters
  if (Array.isArray(starters)) {
    const joined = starters.map(String).join(',')
    snap.isSuperFlexHint = joined.includes('SUPER_FLEX') || joined.includes('SFLEX')
  }
  const tep = loaded.settings?.tePremium
  snap.tePremiumHint = typeof tep === 'number' && tep > 0

  return snap
}
