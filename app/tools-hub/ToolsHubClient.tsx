'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import SeoLandingFooter from '@/components/landing/SeoLandingFooter'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { AppWindow, Trophy, Zap, Bot, ArrowRight } from 'lucide-react'
import {
  getAllSports,
  getFeaturedToolSlugs,
  getToolCardDisplay,
  getSportFilterOptions,
  getToolSlugsForSport,
  getToolsInCategory,
  getCategoryLabel,
  CATEGORY_ORDER,
  getRelatedTools,
  ROUTES,
  type ToolCategoryId,
} from '@/lib/tool-hub'
import type { SportSlug, ToolSlug } from '@/lib/seo-landing/config'

interface ToolsHubClientProps {
  sports: { slug: SportSlug; headline: string }[]
  tools: { slug: ToolSlug; headline: string; openToolHref: string }[]
}

export default function ToolsHubClient({ sports, tools }: ToolsHubClientProps) {
  const { t } = useLanguage()
  const [sportFilter, setSportFilter] = useState<SportSlug | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<ToolCategoryId | 'all'>('all')

  const getLocalizedSportLabel = (slug: SportSlug, fallback: string) => {
    const key = `toolsHub.sport.${slug}`
    const value = t(key)
    return value === key ? fallback : value
  }

  const getLocalizedCategoryLabel = (id: ToolCategoryId) => {
    const key = `toolsHub.category.${id}`
    const value = t(key)
    return value === key ? getCategoryLabel(id) : value
  }

  const getLocalizedToolHeadline = (slug: ToolSlug, fallback: string) => {
    const key = `toolsHub.tool.${slug}.headline`
    const value = t(key)
    return value === key ? fallback : value
  }

  const getLocalizedToolDescription = (slug: ToolSlug, fallback: string) => {
    const key = `toolsHub.tool.${slug}.description`
    const value = t(key)
    return value === key ? fallback : value
  }

  const sportOptions = useMemo(() => getSportFilterOptions(), [])

  const featuredCards = useMemo(() => {
    return getFeaturedToolSlugs()
      .map((slug) => getToolCardDisplay(slug))
      .filter((c): c is NonNullable<typeof c> => c != null)
  }, [])

  const filteredToolSlugs = useMemo(() => {
    let slugs = categoryFilter === 'all'
      ? tools.map((t) => t.slug)
      : getToolsInCategory(categoryFilter).map((t) => t.slug)
    if (sportFilter) {
      const forSport = getToolSlugsForSport(sportFilter)
      const set = new Set(forSport)
      slugs = slugs.filter((s) => set.has(s))
    }
    return slugs
  }, [tools, categoryFilter, sportFilter])

  const filteredTools = useMemo(
    () => filteredToolSlugs.map((slug) => tools.find((t) => t.slug === slug)).filter(Boolean) as typeof tools,
    [filteredToolSlugs, tools]
  )

  return (
    <main
      className="min-h-screen flex flex-col mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <HomeTopNav />

      <article className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('toolsHub.title')}
          </h1>
          <p className="mt-4 text-lg" style={{ color: 'var(--muted)' }}>
            {t('toolsHub.subtitle')}
          </p>

          {/* Featured tools */}
          {featuredCards.length > 0 && (
            <section className="mt-10" aria-label={t('toolsHub.featured.title')}>
              <h2 className="text-xl font-semibold mb-4">{t('toolsHub.featured.title')}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {featuredCards.map((card) => (
                  <li key={card.slug}>
                    <div
                      className="flex flex-col rounded-xl border p-4"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'color-mix(in srgb, var(--panel2) 60%, transparent)',
                        color: 'var(--text)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={card.toolLandingHref}
                          className="font-medium hover:underline"
                        >
                          {getLocalizedToolHeadline(card.slug, card.headline)}
                        </Link>
                        <Link
                          href={card.openToolHref}
                          className="shrink-0 rounded-md px-2 py-1 text-sm font-medium"
                          style={{ background: 'var(--accent-cyan)', color: 'var(--bg)' }}
                        >
                          {t('toolsHub.open')}
                        </Link>
                      </div>
                      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                        {getLocalizedToolDescription(card.slug, card.description)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sport filter */}
          <section className="mt-10" aria-label={t('toolsHub.sportFilter.aria')}>
            <h2 className="text-xl font-semibold mb-4">{t('toolsHub.sportFilter.title')}</h2>
            <div className="mb-4">
              <label htmlFor="hub-sport-filter" className="sr-only">
                {t('toolsHub.sportFilter.label')}
              </label>
              <select
                id="hub-sport-filter"
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value as SportSlug | '')}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
              >
                <option value="">{t('toolsHub.sportFilter.allSports')}</option>
                {sportOptions.map((opt) => (
                  <option key={opt.slug} value={opt.slug}>
                    {getLocalizedSportLabel(opt.slug, opt.label)}
                  </option>
                ))}
              </select>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {sports.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={ROUTES.sportLanding(s.slug as import('@/lib/seo-landing/config').SportSlug)}
                    className="flex items-center justify-between rounded-xl border px-4 py-3 hover:opacity-90"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'color-mix(in srgb, var(--panel2) 60%, transparent)',
                      color: 'var(--text)',
                    }}
                  >
                    <span className="font-medium">{getLocalizedSportLabel(s.slug, s.headline)}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--muted)' }} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Category filter + All tools */}
          <section className="mt-10" aria-label={t('toolsHub.allTools.aria')}>
            <h2 className="text-xl font-semibold mb-4">{t('toolsHub.allTools.title')}</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${categoryFilter === 'all' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                style={{
                  background: categoryFilter === 'all' ? 'var(--accent-cyan)' : 'var(--panel)',
                  color: categoryFilter === 'all' ? 'var(--bg)' : 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                {t('toolsHub.allTools.all')}
              </button>
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${categoryFilter === cat ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    background: categoryFilter === cat ? 'var(--accent-cyan)' : 'var(--panel)',
                    color: categoryFilter === cat ? 'var(--bg)' : 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {getLocalizedCategoryLabel(cat)}
                </button>
              ))}
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {filteredTools.map((tool) => {
                const related = getRelatedTools(tool.slug)
                return (
                  <li key={tool.slug}>
                    <div
                      className="flex flex-col rounded-xl border p-4"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'color-mix(in srgb, var(--panel2) 60%, transparent)',
                        color: 'var(--text)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/tools/${tool.slug}`} className="font-medium hover:underline">
                          {getLocalizedToolHeadline(tool.slug, tool.headline)}
                        </Link>
                        <Link
                          href={tool.openToolHref}
                          className="shrink-0 rounded-md px-2 py-1 text-sm font-medium"
                          style={{ background: 'var(--accent-cyan)', color: 'var(--bg)' }}
                        >
                          {t('toolsHub.open')}
                        </Link>
                      </div>
                      <span className="mt-1 block text-xs" style={{ color: 'var(--muted)' }}>
                        {t('toolsHub.openWithPath')}: {tool.openToolHref}
                      </span>
                      {related.length > 0 && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                            {t('toolsHub.related')}:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {related.slice(0, 3).map((r) => (
                              <Link
                                key={r.slug}
                                href={r.href}
                                className="text-xs hover:underline"
                                style={{ color: 'var(--accent-cyan)' }}
                              >
                                {getLocalizedToolHeadline(r.slug, r.headline)}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">{t('toolsHub.experiences.title')}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href={ROUTES.app()}
                className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 hover:bg-emerald-500/20"
              >
                <AppWindow className="h-8 w-8 text-emerald-400" />
                <span className="font-medium">{t('toolsHub.experiences.sportsApp')}</span>
              </Link>
              <Link
                href={ROUTES.bracket()}
                className="flex items-center gap-3 rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 hover:bg-sky-500/20"
              >
                <Trophy className="h-8 w-8 text-sky-400" />
                <span className="font-medium">{t('toolsHub.experiences.bracket')}</span>
              </Link>
              <Link
                href={ROUTES.afLegacy()}
                className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 hover:bg-amber-500/20"
              >
                <Zap className="h-8 w-8 text-amber-400" />
                <span className="font-medium">{t('toolsHub.experiences.legacy')}</span>
              </Link>
            </div>
          </section>

          <section className="mt-10">
            <Link
              href={ROUTES.chimmy()}
              className="flex items-center gap-3 rounded-xl border border-purple-400/30 bg-purple-500/10 p-4 hover:bg-purple-500/20"
            >
              <Bot className="h-8 w-8 text-purple-400" />
              <div>
                <span className="font-semibold">{t('toolsHub.chimmy.title')}</span>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                  {t('toolsHub.chimmy.subtitle')}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 ml-auto shrink-0" style={{ color: 'var(--muted)' }} />
            </Link>
          </section>

          <section className="mt-10 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 50%, transparent)' }}>
            <Link href={ROUTES.home()} className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent-cyan)' }}>
              <AppWindow className="h-4 w-4" />
              {t('toolsHub.backHome')}
            </Link>
          </section>
        </div>
      </article>

      <SeoLandingFooter />
    </main>
  )
}
