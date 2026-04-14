'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { LiveDraftBrainInput } from '@/lib/live-draft-brain'
import type { WarRoomIntelligenceResult } from '@/lib/war-room/draft-intelligence-engine'
import type { WarRoomNarrativeLayer } from '@/lib/war-room/war-room-narrative'
import { buildDemoLiveBrainInput } from '@/lib/war-room/demo-board-seed'
import { WAR_ROOM_STRATEGY_OPTIONS } from '@/lib/war-room/strategy-mode-map'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import { WarRoomTierBoard } from './WarRoomTierBoard'
import { WarRoomQueue } from './WarRoomQueue'
import { WarRoomCompareModal } from './WarRoomCompareModal'
import { PlayerOutlookDrawer } from './PlayerOutlookDrawer'
import { WarRoomContingencyCard } from './WarRoomContingencyCard'
import { WarRoomManagerIntel } from './WarRoomManagerIntel'
import { PostDraftReportModal } from './PostDraftReportModal'

export type WarRoomPanelProps = {
  leagueId: string
  sport: string
  draftSessionId?: string | null
  /**
   * When true, uses a small demo player pool so recommendations render without a live draft client.
   * When false, pass `brainInput` with `available` from your draft room for real intel.
   */
  useDemoBoard?: boolean
  /** Merge into the live brain payload (e.g. full `available` from draft sync). */
  brainInput?: Partial<LiveDraftBrainInput> | null
  /** When true, request optional OpenAI voice layer (deterministic scores unchanged). */
  includeNarrative?: boolean
  className?: string
}

function mergeBrainPayload(
  demo: LiveDraftBrainInput,
  partial: Partial<LiveDraftBrainInput> | null | undefined
): LiveDraftBrainInput {
  if (!partial) return demo
  return {
    ...demo,
    ...partial,
    context: { ...demo.context, ...partial.context },
    myTeam: partial.myTeam ?? demo.myTeam,
    available: partial.available && partial.available.length > 0 ? partial.available : demo.available,
    mode: partial.mode ?? demo.mode,
  }
}

/**
 * War Room command center — session bootstrap, strategy mode, live draft intelligence API.
 */
