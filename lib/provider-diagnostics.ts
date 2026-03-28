/**
 * PROMPT 155 — Provider diagnostics (re-export from admin service for use by orchestration).
 * Tracks recent failures, fallback events, latency. Safe only — no secrets.
 */

export {
  recordProviderFailure,
  recordProviderFallback,
  recordProviderLatency,
  recordDegradedModeActivation,
  logDiagnosticsEvent,
  getProviderDiagnostics,
  type ProviderId,
  type ProviderPublicId,
  type ProviderStatusState,
  type ProviderDiagnosticsEntry,
  type RecentFailureSummary,
  type FallbackEventSummary,
  type DegradedModeSummary,
  type ProviderDiagnosticsPayload,
} from '@/lib/admin/provider-status-service'
