import type { PlayoffChallengeView, PlayoffSport } from "./types"

export async function createPlayoffBracketChallengeClient(input: {
  name: string
  sport: PlayoffSport
  seasonYear: number
  isTestMode?: boolean
}): Promise<{ challengeId: string; entryId: string }> {
  const response = await fetch("/api/brackets/playoffs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to create playoff bracket")
  }

  return {
    challengeId: payload.challengeId,
    entryId: payload.entryId,
  }
}

export async function getPlayoffBracketViewClient(challengeId: string): Promise<PlayoffChallengeView> {
  const response = await fetch(`/api/brackets/playoffs/${challengeId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to load playoff bracket")
  }

  return payload.view as PlayoffChallengeView
}

export async function savePlayoffBracketPickClient(input: {
  challengeId: string
  entryId: string
  seriesId: string
  pickTeamName: string
}): Promise<PlayoffChallengeView> {
  const response = await fetch(`/api/brackets/playoffs/${input.challengeId}/entries/${input.entryId}/picks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seriesId: input.seriesId,
      pickTeamName: input.pickTeamName,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to save playoff pick")
  }

  return payload.view as PlayoffChallengeView
}
