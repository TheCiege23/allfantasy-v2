'use client'

/**
 * Redraft AF War Room panel — grounded in the league's OWN data via
 * /api/leagues/[leagueId]/redraft-war-room. Every button is wired to a real route.
 * Surfaces deterministic team needs + lineup/waiver/trade-finder + a grounded "ask".
 * Honestly shows data-unavailable states instead of fabricating values.
 */
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, ShieldQuestion, Sparkles } from 'lucide-react'
import {
  analyzeRedraftWarRoomTrade,
  askRedraftWarRoom,
  fetchRedraftWarRoomLineup,
  fetchRedraftWarRoomState,
  fetchRedraftWarRoomWaivers,
  findRedraftWarRoomTrades,
} from '@/lib/redraft-war-room/client'
import type { RedraftWarRoomContext } from '@/lib/redraft-war-room/types'
import type { TeamNeedsResult } from '@/lib/redraft-war-room/redraftTeamNeedsEngine'
import type { LineupResult } from '@/lib/redraft-war-room/redraftLineupEngine'
import type { WaiverResult } from '@/lib/redraft-war-room/redraftWaiverEngine'
import type { TradeFinderResult } from '@/lib/redraft-war-room/redraftTradeEngine'

type Tool = 'lineup' | 'waivers' | 'trade-find' | null

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5 text-[11px] text-amber-200/80">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />
      <span>{children}</span>
    </li>
  )
}

