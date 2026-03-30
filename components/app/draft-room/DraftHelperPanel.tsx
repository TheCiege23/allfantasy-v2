'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, MessageCircle, AlertTriangle } from 'lucide-react'
import { getDraftAIChatUrl, buildAskChimmyAboutPickPrompt } from '@/lib/draft-room/DraftToAIContextBridge'
import { DRAFT_WAR_ROOM_LEGACY_URL, getWarRoomPanelDescription, getWarRoomPanelTitle } from '@/lib/draft-room'
import { useAIAssistantAvailability } from '@/hooks/useAIAssistantAvailability'

export type DraftRecommendation = {
  player: { name: string; position: string; team?: string | null; adp?: number | null }
  reason: string
  confidence: number
}

export type DraftHelperPanelProps = {
  loading: boolean
  error: string | null
  recommendation: DraftRecommendation | null
  alternatives: Array<{ player: { name: string; position: string; team?: string | null }; reason: string; confidence: number }>
  reachWarning: string | null
  valueWarning: string | null
  scarcityInsight: string | null
  stackInsight: string | null
  correlationInsight: string | null
  formatInsight: string | null
  byeNote: string | null
  explanation: string
  evidence: string[]
  caveats: string[]
  uncertainty: string | null
  executionMode?: string | null
  sport: string
  round: number
  pick: number
  leagueId?: string
  leagueName?: string
  rosterSlots?: string[]
  queueLength?: number
  aiExplanationEnabled?: boolean
  onAiExplanationToggle?: (enabled: boolean) => void
  onRefresh: () => void
  onPlayerClick?: (player: { name: string; position: string; team?: string | null }) => void
}

