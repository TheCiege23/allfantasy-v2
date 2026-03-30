"use client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import React, { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  addPlayerSlot,
  buildTradeSummaryForAI,
  canSubmitTradeByAssets,
  estimateTradeValueLens,
  formatValueBreakdown,
  getDefaultPickRounds,
  getFairnessColorClass,
  getFairnessScore as getFairnessScoreUtil,
  getNamedPlayerCount,
  getResultStaleBadge,
  getSportOptions,
  getTotalTradeAssetCount,
  getTradeAnalyzerAIChatUrl,
  getWinnerLabel as getWinnerLabelUtil,
  removeAssetAtIndex,
  shouldShowResult,
  supportsDraftPicksForSport,
  TRADE_ANALYZER_EMPTY_SUBTITLE,
  TRADE_ANALYZER_EMPTY_TITLE,
} from '@/lib/trade-analyzer'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { IdpTradeLineupWarning } from '@/components/idp/IdpTradeLineupWarning'
import { useUserTimezone } from '@/hooks/useUserTimezone'
import { useAIAssistantAvailability } from '@/hooks/useAIAssistantAvailability'
import { ErrorStateRenderer } from '@/components/ui-states'
import { resolveRecoveryActions } from '@/lib/ui-state'

interface PlayerInput {
  name: string
  position: string
  team: string
  age: string
}

interface PickInput {
  year: string
  round: string
  projected_range: 'early' | 'mid' | 'late' | 'unknown'
}

interface TeamInput {
  manager_name: string
  is_af_pro: boolean
  record_or_rank: string
  gives_players: PlayerInput[]
  gives_picks: PickInput[]
  gives_faab: number
}

interface TradeInsightLabel {
  id: string
  name: string
  emoji: string
  description: string
}

interface TradeInsights {
  fairnessScore: number
  fairnessMethod: 'lineup' | 'composite'
  netDeltaPct: number
  labels: TradeInsightLabel[]
  warnings: TradeInsightLabel[]
  veto: boolean
  vetoReason: string | null
  expertWarning: string | null
  idpLineupWarning?: string | null
}

interface EvaluationResult {
  trade_id?: string
  evaluation?: {
    fairness_score_0_to_100?: number
    fairness_score?: number
    winner?: 'sender' | 'receiver' | 'even'
    summary?: string
    explanation?: string
    key_reasons?: string[]
    risk_flags?: string[]
    league_balance_impact?: string
  }
  teams?: {
    sender?: { archetype?: string; roster_strengths?: string[]; roster_weaknesses?: string[] }
    receiver?: { archetype?: string; roster_strengths?: string[]; roster_weaknesses?: string[] }
  }
  team_fit?: { sender_fit?: string; receiver_fit?: string }
  improvements?: {
    best_counter_offer?: { sender_gives_changes?: string[]; receiver_gives_changes?: string[]; why_this_is_better?: string }
    small_tweaks?: string[]
  }
  user_message?: { to_sender?: string; to_receiver?: string }
  dynasty_idp_outlook?: { sender?: string; receiver?: string }
  end_of_season_projection?: { sender?: string; receiver?: string }
  tradeInsights?: TradeInsights
}

const defaultPlayer: PlayerInput = { name: '', position: '', team: '', age: '' }
const defaultPick: PickInput = { year: '2025', round: '1', projected_range: 'mid' }

const defaultTeam: TeamInput = {
  manager_name: '',
  is_af_pro: false,
  record_or_rank: '',
  gives_players: [{ ...defaultPlayer }],
  gives_picks: [],
  gives_faab: 0,
}

const SPORT_OPTIONS = getSportOptions()

type SetTeamFn = (t: TeamInput) => void

