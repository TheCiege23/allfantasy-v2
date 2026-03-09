import { Worker, Job } from "bullmq"
import { redisConnection } from "@/lib/queues/bullmq"

type SimulationJobData = Record<string, unknown>

let worker: Worker<SimulationJobData> | null = null

if (!redisConnection) {
  console.warn("[simulation-worker] Redis is not configured. Worker disabled.")
} else {
  worker = new Worker<SimulationJobData>(
    "simulations",
    async (job: Job<SimulationJobData>) => {
      console.log("[simulation-worker] processing job", job.id)

      return {
        ok: true,
        jobId: job.id,
        processedAt: new Date().toISOString(),
        input: job.data ?? {},
      }
    },
    {
      connection:
        redisConnection.url
          ? { url: redisConnection.url }
          : {
              host: redisConnection.host!,
              port: redisConnection.port!,
            },
    }
  )

  worker.on("completed", (job) => {
    console.log("[simulation-worker] completed", job.id)
  })

  worker.on("failed", (job, err) => {
    console.error("[simulation-worker] failed", job?.id, err)
  })
}

export { worker }