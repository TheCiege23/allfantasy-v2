import type { NormalizedScoringRules } from '@/lib/league-context-engine/types'

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function absorbNumericMap(
  src: Record<string, unknown> | null | undefined,
  into: Record<string, number>,
): void {
  if (!src || typeof src !== 'object') return
  for (const [k, v] of Object.entries(src)) {
    const n = toFiniteNumber(v)
    if (n != null) into[k] = n
  }
}

function startersArray(starters: unknown): string[] {
  if (!Array.isArray(starters)) return []
  return starters.map((x) => String(x))
}

/**
 * Builds `NormalizedScoringRules` from `League.scoring`, `League.settings` JSON,
 * and starter positions — preserves numeric weights for AI consumption.
 *
 * Precedence (later sources override earlier for the same stat id):
 *   1. `settings.scoring_settings` or `settings.scoringSettings` (Sleeper/ESPN embedded)
 *   2. `settings.raw_settings.scoring_settings` (native cache / proxy imports)
 *   3. Yahoo-style `statModifiers` / `stat_modifiers` arrays (namespaced `yahoo_stat_<id>`)
 *   4. `settings.scoringSettings` nested (ESPN/FantasyPros — merged last)
 *
 * `League.scoring` (text column) is preserved verbatim in `rawSources.leagueScoringColumn`
 * for AI prompts but does **not** override numeric weights — it's a label hint, not authoritative.
 */
export function normalizeLeagueScoring(args: {
  sport: string
  scoringColumn: string | null
  settings: Record<string, unknown> | null
  starters: unknown
}): NormalizedScoringRules {
  const settings = args.settings
  const embedded =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings.scoring_settings as Record<string, unknown> | undefined) ??
        (settings.scoringSettings as Record<string, unknown> | undefined)
      : undefined

  const rawSettings =
    settings && typeof settings.raw_settings === 'object' && settings.raw_settings !== null
      ? (settings.raw_settings as Record<string, unknown>)
      : null

  const pointsByStat: Record<string, number> = {}
  absorbNumericMap(embedded, pointsByStat)
  absorbNumericMap(rawSettings?.scoring_settings as Record<string, unknown> | undefined, pointsByStat)

  // Yahoo / some adapters
  const statMods = settings?.statModifiers ?? settings?.stat_modifiers
  if (Array.isArray(statMods)) {
    for (const row of statMods) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const id = String(r.statId ?? r.id ?? r.stat_id ?? '')
      const val = toFiniteNumber(r.value ?? r.points ?? r.score)
      if (id && val != null) pointsByStat[`yahoo_stat_${id}`] = val
    }
  }

  // ESPN / FantasyPros style nested objects
  const scoringSettingsNested = settings?.scoringSettings as Record<string, unknown> | undefined
  absorbNumericMap(scoringSettingsNested, pointsByStat)

  const rec = pointsByStat.rec ?? toFiniteNumber(embedded?.rec)
  let receptionFormat: NormalizedScoringRules['labels']['receptionFormat'] = 'unknown'
  if (rec != null) {
    if (rec >= 0.99) receptionFormat = 'ppr'
    else if (rec >= 0.45 && rec <= 0.55) receptionFormat = 'half_ppr'
    else if (rec === 0) receptionFormat = 'standard'
    else receptionFormat = 'custom'
  } else {
    const sc = (args.scoringColumn ?? '').toLowerCase()
    if (sc.includes('ppr') && !sc.includes('half')) receptionFormat = 'ppr'
    else if (sc.includes('half') || sc.includes('0.5')) receptionFormat = 'half_ppr'
    else if (sc.trim()) receptionFormat = 'standard'
  }

  const bonusRecTe = toFiniteNumber(embedded?.bonus_rec_te) ?? toFiniteNumber(embedded?.rec_te)
  const tepExtra =
    bonusRecTe != null && rec != null && bonusRecTe > rec ? bonusRecTe - rec : bonusRecTe

  const st = startersArray(args.starters)
  const joined = st.join(',')
  const isSuperflex = /SUPER_FLEX|SFLEX|SUPERFLEX/i.test(joined) || st.includes('SUPER_FLEX')
  const qbCount = st.filter((x) => x === 'QB' || x.includes('QB')).length
  const isTwoQB = qbCount >= 2
  const idpSlotsPresent = st.some((x) =>
    ['DE', 'DT', 'LB', 'CB', 'S', 'DL', 'DB', 'IDP_FLEX', 'IDP'].some((p) => x.includes(p)),
  )

  let scoringModel: NormalizedScoringRules['scoringModel'] = 'unknown'
  if (Object.keys(pointsByStat).length > 0) scoringModel = 'points'
  if (Array.isArray(statMods) && statMods.length > 0 && Object.keys(pointsByStat).length === 0) {
    scoringModel = 'category'
  }
  if (scoringModel === 'points' && Array.isArray(statMods) && statMods.length > 0) {
    scoringModel = 'hybrid'
  }

  return {
    schemaVersion: 1,
    scoringModel,
    pointsByStat,
    rawSources: {
      leagueScoringColumn: args.scoringColumn,
      settingsJson: settings,
      embeddedScoringSettings: embedded ?? null,
      categoryOrModifierPayload: statMods ?? null,
    },
    labels: {
      receptionFormat,
      tePremiumExtra: tepExtra,
      isSuperflex,
      isTwoQB,
      idpSlotsPresent,
    },
  }
}
