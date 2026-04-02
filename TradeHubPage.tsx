'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

// ─── TYPES (match existing trade-evaluator API exactly) ──────────

type LeagueFormat  = 'Dynasty' | 'Keeper' | 'Redraft'
type QBFormat      = 'Superflex (2QB)' | '1QB'
type Sport         = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAA Football' | 'NCAA Basketball' | 'Soccer'
type ScoringFormat = 'PPR' | 'Half PPR' | 'Standard' | 'TE Premium' | 'Superflex' | 'Points (NBA/NHL)' | 'Categories (NBA)'

interface TradePlayer {
  id:       string
  name:     string
  position: string
  team:     string
  age:      string
}

interface TradePick {
  id:    string
  year:  string
  round: string
  team:  string
}

interface TradeSide {
  teamName:  string
  record:    string
  players:   TradePlayer[]
  picks:     TradePick[]
  faab:      number
  isProMember: boolean
}

interface LeagueSettings {
  format:    LeagueFormat
  qbFormat:  QBFormat
  sport:     Sport
  scoring:   ScoringFormat
  asOfDate:  string
}

interface TradeResult {
  verdict:          string     // 'SMASH ACCEPT' | 'ACCEPT' | 'LEAN ACCEPT' | 'FAIR' | 'LEAN DECLINE' | 'DECLINE' | 'SMASH DECLINE'
  fairnessScore:    number     // 0-100
  senderGrade:      string     // A+, A, B+...
  receiverGrade:    string
  valueDelta:       number     // positive = good for sender
  recommendation:   string     // full AI text
  counterOffer?:    string
  drivers:          TradeDriver[]
  confidence:       number     // 0-1
  providerUsed:     string[]
  pECRIterations?:  number
  rawAnalysis?:     string
  negotiationSteps?: string[]
}

interface TradeDriver {
  id:        string
  direction: 'positive' | 'negative' | 'neutral'
  strength:  'strong' | 'moderate' | 'weak'
  label:     string
  detail:    string
}

// ─── CONSTANTS ───────────────────────────────────────────────────

const VERDICT_CONFIG: Record<string, { color: string; glow: string; label: string; emoji: string }> = {
  'SMASH ACCEPT':  { color: '#10b981', glow: 'rgba(16,185,129,0.4)',  label: 'SMASH ACCEPT',  emoji: '🚀' },
  'ACCEPT':        { color: '#34d399', glow: 'rgba(52,211,153,0.3)',  label: 'ACCEPT',         emoji: '✅' },
  'LEAN ACCEPT':   { color: '#6ee7b7', glow: 'rgba(110,231,183,0.25)',label: 'LEAN ACCEPT',    emoji: '📈' },
  'FAIR':          { color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  label: 'FAIR DEAL',      emoji: '⚖️' },
  'LEAN DECLINE':  { color: '#fb923c', glow: 'rgba(251,146,60,0.3)',  label: 'LEAN DECLINE',   emoji: '📉' },
  'DECLINE':       { color: '#f87171', glow: 'rgba(248,113,113,0.3)', label: 'DECLINE',        emoji: '❌' },
  'SMASH DECLINE': { color: '#ef4444', glow: 'rgba(239,68,68,0.4)',   label: 'SMASH DECLINE',  emoji: '🚫' },
}

