import type { SupportedSport } from "@/lib/sport-scope"

type PlayoffChallengeRef = {
  challengeId: string
  sport: "nba" | "nhl"
}

type MyPoolCardInput = {
  poolId: string
  sport: string | null | undefined
  challengeType?: string | null
  bracketType?: string | null
  playoffBySport: Map<string, PlayoffChallengeRef>
}

export function resolvePlayoffCardHref(input: {
  sport: SupportedSport | string
  playoffBySport: Map<string, PlayoffChallengeRef>
}): string {
  const normalizedSport = String(input.sport).toLowerCase()
  const existing = input.playoffBySport.get(normalizedSport)
  if (existing?.challengeId) {
    return `/brackets/playoffs/${existing.challengeId}`
  }
  return `/brackets/playoffs/create?sport=${encodeURIComponent(normalizedSport)}`
}

export function resolvePlayoffCardMode(input: {
  sport: SupportedSport | string
  playoffBySport: Map<string, PlayoffChallengeRef>
}): "open" | "create" {
  const normalizedSport = String(input.sport).toLowerCase()
  return input.playoffBySport.has(normalizedSport) ? "open" : "create"
}

export function resolveMyPoolCardHref(input: MyPoolCardInput): string {
  const normalizedSport = String(input.sport ?? "").toLowerCase()
  const normalizedChallengeType = String(input.challengeType ?? input.bracketType ?? "").toLowerCase()

  if (normalizedSport === "nba" || normalizedSport === "nhl") {
    const existing = input.playoffBySport.get(normalizedSport)
    if (existing?.challengeId) {
      return `/brackets/playoffs/${existing.challengeId}`
    }
  }

  if (normalizedChallengeType.includes("playoff")) {
    return `/brackets/playoffs/${input.poolId}`
  }

  return `/brackets/leagues/${input.poolId}`
}
