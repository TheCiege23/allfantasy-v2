'use client'

import { Swords, Flame, AlertTriangle, Trophy, Zap } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type EdgeCategory = {
  label: string
  mine: number // 0-100
  theirs: number // 0-100
}

type KeyNote = {
  tone: 'advantage' | 'warning' | 'gameplan'
  text: string
}

/**
 * Competitive game-plan signature: opponent snapshot header, head-to-head
 * "edge bars" per position group (mine vs theirs), an upset/win meter, and
 * a one-line game-plan block. Feels like a pre-game locker room board.
 *
 * TODO: wire to `/api/league/matchup?leagueId=…&week=…` when ready. UI
 * expects `{ opponent, myProj, theirProj, edges: EdgeCategory[],
 * winChance, gamePlan, notes: KeyNote[] }`.
 */
export function MatchupPrepModal({
  open,
  onClose,
  leagueId: _leagueId,
  leagueName,
  sport,
}: {
  open: boolean
  onClose: () => void
  leagueId: string
  leagueName: string
  sport: string
}) {
  const myProj = 128.4
  const theirProj = 124.2
  const edgeDelta = myProj - theirProj
  const winChance = 64

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="Matchup Prep"
      subtitle="Pre-game scouting and game plan"
      accentColor="sky"
      icon={<Swords className="h-5 w-5" />}
      chimmyPrompt={`Prep me for this week's ${sport} matchup in ${leagueName}`}
    >
      {/* Head-to-head hero */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.08] via-cyan-500/[0.04] to-transparent px-5 py-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-sky-300/70">
          This Week · {leagueName}
        </p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">You</p>
            <p className="text-[22px] font-black tabular-nums text-white/95">
              {myProj.toFixed(1)}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-sky-300/60">vs</span>
            <span
              className={`mt-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                edgeDelta > 0
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                  : edgeDelta < 0
                    ? 'border-red-500/25 bg-red-500/10 text-red-300'
                    : 'border-white/[0.08] bg-white/[0.04] text-white/60'
              }`}
            >
              {edgeDelta > 0 ? '+' : ''}
              {edgeDelta.toFixed(1)}
            </span>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Opponent</p>
            <p className="text-[22px] font-black tabular-nums text-white/60">
              {theirProj.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Win chance + upset meter */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3 w-3 text-emerald-400" />
            <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-300">
              Win Chance
            </p>
          </div>
          <p className="mt-1 text-[22px] font-black tabular-nums text-emerald-200">{winChance}%</p>
        </div>
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-amber-400" />
            <p className="text-[8px] font-bold uppercase tracking-widest text-amber-300">
              Upset Risk
            </p>
          </div>
          <p className="mt-1 text-[22px] font-black tabular-nums text-amber-200">
            {100 - winChance}%
          </p>
        </div>
      </div>

      {/* Edge bars — position-by-position */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
        Position Edges
      </p>
      <div className="mb-4 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        {PLACEHOLDER_EDGES.map((edge) => (
          <EdgeBar key={edge.label} edge={edge} />
        ))}
      </div>

      {/* Key notes */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
        Key Notes
      </p>
      <div className="space-y-1.5">
        {PLACEHOLDER_NOTES.map((note, i) => (
          <KeyNoteRow key={i} note={note} />
        ))}
      </div>

      {/* Game plan one-liner */}
      <div className="mt-4 rounded-xl border border-sky-500/15 bg-sky-500/[0.04] px-4 py-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-sky-300/70">
          Game Plan
        </p>
        <p className="text-[12px] leading-relaxed text-white/70">
          Lean into the RB edge — start both backs even in tough matchups — and play the floor at
          flex with a volume option. Let your WR core win the week on target share, not ceiling.
        </p>
      </div>
    </AIToolModalShell>
  )
}

// ── Edge bar ─────────────────────────────────────────────────────────

function EdgeBar({ edge }: { edge: EdgeCategory }) {
  const total = edge.mine + edge.theirs || 1
  const mineWidth = (edge.mine / total) * 100
  const diff = edge.mine - edge.theirs
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-bold text-white/70">{edge.label}</span>
        <span
          className={`font-black tabular-nums ${
            diff > 0 ? 'text-emerald-300' : diff < 0 ? 'text-red-300' : 'text-white/45'
          }`}
        >
          {diff > 0 ? '+' : ''}
          {diff}
        </span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className="h-full bg-gradient-to-r from-sky-400 to-cyan-300"
          style={{ width: `${mineWidth}%` }}
        />
        <div className="h-full flex-1 bg-red-400/40" />
      </div>
    </div>
  )
}

// ── Key note row ─────────────────────────────────────────────────────

function KeyNoteRow({ note }: { note: KeyNote }) {
  const map = {
    advantage: { icon: <Flame className="h-3 w-3" />, cls: 'border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-200' },
    warning: { icon: <AlertTriangle className="h-3 w-3" />, cls: 'border-red-500/15 bg-red-500/[0.04] text-red-200' },
    gameplan: { icon: <Swords className="h-3 w-3" />, cls: 'border-sky-500/15 bg-sky-500/[0.04] text-sky-200' },
  }[note.tone]
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${map.cls}`}>
      <span className="mt-0.5">{map.icon}</span>
      <p className="text-[11px] leading-snug text-white/75">{note.text}</p>
    </div>
  )
}

// ── Placeholders ─────────────────────────────────────────────────────

const PLACEHOLDER_EDGES: EdgeCategory[] = [
  { label: 'QB', mine: 22, theirs: 20 },
  { label: 'RB', mine: 34, theirs: 24 },
  { label: 'WR', mine: 42, theirs: 40 },
  { label: 'TE', mine: 9, theirs: 14 },
  { label: 'FLEX', mine: 15, theirs: 18 },
  { label: 'DST', mine: 8, theirs: 6 },
]

const PLACEHOLDER_NOTES: KeyNote[] = [
  { tone: 'advantage', text: 'Your RB duo outranks every starter on the opponent’s bench.' },
  { tone: 'warning', text: 'Opponent TE1 has a ceiling game vs. a bottom-5 defense — expect a booming week there.' },
  { tone: 'gameplan', text: 'Start the safer flex option — volume wins when totals are close.' },
]
