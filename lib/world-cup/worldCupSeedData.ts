export type WorldCupTeamSeedRow = {
  fifaCode?: string | null
  countryCode?: string | null
  countryName: string
  displayName?: string | null
}

export type WorldCupFixtureSeedRow = {
  round: string
  matchNumber: number
  startsAt?: string | null
  homeSlotKey: string
  awaySlotKey: string
}

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "USA",
  "united states": "USA",
  "united states of america": "USA",
  england: "England",
  korea: "Korea Republic",
  "south korea": "Korea Republic",
}

export function normalizeFifaTeamCode(code?: string | null): string | null {
  if (!code) return null
  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(normalized)) return null
  return normalized
}

export function normalizeCountryName(name: string): string {
  const raw = name.trim()
  if (!raw) return ""
  const alias = COUNTRY_ALIASES[raw.toLowerCase()]
  if (alias) return alias
  return raw
}

export function getFlagUrlForCountryCode(countryCode?: string | null): string | null {
  const code = normalizeFifaTeamCode(countryCode)
  if (!code) return null
  // TODO: align with canonical platform flag CDN strategy if one is preferred.
  return `https://flagcdn.com/w80/${code.slice(0, 2).toLowerCase()}.png`
}

export function validateTeamSeedRow(row: WorldCupTeamSeedRow): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (!row.countryName?.trim()) errors.push("countryName is required")
  if (row.fifaCode && !normalizeFifaTeamCode(row.fifaCode)) {
    errors.push("fifaCode must be a 3-letter code")
  }
  if (row.countryCode && !normalizeFifaTeamCode(row.countryCode)) {
    errors.push("countryCode must be a 3-letter code")
  }
  return { ok: errors.length === 0, errors }
}

export function validateFixtureSeedRow(row: WorldCupFixtureSeedRow): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (!row.round?.trim()) errors.push("round is required")
  if (!Number.isInteger(row.matchNumber) || row.matchNumber < 1) {
    errors.push("matchNumber must be a positive integer")
  }
  if (!row.homeSlotKey?.trim()) errors.push("homeSlotKey is required")
  if (!row.awaySlotKey?.trim()) errors.push("awaySlotKey is required")
  if (row.startsAt && Number.isNaN(new Date(row.startsAt).getTime())) {
    errors.push("startsAt must be a valid ISO date")
  }
  return { ok: errors.length === 0, errors }
}

// TODO: Add official FIFA 2026 team and fixture seed import wiring once source data is finalized.
