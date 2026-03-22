/**
 * Canonical scoring stat-key resolver.
 * Handles legacy/unprefixed IDP keys so league overrides still map to current templates.
 */

const IDP_UNAMBIGUOUS_ALIASES: Record<string, string> = {
  solo_tackle: 'idp_solo_tackle',
  assist_tackle: 'idp_assist_tackle',
  tackle_for_loss: 'idp_tackle_for_loss',
  qb_hit: 'idp_qb_hit',
  pass_defended: 'idp_pass_defended',
  forced_fumble: 'idp_forced_fumble',
  fumble_recovery: 'idp_fumble_recovery',
  defensive_touchdown: 'idp_defensive_touchdown',
}

const IDP_CONTEXTUAL_ALIASES: Record<string, string> = {
  sack: 'idp_sack',
  interception: 'idp_interception',
  safety: 'idp_safety',
}

export function normalizeScoringStatKey(
  statKey: string,
  options?: {
    sportType?: string | null
    templateRuleKeys?: Iterable<string>
  }
): string {
  const raw = String(statKey ?? '').trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  const templateKeys = options?.templateRuleKeys
    ? new Set(Array.from(options.templateRuleKeys, (k) => String(k)))
    : null

  const unambiguous = IDP_UNAMBIGUOUS_ALIASES[lower]
  if (unambiguous) {
    if (!templateKeys || templateKeys.has(unambiguous)) {
      return unambiguous
    }
    if (templateKeys.has(lower)) return lower
  }

  const contextual = IDP_CONTEXTUAL_ALIASES[lower]
  if (contextual) {
    const sportUpper = String(options?.sportType ?? '').toUpperCase()
    const isNflContext = sportUpper === 'NFL' || sportUpper.length === 0
    if (isNflContext && templateKeys && templateKeys.has(contextual) && !templateKeys.has(lower)) {
      return contextual
    }
  }

  return lower
}

