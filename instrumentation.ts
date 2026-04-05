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
  // Do not import BullMQ workers here — webpack bundles instrumentation.ts and would pull
  // bullmq/ioredis (Node-only: path, child_process, …) into the build and fail.
  // Run workers via `scripts/start-worker.ts` or a dedicated Node process:
  //   START_INTEGRITY_WORKER_WITH_NEXT / START_AUTOCOACH_STATUS_WORKER_WITH_NEXT
  // are honored only when the worker entrypoint is used, not from Next instrumentation.
}
