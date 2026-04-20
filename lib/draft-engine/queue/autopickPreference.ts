/**
 * Autopick preference: queue-first vs pure BPA — runtime uses DraftWorker + queue APIs.
 */

export type AutopickMode = 'queue_first' | 'best_available' | 'adp_only'

export function resolveAutopickMode(flags: {
  autoPickFromQueue: boolean
  cpuAutoPick: boolean
}): AutopickMode {
  if (flags.autoPickFromQueue) return 'queue_first'
  if (flags.cpuAutoPick) return 'best_available'
  return 'adp_only'
}
