/**
 * Post-draft artifacts after DraftSession is marked completed: roster materialization + persisted grades.
 * Kept separate from DraftSessionService to avoid circular imports with ranking/draft-grade code.
 */

import { prisma } from '@/lib/prisma'

const POST_DRAFT_ARTIFACT_STABLE_THROTTLE_MS = 60_000
const MAX_THROTTLE_KEYS = 200

const postDraftArtifactThrottleGlobal = globalThis as typeof globalThis & {
  __afPostDraftArtifactOkAt?: Map<string, number>
}

const postDraftArtifactOkAt =
  postDraftArtifactThrottleGlobal.__afPostDraftArtifactOkAt ??
  (postDraftArtifactThrottleGlobal.__afPostDraftArtifactOkAt = new Map<string, number>())

function prunePostDraftArtifactThrottle() {
  if (postDraftArtifactOkAt.size <= MAX_THROTTLE_KEYS) return
  const entries = [...postDraftArtifactOkAt.entries()].sort((a, b) => a[1] - b[1])
  for (let i = 0; i < postDraftArtifactOkAt.size - MAX_THROTTLE_KEYS; i += 1) {
    postDraftArtifactOkAt.delete(entries[i]![0])
  }
}

/**
 * Apply finalized draft picks to league rosters and persist draft grades from the completed session snapshot.
 * Idempotent: safe to call multiple times (roster merge rules + grade upserts).
 * Grades must not fail silently — callers log; live polls use {@link syncPostDraftArtifactsIfCompletedThrottled} to retry.
 */
export async function runPostDraftFinalizationArtifacts(leagueId: string): Promise<void> {
  const { finalizeRosterAssignments } = await import('@/lib/live-draft-engine/RosterAssignmentService')
  await finalizeRosterAssignments(leagueId)
  const { computeAndPersistDraftRankings } = await import('@/lib/post-draft-manager-ranking')
  await computeAndPersistDraftRankings(leagueId)
}

/**
 * After completion: (re)materialize rosters + grades from the persisted draft board.
 * Throttled on success to avoid redundant work on every poll; on failure the throttle entry is cleared so the next request retries.
 */
export async function syncPostDraftArtifactsIfCompletedThrottled(leagueId: string): Promise<void> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: { status: true },
  })
  if (session?.status !== 'completed') return

  const now = Date.now()
  const lastOk = postDraftArtifactOkAt.get(leagueId)
  if (lastOk != null && now - lastOk < POST_DRAFT_ARTIFACT_STABLE_THROTTLE_MS) {
    return
  }

  try {
    await runPostDraftFinalizationArtifacts(leagueId)
    postDraftArtifactOkAt.set(leagueId, Date.now())
    prunePostDraftArtifactThrottle()
  } catch (err) {
    postDraftArtifactOkAt.delete(leagueId)
    console.error('[syncPostDraftArtifactsIfCompletedThrottled] failed', {
      leagueId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Self-heal: all picks exist but session still `in_progress` / `paused` (e.g. completion step failed mid-flight).
 * Calls `completeDraftSession` which is idempotent when already completed.
 */
export async function repairDraftCompletionIfBoardFull(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: { id: true, status: true, rounds: true, teamCount: true },
  })
  if (!session || session.status === 'completed') return false
  const totalPicks = session.rounds * session.teamCount
  const count = await prisma.draftPick.count({ where: { sessionId: session.id } })
  if (count < totalPicks) return false

  const { completeDraftSession } = await import('@/lib/live-draft-engine/DraftSessionService')
  return completeDraftSession(leagueId)
}
