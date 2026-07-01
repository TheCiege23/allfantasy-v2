'use client'

/**
 * Decision OS — Phase 7.16 Web Component Adapter: `<allfantasy-widget>`.
 *
 * The custom element itself. Composes `sdk-runtime/react` (Phase 7.8) —
 * `useAllFantasyWidget` + `WidgetRenderBoundary` — the same way
 * `sdk-runtime/iframe/src/reactChild` (Phase 7.15) composed it for the
 * iframe embed target. This is the SAME category of sanctioned exception to
 * "adapters never depend on other adapters"
 * (PHASE_7_5_WIDGET_RUNTIME_BOUNDARY_ADR.md decision D2): neither the react
 * adapter nor this one is modified to know about the other's SIBLING
 * adapters (this file never imports `sdk-runtime/iframe`, proven by the
 * import-boundary test's positive control) — only this composition layer
 * imports `sdk-runtime/react` directly, reusing its already-tested
 * fetch/lifecycle/render logic instead of reimplementing it in vanilla DOM.
 * Computes NOTHING: every score/badge/recommendation rendered comes from
 * `WidgetRenderBoundary`, which already renders pre-resolved wire data only.
 *
 * Security model (matches the ADR's web_component row): closed Shadow DOM
 * by default (`shadowMount.ts`) + credential held in a module-private
 * WeakMap (`credentials.ts`), never an attribute, never postMessage'd
 * (this target has no iframe boundary to cross — host communication uses
 * native `CustomEvent`s instead, and every event payload below is built
 * from `SDKError`'s own fields, which are structurally credential-free).
 */

import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { useAllFantasyWidget, WidgetRenderBoundary } from '../../react/src/index'
import type { UseAllFantasyWidgetResult } from '../../react/src/index'
import { buildSDKError } from '../../../lib/decision-os/sdk/errors'
import type { WidgetConfig } from '../../../lib/decision-os/presentation/widget-contracts'
import type { SDKAuth, SDKError } from '../../../lib/decision-os/sdk/types'
import type { RuntimeClock, RuntimeFetch } from '../../core/src/index'
import { OBSERVED_ATTRIBUTES, parseElementAttributes } from './attributes'
import { buildWidgetConfigFromAttributes, validateElementConfig } from './config'
import { attachShadowMountRoot, mountShadowContainer, unmountShadowContainer } from './shadowMount'
import type { WidgetShadowMode } from './shadowMount'
import { getElementCredentials, setElementCredentials } from './credentials'
import { defaultClock, defaultFetchImpl } from './defaults'

// ── Inner React content ───────────────────────────────────────────────────────

interface ElementWidgetContentProps {
  config: WidgetConfig
  auth: SDKAuth
  baseUrl: string
  fetchImpl: RuntimeFetch
  clock: RuntimeClock
  themeMode: string
  onStateChange: (result: UseAllFantasyWidgetResult) => void
}

function ElementWidgetContent({
  config,
  auth,
  baseUrl,
  fetchImpl,
  clock,
  themeMode,
  onStateChange,
}: ElementWidgetContentProps) {
  const result = useAllFantasyWidget({ config, auth, baseUrl, fetchImpl, clock })

  useEffect(() => {
    onStateChange(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onStateChange is a stable per-render-cycle callback from the host class
  }, [result.renderState, result.data, result.degraded, result.error])

  return (
    <div data-theme-mode={themeMode}>
      <WidgetRenderBoundary result={result} />
    </div>
  )
}

function ConfigErrorFallback({ errors }: { errors: string[] }) {
  return (
    <div
      data-widget-state="error"
      style={{
        fontFamily: 'system-ui, sans-serif',
        color: '#e2e8f0',
        background: 'rgba(15,23,42,0.9)',
        borderRadius: 12,
        padding: 16,
        maxWidth: 360,
      }}
    >
      <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>Widget configuration is invalid.</p>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, opacity: 0.7 }}>
        {errors.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  )
}

// ── Custom element ────────────────────────────────────────────────────────────

