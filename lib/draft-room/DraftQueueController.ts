/**
 * DraftQueueController — queue add/remove/reorder logic for draft room.
 * Complements useDraftQueue (DraftTab) and inline queue state in DraftRoom (mock draft).
 */

export type QueuePlayer = {
  name: string
  position: string
  team?: string | null
}

/**
 * Check if a player can be added (not already in queue, by name).
 */
export function canAddToQueue(
  queue: QueuePlayer[],
  player: QueuePlayer
): boolean {
  return !queue.some((q) => q.name === player.name)
}

/**
 * Add player to queue; returns new array or same if duplicate.
 */
export function addToQueue(
  queue: QueuePlayer[],
  player: QueuePlayer
): QueuePlayer[] {
  if (queue.some((q) => q.name === player.name)) return queue
  return [...queue, player]
}

/**
 * Remove item at index.
 */
export function removeFromQueue(
  queue: QueuePlayer[],
  index: number
): QueuePlayer[] {
  if (index < 0 || index >= queue.length) return queue
  return queue.filter((_, i) => i !== index)
}

/**
 * Move item from one index to another.
 */
export function reorderQueue(
  queue: QueuePlayer[],
  fromIndex: number,
  toIndex: number
): QueuePlayer[] {
  if (fromIndex < 0 || fromIndex >= queue.length) return queue
  if (toIndex < 0 || toIndex >= queue.length) return queue
  const next = [...queue]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

/**
 * Get next queued player that is still available (not in drafted set).
 */
export function getNextQueuedAvailable(
  queue: QueuePlayer[],
  draftedNames: Set<string>
): QueuePlayer | null {
  return queue.find((p) => !draftedNames.has(p.name)) ?? null
}
