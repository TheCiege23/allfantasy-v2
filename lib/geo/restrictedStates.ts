// SINGLE SOURCE OF TRUTH for fantasy sports geo-restrictions.
// Update this file only when state laws change.
// Last reviewed: April 2025.

export type RestrictionLevel = "full_block" | "paid_block"

export interface RestrictedState {
  code: string
  name: string
  level: RestrictionLevel
  legalBasis: string
  details: string
  effectiveDate: string
}

export const RESTRICTED_STATES: RestrictedState[] = [
  {
    code: "WA",
    name: "Washington",
    level: "full_block",
    legalBasis: "RCW 9.46.240 (2016 clarification)",
    details:
      "Washington state law classifies all fantasy sports as sports wagering. Operating, offering, or advertising fantasy sports — including free contests — is a Class C felony under Washington law.",
    effectiveDate: "2016-03-01",
  },
  {
    code: "HI",
    name: "Hawaii",
    level: "paid_block",
    legalBasis: "Hawaii AG Opinion 16-1 (January 2016)",
    details:
      "The Hawaii Attorney General determined that paid fantasy sports contests constitute illegal gambling under state law. Free fantasy play is tolerated; paid leagues, entry fees, and prizes are prohibited.",
    effectiveDate: "2016-01-01",
  },
  {
    code: "ID",
    name: "Idaho",
    level: "paid_block",
    legalBasis: "Idaho Code §18-3802; Idaho AG Opinion (May 2016)",
    details:
      "Idaho law prohibits all forms of gambling. The Idaho Attorney General confirmed that paid daily fantasy sports constitute illegal gambling. Free fantasy play is tolerated; paid leagues and entry fees are prohibited.",
    effectiveDate: "2016-05-01",
  },
  {
    code: "MT",
    name: "Montana",
    level: "paid_block",
    legalBasis: "Montana Code §23-5-802",
    details:
      "Montana classifies paid fantasy sports as illegal gambling, despite legalizing traditional sports betting. All major fantasy operators have exited paid contests in Montana. Free fantasy play is tolerated.",
    effectiveDate: "2015-11-01",
  },
  {
    code: "NV",
    name: "Nevada",
    level: "paid_block",
    legalBasis: "NV Gaming Control Board (Oct 2015) + NV AG Opinion",
    details:
      "Nevada requires a sports betting license to operate paid fantasy sports. No fantasy sports operator currently holds this license, making paid contests illegal to operate. Free fantasy play is tolerated.",
    effectiveDate: "2015-10-01",
  },
]

export const FULL_BLOCK_STATES = new Set(RESTRICTED_STATES.filter((s) => s.level === "full_block").map((s) => s.code))

export const PAID_BLOCK_STATES = new Set(RESTRICTED_STATES.filter((s) => s.level === "paid_block").map((s) => s.code))

export const ALL_RESTRICTED_STATE_CODES = new Set(RESTRICTED_STATES.map((s) => s.code))

export function getRestrictionLevel(stateCode: string | null | undefined): RestrictionLevel | null {
  if (!stateCode) return null
  const state = RESTRICTED_STATES.find((s) => s.code === stateCode.toUpperCase())
  return state?.level ?? null
}

export function isFullyBlocked(stateCode: string | null | undefined): boolean {
  return FULL_BLOCK_STATES.has((stateCode ?? "").toUpperCase())
}

export function isPaidBlocked(stateCode: string | null | undefined): boolean {
  return PAID_BLOCK_STATES.has((stateCode ?? "").toUpperCase())
}

export function isAnyRestriction(stateCode: string | null | undefined): boolean {
  return ALL_RESTRICTED_STATE_CODES.has((stateCode ?? "").toUpperCase())
}

export function getRestrictedStateMeta(stateCode: string | null | undefined): RestrictedState | undefined {
  if (!stateCode) return undefined
  return RESTRICTED_STATES.find((s) => s.code === stateCode.toUpperCase())
}
