"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle, RefreshCw, XCircle } from "lucide-react"

type PlatformHealth = {
  platform: string
  providerId: string | null
  adapterAvailable: boolean
  configured: boolean
  requiredEnvKeys: string[]
  connectedTargets: number
  autoPostEnabledTargets: number
  pendingCount: number
  successLast24h: number
  failedLast24h: number
  providerUnavailableLast24h: number
  lastStatus: string | null
  lastPublishAt: string | null
  latestResponseMetadata: Record<string, unknown> | null
  latestErrorSummary: string | null
}

type SocialPublishHealthPayload = {
  generatedAt: string
  platforms: PlatformHealth[]
}

function badge(status: "healthy" | "warning" | "error", text: string) {
  if (status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
        <CheckCircle className="h-3 w-3" />
        {text}
      </span>
    )
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
        <AlertTriangle className="h-3 w-3" />
        {text}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
      <XCircle className="h-3 w-3" />
      {text}
    </span>
  )
}

export default function AdminSocialPublishStatusPanel() {
  const [payload, setPayload] = useState<SocialPublishHealthPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/system/social-publish-health", {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to load social publish health")
      setPayload({
        generatedAt: String(data.generatedAt ?? new Date().toISOString()),
        platforms: Array.isArray(data.platforms) ? (data.platforms as PlatformHealth[]) : [],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const togglePlatformDetails = (platform: string) => {
    setExpandedPlatforms((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }))
  }

  return (
    <section
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)" }}
      data-testid="admin-social-publish-status-panel"
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Social publish provider health
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Per-platform adapter + configuration + publish throughput (24h)
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="h-9 px-3 rounded-lg border flex items-center gap-2 text-xs font-medium hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="p-4 text-sm text-red-300">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                <th className="px-3 py-2 text-left uppercase" style={{ color: "var(--muted)" }}>Platform</th>
                <th className="px-3 py-2 text-left uppercase" style={{ color: "var(--muted)" }}>Adapter</th>
                <th className="px-3 py-2 text-left uppercase" style={{ color: "var(--muted)" }}>Configured</th>
                <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>Connected</th>
                <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>Auto-post</th>
                <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>Success 24h</th>
                <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>Failed 24h</th>
                <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>Pending</th>
                <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>Latest Log</th>
              </tr>
            </thead>
            <tbody>
              {(payload?.platforms ?? []).map((platform) => {
                const configState = platform.configured
                  ? badge("healthy", "Configured")
                  : badge("warning", "Missing env")
                const adapterState = platform.adapterAvailable
                  ? badge("healthy", platform.providerId ?? "Adapter")
                  : badge("error", "No adapter")
                const isExpanded = !!expandedPlatforms[platform.platform]
                return (
                  <Fragment key={platform.platform}>
                    <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2 capitalize" style={{ color: "var(--text)" }}>
                        {platform.platform}
                      </td>
                      <td className="px-3 py-2">{adapterState}</td>
                      <td className="px-3 py-2">{configState}</td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--text)" }}>
                        {platform.connectedTargets}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--text)" }}>
                        {platform.autoPostEnabledTargets}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-300">
                        {platform.successLast24h}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-300">
                        {platform.failedLast24h + platform.providerUnavailableLast24h}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--muted)" }}>
                        {platform.pendingCount}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => togglePlatformDetails(platform.platform)}
                          className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10"
                          data-testid={`admin-social-publish-log-toggle-${platform.platform}`}
                        >
                          {isExpanded ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td colSpan={9} className="px-3 py-3" style={{ background: "color-mix(in srgb, var(--text) 2%, transparent)" }}>
                          <div className="space-y-2">
                            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                              Last status:{" "}
                              <span style={{ color: "var(--text)" }}>{platform.lastStatus ?? "none"}</span>
                              {" · "}
                              Last publish:{" "}
                              <span style={{ color: "var(--text)" }}>
                                {platform.lastPublishAt ? new Date(platform.lastPublishAt).toLocaleString() : "never"}
                              </span>
                            </p>
                            {platform.latestErrorSummary ? (
                              <p className="text-[11px] text-amber-300">
                                Error summary: {platform.latestErrorSummary}
                              </p>
                            ) : null}
                            <pre
                              className="max-h-48 overflow-auto rounded border border-white/10 bg-black/30 p-2 text-[11px] text-white/70"
                              data-testid={`admin-social-publish-log-payload-${platform.platform}`}
                            >
                              {platform.latestResponseMetadata
                                ? JSON.stringify(platform.latestResponseMetadata, null, 2)
                                : "{}"}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 text-[11px]" style={{ color: "var(--muted)" }}>
            Last refreshed: {payload ? new Date(payload.generatedAt).toLocaleString() : "—"}
          </div>
        </div>
      )}
    </section>
  )
}
