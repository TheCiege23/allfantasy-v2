import "server-only";
import { Worker, Job, type ConnectionOptions } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "@/lib/queues/bullmq";

type SimulationJobData = Record<string, unknown>;
type SimulationJobResult = {
  ok: true;
  jobId: string | undefined;
  processedAt: string;
  input: SimulationJobData;
};

let simulationWorker: Worker<SimulationJobData, SimulationJobResult> | null = null;

function getWorkerConnection(): ConnectionOptions {
  const connection = getRedisConnection();

  if (!connection) {
    throw new Error(
      "Redis is not configured. Simulation worker cannot start without REDIS_URL or REDIS_HOST/REDIS_PORT."
    );
  }

  return connection;
}

async function processSimulationJob(
  job: Job<SimulationJobData>
): Promise<SimulationJobResult> {
  console.log("[simulation-worker] processing job", job.id);

  return {
    ok: true,
    jobId: job.id,
    processedAt: new Date().toISOString(),
    input: job.data ?? {},
  };
}

export function startSimulationWorker(): Worker<
  SimulationJobData,
  SimulationJobResult
> | null {
  if (!isRedisConfigured()) {
    console.warn("[simulation-worker] Redis is not configured. Worker disabled.");
    return null;
  }

  if (simulationWorker) {
    return simulationWorker;
  }

  simulationWorker = new Worker<SimulationJobData, SimulationJobResult>(
    "simulations",
    processSimulationJob,
    {
      connection: getWorkerConnection(),
      concurrency: 5,
    }
  );

  simulationWorker.on("completed", (job) => {
    console.log("[simulation-worker] completed", job.id);
  });

  simulationWorker.on("failed", (job, error) => {
    console.error("[simulation-worker] failed", job?.id, error);
  });

  simulationWorker.on("error", (error) => {
    console.error("[simulation-worker] worker error", error);
  });

  return simulationWorker;
}

export async function stopSimulationWorker(): Promise<void> {
  if (!simulationWorker) {
    return;
  }

  await simulationWorker.close();
  simulationWorker = null;
}

export function getSimulationWorker(): Worker<
  SimulationJobData,
  SimulationJobResult
> | null {
  return simulationWorker;
}