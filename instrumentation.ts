/**
 * PROMPT 151 — Startup: log provider config status (safe, no secrets).
 * Runs when Next.js server boots. Enable with experimental.instrumentationHook in next.config.js.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { logProviderStatus } = await import("./lib/provider-config");
    logProviderStatus();
  } catch {
    // Non-fatal; do not block startup
  }
  try {
    const { initSentryServer } = await import("./lib/error-tracking");
    initSentryServer();
  } catch {
    // Optional; do not block startup
  }
}