export function WarRoomPanel({
  leagueId,
  sport,
  draftSessionId: draftSessionIdProp,
  useDemoBoard = true,
  brainInput,
  includeNarrative = false,
  className = '',
}: WarRoomPanelProps) {
  const resolvedSport = (normalizeToSupportedSport(sport) ?? 'NFL') as SupportedSport
  const [compareOpen, setCompareOpen] = useState(false)
  const [outlookOpen, setOutlookOpen] = useState(false)
  const [postDraftOpen, setPostDraftOpen] = useState(false)

  const [sessionId, setSessionId] = useState<string | null>(draftSessionIdProp ?? null)
  const [strategyMode, setStrategyMode] = useState<string>('balanced')
  const [intel, setIntel] = useState<WarRoomIntelligenceResult | null>(null)
  const [narrative, setNarrative] = useState<WarRoomNarrativeLayer | null>(null)
  const [recommendLogId, setRecommendLogId] = useState<string | null>(null)
  const [telemetryBusy, setTelemetryBusy] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [loadingIntel, setLoadingIntel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (draftSessionIdProp) setSessionId(draftSessionIdProp)
  }, [draftSessionIdProp])

  const loadSession = useCallback(async () => {
    setLoadingSession(true)
    setError(null)
    try {
      const res = await fetch('/api/war-room/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, createIfMissing: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Session failed')
        return
      }
      if (typeof data.draftSessionId === 'string') setSessionId(data.draftSessionId)
      if (typeof data.defaultStrategyMode === 'string') {
        setStrategyMode(data.defaultStrategyMode)
      }
    } catch {
      setError('Network error loading session')
    } finally {
      setLoadingSession(false)
    }
  }, [leagueId])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  const recommendPayload = useMemo((): LiveDraftBrainInput | null => {
    const hasLive = Boolean(brainInput?.available && brainInput.available.length > 0)
    if (!hasLive && !useDemoBoard) return null
    const demo = buildDemoLiveBrainInput({
      leagueId,
      sport: resolvedSport,
      strategyMode,
    })
    if (hasLive) return mergeBrainPayload(demo, brainInput)
    return demo
  }, [brainInput, leagueId, resolvedSport, strategyMode, useDemoBoard])

  const loadIntel = useCallback(async () => {
    if (!recommendPayload) {
      setError('Connect live draft data (available players) or enable demo board.')
      return
    }
    setLoadingIntel(true)
    setError(null)
    try {
      const res = await fetch('/api/war-room/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          draftSessionId: sessionId,
          strategyMode,
          includeNarrative,
          ...recommendPayload,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Recommend failed')
        return
      }
      if (data.intelligence) {
        setIntel(data.intelligence as WarRoomIntelligenceResult)
      }
      setNarrative((data.narrative as WarRoomNarrativeLayer | null) ?? null)
      setRecommendLogId(typeof data.logId === 'string' ? data.logId : null)
    } catch {
      setError('Network error')
    } finally {
      setLoadingIntel(false)
    }
  }, [includeNarrative, leagueId, recommendPayload, sessionId, strategyMode])

  const sendTelemetry = useCallback(
    async (accepted: boolean) => {
      if (!recommendLogId || telemetryBusy) return
      setTelemetryBusy(true)
      try {
        await fetch('/api/war-room/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logId: recommendLogId,
            leagueId,
            accepted,
            pickedPlayerName: intel?.pickNow.playerName,
          }),
        })
      } finally {
        setTelemetryBusy(false)
      }
    },
    [intel?.pickNow.playerName, leagueId, recommendLogId, telemetryBusy],
  )

  useEffect(() => {
    if (recommendPayload) void loadIntel()
  }, [recommendPayload, loadIntel])

  const confWidth = intel ? `${intel.confidencePct}%` : '0%'

  return (
    <section
      className={`space-y-3 rounded-xl border border-cyan-500/15 bg-[#040915]/80 p-3 ${className}`}
      data-testid="war-room-ai-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200/70">War Room AI</p>
          <p className="text-[11px] text-white/45">
            Live pick engine · tiers · scarcity · stacks · contingencies · take vs wait
            {useDemoBoard && !brainInput?.available?.length ? (
              <span className="ml-1 text-amber-200/80">· demo board</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={strategyMode}
            onChange={(e) => setStrategyMode(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0a1228] px-2 py-1 text-[10px] text-white/90"
            data-testid="war-room-strategy-select"
            aria-label="Draft strategy mode"
          >
            {WAR_ROOM_STRATEGY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadIntel()}
            disabled={loadingIntel || !recommendPayload}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-40"
            data-testid="war-room-refresh-intel"
          >
            {loadingIntel ? 'Updating…' : 'Refresh intel'}
          </button>
        </div>
      </div>

      {loadingSession && <p className="text-[10px] text-white/40">Loading draft session…</p>}
      {error && (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100/90">
          {error}
        </p>
      )}

      {intel && (
        <div className="space-y-2 rounded-xl border border-white/8 bg-[#060d1e]/80 p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Pick now</p>
              <p className="text-sm font-semibold text-white">
                {intel.pickNow.playerName}{' '}
                <span className="text-white/50">
                  {intel.pickNow.position} · {intel.pickNow.team}
                </span>
              </p>
              <p className="text-[10px] text-cyan-200/70">
                Mode: {intel.strategyMode.brainMode}
                {intel.strategyMode.requested ? ` · requested: ${intel.strategyMode.requested}` : ''}
              </p>
            </div>
            <div className="min-w-[120px] flex-1">
              <p className="text-[9px] uppercase tracking-wider text-white/35">Confidence</p>
              <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-cyan-500/70 transition-all" style={{ width: confWidth }} />
              </div>
              <p className="mt-0.5 text-[10px] text-white/50">{intel.confidencePct}%</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: 'Best value', p: intel.bestValue },
              { k: 'Best fit', p: intel.bestFit },
              { k: 'Best upside', p: intel.bestUpside },
              { k: 'Safest', p: intel.bestSafePick },
            ].map((row) => (
              <div key={row.k} className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wider text-white/40">{row.k}</p>
                <p className="text-[11px] font-medium text-white/90">{row.p.playerName}</p>
                <p className="text-[10px] text-white/45">
                  {row.p.position} · {row.p.recommendationType}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Take vs wait</p>
            <p className="text-[11px] text-cyan-100/90">{intel.takeVsWait.headline}</p>
            <ul className="mt-1 list-inside list-disc text-[10px] text-white/55">
              {intel.takeVsWait.bullets.map((b) => (
                <li key={b.slice(0, 24)}>{b}</li>
              ))}
            </ul>
          </div>

          {narrative?.body ? (
            <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-2 py-1.5" data-testid="war-room-narrative">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-cyan-200/50">Chimmy voice</p>
              <p className="mt-0.5 text-[11px] text-white/80">{narrative.body}</p>
            </div>
          ) : null}

          {recommendLogId ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                disabled={telemetryBusy}
                onClick={() => void sendTelemetry(true)}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-40"
                data-testid="war-room-telemetry-accept"
              >
                Aligns with my plan
              </button>
              <button
                type="button"
                disabled={telemetryBusy}
                onClick={() => void sendTelemetry(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/75 hover:bg-white/10 disabled:opacity-40"
                data-testid="war-room-telemetry-ignore"
              >
                Going another direction
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        <WarRoomTierBoard sport={sport} tierBoard={intel?.tierBoard} scarcity={intel?.scarcityAlerts} />
        <WarRoomQueue leagueId={leagueId} draftSessionId={sessionId} />
      </div>

      <WarRoomContingencyCard plans={intel?.contingencyPlans} stacks={intel?.stackOpportunities} rosterBuild={intel?.rosterBuild} />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-500/20"
          data-testid="war-room-open-compare"
        >
          Compare
        </button>
        <button
          type="button"
          onClick={() => setOutlookOpen(true)}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/85 hover:bg-white/10"
          data-testid="war-room-open-outlook"
        >
          Outlook
        </button>
        <button
          type="button"
          onClick={() => setPostDraftOpen(true)}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/85 hover:bg-white/10"
          data-testid="war-room-open-post-draft"
        >
          Post-draft
        </button>
      </div>

      <WarRoomManagerIntel leagueId={leagueId} />

      <WarRoomCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        leagueId={leagueId}
        sport={sport}
        draftSessionId={sessionId}
      />
      <PlayerOutlookDrawer
        open={outlookOpen}
        onClose={() => setOutlookOpen(false)}
        leagueId={leagueId}
        sport={sport}
      />
      <PostDraftReportModal open={postDraftOpen} onClose={() => setPostDraftOpen(false)} leagueId={leagueId} />
    </section>
  )
}