export function RedraftWarRoomPanel({ leagueId }: { leagueId: string }) {
  const [context, setContext] = useState<RedraftWarRoomContext | null>(null)
  const [needs, setNeeds] = useState<TeamNeedsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tool, setTool] = useState<Tool>(null)
  const [toolBusy, setToolBusy] = useState(false)
  const [lineup, setLineup] = useState<LineupResult | null>(null)
  const [waivers, setWaivers] = useState<WaiverResult | null>(null)
  const [tradeFinder, setTradeFinder] = useState<TradeFinderResult | null>(null)

  const [question, setQuestion] = useState('')
  const [askBusy, setAskBusy] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [askNote, setAskNote] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchRedraftWarRoomState(leagueId)
      .then((res) => {
        if (!active) return
        setContext(res.context)
        setNeeds(res.needs)
        setError(null)
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : 'Failed to load War Room.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [leagueId])

  const runTool = useCallback(
    async (which: Exclude<Tool, null>) => {
      setTool(which)
      setToolBusy(true)
      try {
        if (which === 'lineup') setLineup((await fetchRedraftWarRoomLineup(leagueId)).lineup)
        else if (which === 'waivers') setWaivers((await fetchRedraftWarRoomWaivers(leagueId)).waivers)
        else if (which === 'trade-find') setTradeFinder((await findRedraftWarRoomTrades(leagueId)).tradeFinder)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Tool failed.')
      } finally {
        setToolBusy(false)
      }
    },
    [leagueId],
  )

  const onAsk = useCallback(async () => {
    const q = question.trim()
    if (!q) return
    setAskBusy(true)
    setAnswer(null)
    setAskNote(null)
    try {
      const res = await askRedraftWarRoom(leagueId, q)
      if (res.aiUnavailable) {
        setAskNote('AI is temporarily unavailable — showing grounded facts only.')
        setAnswer(null)
      } else {
        setAnswer(res.answer)
      }
    } catch (e) {
      setAskNote(e instanceof Error ? e.message : 'Ask failed.')
    } finally {
      setAskBusy(false)
    }
  }, [leagueId, question])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#07071a] p-4 text-[12px] text-white/50">
        <Loader2 className="h-4 w-4 animate-spin text-violet-300" /> Loading Redraft War Room…
      </div>
    )
  }
  if (error || !context) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100/90">
        {error ?? 'Redraft War Room is unavailable for this league.'}
      </div>
    )
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-violet-400/20 bg-[#0a0820] p-4"
      data-testid="redraft-war-room-panel"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-300" />
        <h2 className="text-sm font-bold text-white">Redraft War Room</h2>
        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
          {context.sport} · W{context.currentWeek}/{context.totalWeeks}
        </span>
      </div>

      {/* Team needs */}
      {needs && (
        <div className="rounded-lg border border-white/[0.06] bg-[#07071a] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
            Team needs · urgency {needs.urgencyScore}/100
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold text-rose-300/80">NEEDS</p>
              {needs.needs.length ? (
                needs.needs.map((n) => (
                  <p key={n.position} className="text-[11px] text-white/70">
                    {n.position} <span className="text-white/40">({n.severity})</span>
                  </p>
                ))
              ) : (
                <p className="text-[11px] text-white/40">None detected</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-emerald-300/80">STRENGTHS</p>
              {needs.strengths.length ? (
                needs.strengths.slice(0, 4).map((s) => (
                  <p key={s} className="text-[11px] text-white/60">
                    {s}
                  </p>
                ))
              ) : (
                <p className="text-[11px] text-white/40">—</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-amber-300/80">TARGET POSITIONS</p>
              <p className="text-[11px] text-white/60">{needs.tradeTargetPositions.join(', ') || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tool buttons — every one wired to a real route */}
      <div className="flex flex-wrap gap-2">
        {(['lineup', 'waivers', 'trade-find'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => void runTool(t)}
            disabled={toolBusy}
            data-testid={`redraft-war-room-tool-${t}`}
            className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/80 transition hover:border-violet-400/30 hover:bg-violet-500/10 disabled:opacity-50"
          >
            {t === 'lineup' ? 'Start/Sit' : t === 'waivers' ? 'Waivers' : 'Trade finder'}
          </button>
        ))}
      </div>

      {/* Tool output */}
      {toolBusy && (
        <p className="flex items-center gap-1.5 text-[11px] text-white/50">
          <Loader2 className="h-3 w-3 animate-spin" /> Running…
        </p>
      )}
      {tool === 'lineup' && lineup && !toolBusy && (
        <div className="rounded-lg border border-white/[0.06] bg-[#07071a] p-3 text-[11px] text-white/70">
          <p className="mb-1 font-semibold text-white/80">Suggested starters (confidence: {lineup.confidence})</p>
          {lineup.suggestedStarters.map((s) => (
            <p key={s.slotName}>
              <span className="text-white/40">{s.slotName}:</span> {s.playerName ?? '—'}{' '}
              {s.valueUsed != null && <span className="text-white/40">({s.valueUsed})</span>}
            </p>
          ))}
          {lineup.missingDataFlags.length > 0 && (
            <ul className="mt-2 space-y-1">
              {lineup.missingDataFlags.map((f) => (
                <Flag key={f}>{f}</Flag>
              ))}
            </ul>
          )}
        </div>
      )}
      {tool === 'waivers' && waivers && !toolBusy && (
        <div className="rounded-lg border border-white/[0.06] bg-[#07071a] p-3 text-[11px] text-white/70">
          {waivers.needsProviderIntegration ? (
            <p className="text-amber-200/80">
              Free-agent add targets need provider integration. Drop-side analysis is grounded in your roster:
            </p>
          ) : (
            <p className="mb-1 font-semibold text-white/80">Recommended adds</p>
          )}
          {waivers.recommendedAdds.map((a) => (
            <p key={a.playerId}>+ {a.playerName} ({a.position}) — {a.reason}</p>
          ))}
          {waivers.recommendedDrops.map((d) => (
            <p key={d.playerId} className="text-white/55">– {d.playerName} ({d.position})</p>
          ))}
          {waivers.missingDataFlags.length > 0 && (
            <ul className="mt-2 space-y-1">
              {waivers.missingDataFlags.map((f) => (
                <Flag key={f}>{f}</Flag>
              ))}
            </ul>
          )}
        </div>
      )}
      {tool === 'trade-find' && tradeFinder && !toolBusy && (
        <div className="rounded-lg border border-white/[0.06] bg-[#07071a] p-3 text-[11px] text-white/70">
          {tradeFinder.needsMoreData ? (
            <ul className="space-y-1">
              {tradeFinder.missingDataFlags.map((f) => (
                <Flag key={f}>{f}</Flag>
              ))}
            </ul>
          ) : tradeFinder.targets.length ? (
            tradeFinder.targets.slice(0, 5).map((t) => (
              <p key={t.rosterId}>
                <span className="font-semibold text-white/80">{t.teamName ?? t.rosterId}</span> (fit {t.fitScore}):{' '}
                {t.reasons.join(' ')}
              </p>
            ))
          ) : (
            <p className="text-white/40">No complementary trade partners found right now.</p>
          )}
        </div>
      )}

      {/* Global missing-data flags */}
      {context.missingDataFlags.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] p-2">
          {context.missingDataFlags.map((f) => (
            <Flag key={f}>{f}</Flag>
          ))}
        </ul>
      )}

      {/* Ask War Room */}
      <div className="rounded-lg border border-white/[0.06] bg-[#07071a] p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
          <ShieldQuestion className="h-3.5 w-3.5" /> Ask the War Room
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Who should I start at FLEX this week?"
          rows={2}
          data-testid="redraft-war-room-ask-input"
          className="w-full resize-none rounded-md border border-white/[0.1] bg-[#05050f] px-2 py-1.5 text-[12px] text-white/85 placeholder:text-white/30 focus:border-violet-400/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void onAsk()}
          disabled={askBusy || !question.trim()}
          data-testid="redraft-war-room-ask-submit"
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/30 disabled:opacity-50"
        >
          {askBusy && <Loader2 className="h-3 w-3 animate-spin" />} Ask
        </button>
        {askNote && <p className="mt-2 text-[11px] text-amber-200/80">{askNote}</p>}
        {answer && (
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-white/80" data-testid="redraft-war-room-answer">
            {answer}
          </p>
        )}
      </div>
    </section>
  )
}