export function DraftHelperPanel({
  loading,
  error,
  recommendation,
  alternatives,
  reachWarning,
  valueWarning,
  scarcityInsight,
  stackInsight,
  correlationInsight,
  formatInsight,
  byeNote,
  explanation,
  evidence,
  caveats,
  uncertainty,
  executionMode,
  sport,
  round,
  pick,
  leagueId,
  leagueName,
  rosterSlots,
  queueLength,
  aiExplanationEnabled = false,
  onAiExplanationToggle,
  onRefresh,
  onPlayerClick,
}: DraftHelperPanelProps) {
  const [warRoomOpen, setWarRoomOpen] = useState(false)
  const { enabled: aiAssistantEnabled, loading: aiAvailabilityLoading } = useAIAssistantAvailability()
  const chimmyPrompt = buildAskChimmyAboutPickPrompt({
    sport,
    round,
    pick,
    leagueName,
    rosterPositions: rosterSlots,
    queueLength,
    recommendedPlayer: recommendation?.player.name,
    recommendedPosition: recommendation?.player.position,
    explanation,
  })
  const chimmyUrl = getDraftAIChatUrl(chimmyPrompt, {
    leagueId,
    insightType: 'draft',
    sport,
  })

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#060d1e]">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Draft Helper</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          data-testid="draft-helper-refresh"
          className="rounded border border-white/15 bg-black/20 p-1.5 text-white/70 hover:bg-white/10 disabled:opacity-50"
          aria-label="Refresh recommendation"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="border-b border-white/8 px-3 py-1.5">
        <label className="inline-flex items-center gap-2 text-[10px] text-white/70">
          <input
            type="checkbox"
            checked={aiExplanationEnabled}
            onChange={(event) => onAiExplanationToggle?.(event.target.checked)}
            data-testid="draft-helper-ai-explanation-toggle"
            disabled={!aiAssistantEnabled}
            className="rounded border-white/25 bg-black/40"
          />
          AI explanation {!aiAssistantEnabled && !aiAvailabilityLoading ? '(disabled)' : ''}
        </label>
      </div>
      <div className="border-b border-white/8 px-3 py-1.5 text-[10px] text-white/60" data-testid="draft-helper-execution-mode">
        {executionMode === 'ai_explained'
          ? 'Execution: instant recommendation + AI explanation'
          : 'Execution: instant automated recommendation'}
      </div>
      <div className="flex-1 overflow-auto p-2">
        {error && (
          <p className="mb-2 text-xs text-amber-400">{error}</p>
        )}
        {loading && !recommendation && (
          <p className="py-4 text-center text-xs text-white/50">Getting recommendation…</p>
        )}
        {!loading && !error && recommendation && (
          <>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onPlayerClick?.(recommendation.player)}
              onKeyDown={(e) => e.key === 'Enter' && onPlayerClick?.(recommendation.player)}
              data-testid="draft-helper-recommendation-card"
              className="mb-2 rounded-lg border border-cyan-300/30 bg-cyan-500/8 px-2.5 py-2 text-left"
            >
              <p className="font-medium text-cyan-200">
                {recommendation.player.name}
                <span className="ml-1 text-[10px] text-white/70">
                  {recommendation.player.position}
                  {recommendation.player.team ? ` · ${recommendation.player.team}` : ''}
                  {recommendation.player.adp != null ? ` · ADP ${recommendation.player.adp}` : ''}
                </span>
              </p>
              <p className="text-[10px] text-white/80">{recommendation.reason}</p>
              <p className="mt-1 text-[10px] text-white/60">Confidence: {recommendation.confidence}%</p>
            </div>
            {explanation && (
              <p className="mb-2 text-[10px] text-white/80">{explanation}</p>
            )}
            {(reachWarning || valueWarning || scarcityInsight || stackInsight || correlationInsight || formatInsight || byeNote) && (
              <div className="mb-2 space-y-1">
                {reachWarning && (
                  <p className="flex items-start gap-1 text-[10px] text-amber-300">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    {reachWarning}
                  </p>
                )}
                {valueWarning && (
                  <p className="flex items-start gap-1 text-[10px] text-emerald-300">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    {valueWarning}
                  </p>
                )}
                {scarcityInsight && (
                  <p className="text-[10px] text-cyan-300/90">{scarcityInsight}</p>
                )}
                {stackInsight && (
                  <p className="text-[10px] text-violet-200/90">{stackInsight}</p>
                )}
                {correlationInsight && (
                  <p className="text-[10px] text-indigo-200/90">{correlationInsight}</p>
                )}
                {formatInsight && (
                  <p className="text-[10px] text-sky-200/90">{formatInsight}</p>
                )}
                {byeNote && (
                  <p className="text-[10px] text-amber-300/90">{byeNote}</p>
                )}
              </div>
            )}
            {evidence.length > 0 && (
              <div className="mb-2">
                <p className="text-[9px] font-medium text-white/50 uppercase tracking-wider">Evidence</p>
                <ul className="list-inside list-disc text-[10px] text-white/70">
                  {evidence.slice(0, 4).map((item, i) => (
                    <li key={`e-${i}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {caveats.length > 0 && (
              <div className="mb-2">
                <p className="text-[9px] font-medium text-white/50 uppercase tracking-wider">Caveats</p>
                <ul className="list-inside list-disc text-[10px] text-white/60">
                  {caveats.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {uncertainty && (
              <p className="mb-2 text-[10px] text-amber-200/90" data-testid="draft-helper-uncertainty">
                {uncertainty}
              </p>
            )}
            {alternatives.length > 0 && (
              <div className="mb-2">
                <p className="text-[9px] font-medium text-white/50 uppercase tracking-wider mb-1">Alternatives</p>
                <ul className="space-y-1">
                  {alternatives.slice(0, 3).map((alt, i) => (
                    <li
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => onPlayerClick?.(alt.player)}
                      onKeyDown={(e) => e.key === 'Enter' && onPlayerClick?.(alt.player)}
                      data-testid={`draft-helper-alternative-${i}`}
                      className="rounded border border-white/10 bg-[#0a1228] px-2 py-1 text-[10px] text-white/80 hover:bg-white/5 cursor-pointer"
                    >
                      {alt.player.name} ({alt.player.position}) — {alt.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiAssistantEnabled ? (
              <a
                href={chimmyUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="draft-ai-suggestion-button"
                className="mt-2 inline-flex items-center gap-1.5 rounded border border-cyan-300/35 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] text-cyan-100 hover:bg-cyan-500/20"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Ask Chimmy about this pick
              </a>
            ) : (
              <button
                type="button"
                onClick={onRefresh}
                data-testid="draft-ai-suggestion-fallback-button"
                className="mt-2 inline-flex items-center gap-1.5 rounded border border-amber-300/35 bg-amber-500/10 px-2.5 py-1.5 text-[10px] text-amber-100 hover:bg-amber-500/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                AI unavailable - refresh deterministic advice
              </button>
            )}
          </>
        )}
        {!loading && !error && !recommendation && (
          <p className="py-4 text-center text-xs text-white/50">
            Add players to the pool and click Refresh for a recommendation.
          </p>
        )}
        <div className="mt-2 border-t border-white/8 pt-2">
          <button
            type="button"
            data-testid="draft-open-war-room-button"
            onClick={() => setWarRoomOpen((open) => !open)}
            className="rounded border border-violet-400/35 bg-violet-500/10 px-2.5 py-1.5 text-[10px] text-violet-100 hover:bg-violet-500/20"
          >
            {warRoomOpen ? 'Close war room' : 'Open war room'}
          </button>
          {warRoomOpen && (
            <div className="mt-2 rounded-lg border border-violet-400/30 bg-violet-500/8 px-2.5 py-2 text-[10px]" data-testid="draft-war-room-panel">
              <p className="font-medium text-violet-100">{getWarRoomPanelTitle('league_draft')}</p>
              <p className="mt-1 text-violet-200/90">{getWarRoomPanelDescription('league_draft')}</p>
              <a
                href={DRAFT_WAR_ROOM_LEGACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="draft-war-room-link"
                className="mt-2 inline-flex rounded border border-violet-300/35 px-2 py-1 text-violet-100 hover:bg-violet-500/20"
              >
                Launch war room
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
