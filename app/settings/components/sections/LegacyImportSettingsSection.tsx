"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import {
  refreshLegacyImportStatus,
  LEGACY_PROVIDER_IDS,
  getLegacyProviderName,
  getImportStatusLabel,
  getProviderStatus,
  getLegacyProviderPrimaryAction,
  getLegacyProviderHelpHref,
  isImportStatusActive,
  type LegacyImportStatusResponse,
} from "@/lib/legacy-import-settings"
import { EmptyStateRenderer } from "@/components/ui-states"
import { resolveNoResultsState } from "@/lib/ui-state"
import { formatInTimezone } from "@/lib/preferences/TimezoneFormattingResolver"

export function LegacyImportSettingsSection() {
  const [legacyStatus, setLegacyStatus] = useState<LegacyImportStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const loadLegacyStatus = async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await refreshLegacyImportStatus()
      setLegacyStatus(data)
      setLastUpdatedAt(new Date())
    } catch {
      setError("Could not load import status right now.")
    } finally {
      if (asRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    void loadLegacyStatus()
  }, [])

  useEffect(() => {
    const onFocus = () => {
      void loadLegacyStatus(true)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus)
      return () => window.removeEventListener("focus", onFocus)
    }
  }, [])

  const hasActiveImport = LEGACY_PROVIDER_IDS.some((providerId) => {
    const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
    return isImportStatusActive(status?.importStatus ?? null)
  })
  const hasLinkedProvider = LEGACY_PROVIDER_IDS.some((providerId) => {
    const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
    return Boolean(status?.linked)
  })
  const hasCompletedImport = LEGACY_PROVIDER_IDS.some((providerId) => {
    const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
    return status?.importStatus === "completed"
  })

  useEffect(() => {
    if (!hasActiveImport) return
    const timer = window.setInterval(() => {
      void loadLegacyStatus(true)
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [hasActiveImport])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Legacy Import</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Import your fantasy history for AllFantasy Legacy. Supported sports: {SUPPORTED_SPORTS.join(", ")}.
        </p>
      </div>
      <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--muted)" }}>
        <p className="font-medium" style={{ color: "var(--text)" }}>Rankings &amp; level</p>
        <p className="mt-1">
          Legacy import affects your rankings and level progression. If you don&apos;t import history, you start from scratch (level 1). Import from a connected provider to bring in your league history.
        </p>
      </div>
      {error && (
        <p className="text-sm" style={{ color: "var(--accent-red-strong)" }}>
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading import status…</p>
      ) : (
        <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium" style={{ color: "var(--muted2)" }}>Import providers</p>
            <button
              type="button"
              onClick={() => void loadLegacyStatus(true)}
              disabled={refreshing}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {refreshing ? "Refreshing…" : "Refresh status"}
            </button>
          </div>
          {lastUpdatedAt && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Last updated: {formatInTimezone(lastUpdatedAt, undefined, undefined, "en")}
            </p>
          )}
          <ul className="space-y-4">
            {LEGACY_PROVIDER_IDS.map((providerId) => {
              const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
              const isSleeper = providerId === "sleeper"
              const name = getLegacyProviderName(providerId)
              const linked = status?.linked ?? false
              const importStatusLabel = status?.importStatus ? getImportStatusLabel(status.importStatus) : "—"
              const available = status?.available ?? false
              const primaryAction = getLegacyProviderPrimaryAction({ providerId, status })
              const helpHref = getLegacyProviderHelpHref(providerId)
              const showReconnect = isSleeper && linked

              return (
                <li key={providerId} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {available ? (linked ? `Linked · Import: ${importStatusLabel}` : "Not connected") : "Coming soon"}
                    </p>
                    {status?.error && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--accent-red-strong)" }}>{status.error}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {primaryAction ? (
                      <Link
                        href={primaryAction.href}
                        className="rounded-lg border px-3 py-2 text-sm font-medium"
                        style={{ borderColor: primaryAction.label.includes("Retry") ? "var(--accent-red)" : "var(--accent-cyan)", color: "var(--text)" }}
                      >
                        {primaryAction.label}
                      </Link>
                    ) : (
                      !available && <span className="text-xs" style={{ color: "var(--muted)" }}>Coming soon</span>
                    )}
                    {showReconnect && (
                      <Link
                        href="/dashboard"
                        className="rounded-lg border px-3 py-2 text-sm font-medium"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        Reconnect
                      </Link>
                    )}
                    <Link
                      href={helpHref}
                      className="rounded-lg border px-3 py-2 text-sm font-medium"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      Help
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
          {hasActiveImport && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Active import detected. This tab refreshes automatically every 15 seconds.
            </p>
          )}
          {!hasActiveImport && !hasLinkedProvider && !hasCompletedImport ? (
            <EmptyStateRenderer
              compact
              title={resolveNoResultsState({ context: "legacy_import" }).title}
              description={resolveNoResultsState({ context: "legacy_import" }).description}
              actions={resolveNoResultsState({ context: "legacy_import" }).actions.map((action) => ({
                id: action.id,
                label: action.label,
                href: action.href,
              }))}
              testId="legacy-import-empty-state"
            />
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/af-legacy"
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Open Legacy app
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Dashboard (link Sleeper)
        </Link>
        <Link
          href="/import"
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Import instructions
        </Link>
      </div>
    </div>
  )
}
