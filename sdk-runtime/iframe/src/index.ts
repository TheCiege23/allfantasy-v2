/**
 * Decision OS — Phase 7.9 Widget Runtime Iframe Adapter.
 *
 * A versioned postMessage contract for embedding an AllFantasy intelligence
 * widget via iframe — types, config validation, message builders/validators,
 * origin checks, and sandbox/CSP recommendations. Contract only: no
 * `window.postMessage`, no `window.addEventListener`, no real `<iframe>`
 * element (a future runtime ticket implements the actual bootstrap using
 * these contracts).
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  IframeEmbedConfig,
  MessageDirection,
  ParentToChildMessageType,
  IframeInitPayload,
  IframeVisibilityChangePayload,
  IframeThemeUpdatePayload,
  IframeRefreshRequestPayload,
  IframeDisposePayload,
  ParentToChildPayloadMap,
  ParentToChildMessage,
  ChildToParentMessageType,
  IframeLifecycleState,
  IframeReadyPayload,
  IframeLifecycleChangePayload,
  IframeDegradedPayload,
  IframeErrorPayload,
  IframeInteractionPayload,
  IframeResizePayload,
  ChildToParentPayloadMap,
  ChildToParentMessage,
  IframeMessage,
  MessageValidationResult,
} from './types'
export { IFRAME_PROTOCOL_VERSION } from './types'

// ── Config validation ─────────────────────────────────────────────────────────
export type { IframeEmbedConfigValidationResult } from './config'
export { validateIframeEmbedConfig } from './config'

// ── Protocol: builders + validators ───────────────────────────────────────────
export {
  PARENT_TO_CHILD_MESSAGE_TYPES,
  CHILD_TO_PARENT_MESSAGE_TYPES,
  isValidNonceFormat,
  buildInitPayloadFromSdkConfig,
  buildParentToChildMessage,
  buildChildToParentMessage,
  validateParentToChildMessage,
  validateChildToParentMessage,
} from './protocol'

// ── Origin validation ──────────────────────────────────────────────────────────
export type { OriginValidationResult } from './origin'
export {
  isValidOriginFormat,
  validateOriginFormat,
  isOriginAllowed,
  assertExplicitTargetOrigin,
} from './origin'

// ── Sandbox / CSP ──────────────────────────────────────────────────────────────
export type { SandboxValidationResult } from './security'
export {
  IFRAME_SANDBOX_TOKENS,
  IFRAME_SANDBOX_ATTRIBUTE,
  IFRAME_FORBIDDEN_SANDBOX_PAIR,
  containsForbiddenSandboxCombination,
  validateSandboxTokens,
  buildCspFrameAncestors,
} from './security'

// ── Lifecycle / error mapping ─────────────────────────────────────────────────
export { mapLifecycleToIframeState, mapErrorToIframePayload } from './lifecycleMapping'
