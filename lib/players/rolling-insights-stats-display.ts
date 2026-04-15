/**
 * Normalizes Rolling Insights season `stats` JSON (from `PlayerSeasonStats.stats`)
 * into the columns shown on the league Players (waiver) table.
 */
export type RollingInsightsTableStats = {
  rushAtt: number | null
  rushYd: number | null
  rushTd: number | null
  rec: number | null
  tar: number | null
  recYd: number | null
  recTd: number | null
  passCmp: number | null
  passAtt: number | null
  passYd: number | null
  passTd: number | null
  passInt: number | null
}

function num(s: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = s[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

export function parseRollingInsightsStatsJson(raw: unknown): RollingInsightsTableStats | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const s = raw as Record<string, unknown>
  return {
    rushAtt: num(s, 'rushing_attempts', 'rush_attempts'),
    rushYd: num(s, 'rushing_yards'),
    rushTd: num(s, 'rushing_touchdowns'),
    rec: num(s, 'receptions'),
    tar: num(s, 'targets'),
    recYd: num(s, 'receiving_yards'),
    recTd: num(s, 'receiving_touchdowns'),
    passCmp: num(s, 'completions', 'passing_completions'),
    passAtt: num(s, 'passing_attempts'),
    passYd: num(s, 'passing_yards'),
    passTd: num(s, 'passing_touchdowns'),
    passInt: num(s, 'interceptions'),
  }
}

export function fmtStat(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n))
}
