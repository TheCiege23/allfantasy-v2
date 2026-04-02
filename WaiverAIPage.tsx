'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

// ─── TYPES ───────────────────────────────────────────────────────

type WaiverType   = 'FAAB' | 'Rolling' | 'Priority'
type LeagueFormat = 'Redraft' | 'Dynasty' | 'Keeper'
type Sport        = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB' | 'SOCCER'
type Position     = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF' | 'FLEX' | 'IDP'
type InjuryStatus = 'OUT' | 'Q' | 'D' | 'IR' | null

interface UserLeague {
  id:         string
  name:       string
  platform:   'sleeper' | 'yahoo' | 'mfl' | 'fantrax' | 'espn'
  sport:      Sport
  format:     LeagueFormat
  scoring:    string
  teamCount:  number
  season:     string
  waiverType: WaiverType
  totalFaab:  number
  myFaab:     number
  week:       number
}

interface RosterPlayer {
  id:           string
  name:         string
  position:     Position
  team:         string
  projectedPts: number
  injuryStatus: InjuryStatus
  isStarter:    boolean
}

interface WirePlayer {
  id:           string
  name:         string
  position:     Position
  team:         string
  ownership:    number      // 0–100
  projectedPts: number
  aiScore:      number      // 1–10
  reason:       string
  faabLow:      number
  faabHigh:     number
}

interface ClaimItem {
  pickup:   WirePlayer
  dropId:   string | null   // roster player id to drop
}

interface WaiverResult {
  rank:       number
  player:     WirePlayer
  confidence: number
  insight:    string
  faabStrategy: string
  tag:        'Best Add' | 'Streaming' | 'Stash' | 'Handcuff'
}

interface AnalysisResult {
  recommendations: WaiverResult[]
  teamNeedsSummary: string
  faabStrategy:    string
  pECRIterations?: number
}

// ─── CONSTANTS ───────────────────────────────────────────────────

const PLATFORM_CONFIG = {
  sleeper: { label: 'Sleeper', emoji: '🌙', color: '#818cf8' },
  yahoo:   { label: 'Yahoo',   emoji: '🏈', color: '#ef4444' },
  mfl:     { label: 'MFL',     emoji: '🏆', color: '#fbbf24' },
  fantrax: { label: 'Fantrax', emoji: '📊', color: '#34d399' },
  espn:    { label: 'ESPN',    emoji: '🔴', color: '#f97316' },
}

const INJURY_CONFIG = {
  OUT: { label: 'OUT', bg: 'bg-red-500',    text: 'text-white'     },
  Q:   { label: 'Q',   bg: 'bg-yellow-500', text: 'text-black'     },
  D:   { label: 'D',   bg: 'bg-orange-500', text: 'text-white'     },
  IR:  { label: 'IR',  bg: 'bg-gray-600',   text: 'text-white/70'  },
}

const POS_COLORS: Record<string, string> = {
  QB: 'bg-red-500/20 text-red-300 border-red-500/30',
  RB: 'bg-green-500/20 text-green-300 border-green-500/30',
  WR: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  TE: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  K:  'bg-gray-500/20 text-gray-300 border-gray-500/30',
  DEF:'bg-purple-500/20 text-purple-300 border-purple-500/30',
  FLEX:'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  IDP:'bg-pink-500/20 text-pink-300 border-pink-500/30',
}

const FILTER_POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'] as const
const PECR_PHASES = [
  { key: 'plan',    label: 'Planning analysis',       icon: '📋' },
  { key: 'score',   label: 'Scoring candidates',      icon: '💰' },
  { key: 'needs',   label: 'Computing team needs',    icon: '📊' },
  { key: 'grok',    label: 'Grok AI evaluation',      icon: '🧠' },
  { key: 'check',   label: 'Quality-gating result',   icon: '✅' },
]

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,6)}` }

function aiScoreColor(score: number) {
  if (score >= 8) return '#10b981'
  if (score >= 5) return '#fbbf24'
  return '#ef4444'
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────

function PosBadge({ pos }: { pos: string }) {
  return (
    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${POS_COLORS[pos] ?? 'bg-white/10 text-white/60 border-white/20'}`}>
      {pos}
    </span>
  )
}

