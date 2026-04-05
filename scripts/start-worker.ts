import { startSimulationWorker, stopSimulationWorker } from "../lib/workers/simulation-worker"
import { startNotificationWorker, stopNotificationWorker } from "../lib/workers/notification-worker"
import { startAiWorker, stopAiWorker } from "../lib/workers/ai-worker"
import { startDevyWorker, stopDevyWorker } from "../lib/workers/devy-worker"
import { startPowerRankingsWorker, stopPowerRankingsWorker } from "../lib/workers/power-rankings-worker"
import { startIntegrityWorker, stopIntegrityWorker } from "../lib/workers/integrity-worker"

console.log("[Worker] Starting background job workers (simulations, notifications, ai, devy, power-rankings, integrity)...")

startSimulationWorker()
startNotificationWorker()
startAiWorker()
startDevyWorker()
startPowerRankingsWorker()
startIntegrityWorker()

async function shutdown() {
  console.log("[Worker] Shutting down...")
  await Promise.all([
    stopSimulationWorker(),
    stopNotificationWorker(),
    stopAiWorker(),
    stopDevyWorker(),
    stopPowerRankingsWorker(),
    stopIntegrityWorker(),
  ])
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
