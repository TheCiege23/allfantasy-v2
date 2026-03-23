'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMediaArticles } from '@/hooks/useMediaArticles'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type { ArticleGenerationType } from '@/lib/sports-media-engine/types'
import { useUserTimezone } from '@/hooks/useUserTimezone'

const ARTICLE_TYPE_LABELS: Record<ArticleGenerationType, string> = {
  weekly_recap: 'Weekly recap',
  power_rankings: 'Power rankings',
  trade_breakdown: 'Trade breakdown',
  upset_alert: 'Upset alert',
  playoff_preview: 'Playoff preview',
  championship_recap: 'Championship recap',
}

const TAG_OPTIONS: ArticleGenerationType[] = [
  'weekly_recap',
  'power_rankings',
  'trade_breakdown',
  'upset_alert',
  'playoff_preview',
  'championship_recap',
]

export default function NewsTab({ leagueId, isCommissioner = false }: LeagueTabProps & { isCommissioner?: boolean }) {
  const { formatDateInTimezone } = useUserTimezone()
  const [sportFilter, setSportFilter] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [generateType, setGenerateType] = useState<ArticleGenerationType>('weekly_recap')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const { articles, loading, refreshing, loadingMore, error, nextCursor, refresh, loadMore } = useMediaArticles({
    leagueId,
    sport: sportFilter || null,
    tags: tagFilter ? [tagFilter] : undefined,
  })

  const handleGenerate = async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: generateType,
          sport: sportFilter || undefined,
          skipStatsInsights: false,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Generate failed')
      refresh()
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-white">League News</h2>
        <span className="text-sm text-zinc-400">AI-generated recaps and power rankings</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          aria-label="Filter by sport"
        >
          <option value="">All sports</option>
          {SUPPORTED_SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {TAG_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {ARTICLE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
          onClick={() => refresh()}
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <span className="text-sm text-zinc-400">Generate:</span>
        <select
          className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white"
          value={generateType}
          onChange={(e) => setGenerateType(e.target.value as ArticleGenerationType)}
        >
          {TAG_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {ARTICLE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          disabled={generating || !isCommissioner}
          onClick={handleGenerate}
        >
          {generating ? 'Generating…' : 'Generate article'}
        </button>
        {!isCommissioner && (
          <span className="text-xs text-zinc-500">Commissioner only</span>
        )}
        {generateError && (
          <span className="text-sm text-red-400">{generateError}</span>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</div>
      )}

      {loading && articles.length === 0 && (
        <p className="text-sm text-zinc-400">Loading articles…</p>
      )}
      {refreshing && (
        <p className="text-sm text-zinc-500">Refreshing articles…</p>
      )}

      {articles.length === 0 && !loading && (
        <p className="text-sm text-zinc-500">
          {isCommissioner
            ? 'No articles yet. Use "Generate article" to create a weekly recap or power rankings.'
            : 'No articles yet. Ask your commissioner to generate league news.'}
        </p>
      )}

      {articles.length > 0 && (
        <>
          <ul className="space-y-3">
            {articles.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
              >
                <Link
                  href={`/app/league/${encodeURIComponent(leagueId)}/news/${encodeURIComponent(a.id)}`}
                  className="block"
                >
                  <h3 className="font-medium text-white hover:underline">{a.headline}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{a.body.slice(0, 160)}…</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {formatDateInTimezone(a.createdAt)} · {a.sport}
                    </span>
                    {a.tags?.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-zinc-400"
                      >
                        {ARTICLE_TYPE_LABELS[t as ArticleGenerationType] ?? t}
                      </span>
                    ))}
                  </div>
                </Link>
                <div className="mt-2 flex gap-2">
                  <a
                    href={`/app/league/${encodeURIComponent(leagueId)}/news/${encodeURIComponent(a.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open in new tab
                  </a>
                  <span className="text-xs text-zinc-500">·</span>
                  <Link
                    href={`/app/league/${encodeURIComponent(leagueId)}/news/${encodeURIComponent(a.id)}#ai-explanation`}
                    className="text-xs text-amber-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    How was this written?
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {nextCursor && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                onClick={() => loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading more…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
