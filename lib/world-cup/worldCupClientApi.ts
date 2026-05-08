/**
 * Client-side API helpers for World Cup bracket entries.
 * All functions are safe to call from React components ("use client").
 */

import type {
  WorldCupAiMatchupPreview,
  WorldCupAiStrategy,
  WorldCupLeaderboardRow,
} from "./types"

// ── Local types ──────────────────────────────────────────────────────────────

export type WorldCupEntryStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "locked"
  | "live"

export type WorldCupBracketEntryClient = {
  id: string
  challengeId: string
  participantId: string
  userId: string
  name: string
  championTeamId: string | null
  championTeamName: string | null
  totalScore: number
  maxPossibleScore: number
  correctPicks: number
  incorrectPicks: number
  rank: number | null
  roundBreakdown: Record<string, number>
  isComplete: boolean
  isLocked: boolean
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

export type WorldCupEntryPickPayload = {
  matchId: string
  selectedTeamId?: string | null
  selectedTeamName?: string
  selectedSide?: "home" | "away"
  selectedSlotKey?: string | null
}

export type WorldCupEntryPickResult = {
  success: boolean
  entry: WorldCupBracketEntryClient | null
  pick: unknown
  picks: unknown[]
  isComplete: boolean
}

export type WorldCupEntryLeaderboardRow = WorldCupLeaderboardRow & {
  championAlive?: boolean
}

export type WorldCupChallengeIntegrityReport = {
  ok: boolean
  errors: string[]
  warnings: string[]
  stats: {
    participants: number
    entries: number
    matches: number
    picks: number
    completedMatches: number
    liveMatches: number
    lockedEntries: number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  })
  return res
}

// ── Entry CRUD ────────────────────────────────────────────────────────────────

export async function listWorldCupBracketEntries(
  challengeId: string
): Promise<WorldCupBracketEntryClient[]> {
  const res = await apiFetch(`/api/brackets/world-cup/${challengeId}/entries`)
  if (!res.ok) throw new Error("Failed to load bracket entries")
  const data = await res.json()
  return (data.entries ?? []) as WorldCupBracketEntryClient[]
}

