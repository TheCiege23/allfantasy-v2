export type QueueName =
  | 'events'
  | 'scoring'
  | 'schedule'
  | 'draft'
  | 'waiver'
  | 'trade'
  | 'notifications'
  | 'ai'
  | 'imports'
  | 'payments'

export interface JobDefinition {
  queue: QueueName
  name: string
  retryLimit: number
  backoffMs: number
}

export const jobTopology: JobDefinition[] = [
  { queue: 'events', name: 'outbox.publish', retryLimit: 10, backoffMs: 1000 },
  { queue: 'scoring', name: 'scores.recalculate', retryLimit: 5, backoffMs: 2000 },
  { queue: 'schedule', name: 'matchups.generate', retryLimit: 5, backoffMs: 2000 },
  { queue: 'draft', name: 'draft.timer.tick', retryLimit: 20, backoffMs: 500 },
  { queue: 'waiver', name: 'waiver.run.process', retryLimit: 6, backoffMs: 2000 },
  { queue: 'trade', name: 'trade.review.expire', retryLimit: 6, backoffMs: 2000 },
  { queue: 'notifications', name: 'notification.dispatch', retryLimit: 8, backoffMs: 1000 },
  { queue: 'ai', name: 'chimmy.task.run', retryLimit: 4, backoffMs: 3000 },
  { queue: 'imports', name: 'import.provider.sync', retryLimit: 8, backoffMs: 5000 },
  { queue: 'payments', name: 'ledger.reconcile', retryLimit: 12, backoffMs: 3000 }
]