export class AllFantasyWidgetElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRIBUTES]
  }

  /** Injectable for tests; defaults to real `fetch` when unset. Set before connecting to take effect on the first render. */
  fetchImpl: RuntimeFetch | null = null
  /** Injectable for tests; defaults to real timers when unset. Set before connecting to take effect on the first render. */
  clock: RuntimeClock | null = null
  /**
   * 'open' only for test harnesses that need to inspect rendered content —
   * production hosts should never set this. Must be set before the element
   * is first connected; `attachShadow()`'s mode cannot change afterward.
   */
  shadowMode: WidgetShadowMode = 'closed'

  #connected = false
  #shadowRoot: ShadowRoot | null = null
  #container: HTMLElement | null = null
  #root: Root | null = null
  #refreshFn: (() => Promise<void>) | null = null
  #lastRenderState: string | null = null
  #configErrors: readonly string[] = []

  /**
   * Sets the fetch credential (Phase 7.4 SDKAuth) and widget-contract
   * apiKey (Phase 7.3 WidgetTenantConfig.apiKey) atomically. Never an
   * attribute — stored in credentials.ts's module-private WeakMap. Safe to
   * call before OR after the element connects; calling it while connected
   * triggers an immediate re-render with the new credentials.
   */
  setCredentials(auth: SDKAuth, apiKey: string): void {
    setElementCredentials(this, { auth, apiKey })
    if (this.#connected && this.#root) {
      this.#renderCurrentConfig()
    }
  }

  get auth(): SDKAuth | null {
    return getElementCredentials(this)?.auth ?? null
  }

  get apiKey(): string | null {
    return getElementCredentials(this)?.apiKey ?? null
  }

  /** Collapsed render-facing state (Phase 7.8's WidgetRenderState), or null before the first render. Read-only host/test introspection. */
  get widgetRenderState(): string | null {
    return this.#lastRenderState
  }

  /** Attribute/config-layer validation errors from the most recent render attempt (empty when config is valid). */
  get configErrors(): readonly string[] {
    return this.#configErrors
  }

  connectedCallback(): void {
    this.#connected = true
    if (!this.#shadowRoot) {
      this.#shadowRoot = attachShadowMountRoot(this, this.shadowMode)
    }
    this.#container = mountShadowContainer(this.#shadowRoot)
    this.#root = createRoot(this.#container)
    this.#renderCurrentConfig()
  }

  disconnectedCallback(): void {
    this.#connected = false
    if (this.#root) {
      this.#root.unmount()
      this.#root = null
    }
    if (this.#shadowRoot) {
      unmountShadowContainer(this.#shadowRoot)
    }
    this.#container = null
    this.#refreshFn = null
    this.#lastRenderState = null
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (!this.#connected) return
    if (oldValue === newValue) return
    this.#renderCurrentConfig()
  }

  /** Manual refresh — delegates to the underlying RefreshEngine via the React hook's `refresh()`. No-op before the first successful render. */
  refresh(): Promise<void> {
    return this.#refreshFn ? this.#refreshFn() : Promise.resolve()
  }

  #renderCurrentConfig(): void {
    if (!this.#root) return

    const attributeResult = parseElementAttributes((name) => this.getAttribute(name))
    if (!attributeResult.ok) {
      this.#renderConfigError(attributeResult.errors)
      return
    }

    const credentials = getElementCredentials(this)
    if (!credentials) {
      this.#renderConfigError(['setCredentials(auth, apiKey) must be called before the widget can render'])
      return
    }

    const config = buildWidgetConfigFromAttributes(attributeResult.parsed, credentials.apiKey)
    const validation = validateElementConfig(config, credentials.auth)
    if (!validation.valid) {
      this.#renderConfigError(validation.errors)
      return
    }

    this.#configErrors = []
    const fetchImpl = this.fetchImpl ?? defaultFetchImpl
    const clock = this.clock ?? defaultClock

    this.#root.render(
      <ElementWidgetContent
        config={config}
        auth={credentials.auth}
        baseUrl={attributeResult.parsed.baseUrl}
        fetchImpl={fetchImpl}
        clock={clock}
        themeMode={attributeResult.parsed.themeMode}
        onStateChange={(result) => this.#handleStateChange(result)}
      />,
    )
  }

  #renderConfigError(errors: string[]): void {
    this.#configErrors = errors
    this.#refreshFn = null
    this.#lastRenderState = 'error'
    if (this.#root) {
      this.#root.render(<ConfigErrorFallback errors={errors} />)
    }
    this.#dispatchErrorEvent(buildSDKError('UNSUPPORTED_WIDGET'))
  }

  #handleStateChange(result: UseAllFantasyWidgetResult): void {
    this.#refreshFn = result.refresh
    if (result.renderState === this.#lastRenderState) return
    this.#lastRenderState = result.renderState

    if (result.renderState === 'ready') {
      this.dispatchEvent(new CustomEvent('af-widget-ready'))
      if (result.degraded) {
        this.dispatchEvent(new CustomEvent('af-widget-degraded'))
      }
    } else if (result.renderState === 'error' || result.renderState === 'offline' || result.renderState === 'rate_limited') {
      if (result.error) this.#dispatchErrorEvent(result.error)
    }
  }

  #dispatchErrorEvent(error: SDKError): void {
    this.dispatchEvent(
      new CustomEvent('af-widget-error', {
        detail: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          widgetId: error.widgetId,
          timestamp: error.timestamp,
        },
      }),
    )
  }
}
