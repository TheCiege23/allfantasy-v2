/**
 * Decision OS — Phase 7.4 Widget SDK & Embed Specification.
 *
 * The platform-agnostic runtime contract every future SDK implements.
 * Consumes ONLY the Presentation API (Phase 7.2) via the Widget Contract
 * (Phase 7.3). No rendering, no network calls, no React.
 *
 * Architecture: Presentation API → IPM → Widget Contract → SDK (this module)
 *               → Platform SDK Runtime (Phase 7.5+) → Partner Website/App
 */

// ── Version ───────────────────────────────────────────────────────────────────
export { SDK_VERSION } from './types'

// ── All types ─────────────────────────────────────────────────────────────────
export type {
  SDKVersion,
  SDKSupportedLocale,
  SDKLocale,
  SDKThemeMode,
  SDKThemeTokens,
  SDKTheme,
  SDKAuthMethod,
  SDKAuth,
  SDKEmbedTarget,
  SDKEmbedCapabilities,
  SDKRefreshTrigger,
  SDKRefreshStrategyConfig,
  SDKCapabilities,
  SDKLifecycleState,
  SDKConfig,
  SDKWidgetInstance,
  SDKTelemetryEventType,
  SDKEvent,
  SDKTelemetry,
  SDKErrorCode,
  SDKError,
  SDKCallbacks,
  SDKExtensionPoint,
  SDKLicenseTier,
  SDKEnterpriseExtension,
} from './types'

// ── Lifecycle ─────────────────────────────────────────────────────────────────
export {
  LIFECYCLE_TRANSITIONS,
  ALL_LIFECYCLE_STATES,
  TERMINAL_LIFECYCLE_STATES,
  isValidLifecycleTransition,
  nextLifecycleStates,
  isTerminalLifecycleState,
  validateLifecycleSequence,
} from './lifecycle'

// ── Theme ─────────────────────────────────────────────────────────────────────
export {
  VALID_THEME_MODES,
  resolveSDKTheme,
  validateSDKTheme,
} from './theme'

// ── Auth ──────────────────────────────────────────────────────────────────────
export {
  AUTH_METHOD_REQUIREMENTS,
  ALL_AUTH_METHODS,
  validateSDKAuth,
  isPublicAuthMethod,
} from './auth'
export type { SDKAuthValidationResult } from './auth'

// ── Embed ─────────────────────────────────────────────────────────────────────
export {
  EMBED_CAPABILITIES,
  ALL_EMBED_TARGETS,
  getEmbedCapabilities,
  isFullyIsolatedEmbed,
} from './embed'

// ── Events ────────────────────────────────────────────────────────────────────
export {
  ALL_SDK_EVENT_TYPES,
  obfuscateTenantIdForTelemetry,
  buildSDKEvent,
  validateEventSequence,
} from './events'
export type { EventSequenceValidationResult } from './events'

// ── Errors ────────────────────────────────────────────────────────────────────
export {
  SDK_ERROR_SPECS,
  ALL_SDK_ERROR_CODES,
  buildSDKError,
  isRetryableErrorCode,
} from './errors'

// ── Refresh ───────────────────────────────────────────────────────────────────
export {
  REFRESH_DEFAULTS,
  ALL_REFRESH_TRIGGERS,
  resolveRefreshStrategy,
  validateRefreshStrategy,
} from './refresh'
export type { RefreshValidationResult } from './refresh'

// ── Privacy ───────────────────────────────────────────────────────────────────
export {
  INTERNAL_FIELD_DENYLIST,
  INTERNAL_TERMINOLOGY_DENYLIST,
  stripInternalFields,
  findInternalLeakage,
  hasInternalLeakage,
} from './privacy'

// ── Config + enterprise extensions ────────────────────────────────────────────
export {
  validateSDKConfig,
  EXTENSION_POINT_MIN_TIER,
  isExtensionPointAllowed,
  buildEnterpriseExtension,
} from './config'
export type { SDKConfigValidationResult } from './config'
