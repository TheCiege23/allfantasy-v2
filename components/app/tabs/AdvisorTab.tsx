'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, ShoppingCart, Stethoscope } from 'lucide-react'
import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import type {
  LeagueAdvisorAdvice,
  AdvisorLineupItem,
  AdvisorTradeItem,
  AdvisorWaiverItem,
  AdvisorInjuryItem,
} from '@/lib/league-advisor'
import { useUserTimezone } from '@/hooks/useUserTimezone'

function PriorityBadge({ priority }: { priority: string }) {
  const style =
    priority === 'high'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      : priority === 'medium'
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${style}`}>
      {priority}
    </span>
  )
}

function LineupBlock({ items }: { items: AdvisorLineupItem[] }) {
  if (!items.length) return null
  return (
    <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-200">
        <TrendingUp className="h-4 w-4" /> Lineup help
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex flex-wrap items-start gap-2 text-sm text-white/90">
            <PriorityBadge priority={item.priority} />
            <span>{item.summary}</span>
            {item.action && (
              <span className="text-emerald-300">→ {item.action}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function TradeBlock({ items }: { items: AdvisorTradeItem[] }) {
  if (!items.length) return null
  return (
    <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-200">
        <ShoppingCart className="h-4 w-4" /> Trade suggestions
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex flex-wrap items-start gap-2 text-sm text-white/90">
            <PriorityBadge priority={item.priority} />
            <span>{item.summary}</span>
            {item.direction && (
              <span className="text-blue-300">({item.direction})</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function WaiverBlock({ items }: { items: AdvisorWaiverItem[] }) {
  if (!items.length) return null
  return (
    <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-200">
        <RefreshCw className="h-4 w-4" /> Waiver alerts
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex flex-wrap items-start gap-2 text-sm text-white/90">
            <PriorityBadge priority={item.priority} />
            <span>{item.summary}</span>
            {item.addTarget && (
              <span className="text-violet-300">Add: {item.addTarget}</span>
            )}
            {item.dropCandidate && (
              <span className="text-rose-300/90">Drop: {item.dropCandidate}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function InjuryBlock({ items }: { items: AdvisorInjuryItem[] }) {
  if (!items.length) return null
  return (
    <section className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-200">
        <Stethoscope className="h-4 w-4" /> Injury alerts
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex flex-wrap items-start gap-2 text-sm text-white/90">
            <PriorityBadge priority={item.priority} />
            <span className="font-medium text-rose-100">{item.playerName}</span>
            {item.status && <span className="text-rose-300/90">{item.status}</span>}
            <span>{item.summary}</span>
            {item.suggestedAction && (
              <span className="text-amber-200">→ {item.suggestedAction}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function AdvisorTab({ leagueId }: LeagueTabProps) {
  const { formatInTimezone } = useUserTimezone()
  const [data, setData] = useState<LeagueAdvisorAdvice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/advisor`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'League or roster not found.' : 'Failed to load advisor.')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load advisor.'))
      .finally(() => setLoading(false))
  }, [leagueId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <TabDataState title="AI League Advisor" loading={loading} error={error} onReload={() => void load()}>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Personal AI Advisor</h2>
          </div>
          {data?.generatedAt && (
            <p className="text-xs text-white/60">
              Generated {formatInTimezone(data.generatedAt)} · {data.sport}
            </p>
          )}
        </div>

        {data && (
          <>
            <LineupBlock items={data.lineup} />
            <TradeBlock items={data.trade} />
            <WaiverBlock items={data.waiver} />
            <InjuryBlock items={data.injury} />

            {!data.lineup.length && !data.trade.length && !data.waiver.length && !data.injury.length && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No specific advice right now. Check back after your roster or league data is updated.
              </div>
            )}
          </>
        )}
      </div>
    </TabDataState>
  )
}
