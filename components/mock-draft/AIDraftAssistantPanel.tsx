'use client'

import { useEffect } from 'react'
import { Bot, AlertTriangle, Info } from 'lucide-react'
import { useAIDraftAssistant, type FetchSuggestionParams } from '@/hooks/useAIDraftAssistant'

export interface AIDraftAssistantPanelProps {
  /** When non-null, fetch suggestion for this pick/context */
  params: FetchSuggestionParams | null
  /** Auto-fetch when params change */
  autoFetch?: boolean
  /** Compact layout */
  compact?: boolean
}

export function AIDraftAssistantPanel({
  params,
  autoFetch = true,
  compact = false,
}: AIDraftAssistantPanelProps) {
  const {
    bestPick,
    explanation,
    compareOptions,
    positionalRunWarning,
    rosterWarning,
    loading,
    error,
    fetchSuggestion,
    clear,
  } = useAIDraftAssistant()

  useEffect(() => {
    if (!params || !autoFetch) return
    fetchSuggestion(params)
    return () => clear()
  }, [params?.round, params?.pick, autoFetch])

  return (
    <section
      className={`rounded-2xl border border-white/12 bg-black/25 text-sm text-white/90 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
          <Bot className="h-4 w-4 text-cyan-400" />
        </span>
        <div>
          <p className="font-semibold text-white">AI Draft Assistant</p>
          <p className="text-[10px] text-white/55">
            Suggestions only — not a guarantee. You decide.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <p className="text-white/55">Loading suggestion…</p>
      )}

      {!loading && bestPick && (
        <>
          <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-cyan-400/80">Best pick</p>
            <p className="font-semibold text-white">
              {bestPick.player}
              <span className="ml-2 text-white/60">
                {bestPick.position}
                {bestPick.team ? ` · ${bestPick.team}` : ''}
              </span>
            </p>
            {bestPick.reason && (
              <p className="mt-1.5 text-[11px] text-white/70">{bestPick.reason}</p>
            )}
          </div>

          {explanation && (
            <div className="mb-3 flex gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
              <Info className="h-4 w-4 shrink-0 text-cyan-400/80" />
              <p className="text-[11px] text-white/75">{explanation}</p>
            </div>
          )}

          {compareOptions.length > 1 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/55">
                Compare options
              </p>
              <ul className="space-y-1.5">
                {compareOptions.slice(0, 3).map((opt, i) => (
                  <li
                    key={`${opt.player}-${i}`}
                    className="flex justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="font-medium text-white">{opt.player}</span>
                    <span className="text-white/55">{opt.position}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {positionalRunWarning && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {positionalRunWarning}
            </div>
          )}

          {rosterWarning && (
            <div className="flex items-center gap-2 rounded-lg border border-purple-500/25 bg-purple-500/10 px-2.5 py-1.5 text-[11px] text-purple-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {rosterWarning}
            </div>
          )}
        </>
      )}

      {!loading && !bestPick && !error && params && (
        <p className="text-white/55">Select a pick or start the draft to see AI suggestions.</p>
      )}
    </section>
  )
}