export async function createWorldCupBracketEntry(
  challengeId: string,
  name?: string
): Promise<WorldCupBracketEntryClient> {
  const res = await apiFetch(`/api/brackets/world-cup/${challengeId}/entries`, {
    method: "POST",
    body: JSON.stringify({ name: name ?? null }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to create entry")
  return data.entry as WorldCupBracketEntryClient
}

export async function getWorldCupBracketEntry(
  challengeId: string,
  entryId: string
): Promise<WorldCupBracketEntryClient | null> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/entries/${entryId}`
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to load entry")
  const data = await res.json()
  return (data.entry ?? null) as WorldCupBracketEntryClient | null
}

export async function renameWorldCupBracketEntry(
  challengeId: string,
  entryId: string,
  name: string
): Promise<WorldCupBracketEntryClient> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/entries/${entryId}`,
    { method: "PATCH", body: JSON.stringify({ name }) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to rename entry")
  return data.entry as WorldCupBracketEntryClient
}

export async function deleteWorldCupBracketEntry(
  challengeId: string,
  entryId: string
): Promise<void> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/entries/${entryId}`,
    { method: "DELETE" }
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(
      (data as { error?: string }).error ?? "Failed to delete entry"
    )
  }
}

export async function saveWorldCupBracketEntryPick(
  challengeId: string,
  entryId: string,
  payload: WorldCupEntryPickPayload
): Promise<WorldCupEntryPickResult> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/entries/${entryId}/picks`,
    { method: "POST", body: JSON.stringify(payload) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to save pick")
  return data as WorldCupEntryPickResult
}

/**
 * Clear specific picks for an entry (used when an earlier-round pick changes
 * and downstream picks are now invalid).
 * Returns the remaining picks after deletion.
 */
export async function clearWorldCupBracketEntryPicks(
  challengeId: string,
  entryId: string,
  matchIds: string[]
): Promise<unknown[]> {
  if (matchIds.length === 0) return []
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/entries/${entryId}/picks`,
    { method: "DELETE", body: JSON.stringify({ matchIds }) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to clear picks")
  return (data as { picks: unknown[] }).picks ?? []
}

export async function getWorldCupIntegrityReport(
  challengeId: string
): Promise<WorldCupChallengeIntegrityReport> {
  const res = await apiFetch(`/api/brackets/world-cup/${challengeId}/admin/integrity`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Failed to run integrity check")
  }
  return (data as { report: WorldCupChallengeIntegrityReport }).report
}

// ── AI matchup preview ────────────────────────────────────────────────────────

export async function getWorldCupAiMatchupPreview(
  challengeId: string,
  payload: {
    matchId: string
    entryId?: string
    strategy?: WorldCupAiStrategy
  }
): Promise<WorldCupAiMatchupPreview> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/ai/matchup-preview`,
    { method: "POST", body: JSON.stringify(payload) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "AI preview failed")
  return (data as { preview: WorldCupAiMatchupPreview }).preview
}

// ── Status helper ─────────────────────────────────────────────────────────────

export function getEntryStatus(
  entry: Pick<
    WorldCupBracketEntryClient,
    "isLocked" | "isComplete" | "correctPicks" | "totalScore"
  >,
  isChallengeLive?: boolean
): WorldCupEntryStatus {
  if (entry.isLocked && isChallengeLive) return "live"
  if (entry.isLocked) return "locked"
  if (entry.isComplete) return "complete"
  if (entry.correctPicks > 0 || entry.totalScore > 0) return "in_progress"
  return "not_started"
}

// ── Admin sync helpers ────────────────────────────────────────────────────────

export type WorldCupAdminSyncProvider = "mock" | "apifootball" | "sportsdata" | "manual"

export type WorldCupAdminSyncTeamsResult = {
  ok: boolean
  created: number
  updated: number
  skipped: number
  warnings: string[]
  teamCount: number
  syncedAt: string
  dryRun: boolean
}

export type WorldCupAdminSyncFixturesResult = {
  ok: boolean
  created: number
  updated: number
  skipped: number
  warnings: string[]
  lockTimeInferred: string | null
  fixtureCount: number
  syncedAt: string
  dryRun: boolean
}

export type WorldCupAdminSyncLiveResult = {
  ok: boolean
  updated: number
  skipped: number
  finalMatches: number
  recalculated: boolean
  warnings: string[]
  syncedAt: string
  dryRun: boolean
}

export type WorldCupAdminSimulationStrategy = "random" | "higher_seed" | "home" | "away"

export type WorldCupAdminSimulationMatchResult = {
  ok: boolean
  result: {
    challengeId: string
    dryRun: boolean
    updatedMatch: unknown
    advancedMatchIds: string[]
    recalculated: boolean
    leaderboardTop: unknown[]
  }
}

export type WorldCupAdminSimulationRoundResult = {
  ok: boolean
  result: {
    challengeId: string
    round: string
    dryRun: boolean
    strategy: WorldCupAdminSimulationStrategy
    simulatedMatches: number
    skippedMatches: number
    skippedMatchIds: string[]
  }
}

export type WorldCupAdminSimulationTournamentResult = {
  ok: boolean
  result: {
    challengeId: string
    dryRun: boolean
    strategy: WorldCupAdminSimulationStrategy
    rounds: Array<{
      round: string
      simulatedMatches: number
      skippedMatches: number
      skippedMatchIds: string[]
    }>
    champion: {
      winnerTeamId: string | null
      winnerTeamName: string | null
    }
    leaderboardTop: unknown[]
  }
}

export type WorldCupAdminResetSimulationResult = {
  ok: boolean
  result: {
    challengeId: string
    dryRun: boolean
    resetMatches: number
    recalculated: boolean
  }
}

export async function adminSyncWorldCupTeams(opts: {
  provider?: WorldCupAdminSyncProvider
  dryRun?: boolean
}): Promise<WorldCupAdminSyncTeamsResult> {
  const res = await apiFetch("/api/brackets/world-cup/admin/sync-teams", {
    method: "POST",
    body: JSON.stringify(opts),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Sync teams failed")
  return data as WorldCupAdminSyncTeamsResult
}

export async function adminSyncWorldCupFixtures(
  challengeId: string,
  opts: { provider?: WorldCupAdminSyncProvider; dryRun?: boolean }
): Promise<WorldCupAdminSyncFixturesResult> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/admin/sync-fixtures`,
    { method: "POST", body: JSON.stringify(opts) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Sync fixtures failed")
  return data as WorldCupAdminSyncFixturesResult
}

export async function adminSyncWorldCupLive(
  challengeId: string,
  opts: {
    provider?: WorldCupAdminSyncProvider
    dryRun?: boolean
    recalculate?: boolean
  }
): Promise<WorldCupAdminSyncLiveResult> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/admin/sync-live`,
    { method: "POST", body: JSON.stringify(opts) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Sync live failed")
  return data as WorldCupAdminSyncLiveResult
}

export async function adminSimulateWorldCupMatch(
  challengeId: string,
  payload: {
    matchId: string
    winnerTeamId?: string | null
    homeScore?: number | null
    awayScore?: number | null
    elapsedMinute?: number | null
    dryRun?: boolean
    status?: "scheduled" | "live" | "final"
  }
): Promise<WorldCupAdminSimulationMatchResult> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/admin/simulate-match`,
    {
      method: "POST",
      body: JSON.stringify({ ...payload, confirmSimulation: true }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Simulate match failed")
  return data as WorldCupAdminSimulationMatchResult
}

export async function adminSimulateWorldCupRound(
  challengeId: string,
  payload: {
    round: "round_of_32" | "round_of_16" | "quarterfinal" | "semifinal" | "third_place" | "final"
    strategy: WorldCupAdminSimulationStrategy
    dryRun?: boolean
  }
): Promise<WorldCupAdminSimulationRoundResult> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/admin/simulate-round`,
    {
      method: "POST",
      body: JSON.stringify({ ...payload, confirmSimulation: true }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Simulate round failed")
  return data as WorldCupAdminSimulationRoundResult
}

export async function adminSimulateWorldCupTournament(
  challengeId: string,
  payload: {
    strategy: WorldCupAdminSimulationStrategy
    dryRun?: boolean
  }
): Promise<WorldCupAdminSimulationTournamentResult> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/admin/simulate-tournament`,
    {
      method: "POST",
      body: JSON.stringify({ ...payload, confirmSimulation: true }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Simulate tournament failed")
  return data as WorldCupAdminSimulationTournamentResult
}

export async function adminResetWorldCupSimulation(
  challengeId: string,
  payload?: { dryRun?: boolean }
): Promise<WorldCupAdminResetSimulationResult> {
  const res = await apiFetch(
    `/api/brackets/world-cup/${challengeId}/admin/reset-simulation`,
    {
      method: "POST",
      body: JSON.stringify({ ...(payload ?? {}), confirmSimulationReset: true }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Reset simulation failed")
  return data as WorldCupAdminResetSimulationResult
}
