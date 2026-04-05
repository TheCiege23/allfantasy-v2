import "server-only"

import { Queue } from "bullmq"
import { getRedisConnection, isRedisConfigured } from "@/lib/queues/bullmq"
import { QUEUE_NAMES } from "@/lib/jobs/types"
import type { IntegrityJobPayload } from "@/lib/jobs/types"

/**
 * Queue a post-trade collusion scan (delayed so the trade row is fully committed).
 * PRIVACY: job only carries trade ids and roster ids — no chat payloads.
 */
export async function enqueueCollusionScan(
  leagueId: string,
  tradeTransactionId: string,
  tradingRosterIds: string[]
): Promise<void> {
  if (!isRedisConfigured()) return
  const connection = getRedisConnection()
  if (!connection) return

  const queue = new Queue<IntegrityJobPayload>(QUEUE_NAMES.INTEGRITY, { connection })
  await queue.add(
    "collusion_scan_trade",
    {
      type: "collusion_scan_trade",
      leagueId,
      tradeTransactionId,
      tradingRosterIds,
    },
    {
      delay: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
    }
  )
}