function InjuryBadge({ status }: { status: InjuryStatus }) {
  if (!status) return null
  const cfg = INJURY_CONFIG[status]
  return (
    <span className={`text-[9px] font-black px-1 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

function AiScoreRing({ score }: { score: number }) {
  const color = aiScoreColor(score)
  const pct   = (score / 10) * 100
  const r = 14, circ = 2 * Math.PI * r
  return (
    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="40" height="40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(pct/100)*circ} ${circ}`}
          strokeLinecap="round"/>
      </svg>
      <span className="text-[11px] font-black" style={{ color }}>{score.toFixed(1)}</span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0c0c1e] p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-5 rounded bg-white/10"/>
        <div className="h-4 flex-1 rounded bg-white/10"/>
        <div className="w-12 h-4 rounded bg-white/10"/>
      </div>
      <div className="h-3 w-3/4 rounded bg-white/6 mb-2"/>
      <div className="h-3 w-1/2 rounded bg-white/6"/>
    </div>
  )
}

function PECRPhaseAnimation({ phase }: { phase: string }) {
  const activeIdx = PECR_PHASES.findIndex(p => p.key === phase)
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-6 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-green-500 animate-bounce"
               style={{ animationDelay: `${i*150}ms` }}/>
        ))}
      </div>
      <div className="space-y-2 max-w-xs mx-auto">
        {PECR_PHASES.map((p, i) => (
          <div key={p.key} className={`flex items-center gap-3 rounded-xl px-4 py-2 transition-all ${
            i < activeIdx  ? 'opacity-40' :
            i === activeIdx ? 'bg-green-500/10 border border-green-500/20' : 'opacity-20'
          }`}>
            <span>{p.icon}</span>
            <span className="text-sm text-white/80 flex-1 text-left">{p.label}</span>
            {i < activeIdx  && <span className="text-green-400 text-xs">✓</span>}
            {i === activeIdx && <div className="w-3 h-3 rounded-full border border-green-500 border-t-transparent animate-spin"/>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── LEAGUE GATE ─────────────────────────────────────────────────

function LeagueGate({ onSelect }: { onSelect: (league: UserLeague) => void }) {
  const [leagues,  setLeagues]  = useState<UserLeague[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    // Try list endpoint first, fall back to sleeper-user-leagues
    fetch('/api/league/list')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const raw = data.leagues ?? data.data ?? data ?? []
        setLeagues(Array.isArray(raw) ? raw : [])
      })
      .catch(() =>
        fetch('/api/league/sleeper-user-leagues')
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => {
            const raw = data.leagues ?? data.data ?? data ?? []
            setLeagues(Array.isArray(raw) ? raw : [])
          })
          .catch(() => setError('Could not load leagues.'))
      )
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#07071a] text-white">
      {/* Header */}
      <div className="border-b border-white/6 bg-[#07071a]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-green-400 uppercase tracking-widest">🌿 AI-Powered</span>
          </div>
          <h1 className="text-2xl font-black text-white">Waiver Wire AI</h1>
          <p className="text-sm text-white/45 mt-0.5">League-specific pickup recommendations powered by Grok</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-1">Select a League</h2>
          <p className="text-sm text-white/45">
            Choose which league to analyze. Waiver recommendations are tailored to your roster,
            FAAB budget, scoring settings, and positional needs.
          </p>
        </div>

        {loading && (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl border border-white/6 bg-[#0c0c1e] p-5 animate-pulse h-40"/>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && leagues.length === 0 && (
          <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-10 text-center">
            <div className="text-5xl mb-4">🏈</div>
            <h3 className="text-xl font-bold text-white mb-2">No leagues connected yet</h3>
            <p className="text-sm text-white/50 mb-6">
              Import a league from Sleeper, Yahoo, or MFL to use Waiver Wire AI.
            </p>
            <Link
              href="/dashboard/rankings"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
            >
              Import a League →
            </Link>
          </div>
        )}

        {!loading && leagues.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {leagues.map(league => {
              const plat = PLATFORM_CONFIG[league.platform] ?? PLATFORM_CONFIG.sleeper
              const isHovered = hoveredId === league.id
              return (
                <button
                  key={league.id}
                  onClick={() => onSelect(league)}
                  onMouseEnter={() => setHoveredId(league.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="text-left rounded-2xl border bg-[#0c0c1e] p-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    borderColor: isHovered ? `${plat.color}60` : 'rgba(255,255,255,0.08)',
                    boxShadow:   isHovered ? `0 0 24px ${plat.color}20` : 'none',
                  }}
                >
                  {/* Platform + badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{plat.emoji}</span>
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: plat.color }}>
                        {plat.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-white/8 rounded-full px-2 py-0.5 text-white/50">
                        {league.sport}
                      </span>
                      <span className="text-[10px] bg-white/8 rounded-full px-2 py-0.5 text-white/50">
                        {league.format}
                      </span>
                    </div>
                  </div>

                  {/* League name */}
                  <h3 className="text-base font-bold text-white mb-1 truncate">{league.name}</h3>

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-[11px] text-white/35">
                    <span>{league.teamCount} teams</span>
                    <span>·</span>
                    <span>{league.scoring}</span>
                    <span>·</span>
                    <span>Week {league.week}</span>
                  </div>

                  {/* FAAB */}
                  {league.waiverType === 'FAAB' && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(league.myFaab / league.totalFaab) * 100}%`,
                            background: plat.color,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-bold" style={{ color: plat.color }}>
                        ${league.myFaab} FAAB
                      </span>
                    </div>
                  )}

                  {/* Select CTA */}
                  <div className={`mt-4 text-sm font-bold transition-all ${isHovered ? 'text-white' : 'text-white/30'}`}
                       style={isHovered ? { color: plat.color } : {}}>
                    Select League →
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ROSTER PANEL ─────────────────────────────────────────────────

function RosterPanel({
  roster, dropCandidates, myFaab, onToggleDrop, onFaabChange,
}: {
  roster:        RosterPlayer[]
  dropCandidates: Set<string>
  myFaab:        number
  onToggleDrop:  (id: string) => void
  onFaabChange:  (v: number) => void
}) {
  const starters = roster.filter(p => p.isStarter)
  const bench    = roster.filter(p => !p.isStarter)

  const PlayerRow = ({ p }: { p: RosterPlayer }) => {
    const isDrop = dropCandidates.has(p.id)
    return (
      <div
        onClick={() => onToggleDrop(p.id)}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all group border ${
          isDrop
            ? 'border-red-500/30 bg-red-500/8'
            : 'border-transparent hover:border-white/8 hover:bg-white/3'
        }`}
      >
        <PosBadge pos={p.position}/>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold truncate ${isDrop ? 'line-through text-red-400' : 'text-white/85'}`}>
            {p.name}
          </div>
          <div className="text-[10px] text-white/30">{p.team}</div>
        </div>
        <InjuryBadge status={p.injuryStatus}/>
        <div className="text-xs text-white/40 font-mono w-10 text-right shrink-0">
          {p.projectedPts.toFixed(1)}
        </div>
        {isDrop && <span className="text-[10px] font-bold text-red-400 shrink-0">DROP</span>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-white/6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">My Roster</h2>
          <span className="text-[10px] text-white/30">click to mark drop</span>
        </div>
        {/* FAAB */}
        <div className="flex items-center gap-2 bg-white/4 rounded-xl px-3 py-2">
          <span className="text-xs text-white/40">FAAB</span>
          <span className="text-green-400 font-bold text-sm">$</span>
          <input
            type="number"
            value={myFaab}
            min={0}
            onChange={e => onFaabChange(Number(e.target.value) || 0)}
            className="flex-1 bg-transparent text-sm font-bold text-white focus:outline-none w-16"
          />
          <span className="text-[10px] text-white/30">remaining</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {starters.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-2 py-1">Starters</div>
            {starters.map(p => <PlayerRow key={p.id} p={p}/>)}
          </>
        )}
        {bench.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-2 pt-3 pb-1">Bench</div>
            {bench.map(p => <PlayerRow key={p.id} p={p}/>)}
          </>
        )}
        {roster.length === 0 && (
          <div className="text-center text-xs text-white/25 py-8">Loading roster...</div>
        )}
      </div>
    </div>
  )
}

// ─── WIRE PANEL ──────────────────────────────────────────────────

function WirePanel({
  players, loading, queue, posFilter,
  onPosFilter, onQueue, onRefresh,
}: {
  players:    WirePlayer[]
  loading:    boolean
  queue:      ClaimItem[]
  posFilter:  string
  onPosFilter:(p: string) => void
  onQueue:    (p: WirePlayer) => void
  onRefresh:  () => void
}) {
  const filtered = posFilter === 'ALL'
    ? players
    : players.filter(p => p.position === posFilter || (posFilter === 'FLEX' && ['RB','WR','TE'].includes(p.position)))

  const isQueued = (id: string) => queue.some(q => q.pickup.id === id)

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {FILTER_POSITIONS.map(pos => (
          <button
            key={pos}
            onClick={() => onPosFilter(pos)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              posFilter === pos
                ? 'bg-green-500 text-black'
                : 'bg-white/6 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            {pos}
          </button>
        ))}
        <button
          onClick={onRefresh}
          className="ml-auto text-xs text-white/35 hover:text-white border border-white/10 hover:border-white/25 rounded-xl px-3 py-1.5 transition-all"
        >
          ⟳ Refresh
        </button>
      </div>

      {/* Player cards */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading && [1,2,3,4,5].map(i => <SkeletonCard key={i}/>)}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-white/6 bg-[#0c0c1e] p-8 text-center">
            <p className="text-sm text-white/35">No players found for this filter</p>
          </div>
        )}

        {!loading && filtered.map(p => {
          const queued  = isQueued(p.id)
          const color   = aiScoreColor(p.aiScore)
          return (
            <div key={p.id} className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-4 transition-all hover:border-white/15">
              {/* Top row */}
              <div className="flex items-start gap-3 mb-2">
                <AiScoreRing score={p.aiScore}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <PosBadge pos={p.position}/>
                    <span className="text-sm font-bold text-white truncate">{p.name}</span>
                    <span className="text-xs text-white/40">{p.team}</span>
                  </div>
                  {/* Ownership bar */}
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-white/30" style={{ width: `${p.ownership}%` }}/>
                    </div>
                    <span className="text-[10px] text-white/35 shrink-0">{p.ownership}% owned</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-white">{p.projectedPts.toFixed(1)}</div>
                  <div className="text-[10px] text-white/30">proj pts</div>
                </div>
              </div>

              {/* Reason */}
              <p className="text-xs text-white/55 italic leading-relaxed mb-3 line-clamp-2">
                {p.reason}
              </p>

              {/* Bottom row */}
              <div className="flex items-center gap-2">
                <div className="rounded-lg px-2.5 py-1 text-[11px] font-bold border"
                     style={{ color, borderColor: `${color}40`, background: `${color}10` }}>
                  FAAB ${p.faabLow}–${p.faabHigh}
                </div>
                <button
                  onClick={() => !queued && onQueue(p)}
                  disabled={queued}
                  className={`ml-auto text-xs font-bold px-4 py-1.5 rounded-xl transition-all ${
                    queued
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30 cursor-default'
                      : 'bg-green-500 text-black hover:bg-green-400 active:scale-95'
                  }`}
                >
                  {queued ? '✓ Queued' : '+ Queue'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ANALYSIS PANEL ──────────────────────────────────────────────

function AnalysisPanel({
  queue, roster, league, myFaab, loading, phaseName, results,
  onRemove, onDropChange, onAnalyze,
}: {
  queue:        ClaimItem[]
  roster:       RosterPlayer[]
  league:       UserLeague
  myFaab:       number
  loading:      boolean
  phaseName:    string
  results:      AnalysisResult | null
  onRemove:     (id: string) => void
  onDropChange: (pickupId: string, dropId: string) => void
  onAnalyze:    () => void
}) {
  const benchPlayers = roster.filter(p => !p.isStarter)

  const teamNeeds = useMemo(() => {
    if (!roster.length) return []
    const positions = ['QB','RB','WR','TE','K','DEF']
    return positions.map(pos => {
      const count = roster.filter(p => p.position === pos).length
      const max   = pos === 'QB' ? 3 : pos === 'TE' ? 4 : pos === 'K' || pos === 'DEF' ? 2 : 8
      const pct   = Math.min(100, (count / max) * 100)
      const need  = pct < 40 ? 'Weak' : pct < 70 ? 'OK' : 'Strong'
      return { pos, count, pct, need }
    })
  }, [roster])

  if (loading) return <PECRPhaseAnimation phase={phaseName}/>

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] overflow-hidden flex flex-col">
      {/* FAAB budget */}
      <div className="p-4 border-b border-white/6">
        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">FAAB Budget</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">My remaining</span>
          <span className="font-bold text-green-400">${myFaab}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-white/60">League avg</span>
          <span className="font-bold text-white/60">${league.totalFaab > 0 ? Math.round(league.totalFaab * 0.6) : '—'}</span>
        </div>
      </div>

      {/* Team needs */}
      {teamNeeds.length > 0 && (
        <div className="p-4 border-b border-white/6">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Team Needs</div>
          <div className="space-y-2">
            {teamNeeds.map(n => (
              <div key={n.pos} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/40 w-7">{n.pos}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${n.pct}%`,
                      background: n.need === 'Weak' ? '#ef4444' : n.need === 'OK' ? '#fbbf24' : '#10b981',
                    }}
                  />
                </div>
                <span className={`text-[10px] font-bold w-12 text-right ${
                  n.need === 'Weak' ? 'text-red-400' : n.need === 'OK' ? 'text-yellow-400' : 'text-green-400'
                }`}>{n.need}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim queue */}
      <div className="p-4 border-b border-white/6 flex-1">
        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
          Claim Queue ({queue.length})
        </div>
        {queue.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-white/25 italic">Queue pickups from the wire →</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map(item => (
              <div key={item.pickup.id} className="rounded-xl border border-white/8 bg-white/3 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">+</span>
                    <PosBadge pos={item.pickup.position}/>
                    <span className="text-xs font-bold text-white truncate max-w-[100px]">{item.pickup.name}</span>
                  </div>
                  <button
                    onClick={() => onRemove(item.pickup.id)}
                    className="text-white/25 hover:text-red-400 text-sm transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-red-400/10"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-red-400 font-bold">–</span>
                  <select
                    value={item.dropId ?? ''}
                    onChange={e => onDropChange(item.pickup.id, e.target.value)}
                    className="flex-1 text-[11px] rounded-lg border border-white/10 bg-[#07071a] text-white/70 px-2 py-1 focus:border-red-500/40 focus:outline-none"
                  >
                    <option value="">Select player to drop...</option>
                    {benchPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analyze button */}
      <div className="p-4">
        <button
          onClick={onAnalyze}
          disabled={queue.length === 0 || loading}
          className="w-full rounded-2xl py-3.5 text-sm font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: queue.length > 0
              ? 'linear-gradient(135deg, #059669, #0891b2)'
              : 'rgba(255,255,255,0.05)',
            boxShadow: queue.length > 0
              ? '0 6px 24px rgba(5,150,105,0.3)'
              : 'none',
          }}
        >
          ⚡ Analyze My Waivers
        </button>
        {queue.length === 0 && (
          <p className="text-[10px] text-white/25 text-center mt-2">
            Queue at least one pickup to analyze
          </p>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="border-t border-white/6 p-4 space-y-4">
          <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
            AI Recommendations
            {results.pECRIterations && results.pECRIterations > 1 && (
              <span className="text-white/20 ml-auto">{results.pECRIterations} iterations</span>
            )}
          </div>

          {results.recommendations.map(r => (
            <div key={r.player.id} className="rounded-xl border border-white/8 bg-white/2 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center bg-green-500/20 text-green-400">
                  {r.rank}
                </div>
                <PosBadge pos={r.player.position}/>
                <span className="text-sm font-bold text-white flex-1 truncate">{r.player.name}</span>
                <span className="text-[10px] rounded-full px-2 py-0.5 font-bold"
                      style={{
                        background: r.tag === 'Best Add' ? '#10b98120' : r.tag === 'Streaming' ? '#3b82f620' : '#f59e0b20',
                        color:      r.tag === 'Best Add' ? '#10b981' : r.tag === 'Streaming' ? '#60a5fa' : '#fbbf24',
                      }}>
                  {r.tag}
                </span>
              </div>
              <p className="text-xs text-white/55 italic leading-relaxed mb-2">{r.insight}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Confidence</span>
                <span className="font-bold text-green-400">{Math.round(r.confidence * 100)}%</span>
              </div>
              {r.faabStrategy && (
                <div className="mt-2 rounded-lg bg-white/4 px-2.5 py-1.5 text-[11px] text-white/50">
                  💡 {r.faabStrategy}
                </div>
              )}
            </div>
          ))}

          {results.faabStrategy && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
              <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">FAAB Strategy</p>
              <p className="text-xs text-white/65 leading-relaxed">{results.faabStrategy}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────

export default function WaiverAIPage() {
  const { data: session } = useSession()

  // League gate
  const [league,    setLeague]    = useState<UserLeague | null>(null)

  // League data
  const [roster,    setRoster]    = useState<RosterPlayer[]>([])
  const [wire,      setWire]      = useState<WirePlayer[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [wireLoading,   setWireLoading]   = useState(false)

  // UI state
  const [week,       setWeek]       = useState(1)
  const [myFaab,     setMyFaab]     = useState(75)
  const [posFilter,  setPosFilter]  = useState('ALL')
  const [dropCands,  setDropCands]  = useState<Set<string>>(new Set())
  const [queue,      setQueue]      = useState<ClaimItem[]>([])

  // Analysis state
  const [analyzing,  setAnalyzing]  = useState(false)
  const [phaseName,  setPhaseName]  = useState('plan')
  const [results,    setResults]    = useState<AnalysisResult | null>(null)
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null)

  // Load roster + wire when league is selected
  useEffect(() => {
    if (!league) return

    setWeek(league.week)
    setMyFaab(league.myFaab || 75)
    setDropCands(new Set())
    setQueue([])
    setResults(null)

    // Load roster
    setRosterLoading(true)
    fetch(`/api/league/roster?leagueId=${league.id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const raw: RosterPlayer[] = (data.roster ?? data.players ?? data ?? []).map((p: Record<string,unknown>) => ({
          id:           String(p.id ?? p.playerId ?? uid()),
          name:         String(p.name ?? p.playerName ?? 'Unknown'),
          position:     String(p.position ?? 'WR') as Position,
          team:         String(p.team ?? p.nflTeam ?? ''),
          projectedPts: Number(p.projectedPts ?? p.projected ?? 0),
          injuryStatus: (p.injuryStatus ?? p.status ?? null) as InjuryStatus,
          isStarter:    Boolean(p.isStarter ?? p.starter ?? false),
        }))
        setRoster(raw)
      })
      .catch(() => setRoster([]))
      .finally(() => setRosterLoading(false))

    // Load wire suggestions
    refreshWire(league.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league])

  const refreshWire = useCallback((leagueId: string) => {
    setWireLoading(true)
    setWire([])
    fetch(`/api/waiver-ai-suggest?leagueId=${leagueId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const raw: WirePlayer[] = (data.suggestions ?? data.players ?? data ?? []).map((p: Record<string,unknown>) => ({
          id:           String(p.id ?? p.playerId ?? uid()),
          name:         String(p.name ?? p.playerName ?? 'Unknown'),
          position:     String(p.position ?? 'WR') as Position,
          team:         String(p.team ?? p.nflTeam ?? ''),
          ownership:    Number(p.ownership ?? p.ownershipPct ?? 0),
          projectedPts: Number(p.projectedPts ?? p.projected ?? 0),
          aiScore:      Number(p.aiScore ?? p.score ?? 5),
          reason:       String(p.reason ?? p.aiInsight ?? ''),
          faabLow:      Number(p.faabLow ?? p.faabMin ?? 0),
          faabHigh:     Number(p.faabHigh ?? p.faabMax ?? 0),
        }))
        setWire(raw)
      })
      .catch(() => setWire([]))
      .finally(() => setWireLoading(false))
  }, [])

  const queuePlayer = useCallback((p: WirePlayer) => {
    setQueue(q => q.some(c => c.pickup.id === p.id) ? q : [...q, { pickup: p, dropId: null }])
  }, [])

  const removeFromQueue = useCallback((id: string) => {
    setQueue(q => q.filter(c => c.pickup.id !== id))
  }, [])

  const updateDrop = useCallback((pickupId: string, dropId: string) => {
    setQueue(q => q.map(c => c.pickup.id === pickupId ? { ...c, dropId } : c))
  }, [])

  const toggleDrop = useCallback((id: string) => {
    setDropCands(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const analyze = useCallback(async () => {
    if (!league || queue.length === 0 || analyzing) return
    setAnalyzing(true)
    setResults(null)
    setAnalyzeErr(null)
    setPhaseName('plan')

    const phases = ['score', 'needs', 'grok', 'check']
    const timers = phases.map((p, i) => setTimeout(() => setPhaseName(p), (i + 1) * 1800))

    try {
      const starters = roster.filter(p => p.isStarter)
      const bench    = roster.filter(p => !p.isStarter)
      const body = {
        format:          league.format,
        sport:           league.sport,
        waiverType:      league.waiverType,
        currentWeek:     week,
        totalFaab:       league.totalFaab,
        myFaabRemaining: myFaab,
        leagueId:        league.id,
        myTeam: {
          starters: starters.map(p => ({ name: p.name, position: p.position, team: p.team })),
          bench:    bench.map(p => ({ name: p.name, position: p.position, team: p.team })),
        },
        waiverPool: queue.map(c => ({
          name:     c.pickup.name,
          position: c.pickup.position,
          team:     c.pickup.team,
          ownership: c.pickup.ownership,
          projected: c.pickup.projectedPts,
          dropPlayer: c.dropId
            ? roster.find(p => p.id === c.dropId)?.name ?? null
            : null,
        })),
      }

      const res  = await fetch('/api/waiver-ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      const iters = Number(res.headers.get('x-pecr-iterations') ?? 1)

      const recommendations: WaiverResult[] = (data.recommendations ?? data.suggestions ?? data.results ?? []).map(
        (r: Record<string,unknown>, i: number) => ({
          rank:       i + 1,
          player: {
            id:           String(r.id ?? uid()),
            name:         String(r.name ?? r.playerName ?? ''),
            position:     String(r.position ?? 'WR') as Position,
            team:         String(r.team ?? ''),
            ownership:    Number(r.ownership ?? 0),
            projectedPts: Number(r.projectedPts ?? r.projected ?? 0),
            aiScore:      Number(r.aiScore ?? r.score ?? 7),
            reason:       String(r.reason ?? ''),
            faabLow:      Number(r.faabLow ?? r.faabMin ?? 0),
            faabHigh:     Number(r.faabHigh ?? r.faabMax ?? 0),
          },
          confidence:   Number(r.confidence ?? 0.8),
          insight:      String(r.insight ?? r.aiInsight ?? r.analysis ?? ''),
          faabStrategy: String(r.faabStrategy ?? r.faabNote ?? ''),
          tag: (r.tag ?? (Number(r.aiScore ?? 7) >= 8 ? 'Best Add' : 'Streaming')) as WaiverResult['tag'],
        })
      )

      setResults({
        recommendations,
        teamNeedsSummary: String(data.teamNeedsSummary ?? ''),
        faabStrategy:     String(data.faabStrategy ?? data.strategy ?? ''),
        pECRIterations:   iters,
      })
    } catch (err: unknown) {
      setAnalyzeErr(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      timers.forEach(clearTimeout)
      setAnalyzing(false)
    }
  }, [league, queue, roster, week, myFaab, analyzing])

  // ── RENDER ──────────────────────────────────────────────────────

  if (!league) return <LeagueGate onSelect={setLeague}/>

  const plat = PLATFORM_CONFIG[league.platform] ?? PLATFORM_CONFIG.sleeper

  return (
    <div className="min-h-screen bg-[#07071a] text-white flex flex-col">
      {/* Sticky header */}
      <div className="border-b border-white/6 bg-[#07071a]/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-base">{plat.emoji}</span>
            <h1 className="text-base font-black text-white">Waiver Wire AI</h1>
          </div>

          {/* League pill */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-3 py-1.5">
            <span className="text-xs font-bold" style={{ color: plat.color }}>{league.name}</span>
            <span className="text-[10px] text-white/30">·</span>
            <span className="text-[10px] text-white/40">{league.sport} {league.format}</span>
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-2 py-1.5">
            <span className="text-xs text-white/40">Week</span>
            <select
              value={week}
              onChange={e => setWeek(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white focus:outline-none"
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => refreshWire(league.id)}
              className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-xl px-3 py-1.5 transition-all"
            >
              ⟳ Refresh Wire
            </button>
            <button
              onClick={() => { setLeague(null); setRoster([]); setWire([]); setQueue([]); setResults(null) }}
              className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-xl px-3 py-1.5 transition-all"
            >
              Change League
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {analyzeErr && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 flex items-center gap-2">
            <span>⚠️</span> {analyzeErr}
            <button onClick={() => setAnalyzeErr(null)} className="ml-auto text-red-400 hover:text-red-300">✕</button>
          </div>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-5">
        <div className="grid lg:grid-cols-[260px_1fr_300px] gap-5 h-full" style={{ minHeight: 'calc(100vh - 120px)' }}>

          {/* LEFT: Roster */}
          <div className="lg:sticky lg:top-[61px] lg:max-h-[calc(100vh-80px)]">
            {rosterLoading ? (
              <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-6 animate-pulse h-96"/>
            ) : (
              <RosterPanel
                roster={roster}
                dropCandidates={dropCands}
                myFaab={myFaab}
                onToggleDrop={toggleDrop}
                onFaabChange={setMyFaab}
              />
            )}
          </div>

          {/* CENTER: Wire */}
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-3">Waiver Wire</h2>
            <WirePanel
              players={wire}
              loading={wireLoading}
              queue={queue}
              posFilter={posFilter}
              onPosFilter={setPosFilter}
              onQueue={queuePlayer}
              onRefresh={() => refreshWire(league.id)}
            />
          </div>

          {/* RIGHT: Analysis */}
          <div className="lg:sticky lg:top-[61px] lg:max-h-[calc(100vh-80px)] lg:overflow-y-auto">
            <AnalysisPanel
              queue={queue}
              roster={roster}
              league={league}
              myFaab={myFaab}
              loading={analyzing}
              phaseName={phaseName}
              results={results}
              onRemove={removeFromQueue}
              onDropChange={updateDrop}
              onAnalyze={analyze}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
