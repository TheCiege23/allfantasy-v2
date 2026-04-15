import type {
  RosterSlotDefinition,
  RosterValidationResult,
  SupportedRosterSport,
} from './RosterEngineTypes'

function validateUniversal(
  slots: Record<string, number>,
  defs: RosterSlotDefinition[],
): RosterValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const total = Object.values(slots).reduce((a, b) => a + Math.max(0, Number(b || 0)), 0)
  const starters = Object.entries(slots)
    .filter(([key]) => !['BN', 'IR', 'IL', 'IL_PLUS', 'IR_PLUS', 'TAXI', 'DEVY', 'PROSPECT', 'RIGHTS', 'YOUTH', 'DEVELOPMENT', 'ACADEMY', 'NA', 'MINORS', 'RESERVE'].includes(key))
    .reduce((a, [, c]) => a + Math.max(0, Number(c || 0)), 0)

  if (total <= 0) errors.push('Roster cannot be empty.')
  if (starters <= 0) errors.push('Starter count cannot be zero.')

  const defMap = new Map(defs.map((d) => [d.key, d]))
  for (const [key, value] of Object.entries(slots)) {
    const numeric = Number(value || 0)
    const def = defMap.get(key)
    if (!def) {
      warnings.push(`Unknown slot ${key} is present in config.`)
      continue
    }
    if (numeric < def.minCount) {
      errors.push(`${def.label} is below minimum (${def.minCount}).`)
    }
    if (numeric > def.maxCount) {
      errors.push(`${def.label} exceeds maximum (${def.maxCount}).`)
    }
  }

  return { valid: errors.length === 0, warnings, errors }
}

function applySportChecks(
  sport: SupportedRosterSport,
  slots: Record<string, number>,
  result: RosterValidationResult,
): RosterValidationResult {
  const warnings = [...result.warnings]

  if ((sport === 'NFL' || sport === 'NCAAF') && (slots.SUPERFLEX ?? 0) > 0 && (slots.QB ?? 0) < 2) {
    warnings.push('Superflex is enabled with fewer than 2 QB slots; league may experience QB scarcity.')
  }

  if ((sport === 'NBA' || sport === 'NCAAB') && (slots.C ?? 0) <= 0) {
    warnings.push('No center slots configured; ensure this is intentional.')
  }

  if (sport === 'MLB' && (slots.C ?? 0) > 2) {
    warnings.push('High catcher starter count may create player-supply constraints.')
  }

  if (sport === 'NHL' && (slots.G ?? 0) <= 0) {
    warnings.push('No goalie starter slots configured; goalie minimum checks may fail.')
  }

  if (sport === 'SOCCER') {
    if ((slots.GK ?? 0) <= 0) warnings.push('At least one GK starter is recommended.')
    const shape = (slots.DEF ?? 0) + (slots.MID ?? 0) + (slots.FWD ?? 0)
    if (shape < 9) warnings.push('Soccer outfield starter shape appears undersized for standard formation play.')
  }

  const hasC2C = Object.keys(slots).some((k) => k.startsWith('C2C_'))
  if (hasC2C) {
    const c2cStarters = Object.entries(slots)
      .filter(([k]) => k.startsWith('C2C_') && !k.startsWith('C2C_BN') && !k.startsWith('C2C_IR'))
      .reduce((a, [, c]) => a + Math.max(0, Number(c || 0)), 0)
    if (c2cStarters <= 0) warnings.push('Dual-track roster has C2C keys but no C2C starter slots enabled.')
  }

  return {
    valid: result.valid,
    errors: result.errors,
    warnings,
  }
}

export function validateRosterConfig(
  sport: SupportedRosterSport,
  _leagueType: string,
  slots: Record<string, number>,
  defs: RosterSlotDefinition[],
): RosterValidationResult {
  const universal = validateUniversal(slots, defs)
  return applySportChecks(sport, slots, universal)
}
