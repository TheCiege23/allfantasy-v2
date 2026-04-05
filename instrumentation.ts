/**
 * PROMPT 151 — Startup: log provider config status (safe, no secrets).
 * Runs when Next.js server boots. Enable with experimental.instrumentationHook in next.config.js.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { logProviderStatus, logProviderStartupValidation } = await import("./lib/provider-config");
    logProviderStatus();
    logProviderStartupValidation();
  } catch {
    // Non-fatal; do not block startup
  }
  try {
    const { initSentryServer } = await import("./lib/error-tracking");
    initSentryServer();
  } catch {
    // Optional; do not block startup
  }
  // BullMQ workers (including integrity) normally run via `scripts/start-worker.ts`.
  // Set START_INTEGRITY_WORKER_WITH_NEXT=1 only on a dedicated Node host — not on Vercel serverless.
  try {
    if (process.env.START_INTEGRITY_WORKER_WITH_NEXT === "1") {
      const { startIntegrityWorker } = await import("./lib/workers/integrity-worker");
      startIntegrityWorker();
    }
  } catch {
    // Non-fatal
  }
  // Same pattern as integrity: only on a dedicated Node worker host (not Vercel serverless).
  try {
    if (process.env.START_AUTOCOACH_STATUS_WORKER_WITH_NEXT === "1") {
      const { startAutoCoachStatusWorker } = await import("./lib/workers/autocoach-status-worker");
      startAutoCoachStatusWorker();
    }
  } catch {
    // Non-fatal
  }
}
