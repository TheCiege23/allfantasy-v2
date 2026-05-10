/**
 * Picks the stable format key for league home / intro video resolution.
 *
 * Priority (canonical create + imports persist `League.leagueType`):
 * 1. Prisma `league.leagueType` column
 * 2. `settings.league_type` or `settings.leagueType`
 *
 * We intentionally do **not** fall back to `league.leagueVariant` as the format id: variant is for
 * modifiers (idp, superflex, scoring labels), and passing it as `leagueType` caused redraft leagues
 * to resolve the wrong intro (e.g. guillotine) when settings omitted `league_type`.
 */

export function resolveLeagueIntroFormatKey(input: {
  leagueTypeColumn: string | null | undefined
  settings: Record<string, unknown>
}): string | undefined {
  const col = typeof input.leagueTypeColumn === 'string' ? input.leagueTypeColumn.trim().toLowerCase() : ''
  if (col) return col

  const snake = input.settings.league_type
  const camel = input.settings.leagueType
  const fromSettings =
    typeof snake === 'string'
      ? snake.trim().toLowerCase()
      : typeof camel === 'string'
        ? camel.trim().toLowerCase()
        : ''
  if (fromSettings) return fromSettings

  return undefined
}
