'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flame, TrendingUp, TrendingDown } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type TrendPlayer = { playerName: string | null; position: string | null; team: string | null; crowdScore: number; sport: string; netTrend?: number }

export function TrendingPlayersModal({ open, onClose, sport = 'ALL' }: { open: boolean; onClose: () => void; sport?: string }) {
  const [players, setPlayers] = useState<TrendPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    fetch(`/api/dashboard/ai-tools/trending-players?sport=${encodeURIComponent(sport)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setPlayers(j.players ?? []))
      .catch(() => setError('Could not load trending players.'))
      .finally(() => setLoading(false))
  }, [sport])

  useEffect(() => { if (open) load() }, [open, load])

  const hot = players.filter((p) => (p.netTrend ?? p.crowdScore) > 0).slice(0, 10)
  const cold = players.filter((p) => (p.netTrend ?? 0) < 0).slice(0, 10)
  const all = hot.length === 0 && cold.length === 0 ? players.slice(0, 15) : []

  return (
    <AIToolModalShell
      open={open} onClose={onClose}
      title="Trending Players" subtitle="Movement board"
      accentColor="amber"
      icon={<Flame className="h-5 w-5" />}
      loading={loading && players.length === 0} error={error}
      empty={players.length === 0 && !loading} emptyMessage="No trending player data yet."
      onRefresh={load} refreshing={loading && players.length > 0}
      chimmyPrompt="Which trending players should I target or avoid?"
    >
      {hot.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400/60">
            <TrendingUp className="h-3 w-3" /> Rising
          </p>
          <div className="space-y-1">
            {hot.map((p, i) => <PlayerRow key={i} player={p} direction="up" rank={i + 1} />)}
          </div>
        </div>
      )}
      {cold.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400/60">
            <TrendingDown className="h-3 w-3" /> Falling
          </p>
          <div className="space-y-1">
            {cold.map((p, i) => <PlayerRow key={i} player={p} direction="down" rank={i + 1} />)}
          </div>
        </div>
      )}
      {all.length > 0 && (
        <div className="space-y-1">
          {all.map((p, i) => <PlayerRow key={i} player={p} direction="neutral" rank={i + 1} />)}
        </div>
      )}
    </AIToolModalShell>
  )
}

function PlayerRow({ player, direction, rank }: { player: TrendPlayer; direction: 'up' | 'down' | 'neutral'; rank: number }) {
  const border = direction === 'up' ? 'border-emerald-500/10' : direction === 'down' ? 'border-red-500/10' : 'border-white/[0.04]'
  return (
    <div className={`flex items-center gap-3 rounded-lg border ${border} bg-white/[0.02] px-3 py-2`}>
      <span className="w-5 text-center text-[10px] font-bold text-white/20">{rank}</span>
      <div className="min-w-0 flex-1">
        <span className="text-[12px] font-semibold text-white/80">{player.playerName ?? 'Unknown'}</span>
        <span className="ml-1.5 text-[9px] text-white/30">
          {player.position} · {player.team} · {player.sport.toUpperCase()}
        </span>
      </div>
      <span className={`text-[11px] font-bold ${
        direction === 'up' ? 'text-emerald-400' : direction === 'down' ? 'text-red-400' : 'text-white/40'
      }`}>
        {player.crowdScore}
      </span>
    </div>
  )
}
