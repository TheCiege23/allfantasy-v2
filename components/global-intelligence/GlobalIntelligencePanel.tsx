'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Brain,
  BarChart3,
  Sparkles,
  Newspaper,
  Trophy,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { GlobalIntelligenceResult } from '@/lib/global-intelligence'

interface GlobalIntelligencePanelProps {
  leagueId: string
  sport?: string | null
  /** Include only these modules; default all. */
  include?: ('meta' | 'simulation' | 'advisor' | 'media' | 'draft')[]
}

export default function GlobalIntelligencePanel({
  leagueId,
  sport,
  include,
}: GlobalIntelligencePanelProps) {
  const [data, setData] = useState<GlobalIntelligenceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['meta', 'simulation', 'advisor', 'media', 'draft']))

  const load = useCallback(() => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    fetch('/api/intelligence/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, sport: sport ?? null, include }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load intelligence')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [leagueId, sport, include])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-8">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        <span className="text-sm text-white/70">Loading global intelligence...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-4">
        <p className="text-sm text-rose-400">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-2 text-sm text-cyan-400 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-t-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
        <Brain className="h-5 w-5 text-cyan-400" />
        <h3 className="font-semibold text-white">Global Intelligence</h3>
        <span className="text-xs text-white/50">Meta · Simulation · Advisor · Media · Draft</span>
      </div>

      {data.meta && (
        <Section
          id="meta"
          icon={BarChart3}
          title="Meta Engine"
          open={openSections.has('meta')}
          onToggle={() => toggle('meta')}
          error={data.meta.error}
        >
          {data.meta.summary && <p className="text-sm text-white/80">{data.meta.summary}</p>}
          {data.meta.topTrends?.length ? (
            <ul className="mt-2 list-inside list-disc text-xs text-white/60">
              {data.meta.topTrends.slice(0, 5).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          ) : null}
        </Section>
      )}

      {data.simulation && (
        <Section
          id="simulation"
          icon={Sparkles}
          title="Simulation Engine"
          open={openSections.has('simulation')}
          onToggle={() => toggle('simulation')}
          error={data.simulation.error}
        >
          <div className="space-y-2 text-sm text-white/80">
            {data.simulation.playoffOddsSummary && (
              <p><strong>Playoff:</strong> {data.simulation.playoffOddsSummary}</p>
            )}
            {data.simulation.matchupSummary && (
              <p><strong>Matchup:</strong> {data.simulation.matchupSummary}</p>
            )}
            {data.simulation.dynastySummary && (
              <p><strong>Dynasty:</strong> {data.simulation.dynastySummary}</p>
            )}
            {data.simulation.warehouseSummary && (
              <p><strong>Warehouse:</strong> {data.simulation.warehouseSummary}</p>
            )}
            {!data.simulation.playoffOddsSummary && !data.simulation.matchupSummary && !data.simulation.error && (
              <p className="text-white/50">No simulation data for this league yet.</p>
            )}
          </div>
        </Section>
      )}

      {data.advisor && (
        <Section
          id="advisor"
          icon={Brain}
          title="AI Advisor"
          open={openSections.has('advisor')}
          onToggle={() => toggle('advisor')}
          error={data.advisor.error}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {data.advisor.lineup.length > 0 && (
              <Block title="Lineup" items={data.advisor.lineup} />
            )}
            {data.advisor.trade.length > 0 && (
              <Block title="Trade" items={data.advisor.trade} />
            )}
            {data.advisor.waiver.length > 0 && (
              <Block title="Waiver" items={data.advisor.waiver} />
            )}
            {data.advisor.injury.length > 0 && (
              <Block title="Injury" items={data.advisor.injury} />
            )}
            {data.advisor.lineup.length === 0 && data.advisor.trade.length === 0 && data.advisor.waiver.length === 0 && data.advisor.injury.length === 0 && !data.advisor.error && (
              <p className="text-sm text-white/50">No advisor tips. Sign in and open this league to get personalized advice.</p>
            )}
          </div>
        </Section>
      )}

      {data.media && (
        <Section
          id="media"
          icon={Newspaper}
          title="Media Engine"
          open={openSections.has('media')}
          onToggle={() => toggle('media')}
          error={data.media.error}
        >
          {data.media.articles.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {data.media.articles.map((a) => (
                <li key={a.id} className="text-white/80">{a.headline}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/50">No articles yet. Generate from Media tab.</p>
          )}
        </Section>
      )}

      {data.draft && (
        <Section
          id="draft"
          icon={Trophy}
          title="Draft Intelligence"
          open={openSections.has('draft')}
          onToggle={() => toggle('draft')}
          error={data.draft.error}
        >
          {data.draft.context ? (
            <p className="whitespace-pre-wrap text-sm text-white/80">{data.draft.context}</p>
          ) : (
            <p className="text-sm text-white/50">No draft context for this league.</p>
          )}
        </Section>
      )}

      <p className="text-right text-xs text-white/40">Generated {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : ''}</p>
    </div>
  )
}

function Section({
  id,
  icon: Icon,
  title,
  open,
  onToggle,
  error,
  children,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  open: boolean
  onToggle: () => void
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/5"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Icon className="h-4 w-4 text-cyan-400" />
        <span className="font-medium text-white">{title}</span>
        {error && <span className="text-xs text-rose-400">({error})</span>}
      </button>
      {open && (
        <div className="border-t border-white/10 px-4 py-3">
          {children}
        </div>
      )}
    </div>
  )
}

function Block({
  title,
  items,
}: {
  title: string
  items: Array<{ summary: string; priority?: string }>
}) {
  return (
    <div>
      <p className="text-xs font-medium text-white/70">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-white/80">
            {item.priority && <span className="text-white/50">[{item.priority}] </span>}
            {item.summary}
          </li>
        ))}
      </ul>
    </div>
  )
}
