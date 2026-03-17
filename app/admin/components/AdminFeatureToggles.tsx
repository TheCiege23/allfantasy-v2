"use client"

import { useCallback, useEffect, useState } from "react"
import { FEATURE_KEYS } from "@/lib/feature-toggle"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import { toast } from "sonner"
import { Loader2, RefreshCw } from "lucide-react"
import type { LeagueSport } from "@prisma/client"

const LABELS: Record<string, string> = {
  [FEATURE_KEYS.AI_ASSISTANT]: "AI assistant",
  [FEATURE_KEYS.MOCK_DRAFTS]: "Mock drafts",
  [FEATURE_KEYS.LEGACY_MODE]: "Legacy mode",
  [FEATURE_KEYS.BRACKET_CHALLENGES]: "Bracket challenges",
  [FEATURE_KEYS.TOOL_WAIVER_AI]: "Waiver AI tool",
  [FEATURE_KEYS.TOOL_TRADE_ANALYZER]: "Trade analyzer tool",
  [FEATURE_KEYS.TOOL_RANKINGS]: "Rankings tool",
  [FEATURE_KEYS.EXPERIMENTAL_LEGACY_IMPORT]: "Experimental legacy import",
  [FEATURE_KEYS.EXPERIMENTAL_DYNASTY]: "Experimental dynasty",
}

const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "AI features", keys: [FEATURE_KEYS.AI_ASSISTANT] },
  { title: "Tools", keys: [FEATURE_KEYS.MOCK_DRAFTS, FEATURE_KEYS.TOOL_WAIVER_AI, FEATURE_KEYS.TOOL_TRADE_ANALYZER, FEATURE_KEYS.TOOL_RANKINGS] },
  { title: "Platform", keys: [FEATURE_KEYS.LEGACY_MODE, FEATURE_KEYS.BRACKET_CHALLENGES] },
  { title: "Experimental", keys: [FEATURE_KEYS.EXPERIMENTAL_LEGACY_IMPORT, FEATURE_KEYS.EXPERIMENTAL_DYNASTY] },
]

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAF: "NCAA Football",
  NCAAB: "NCAA Basketball",
  SOCCER: "Soccer",
}

type Snapshot = {
  features: Record<string, boolean>
  sports: string[]
  raw: Record<string, string>
}

export default function AdminFeatureToggles() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [sportsSaving, setSportsSaving] = useState(false)
  const [pendingSports, setPendingSports] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/config", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to load config")
      setSnapshot(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setToggle = async (key: string, enabled: boolean) => {
    setToggling(key)
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: enabled }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      setSnapshot(data)
      toast.success(enabled ? "Enabled" : "Disabled")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setToggling(null)
    }
  }

  const setSports = async (sports: string[]) => {
    setSportsSaving(true)
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sports }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to update sports")
      setSnapshot(data)
      setPendingSports(null)
      toast.success("Sports updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSportsSaving(false)
    }
  }

  const toggleSport = (sport: string) => {
    if (!snapshot) return
    const current = snapshot.sports as string[]
    const next = current.includes(sport)
      ? current.filter((s) => s !== sport)
      : [...current, sport]
    setSports(next)
  }

  if (loading && !snapshot) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    )
  }

  if (error && !snapshot) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
        {error}
        <button onClick={load} className="ml-3 underline">Retry</button>
      </div>
    )
  }

  const savedSports = snapshot?.sports ?? (SUPPORTED_SPORTS as unknown as string[])
  const currentSports = pendingSports ?? savedSports
  const allSports = SUPPORTED_SPORTS as unknown as string[]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            Feature toggles
          </h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Enable or disable features globally without deployment. Changes take effect immediately.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="h-10 px-4 rounded-xl border flex items-center gap-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {!snapshot && (
        <div className="text-sm" style={{ color: "var(--muted)" }}>No config loaded.</div>
      )}

      {snapshot && (
        <>
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="px-4 py-3 text-sm font-semibold"
                style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
              >
                {section.title}
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {section.keys.map((key) => {
                  const enabled = snapshot.features[key] ?? false
                  const busy = toggling === key
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between px-4 py-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--text)" }}>
                        {LABELS[key] ?? key}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        disabled={!!toggling}
                        onClick={() => setToggle(key, !enabled)}
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                        style={{
                          background: enabled ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        <span
                          className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition"
                          style={{ translate: enabled ? "translate-x-5" : "translate-x-0.5" }}
                        />
                        {busy && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          </span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {/* Sports availability */}
          <section
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="px-4 py-3 text-sm font-semibold"
              style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
            >
              Sports availability
            </div>
            <div className="px-4 py-3">
              <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                Enable which sports are available. If none are selected, all are enabled.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                {allSports.map((sport) => {
                  const enabled = currentSports.length === 0 || currentSports.includes(sport)
                  return (
                    <label
                      key={sport}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => {
                          const next =
                            currentSports.length === 0
                              ? allSports.filter((x) => x !== sport)
                              : currentSports.includes(sport)
                                ? currentSports.filter((x) => x !== sport)
                                : [...currentSports, sport]
                          setPendingSports(next.length ? next : allSports)
                        }}
                        className="rounded border"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <span className="text-sm" style={{ color: "var(--text)" }}>
                        {SPORT_LABELS[sport] ?? sport}
                      </span>
                    </label>
                  )
                })}
              </div>
              <button
                onClick={() => setSports(currentSports)}
                disabled={sportsSaving}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {sportsSaving ? "Saving…" : "Save sports"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
