import type { QueueEntry } from '@/lib/live-draft-engine/types'
import { trimDraftQueue } from '@/lib/draft-defaults/DraftQueueLimitResolver'

type RawQueueEntry = QueueEntry & {
  player_name?: string
  player_id?: string | null
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeQueueEntries(
  queue: unknown[],
  queueSizeLimit: number
): QueueEntry[] {
  const normalized = trimDraftQueue(queue, queueSizeLimit).map((e) => {
    const entry = (e ?? {}) as RawQueueEntry
    return {
      playerName: String(entry.playerName ?? entry.player_name ?? '').trim(),
      position: String(entry.position ?? '').trim(),
      team: entry.team ?? null,
      playerId: entry.playerId ?? entry.player_id ?? null,
    }
  })

  return normalized.filter((entry) => entry.playerName.length > 0)
}

export function dedupeQueueEntries(queue: QueueEntry[]): QueueEntry[] {
  const seen = new Set<string>()
  const deduped: QueueEntry[] = []
  for (const entry of queue) {
    const key = `${normalizeName(entry.playerName)}|${String(entry.position ?? '').trim().toUpperCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(entry)
  }
  return deduped
}

export function removeDraftedPlayersFromQueue(
  queue: QueueEntry[],
  draftedNames: Set<string>
): { queue: QueueEntry[]; removedCount: number } {
  const filtered = queue.filter(
    (entry) => !draftedNames.has(normalizeName(entry.playerName))
  )
  return {
    queue: filtered,
    removedCount: Math.max(0, queue.length - filtered.length),
  }
}

export function normalizeDraftedNameSet(picks: Array<{ playerName: string }>): Set<string> {
  return new Set(
    picks
      .map((pick) => normalizeName(String(pick.playerName ?? '')))
      .filter(Boolean)
  )
}
