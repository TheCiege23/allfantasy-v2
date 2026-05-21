"use client"

import { useEffect, useState } from "react"
import { Loader2, Lock, Sparkles } from "lucide-react"
import {
  buildWorldCupBracketUniquenessInsights,
  type UniquenessRarity,
  type UniquenessResult,
} from "@/lib/world-cup/worldCupUniquenessInsights"
import type { WorldCupRound } from "@/lib/world-cup/types"

const RARITY_TONE: Record<UniquenessRarity, string> = {
  very_rare: "border-cyan-300/45 bg-cyan-300/[0.10]",
  rare: "border-amber-300/40 bg-amber-300/[0.08]",
  uncommon: "border-white/20 bg-white/[0.04]",
  common: "border-white/10 bg-white/[0.03]",
}

const RARITY_LABEL: Record<UniquenessRarity, string> = {
  very_rare: "Very rare",
  rare: "Rare",
  uncommon: "Uncommon",
  common: "Common",
}

type ApiResponse = {
  ok: boolean
  finalizedEntryCount?: number
  distributions?: Record<string, Array<{ teamName: string; count: number }>>
  ownChampionTeamName?: string | null
  ownPicksByRound?: Partial<Record<WorldCupRound, string[]>>
}

export default function WorldCupBracketUniquenessCard({
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
  const [result, setResult] = useState<UniquenessResult | null>(null)

  useEffect(() => {
    if (!entryId) {
      setResult(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(
          `/api/brackets/world-cup/${challengeId}/entries/${entryId}/uniqueness`
        )
        if (cancelled) return
        if (!res.ok) {
          setError("Could not load uniqueness data.")
          setResult(null)
          return
        }
        const body = (await res.json()) as ApiResponse
        if (cancelled) return
        const computed = buildWorldCupBracketUniquenessInsights({
          ownChampionTeamName: body.ownChampionTeamName ?? null,
          ownPicksByRound: body.ownPicksByRound ?? {},
          poolDistributions: body.distributions ?? {},
          finalizedEntryCount: body.finalizedEntryCount ?? 0,
          hasBracketBrainAi,
        })
        setResult(computed)
      } catch {
        if (!cancelled) {
          setError("Network error. Please try again.")
          setResult(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [challengeId, entryId, hasBracketBrainAi])

  return (
    <section
      data-testid="world-cup-bracket-uniqueness"
      className="rounded-xl border border-cyan-300/20 bg-gradient-to-b from-cyan-300/[0.06] to-white/[0.03] p-4 backdrop-blur"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10">
            <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
              Pool comparison
            </p>
            <h3 className="text-base font-black text-white sm:text-lg">
              What makes my bracket unique?
            </h3>
            <p className="mt-0.5 text-xs text-white/55">
              Compared only against finalized brackets in this pool.
            </p>
          </div>
        </div>
        <span
          data-testid="world-cup-bracket-uniqueness-tier"
          className={
            hasBracketBrainAi
              ? "shrink-0 rounded-full border border-cyan-300/30 bg-cyan-300/[0.08] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-100"
              : "shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white/65"
          }
        >
          {hasBracketBrainAi ? "AF Pro" : "Basic"}
        </span>
      </div>

      {!entryId ? (
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/65">
          Select a bracket entry to compute uniqueness.
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/65">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading pool comparison...
        </div>
      ) : null}

      {error ? (
        <p
          data-testid="world-cup-bracket-uniqueness-error"
          className="rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
        >
          {error}
        </p>
      ) : null}

      {result && result.status === "not_enough_pool_data" ? (
        <p
          data-testid="world-cup-bracket-uniqueness-not-ready"
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/65"
        >
          {result.lockedLines?.[0] ?? "Uniqueness unlocks after more finalized brackets are submitted."}
        </p>
      ) : null}

      {result && result.status === "incomplete" ? (
        <p
          data-testid="world-cup-bracket-uniqueness-incomplete"
          className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-100"
        >
          {result.lockedLines?.[0] ?? "Make group and knockout picks to see how unique your bracket is."}
        </p>
      ) : null}

      {result && result.status === "ready" ? (
        <ul className="space-y-2">
          {result.insights.map((insight, idx) => (
            <li
              key={`${insight.tag}:${idx}`}
              data-testid={`world-cup-bracket-uniqueness-insight-${idx}`}
              className={`rounded-xl border px-3 py-2.5 text-cyan-50 ${RARITY_TONE[insight.rarity]}`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  {insight.label}
                </span>
                <span
                  data-testid={`world-cup-bracket-uniqueness-rarity-${idx}`}
                  className="rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/75"
                >
                  {RARITY_LABEL[insight.rarity]}
                </span>
                {typeof insight.percentage === "number" ? (
                  <span className="rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/75">
                    {insight.percentage}% share
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs leading-5 text-white/75">{insight.description}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {result?.lockedLines && result.status === "ready" ? (
        <div className="mt-2 space-y-1">
          {result.lockedLines.map((line, idx) => (
            <p
              key={idx}
              data-testid={`world-cup-bracket-uniqueness-locked-${idx}`}
              className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] leading-5 text-white/55"
            >
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-white/40" aria-hidden />
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-[10px] text-white/40">
        Deterministic — counts only finalized brackets. No AI call, no other users' raw picks shown.
      </p>
    </section>
  )
}
