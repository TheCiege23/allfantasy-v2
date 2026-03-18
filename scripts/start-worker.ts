import { startSimulationWorker, stopSimulationWorker } from "../lib/workers/simulation-worker"
import { startNotificationWorker, stopNotificationWorker } from "../lib/workers/notification-worker"
import { startAiWorker, stopAiWorker } from "../lib/workers/ai-worker"

console.log("[Worker] Starting background job workers (simulations, notifications, ai)...")

startSimulationWorker()
startNotificationWorker()
startAiWorker()

async function shutdown() {
  console.log("[Worker] Shutting down...")
  await Promise.all([
    stopSimulationWorker(),
    stopNotificationWorker(),
    stopAiWorker(),
  ])
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