function TradeEvaluatorInner() {
  const { formatInTimezone } = useUserTimezone()
  const { enabled: aiAssistantEnabled, loading: aiAvailabilityLoading } = useAIAssistantAvailability()
  const searchParams = useSearchParams()

  const [sender, setSender] = useState<TeamInput>(() => {
    const previewName = searchParams.get('previewSender') || ''
    return {
      ...defaultTeam,
      manager_name: 'Sender Team',
      gives_players: [{ ...defaultPlayer, name: previewName }],
    }
  })

  const [receiver, setReceiver] = useState<TeamInput>(() => {
    const previewName = searchParams.get('previewReceiver') || ''
    return {
      ...defaultTeam,
      manager_name: 'Receiver Team',
      gives_players: [{ ...defaultPlayer, name: previewName }],
    }
  })
  const [leagueFormat, setLeagueFormat] = useState<'dynasty' | 'keeper' | 'redraft'>('dynasty')
  const [sport, setSport] = useState<string>(DEFAULT_SPORT)
  const [scoring, setScoring] = useState('PPR')
  const [qbFormat, setQbFormat] = useState<'1qb' | 'sf'>('sf')
  const [asOfDate, setAsOfDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [activeResultTab, setActiveResultTab] = useState<'overview' | 'breakdown' | 'outlook'>('overview')
  const [outlookMode, setOutlookMode] = useState<'current' | 'future'>('current')
  const [lastAnalyzedSignature, setLastAnalyzedSignature] = useState<string | null>(null)

  const pickRoundOptions = useMemo(() => getDefaultPickRounds(sport), [sport])
  const pickSupportEnabled = useMemo(() => supportsDraftPicksForSport(sport), [sport])
  const currentInputSignature = useMemo(
    () =>
      JSON.stringify({
        sender,
        receiver,
        leagueFormat,
        sport,
        scoring,
        qbFormat,
        asOfDate,
      }),
    [sender, receiver, leagueFormat, sport, scoring, qbFormat, asOfDate]
  )
  const analysisStale = shouldShowResult(result, loading, error || null) && lastAnalyzedSignature !== currentInputSignature
  const staleBanner = getResultStaleBadge(analysisStale)

  const senderAssetCount = getTotalTradeAssetCount(sender.gives_players, sender.gives_picks, sender.gives_faab)
  const receiverAssetCount = getTotalTradeAssetCount(receiver.gives_players, receiver.gives_picks, receiver.gives_faab)
  const canAnalyzeTrade = canSubmitTradeByAssets(senderAssetCount, receiverAssetCount, true)

  const evaluateTrade = async () => {
    setLoading(true)
    setResult(null)

    const formatPlayers = (players: PlayerInput[]) =>
      players.filter(p => p.name.trim()).map(p => ({
        name: p.name,
        position: p.position || undefined,
        team: p.team || undefined,
        age: p.age ? parseInt(p.age) : undefined,
      }))

    const formatPicks = (picks: PickInput[]) =>
      picks
        .filter((pick) => String(pick.year).trim() && String(pick.round).trim())
        .map(p => ({
          year: parseInt(p.year, 10),
          round: parseInt(p.round, 10),
          projected_range: p.projected_range,
        }))

    try {
      const res = await fetch('/api/trade-evaluator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade_id: `trade_${Date.now()}`,
          sender: {
            manager_name: sender.manager_name,
            is_af_pro: sender.is_af_pro,
            record_or_rank: sender.record_or_rank || undefined,
            gives_players: formatPlayers(sender.gives_players),
            gives_picks: formatPicks(sender.gives_picks),
            gives_faab: sender.gives_faab,
          },
          receiver: {
            manager_name: receiver.manager_name,
            is_af_pro: receiver.is_af_pro,
            record_or_rank: receiver.record_or_rank || undefined,
            gives_players: formatPlayers(receiver.gives_players),
            gives_picks: formatPicks(receiver.gives_picks),
            gives_faab: receiver.gives_faab,
          },
          league: {
            format: leagueFormat,
            sport: normalizeToSupportedSport(sport),
            scoring_summary: scoring,
            qb_format: qbFormat,
          },
          asOfDate: asOfDate || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Failed to evaluate trade')
        return
      }

      setResult(data)
      setLastAnalyzedSignature(currentInputSignature)
      setActiveResultTab('overview')
      setError('')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addPlayer = (team: 'sender' | 'receiver') => {
    if (team === 'sender') {
      setSender({ ...sender, gives_players: addPlayerSlot(sender.gives_players, { ...defaultPlayer }) })
    } else {
      setReceiver({ ...receiver, gives_players: addPlayerSlot(receiver.gives_players, { ...defaultPlayer }) })
    }
  }

  const removePlayer = (team: 'sender' | 'receiver', index: number) => {
    if (team === 'sender') {
      setSender({ ...sender, gives_players: removeAssetAtIndex(sender.gives_players, index) })
    } else {
      setReceiver({ ...receiver, gives_players: removeAssetAtIndex(receiver.gives_players, index) })
    }
  }

  const updatePlayer = (team: 'sender' | 'receiver', index: number, field: keyof PlayerInput, value: string) => {
    if (team === 'sender') {
      const players = [...sender.gives_players]
      players[index] = { ...players[index], [field]: value }
      setSender({ ...sender, gives_players: players })
    } else {
      const players = [...receiver.gives_players]
      players[index] = { ...players[index], [field]: value }
      setReceiver({ ...receiver, gives_players: players })
    }
  }

  const addPick = (team: 'sender' | 'receiver') => {
    if (!pickSupportEnabled) return
    if (team === 'sender') {
      setSender({ ...sender, gives_picks: [...sender.gives_picks, { ...defaultPick }] })
    } else {
      setReceiver({ ...receiver, gives_picks: [...receiver.gives_picks, { ...defaultPick }] })
    }
  }

  const removePick = (team: 'sender' | 'receiver', index: number) => {
    if (team === 'sender') {
      setSender({ ...sender, gives_picks: removeAssetAtIndex(sender.gives_picks, index) })
    } else {
      setReceiver({ ...receiver, gives_picks: removeAssetAtIndex(receiver.gives_picks, index) })
    }
  }

  const clearTeamAssets = (team: 'sender' | 'receiver') => {
    if (team === 'sender') {
      setSender({
        ...sender,
        gives_players: [{ ...defaultPlayer }],
        gives_picks: [],
        gives_faab: 0,
      })
    } else {
      setReceiver({
        ...receiver,
        gives_players: [{ ...defaultPlayer }],
        gives_picks: [],
        gives_faab: 0,
      })
    }
    setResult(null)
    setLastAnalyzedSignature(null)
    setError('')
  }

  const updatePick = (team: 'sender' | 'receiver', index: number, field: keyof PickInput, value: string) => {
    if (team === 'sender') {
      const picks = [...sender.gives_picks]
      picks[index] = { ...picks[index], [field]: value } as PickInput
      setSender({ ...sender, gives_picks: picks })
    } else {
      const picks = [...receiver.gives_picks]
      picks[index] = { ...picks[index], [field]: value } as PickInput
      setReceiver({ ...receiver, gives_picks: picks })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!canAnalyzeTrade) {
      setError('Add at least one trade asset (player, pick, or FAAB) to each side.')
      return
    }
    await evaluateTrade()
  }

  const getFairnessScore = (r: EvaluationResult): number => getFairnessScoreUtil(r)
  const getFairnessColor = (score: number) => getFairnessColorClass(score)
  const getWinnerLabel = (winner?: string) => getWinnerLabelUtil(winner, sender.manager_name || 'Sender', receiver.manager_name || 'Receiver')

  const resetTrade = () => {
    setSender({ ...defaultTeam, manager_name: 'Sender Team', gives_players: [{ ...defaultPlayer }] })
    setReceiver({ ...defaultTeam, manager_name: 'Receiver Team', gives_players: [{ ...defaultPlayer }] })
    setLeagueFormat('dynasty')
    setSport(DEFAULT_SPORT)
    setScoring('PPR')
    setQbFormat('sf')
    setAsOfDate('')
    setResult(null)
    setError('')
    setLastAnalyzedSignature(null)
    setActiveResultTab('overview')
    setOutlookMode('current')
  }

  const swapSides = () => {
    const senderSnapshot = { ...sender }
    const receiverSnapshot = { ...receiver }
    setSender({ ...receiverSnapshot, manager_name: receiverSnapshot.manager_name || 'Sender Team' })
    setReceiver({ ...senderSnapshot, manager_name: senderSnapshot.manager_name || 'Receiver Team' })
    setResult(null)
    setError('')
    setLastAnalyzedSignature(null)
  }

  const renderTeamForm = (team: TeamInput, setTeam: SetTeamFn, label: string, teamKey: 'sender' | 'receiver') => (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 backdrop-blur"
      data-testid={`trade-team-builder-${teamKey}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-white/90">{label}</h3>
          <p className="text-xs text-white/45">
            {getNamedPlayerCount(team.gives_players)} players, {team.gives_picks.length} picks, {team.gives_faab} FAAB
          </p>
        </div>
        <button
          type="button"
          onClick={() => clearTeamAssets(teamKey)}
          data-testid={`trade-clear-side-${teamKey}`}
          className="rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white/85"
        >
          Clear side
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor={`trade-${teamKey}-manager-name`} className="block text-sm text-white/60 mb-1.5">Manager/Team Name</label>
          <input
            id={`trade-${teamKey}-manager-name`}
            type="text"
            value={team.manager_name}
            onChange={(e) => setTeam({ ...team, manager_name: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white placeholder-white/40 focus:border-cyan-400/50 focus:outline-none"
            placeholder="e.g., Dynasty Destroyers"
          />
        </div>

        <div>
          <label htmlFor={`trade-${teamKey}-record-rank`} className="block text-sm text-white/60 mb-1.5">Record/Rank <span className="text-white/40">(optional)</span></label>
          <input
            id={`trade-${teamKey}-record-rank`}
            type="text"
            value={team.record_or_rank}
            onChange={(e) => setTeam({ ...team, record_or_rank: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white placeholder-white/40 focus:border-cyan-400/50 focus:outline-none"
            placeholder="e.g., 3rd place, 8-4"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-white/60">Players Giving</label>
            <button
              type="button"
              onClick={() => addPlayer(teamKey)}
              data-testid={`trade-add-player-${teamKey}`}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              + Add Player
            </button>
          </div>
          {team.gives_players.map((player, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 mb-2">
              <input
                type="text"
                value={player.name}
                onChange={(e) => updatePlayer(teamKey, i, 'name', e.target.value)}
                aria-label={`${teamKey} player ${i + 1} name`}
                className="col-span-2 sm:col-span-5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 sm:py-2 text-sm text-white placeholder-white/40 focus:border-cyan-400/50 focus:outline-none"
                placeholder="Player name"
              />
              <input
                type="text"
                value={player.position}
                onChange={(e) => updatePlayer(teamKey, i, 'position', e.target.value)}
                aria-label={`${teamKey} player ${i + 1} position`}
                className="col-span-1 sm:col-span-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 sm:py-2 text-sm text-white placeholder-white/40 focus:border-cyan-400/50 focus:outline-none"
                placeholder="Pos"
              />
              <input
                type="text"
                value={player.team}
                onChange={(e) => updatePlayer(teamKey, i, 'team', e.target.value)}
                aria-label={`${teamKey} player ${i + 1} team`}
                className="col-span-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-cyan-400/50 focus:outline-none"
                placeholder="Team"
              />
              <input
                type="text"
                value={player.age}
                onChange={(e) => updatePlayer(teamKey, i, 'age', e.target.value)}
                aria-label={`${teamKey} player ${i + 1} age`}
                className="col-span-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-cyan-400/50 focus:outline-none"
                placeholder="Age"
              />
              <button
                type="button"
                onClick={() => removePlayer(teamKey, i)}
                data-testid={`trade-remove-player-${teamKey}-${i}`}
                aria-label={`Remove ${teamKey} player ${i + 1}`}
                className="col-span-1 text-red-400/60 hover:text-red-400 text-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-white/60">Draft Picks Giving</label>
            <button
              type="button"
              onClick={() => addPick(teamKey)}
              disabled={!pickSupportEnabled}
              data-testid={`trade-add-pick-${teamKey}`}
              className="text-xs text-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add Pick
            </button>
          </div>
          {pickSupportEnabled ? (
            <>
              <p className="mb-2 text-[11px] text-white/40">
                Round options adapt to {sport}. Available rounds: {pickRoundOptions.join(', ')}.
              </p>
              {team.gives_picks.map((pick, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2">
              <input
                type="text"
                value={pick.year}
                onChange={(e) => updatePick(teamKey, i, 'year', e.target.value)}
                aria-label={`${teamKey} pick ${i + 1} year`}
                className="col-span-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-cyan-400/50 focus:outline-none"
                placeholder="Year"
              />
              <select
                value={pick.round}
                onChange={(e) => updatePick(teamKey, i, 'round', e.target.value)}
                aria-label={`${teamKey} pick ${i + 1} round`}
                className="col-span-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
              >
                {pickRoundOptions.map(r => <option key={r} value={r}>Round {r}</option>)}
              </select>
              <select
                value={pick.projected_range}
                onChange={(e) => updatePick(teamKey, i, 'projected_range', e.target.value)}
                aria-label={`${teamKey} pick ${i + 1} projected range`}
                className="col-span-5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
              >
                <option value="early">Early</option>
                <option value="mid">Mid</option>
                <option value="late">Late</option>
                <option value="unknown">Unknown</option>
              </select>
              <button
                type="button"
                onClick={() => removePick(teamKey, i)}
                data-testid={`trade-remove-pick-${teamKey}-${i}`}
                aria-label={`Remove ${teamKey} pick ${i + 1}`}
                className="col-span-1 text-red-400/60 hover:text-red-400 text-lg"
              >
                ×
              </button>
            </div>
              ))}
            </>
          ) : (
            <p className="mb-2 text-[11px] text-white/40">Draft picks are not currently configurable for {sport} in this flow.</p>
          )}
        </div>

        <div>
          <label htmlFor={`trade-${teamKey}-faab`} className="block text-sm text-white/60 mb-1.5">FAAB Giving</label>
          <input
            id={`trade-${teamKey}-faab`}
            type="number"
            value={team.gives_faab}
            onChange={(e) => setTeam({ ...team, gives_faab: Number(e.target.value) })}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white placeholder-white/40 focus:border-cyan-400/50 focus:outline-none"
            placeholder="$0"
            min={0}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={team.is_af_pro}
            onChange={(e) => setTeam({ ...team, is_af_pro: e.target.checked })}
            aria-label={`${teamKey} AF Pro member`}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-400"
          />
          <span className="text-sm text-white/70">AF Pro Member</span>
        </label>
      </div>
    </div>
  );

  const senderAssetLabels = [
    ...sender.gives_players.map((p) => p.name.trim()).filter(Boolean),
    ...sender.gives_picks
      .map((p) => (String(p.year).trim() && String(p.round).trim() ? `${p.year} Round ${p.round}` : ""))
      .filter(Boolean),
    ...(sender.gives_faab > 0 ? [`${sender.gives_faab} FAAB`] : []),
  ]
  const receiverAssetLabels = [
    ...receiver.gives_players.map((p) => p.name.trim()).filter(Boolean),
    ...receiver.gives_picks
      .map((p) => (String(p.year).trim() && String(p.round).trim() ? `${p.year} Round ${p.round}` : ""))
      .filter(Boolean),
    ...(receiver.gives_faab > 0 ? [`${receiver.gives_faab} FAAB`] : []),
  ]
  const valueBreakdown = formatValueBreakdown(
    {
      label: sender.manager_name || "Sender",
      assets: senderAssetLabels,
    },
    {
      label: receiver.manager_name || "Receiver",
      assets: receiverAssetLabels,
    }
  )
  const senderValueLens = estimateTradeValueLens(sender.gives_players, sender.gives_picks, sender.gives_faab)
  const receiverValueLens = estimateTradeValueLens(receiver.gives_players, receiver.gives_picks, receiver.gives_faab)
  const currentValueDelta = Number((senderValueLens.current - receiverValueLens.current).toFixed(1))
  const futureValueDelta = Number((senderValueLens.future - receiverValueLens.future).toFixed(1))

  const content = (
    <div role="main" className="min-h-screen bg-[#05060a] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[160px]" />
        <div className="absolute top-52 -left-56 h-[520px] w-[520px] rounded-full bg-fuchsia-500/7 blur-[180px]" />
        <div className="absolute -bottom-64 right-0 h-[560px] w-[560px] rounded-full bg-indigo-500/9 blur-[190px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 noise-overlay" />
      <div className="pointer-events-none absolute inset-0 scanline-overlay" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white/90 transition-colors mb-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="text-center mb-10">
          <div className="mx-auto w-fit rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-white/75 backdrop-blur mb-4">
            AI-Powered Analysis v2
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
            <span className="bg-gradient-to-b from-white via-white/85 to-white/55 bg-clip-text text-transparent">
              AF Trade Analyzer
            </span>
          </h1>
          <p className="mt-3 text-white/65 max-w-xl mx-auto">
            Get comprehensive AI analysis of your fantasy trade with sender/receiver breakdown.
          </p>
          <p className="mt-1 text-xs text-white/45 max-w-lg mx-auto">
            Add players and picks to each side, then click Evaluate Trade. Supports NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball, and Soccer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            {renderTeamForm(sender, setSender, 'Sender (Proposing)', 'sender')}
            {renderTeamForm(receiver, setReceiver, 'Receiver (Responding)', 'receiver')}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <h3 className="text-lg font-medium text-white/90 mb-4">League Settings</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="trade-league-format" className="block text-sm text-white/60 mb-1.5">Format</label>
                <select
                  id="trade-league-format"
                  value={leagueFormat}
                  onChange={(e) => setLeagueFormat(e.target.value as 'dynasty' | 'keeper' | 'redraft')}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white focus:border-cyan-400/50 focus:outline-none"
                >
                  <option value="dynasty">Dynasty</option>
                  <option value="keeper">Keeper</option>
                  <option value="redraft">Redraft</option>
                </select>
              </div>
              <div>
                <label htmlFor="trade-qb-format" className="block text-sm text-white/60 mb-1.5">QB Format</label>
                <select
                  id="trade-qb-format"
                  value={qbFormat}
                  onChange={(e) => setQbFormat(e.target.value as '1qb' | 'sf')}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white focus:border-cyan-400/50 focus:outline-none"
                >
                  <option value="sf">Superflex (2QB)</option>
                  <option value="1qb">1QB</option>
                </select>
              </div>
              <div>
                <label htmlFor="trade-sport" className="block text-sm text-white/60 mb-1.5">Sport</label>
                <select
                  id="trade-sport"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white focus:border-cyan-400/50 focus:outline-none"
                >
                  {SPORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="trade-scoring" className="block text-sm text-white/60 mb-1.5">Scoring</label>
                <select
                  id="trade-scoring"
                  value={scoring}
                  onChange={(e) => setScoring(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white focus:border-cyan-400/50 focus:outline-none"
                >
                  <option value="PPR">PPR</option>
                  <option value="Half PPR">Half PPR</option>
                  <option value="Standard">Standard</option>
                  <option value="TE Premium">TE Premium</option>
                  <option value="Superflex">Superflex</option>
                  <option value="Points">Points (NBA/NHL)</option>
                  <option value="Categories">Categories (NBA)</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <label htmlFor="trade-as-of-date" className="block text-sm text-white/60 mb-1.5">
                  As Of Date <span className="text-white/40">(optional - for historical analysis)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="trade-as-of-date"
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    min="2020-04-01"
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white focus:border-cyan-400/50 focus:outline-none [color-scheme:dark]"
                    placeholder="Leave empty for today's values"
                  />
                  {asOfDate && (
                    <button
                      type="button"
                      onClick={() => setAsOfDate('')}
                      aria-label="Clear as-of date"
                      className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {asOfDate && (
                  <p className="text-xs text-cyan-400/80 mt-1.5">
                    Using historical market values from {formatInTimezone(asOfDate, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <ErrorStateRenderer
              compact
              title="Trade evaluation failed"
              message={error}
              onRetry={
                error.includes("Add at least one trade asset")
                  ? undefined
                  : () => void evaluateTrade()
              }
              actions={resolveRecoveryActions("tool_page").map((action) => ({
                id: action.id,
                label: action.label,
                href: action.href,
              }))}
              testId="trade-evaluator-error-state"
            />
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={loading || !canAnalyzeTrade}
              data-testid="trade-evaluate-button"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-4 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed sm:flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing Trade...
                </span>
              ) : (
                'Evaluate Trade'
              )}
            </button>
            <button
              type="button"
              onClick={swapSides}
              data-testid="trade-swap-sides-button"
              className="rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 font-medium text-white/80 hover:bg-white/[0.08] transition-all"
            >
              Swap sides
            </button>
            <button
              type="button"
              onClick={resetTrade}
              data-testid="trade-reset-button"
              className="rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 font-medium text-white/60 hover:bg-white/[0.08] transition-all"
            >
              Reset trade
            </button>
          </div>
          {!canAnalyzeTrade && (
            <p className="text-xs text-white/45">Add at least one player, pick, or FAAB on both sides to analyze.</p>
          )}
        </form>

        {result && (
          <div className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {(["overview", "breakdown", "outlook"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveResultTab(tab)}
                  data-testid={`trade-result-tab-${tab}`}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    activeResultTab === tab
                      ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                      : "border-white/15 bg-white/[0.03] text-white/65 hover:text-white/90"
                  }`}
                >
                  {tab === "overview" ? "Summary" : tab === "breakdown" ? "Value Breakdown" : "Current/Future Outlook"}
                </button>
              ))}
            </div>

            {staleBanner && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                {staleBanner}
              </div>
            )}

            {activeResultTab === "overview" && (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur text-center">
                  <div className="mb-4">
                    <span className="text-sm text-white/50 uppercase tracking-wider">Fairness Score</span>
                    <div className={`text-6xl font-bold mt-2 ${getFairnessColor(getFairnessScore(result))}`}>
                      {getFairnessScore(result)}
                    </div>
                    <div className="text-white/40 text-sm mt-1">out of 100 (50 = perfectly fair)</div>
                  </div>

                  <div className="inline-block rounded-full px-4 py-2 bg-white/[0.06] border border-white/10">
                    <span className="text-white/60">Winner: </span>
                    <span className="text-white font-medium">{getWinnerLabel(result.evaluation?.winner)}</span>
                  </div>

                  <p className="mt-6 text-white/70 max-w-2xl mx-auto">
                    {result.evaluation?.summary || result.evaluation?.explanation}
                  </p>
                  <Link
                    href={
                      aiAssistantEnabled
                        ? getTradeAnalyzerAIChatUrl(
                            buildTradeSummaryForAI(
                              senderAssetLabels.join(', ') || '—',
                              receiverAssetLabels.join(', ') || '—',
                              sport,
                              {
                                fairnessScore: getFairnessScore(result),
                                winnerLabel: getWinnerLabel(result.evaluation?.winner),
                              }
                            ),
                            {
                              insightType: 'trade',
                              sport,
                            }
                          )
                        : `/trade-finder?context=analyzer&sport=${encodeURIComponent(sport)}`
                    }
                    data-testid="trade-ai-explanation-link"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                  >
                    <span>
                      {aiAssistantEnabled
                        ? 'Discuss in AI Chat'
                        : aiAvailabilityLoading
                          ? 'Checking AI availability...'
                          : 'Open deterministic trade finder'}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </Link>
                </div>

                {result.tradeInsights && (
                  <div className="space-y-4">
                    {result.tradeInsights.veto && (
                      <div className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">🚫</span>
                          <h3 className="text-lg font-bold text-red-400">Trade Not Recommended</h3>
                        </div>
                        <p className="text-red-300">{result.tradeInsights.vetoReason}</p>
                      </div>
                    )}
                    {result.tradeInsights.expertWarning && !result.tradeInsights.veto && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⚠️</span>
                          <span className="text-amber-300 font-medium">Expert Warning:</span>
                          <span className="text-amber-200/80">{result.tradeInsights.expertWarning}</span>
                        </div>
                      </div>
                    )}
                    <IdpTradeLineupWarning idpLineupWarning={result.tradeInsights.idpLineupWarning} />
                    {result.tradeInsights.labels.length > 0 && (
                      <div className="flex flex-wrap gap-3 justify-center">
                        {result.tradeInsights.labels.map((label) => (
                          <div
                            key={label.id}
                            className="group relative rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 cursor-help"
                          >
                            <span className="text-emerald-400 font-medium">{label.emoji} {label.name}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                              <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white shadow-xl whitespace-nowrap max-w-xs">
                                {label.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.tradeInsights.warnings.length > 0 && (
                      <div className="flex flex-wrap gap-3 justify-center">
                        {result.tradeInsights.warnings.map((warning) => (
                          <div
                            key={warning.id}
                            className="group relative rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 cursor-help"
                          >
                            <span className="text-orange-400 font-medium">{warning.emoji} {warning.name}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                              <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white shadow-xl whitespace-nowrap max-w-xs">
                                {warning.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-center text-sm text-white/50">
                      Fairness Score: <span className={result.tradeInsights.fairnessScore >= 45 && result.tradeInsights.fairnessScore <= 55 ? 'text-emerald-400' : result.tradeInsights.fairnessScore >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                        {result.tradeInsights.fairnessScore}/100
                      </span>
                      <span className="ml-2 text-xs text-white/30">
                        ({result.tradeInsights.fairnessMethod === 'lineup' ? 'lineup-based' : 'value-based'})
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeResultTab === "breakdown" && (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
                    <h3 className="mb-3 text-lg font-medium text-cyan-300">{sender.manager_name || "Sender"} gives</h3>
                    <p className="text-sm text-white/70">{valueBreakdown.sideA}</p>
                  </div>
                  <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-6">
                    <h3 className="mb-3 text-lg font-medium text-fuchsia-300">{receiver.manager_name || "Receiver"} gives</h3>
                    <p className="text-sm text-white/70">{valueBreakdown.sideB}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Current vs Future Value Lens</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                      <div className="text-xs text-cyan-200">{sender.manager_name || "Sender"}</div>
                      <div className="mt-1 text-xs text-white/70">Current: <span className="font-semibold text-white">{senderValueLens.current}</span></div>
                      <div className="text-xs text-white/70">Future: <span className="font-semibold text-white">{senderValueLens.future}</span></div>
                    </div>
                    <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3">
                      <div className="text-xs text-fuchsia-200">{receiver.manager_name || "Receiver"}</div>
                      <div className="mt-1 text-xs text-white/70">Current: <span className="font-semibold text-white">{receiverValueLens.current}</span></div>
                      <div className="text-xs text-white/70">Future: <span className="font-semibold text-white">{receiverValueLens.future}</span></div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-white/15 bg-white/[0.03] px-2 py-1 text-white/65">
                      Current delta: <span className={currentValueDelta >= 0 ? 'text-cyan-300' : 'text-fuchsia-300'}>{currentValueDelta >= 0 ? '+' : ''}{currentValueDelta}</span>
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/[0.03] px-2 py-1 text-white/65">
                      Future delta: <span className={futureValueDelta >= 0 ? 'text-cyan-300' : 'text-fuchsia-300'}>{futureValueDelta >= 0 ? '+' : ''}{futureValueDelta}</span>
                    </span>
                  </div>
                </div>

                {result.evaluation?.risk_flags && result.evaluation.risk_flags.length > 0 && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
                    <h3 className="text-lg font-medium text-yellow-400 mb-3">Risk Flags</h3>
                    <ul className="space-y-2">
                      {result.evaluation.risk_flags.map((flag, i) => (
                        <li key={i} className="flex gap-2 text-white/70 text-sm">
                          <span className="text-yellow-400">!</span>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.improvements?.best_counter_offer && (
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
                    <h3 className="text-lg font-medium text-cyan-400 mb-3">Suggested Counter-Offer</h3>
                    <p className="text-white/70 text-sm mb-4">{result.improvements.best_counter_offer.why_this_is_better}</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      {result.improvements.best_counter_offer.sender_gives_changes?.length ? (
                        <div>
                          <h4 className="text-sm text-white/60 mb-2">Sender adjustments:</h4>
                          <ul className="space-y-1">
                            {result.improvements.best_counter_offer.sender_gives_changes.map((adj, i) => (
                              <li key={i} className="text-white/70 text-sm">→ {adj}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {result.improvements.best_counter_offer.receiver_gives_changes?.length ? (
                        <div>
                          <h4 className="text-sm text-white/60 mb-2">Receiver adjustments:</h4>
                          <ul className="space-y-1">
                            {result.improvements.best_counter_offer.receiver_gives_changes.map((adj, i) => (
                              <li key={i} className="text-white/70 text-sm">→ {adj}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {result.user_message && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
                      <h3 className="text-lg font-medium text-cyan-400 mb-3">Message for {sender.manager_name || 'Sender'}</h3>
                      <p className="text-white/70 text-sm">{result.user_message.to_sender}</p>
                    </div>
                    <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-6">
                      <h3 className="text-lg font-medium text-fuchsia-400 mb-3">Message for {receiver.manager_name || 'Receiver'}</h3>
                      <p className="text-white/70 text-sm">{result.user_message.to_receiver}</p>
                    </div>
                  </div>
                )}

                <Link
                  href={`/trade-finder?context=analyzer&sport=${encodeURIComponent(sport)}`}
                  data-testid="trade-propose-flow-link"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.08]"
                >
                  Open trade finder / propose flow
                </Link>
              </>
            )}

            {activeResultTab === "outlook" && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOutlookMode('current')}
                    data-testid="trade-outlook-current-toggle"
                    className={`rounded-lg border px-3 py-1.5 text-sm ${outlookMode === 'current' ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200' : 'border-white/15 bg-white/[0.03] text-white/65'}`}
                  >
                    Current season outlook
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutlookMode('future')}
                    data-testid="trade-outlook-future-toggle"
                    className={`rounded-lg border px-3 py-1.5 text-sm ${outlookMode === 'future' ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200' : 'border-white/15 bg-white/[0.03] text-white/65'}`}
                  >
                    Future / dynasty outlook
                  </button>
                </div>

                {outlookMode === 'current' && result.end_of_season_projection && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <h3 className="text-lg font-medium text-white/90 mb-3">End of Season Projection</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-white/50">{sender.manager_name || 'Sender'}: </span>
                        <span className="text-white/70">{result.end_of_season_projection.sender}</span>
                      </div>
                      <div>
                        <span className="text-white/50">{receiver.manager_name || 'Receiver'}: </span>
                        <span className="text-white/70">{result.end_of_season_projection.receiver}</span>
                      </div>
                    </div>
                  </div>
                )}

                {outlookMode === 'future' && result.dynasty_idp_outlook && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <h3 className="text-lg font-medium text-white/90 mb-3">Dynasty Outlook</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-white/50">{sender.manager_name || 'Sender'}: </span>
                        <span className="text-white/70">{result.dynasty_idp_outlook.sender}</span>
                      </div>
                      <div>
                        <span className="text-white/50">{receiver.manager_name || 'Receiver'}: </span>
                        <span className="text-white/70">{result.dynasty_idp_outlook.receiver}</span>
                      </div>
                    </div>
                  </div>
                )}

                {((outlookMode === 'current' && !result.end_of_season_projection) ||
                  (outlookMode === 'future' && !result.dynasty_idp_outlook)) && (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm text-white/55">
                    No {outlookMode === 'current' ? 'current season' : 'future dynasty'} outlook data returned for this trade.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
            <h2 className="text-lg font-semibold text-white/85">{TRADE_ANALYZER_EMPTY_TITLE}</h2>
            <p className="mt-2 text-sm text-white/55">{TRADE_ANALYZER_EMPTY_SUBTITLE}</p>
          </div>
        )}
      </div>
    </div>
  );
  return content;
}

export default function TradeEvaluatorPage() {
  return (
    <Suspense fallback={<div role="main" className="min-h-screen mode-readable" />}>
      <TradeEvaluatorInner />
    </Suspense>
  )
}
