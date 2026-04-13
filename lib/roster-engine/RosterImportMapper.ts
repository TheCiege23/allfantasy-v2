import type { ImportedRosterPayload, SupportedRosterSport } from './RosterEngineTypes'

const SOURCE_SLOT_MAPPINGS: Record<string, Record<string, string>> = {
  yahoo_nfl: {
    QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', WRT: 'FLEX', FLEX: 'FLEX', K: 'K', DEF: 'DEF', BN: 'BN', IR: 'IR',
  },
  yahoo_nba: {
    PG: 'PG', SG: 'SG', G: 'G', SF: 'SF', PF: 'PF', F: 'F', C: 'C', UTIL: 'UTIL', BN: 'BN', IL: 'IL',
  },
  yahoo_mlb: {
    C: 'C', '1B': '1B', '2B': '2B', '3B': '3B', SS: 'SS', CI: 'CI', MI: 'MI', OF: 'OF', SP: 'SP', RP: 'RP', P: 'P', BN: 'BN', IL: 'IL',
  },
  yahoo_nhl: {
    C: 'C', LW: 'LW', RW: 'RW', D: 'D', G: 'G', UTIL: 'UTIL', BN: 'BN', IR: 'IR',
  },
  fpl_soccer: {
    GKP: 'GK', GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD', BENCH: 'BN', IR: 'IR',
  },
}

function normalizeSourceKey(sourcePlatform: string, sport: SupportedRosterSport): string {
  return `${sourcePlatform.toLowerCase()}_${sport.toLowerCase()}`
}

export function mapImportedRosterToAF(payload: ImportedRosterPayload): {
  mappedSlots: Record<string, number>
  unmappedSlots: string[]
} {
  const sourceKey = normalizeSourceKey(payload.sourcePlatform, payload.sport)
  const mapper = SOURCE_SLOT_MAPPINGS[sourceKey] ?? {}
  const mappedSlots: Record<string, number> = {}
  const unmappedSlots: string[] = []

  for (const [rawSlot, count] of Object.entries(payload.importedConfig)) {
    const normalized = rawSlot.trim().toUpperCase()
    const mappedKey = mapper[normalized] ?? normalized
    if (!mappedKey) {
      unmappedSlots.push(rawSlot)
      continue
    }
    mappedSlots[mappedKey] = (mappedSlots[mappedKey] ?? 0) + Number(count || 0)
  }

  return { mappedSlots, unmappedSlots }
}
