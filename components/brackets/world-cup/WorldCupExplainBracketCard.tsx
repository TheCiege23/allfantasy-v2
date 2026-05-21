"use client"

import { useState } from "react"
import { Loader2, Lock, Sparkles } from "lucide-react"

type ExplainResult = {
  summary: string
  lines: string[]
  generative: boolean
}

export default function WorldCupExplainBracketCard({
  challengeId,
  entryId,
  hasBracketBrainAi,
}: {
  challengeId: string
  entryId: string | null
  hasBracketBrainAi: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExplainResult | null>(null)

  async function handleGenerate() {
    if (!entryId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/brackets/world-cup/${challengeId}/entries/${entryId}/explain`,
        { method: "POST" }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          typeof body?.error === "string"
            ? body.error
            : "Could not generate explanation."
        )
        return
      }
      setResult({
        summary: String(body.summary ?? ""),
        lines: Array.isArray(body.lines) ? body.lines.map(String) : [],
        generative: Boolean(body.generative),
      })
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      data-testid="world-cup-explain-bracket"
      className="rounded-xl border border-cyan-300/20 bg-gradient-to-b from-cyan-300/[0.06] to-white/[0.03] p-4 backdrop-blur"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10">
            <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
              Private AI
            </p>
            <h3 className="text-base font-black text-white sm:text-lg">
              Explain My Bracket
            </h3>
            <p className="mt-0.5 text-xs text-white/55">
              A private narrative analysis of your bracket strategy. Only you can see it.
            </p>
          </div>
        </div>
        <span
          data-testid="world-cup-explain-bracket-tier"
          className={
            hasBracketBrainAi
              ? "shrink-0 rounded-full border border-cyan-300/30 bg-cyan-300/[0.08] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-100"
              : "shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white/65"
          }
        >
          {hasBracketBrainAi ? "AF Pro" : "Locked"}
        </span>
      </div>

      {!hasBracketBrainAi ? (
        <div
          data-testid="world-cup-explain-bracket-locked"
          className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs leading-5 text-white/65"
        >
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" aria-hidden />
          <span>
            AF Pro unlocks a private AI explanation of your bracket strategy — including style, safest picks, riskiest picks, champion path, and one specific recommendation.
          </span>
        </div>
      ) : null}

      {hasBracketBrainAi && !result ? (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !entryId}
          data-testid="world-cup-explain-bracket-generate"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 sm:w-auto"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Generating..." : entryId ? "Generate explanation" : "Select a bracket first"}
        </button>
      ) : null}

      {error ? (
        <p
          data-testid="world-cup-explain-bracket-error"
          className="mt-2 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          data-testid="world-cup-explain-bracket-result"
          className="mt-2 space-y-2"
        >
          <p
            data-testid="world-cup-explain-bracket-summary"
            className="rounded-lg border border-cyan-300/30 bg-cyan-300/[0.08] px-3 py-2 text-sm font-bold leading-5 text-white"
          >
            {result.summary}
          </p>
          <div className="space-y-1.5">
            {result.lines.slice(1).map((line, idx) => (
              <p
                key={idx}
                data-testid={`world-cup-explain-bracket-line-${idx}`}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-white/80"
              >
                {line}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              data-testid="world-cup-explain-bracket-regenerate"
              className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-white/70 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? "Regenerating..." : "Regenerate"}
            </button>
            {!result.generative ? (
              <span
                data-testid="world-cup-explain-bracket-fallback-badge"
                className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100"
              >
                Deterministic fallback
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] text-white/40">
        Private to you. Uses only your own picks and public team data. Never posted to chat.
      </p>
    </section>
  )
}