const POSITIONS  = ['QB','RB','WR','TE','K','DEF','FLEX','IDP','OL','DL','LB','DB']
const PICK_YEARS = ['2025','2026','2027','2028']
const PICK_ROUNDS = ['1st','2nd','3rd','4th','5th']

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,6)}` }

// ─── EMPTY SIDE FACTORY ──────────────────────────────────────────

function emptySide(name: string): TradeSide {
  return {
    teamName: name,
    record:   '',
    players:  [{ id: uid(), name: '', position: '', team: '', age: '' }],
    picks:    [],
    faab:     0,
    isProMember: false,
  }
}

// ─── PLAYER ROW ──────────────────────────────────────────────────

function PlayerRow({
  player, onChange, onRemove,
}: {
  player:   TradePlayer
  onChange: (field: keyof TradePlayer, value: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 group">
      <input
        value={player.name}
        onChange={e => onChange('name', e.target.value)}
        placeholder="Player name"
        className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:outline-none transition-colors"
      />
      <select
        value={player.position}
        onChange={e => onChange('position', e.target.value)}
        className="w-20 rounded-lg border border-white/10 bg-[#0d0d1f] px-2 py-2 text-xs text-white/80 focus:border-cyan-500/50 focus:outline-none"
      >
        <option value="">Pos</option>
        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <input
        value={player.team}
        onChange={e => onChange('team', e.target.value)}
        placeholder="Team"
        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 placeholder:text-white/25 focus:border-cyan-500/50 focus:outline-none"
      />
      <input
        value={player.age}
        onChange={e => onChange('age', e.target.value)}
        placeholder="Age"
        type="number"
        className="w-14 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 placeholder:text-white/25 focus:border-cyan-500/50 focus:outline-none"
      />
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

// ─── PICK ROW ────────────────────────────────────────────────────

function PickRow({ pick, onChange, onRemove }: {
  pick:     TradePick
  onChange: (field: keyof TradePick, value: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 group">
      <select
        value={pick.year}
        onChange={e => onChange('year', e.target.value)}
        className="flex-1 rounded-lg border border-white/10 bg-[#0d0d1f] px-2 py-2 text-xs text-white/80 focus:border-cyan-500/50 focus:outline-none"
      >
        <option value="">Year</option>
        {PICK_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        value={pick.round}
        onChange={e => onChange('round', e.target.value)}
        className="flex-1 rounded-lg border border-white/10 bg-[#0d0d1f] px-2 py-2 text-xs text-white/80 focus:border-cyan-500/50 focus:outline-none"
      >
        <option value="">Round</option>
        {PICK_ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <input
        value={pick.team}
        onChange={e => onChange('team', e.target.value)}
        placeholder="Team"
        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 placeholder:text-white/25 focus:border-cyan-500/50 focus:outline-none"
      />
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

// ─── SIDE PANEL ──────────────────────────────────────────────────

function SidePanel({
  side, label, accent, onChange, onClear,
}: {
  side:     TradeSide
  label:    string
  accent:   string
  onChange: (side: TradeSide) => void
  onClear:  () => void
}) {
  const playerCount = side.players.filter(p => p.name.trim()).length
  const pickCount   = side.picks.length
  const summary     = `${playerCount} player${playerCount !== 1 ? 's' : ''}, ${pickCount} pick${pickCount !== 1 ? 's' : ''}`
    + (side.faab > 0 ? `, $${side.faab} FAAB` : '')

  const updatePlayer = (i: number, field: keyof TradePlayer, value: string) => {
    const players = [...side.players]
    players[i] = { ...players[i], [field]: value }
    onChange({ ...side, players })
  }
  const updatePick = (i: number, field: keyof TradePick, value: string) => {
    const picks = [...side.picks]
    picks[i] = { ...picks[i], [field]: value }
    onChange({ ...side, picks })
  }

  return (
    <div className="relative rounded-2xl border border-white/8 bg-[#0c0c1e] overflow-hidden">
      {/* Accent top bar */}
      <div className="h-0.5 w-full" style={{ background: accent }} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: accent }}>{label}</div>
            <div className="text-[11px] text-white/35">{summary}</div>
          </div>
          <button
            onClick={onClear}
            className="text-xs text-white/25 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Clear
          </button>
        </div>

        {/* Team name */}
        <input
          value={side.teamName}
          onChange={e => onChange({ ...side, teamName: e.target.value })}
          placeholder="Manager / Team name"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-500/40 focus:outline-none transition-colors"
        />

        {/* Record */}
        <input
          value={side.record}
          onChange={e => onChange({ ...side, record: e.target.value })}
          placeholder="Record / Rank  (optional: e.g. 8-4, 3rd place)"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/80 placeholder:text-white/25 focus:border-cyan-500/40 focus:outline-none transition-colors"
        />

        {/* Players */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Players Giving</span>
            <button
              onClick={() => onChange({ ...side, players: [...side.players, { id: uid(), name: '', position: '', team: '', age: '' }] })}
              className="text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: accent }}
            >
              + Add Player
            </button>
          </div>
          {side.players.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              onChange={(f, v) => updatePlayer(i, f, v)}
              onRemove={() => onChange({ ...side, players: side.players.filter((_, j) => j !== i) })}
            />
          ))}
        </div>

        {/* Picks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Draft Picks</span>
            <button
              onClick={() => onChange({ ...side, picks: [...side.picks, { id: uid(), year: '2026', round: '1st', team: '' }] })}
              className="text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: accent }}
            >
              + Add Pick
            </button>
          </div>
          {side.picks.length === 0 && (
            <div className="text-[11px] text-white/20 italic">No draft picks added</div>
          )}
          {side.picks.map((p, i) => (
            <PickRow
              key={p.id}
              pick={p}
              onChange={(f, v) => updatePick(i, f, v)}
              onRemove={() => onChange({ ...side, picks: side.picks.filter((_, j) => j !== i) })}
            />
          ))}
        </div>

        {/* FAAB */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider shrink-0">FAAB $</span>
          <input
            type="number"
            min={0}
            value={side.faab || ''}
            onChange={e => onChange({ ...side, faab: Number(e.target.value) || 0 })}
            placeholder="0"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-cyan-500/40 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

// ─── LEAGUE SETTINGS BAR ─────────────────────────────────────────

function LeagueSettingsBar({ settings, onChange }: {
  settings: LeagueSettings
  onChange: (s: LeagueSettings) => void
}) {
  const sel = 'w-full rounded-xl border border-white/10 bg-[#0c0c1e] px-3 py-2.5 text-sm text-white focus:border-cyan-500/40 focus:outline-none transition-colors'

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
      <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">League Settings</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wide mb-1.5 block">Format</label>
          <select value={settings.format} onChange={e => onChange({ ...settings, format: e.target.value as LeagueFormat })} className={sel}>
            {(['Dynasty','Keeper','Redraft'] as LeagueFormat[]).map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wide mb-1.5 block">QB Format</label>
          <select value={settings.qbFormat} onChange={e => onChange({ ...settings, qbFormat: e.target.value as QBFormat })} className={sel}>
            {(['Superflex (2QB)','1QB'] as QBFormat[]).map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wide mb-1.5 block">Sport</label>
          <select value={settings.sport} onChange={e => onChange({ ...settings, sport: e.target.value as Sport })} className={sel}>
            {(['NFL','NBA','MLB','NHL','NCAA Football','NCAA Basketball','Soccer'] as Sport[]).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wide mb-1.5 block">Scoring</label>
          <select value={settings.scoring} onChange={e => onChange({ ...settings, scoring: e.target.value as ScoringFormat })} className={sel}>
            {(['PPR','Half PPR','Standard','TE Premium','Superflex','Points (NBA/NHL)','Categories (NBA)'] as ScoringFormat[]).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="text-[10px] text-white/30 uppercase tracking-wide mb-1.5 block">As Of Date (optional — for historical analysis)</label>
        <input
          type="date"
          value={settings.asOfDate}
          onChange={e => onChange({ ...settings, asOfDate: e.target.value })}
          className="rounded-xl border border-white/10 bg-[#0c0c1e] px-3 py-2.5 text-sm text-white focus:border-cyan-500/40 focus:outline-none"
        />
      </div>
    </div>
  )
}

// ─── VERDICT DISPLAY ─────────────────────────────────────────────

function VerdictDisplay({ result }: { result: TradeResult }) {
  const cfg = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG['FAIR']

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Main verdict hero */}
      <div className="relative rounded-3xl overflow-hidden border border-white/8"
           style={{ background: `radial-gradient(ellipse at 30% 0%, ${cfg.glow}, #07071a 60%)` }}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Verdict badge */}
          <div className="text-center">
            <div className="text-6xl mb-2">{cfg.emoji}</div>
            <div className="text-xl font-black" style={{ color: cfg.color }}>{cfg.label}</div>
            <div className="text-xs text-white/40 mt-0.5">Trade Verdict</div>
          </div>

          {/* Scores */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 text-center">
              <div className="text-3xl font-black text-white">{result.fairnessScore}</div>
              <div className="text-[11px] text-white/40 mt-0.5">Fairness Score</div>
              <div className="text-[10px] text-white/25">out of 100</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 text-center">
              <div className="text-3xl font-black" style={{ color: cfg.color }}>
                {result.valueDelta > 0 ? '+' : ''}{result.valueDelta}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">Value Delta</div>
              <div className="text-[10px] text-white/25">for sender</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 text-center">
              <div className="text-3xl font-black text-white">{Math.round(result.confidence * 100)}%</div>
              <div className="text-[11px] text-white/40 mt-0.5">Confidence</div>
              <div className="text-[10px] text-white/25">{result.providerUsed.join(' + ')}</div>
            </div>
          </div>

          {/* Grades */}
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 text-center">
              <div className="text-2xl font-black text-white">{result.senderGrade}</div>
              <div className="text-[10px] text-white/40 mt-0.5">Sender</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 text-center">
              <div className="text-2xl font-black text-white">{result.receiverGrade}</div>
              <div className="text-[10px] text-white/40 mt-0.5">Receiver</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">AI Analysis</span>
          {result.pECRIterations && result.pECRIterations > 1 && (
            <span className="text-[10px] text-white/20 ml-auto">{result.pECRIterations} iterations</span>
          )}
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{result.recommendation}</p>
      </div>

      {/* Trade Drivers */}
      {result.drivers.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Trade Drivers</p>
          <div className="space-y-2.5">
            {result.drivers.map(d => (
              <div key={d.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/2 p-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  d.direction === 'positive' ? 'bg-green-400' :
                  d.direction === 'negative' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <div>
                  <div className="text-xs font-semibold text-white/80">{d.label}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{d.detail}</div>
                </div>
                <span className={`ml-auto text-[10px] font-bold shrink-0 ${
                  d.strength === 'strong' ? 'text-white/60' :
                  d.strength === 'moderate' ? 'text-white/35' : 'text-white/20'
                }`}>
                  {d.strength.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counter offer */}
      {result.counterOffer && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">💡 Counter-Offer Suggestion</p>
          <p className="text-sm text-white/70 leading-relaxed">{result.counterOffer}</p>
        </div>
      )}

      {/* Negotiation steps */}
      {result.negotiationSteps && result.negotiationSteps.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Negotiation Playbook</p>
          <ol className="space-y-2">
            {result.negotiationSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white/65">
                <span className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-white/8 text-white/50 mt-0.5">{i+1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

// ─── LOADING ANIMATION ───────────────────────────────────────────

function AnalyzingState({ phase }: { phase: string }) {
  const phases = [
    { key: 'plan',    label: 'Planning analysis',          icon: '📋' },
    { key: 'value',   label: 'Pricing players & picks',    icon: '💰' },
    { key: 'engine',  label: 'Running trade engine',       icon: '⚙️' },
    { key: 'ai',      label: 'Multi-model AI evaluation',  icon: '🧠' },
    { key: 'check',   label: 'Quality-gating result',      icon: '✅' },
  ]
  const activeIdx = phases.findIndex(p => p.key === phase)

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-8 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-8">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
        ))}
      </div>
      <div className="space-y-3 max-w-xs mx-auto">
        {phases.map((p, i) => (
          <div key={p.key} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-500 ${
            i < activeIdx  ? 'opacity-40' :
            i === activeIdx ? 'bg-cyan-500/10 border border-cyan-500/20' :
            'opacity-20'
          }`}>
            <span className="text-lg">{p.icon}</span>
            <span className="text-sm text-white/80">{p.label}</span>
            {i < activeIdx && <span className="ml-auto text-green-400 text-xs">✓</span>}
            {i === activeIdx && <div className="ml-auto w-3 h-3 rounded-full border border-cyan-500 border-t-transparent animate-spin" />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────

export default function TradeHubPage() {
  const [sender,   setSender]   = useState<TradeSide>(emptySide('Sender Team'))
  const [receiver, setReceiver] = useState<TradeSide>(emptySide('Receiver Team'))
  const [settings, setSettings] = useState<LeagueSettings>({
    format:   'Dynasty',
    qbFormat: 'Superflex (2QB)',
    sport:    'NFL',
    scoring:  'PPR',
    asOfDate: '',
  })
  const [result,    setResult]    = useState<TradeResult | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [phase,     setPhase]     = useState('plan')
  const [error,     setError]     = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const canEvaluate = (
    sender.players.some(p => p.name.trim()) ||
    sender.picks.length > 0 ||
    sender.faab > 0
  ) && (
    receiver.players.some(p => p.name.trim()) ||
    receiver.picks.length > 0 ||
    receiver.faab > 0
  )

  const swapSides = () => {
    setSender(s => ({ ...receiver, teamName: s.teamName }))
    setReceiver(r => ({ ...sender, teamName: r.teamName }))
  }

  const resetTrade = () => {
    setSender(emptySide('Sender Team'))
    setReceiver(emptySide('Receiver Team'))
    setResult(null)
    setError(null)
  }

  const evaluate = useCallback(async () => {
    if (!canEvaluate || loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    setPhase('plan')

    // Simulate phase progression for UX
    const phaseTimer = (p: string, delay: number) =>
      setTimeout(() => setPhase(p), delay)
    const t1 = phaseTimer('value',  800)
    const t2 = phaseTimer('engine', 2000)
    const t3 = phaseTimer('ai',     3500)
    const t4 = phaseTimer('check',  6000)

    try {
      const body = {
        sender: {
          teamName:   sender.teamName,
          record:     sender.record,
          isProMember: sender.isProMember,
          players:    sender.players.filter(p => p.name.trim()),
          picks:      sender.picks,
          faab:       sender.faab,
        },
        receiver: {
          teamName:   receiver.teamName,
          record:     receiver.record,
          isProMember: receiver.isProMember,
          players:    receiver.players.filter(p => p.name.trim()),
          picks:      receiver.picks,
          faab:       receiver.faab,
        },
        leagueSettings: {
          format:   settings.format,
          qbFormat: settings.qbFormat,
          sport:    settings.sport,
          scoring:  settings.scoring,
          asOfDate: settings.asOfDate || undefined,
        },
      }

      const res  = await fetch('/api/trade-evaluator', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      // Map response to TradeResult
      const mapped: TradeResult = {
        verdict:          data.verdict ?? data.overallFairness ?? 'FAIR',
        fairnessScore:    data.fairnessScore ?? data.score ?? 70,
        senderGrade:      data.senderGrade   ?? data.grades?.sender   ?? 'B',
        receiverGrade:    data.receiverGrade ?? data.grades?.receiver ?? 'B',
        valueDelta:       data.valueDelta    ?? 0,
        recommendation:   data.recommendation ?? data.answer ?? data.analysis ?? '',
        counterOffer:     data.counterOffer   ?? data.counter ?? undefined,
        drivers:          (data.drivers ?? data.tradeDrivers ?? []).map((d: Record<string,unknown>) => ({
          id:        String(d.id        ?? uid()),
          direction: String(d.direction ?? 'neutral') as TradeDriver['direction'],
          strength:  String(d.strength  ?? 'moderate') as TradeDriver['strength'],
          label:     String(d.label     ?? d.id ?? ''),
          detail:    String(d.detail    ?? d.evidence ?? ''),
        })),
        confidence:      data.confidence ?? 0.8,
        providerUsed:    data.providerUsed ?? data.providers ?? ['AI'],
        pECRIterations:  data.pECRIterations ?? data['x-pecr-iterations'] ?? undefined,
        negotiationSteps: data.negotiationSteps ?? [],
      }

      setResult(mapped)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
      setLoading(false)
    }
  }, [sender, receiver, settings, canEvaluate, loading])

  return (
    <div className="min-h-screen bg-[#07071a] text-white">
      {/* Header */}
      <div className="border-b border-white/6 bg-[#07071a]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">⚡ AI-Powered</span>
              <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full px-2 py-0.5 font-bold">PECR v2</span>
            </div>
            <h1 className="text-xl font-black text-white">Trade Analyzer</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={swapSides} className="text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-xl px-3 py-2 transition-all">
              ⇄ Swap
            </button>
            <button onClick={resetTrade} className="text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-xl px-3 py-2 transition-all">
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Trade panels */}
        <div className="grid md:grid-cols-2 gap-5">
          <SidePanel
            side={sender}
            label="Sender · Giving Away"
            accent="#06b6d4"
            onChange={setSender}
            onClear={() => setSender(emptySide('Sender Team'))}
          />
          <SidePanel
            side={receiver}
            label="Receiver · Getting Back"
            accent="#a78bfa"
            onChange={setReceiver}
            onClear={() => setReceiver(emptySide('Receiver Team'))}
          />
        </div>

        {/* League settings */}
        <LeagueSettingsBar settings={settings} onChange={setSettings} />

        {/* Evaluate button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={evaluate}
            disabled={!canEvaluate || loading}
            className="w-full max-w-lg rounded-2xl py-4 text-base font-black tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background: canEvaluate && !loading
                ? 'linear-gradient(135deg, #0891b2, #7c3aed)'
                : 'rgba(255,255,255,0.05)',
              boxShadow: canEvaluate && !loading
                ? '0 8px 32px rgba(8,145,178,0.35), 0 0 0 1px rgba(255,255,255,0.05)'
                : 'none',
            }}
          >
            {loading ? 'Analyzing Trade...' : '⚡ Evaluate Trade'}
          </button>
          {!canEvaluate && !loading && (
            <p className="text-xs text-white/30">Add at least one player, pick, or FAAB to both sides to analyze</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Loading state */}
        {loading && <AnalyzingState phase={phase} />}

        {/* Result */}
        {result && !loading && (
          <div ref={resultRef}>
            <VerdictDisplay result={result} />
          </div>
        )}
      </div>
    </div>
  )
}
