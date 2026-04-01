"use client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import LanguageToggle from '@/components/i18n/LanguageToggle'
import { HealthBadge } from '@/components/bracket/HealthBadge'

type SimResult = {
  simulations: number
  winLeagueProbability: number
  top5Probability: number
  expectedRank: number
  finalFourFrequency: Record<string, number>
  championshipFrequency: Record<string, number>
}

type ReviewMetrics = {
  totalUpsets: number
  upsetRate: number
  upsetsByRound: Record<string, number>
  uniqueness: { score: number; percentile: number | null }
  champion: { pick: string | null; popularity: { team: string; pct: number } | null }
  riskScore?: number
}

type AiReview = {
  strengths: string[]
  risks: string[]
  strategyNotes: string[]
  summary: string
} | null

function BracketReviewInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const entryId = searchParams?.get('entryId') || ''
  const { t } = useLanguage()

  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const [simResult, setSimResult] = useState<SimResult | null>(null)

  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<ReviewMetrics | null>(null)
  const [aiReview, setAiReview] = useState<AiReview>(null)

  // Simple analytics hook for bracket review engagement
  useEffect(() => {
    if (!entryId) return
    fetch('/api/analytics/insight', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'bracket_review_opened',
        entry_id: entryId,
        insight_type: 'bracket_review',
        placement: 'bracket_review_page',
      }),
    }).catch(() => {})
  }, [entryId])

  useEffect(() => {
    if (!entryId) return

    setSimLoading(true)
    setSimError(null)
    setReviewLoading(true)
    setReviewError(null)

    // Simulation
    fetch('/api/bracket/intelligence/simulate-entry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entryId }),
    })
      .then((res) =>
        res
          .json()
          .then((data) => ({ ok: res.ok, data }))
          .catch(() => ({ ok: false, data: {} })),
      )
      .then(({ ok, data }) => {
        if (!ok || !data?.ok) {
          setSimError(data?.error || t('bracket.intel.simulate.error'))
          return
        }
        setSimResult({
          simulations: data.simulations,
          winLeagueProbability: data.winLeagueProbability || 0,
          top5Probability: data.top5Probability || 0,
          expectedRank: data.expectedRank || 0,
          finalFourFrequency: data.finalFourFrequency || {},
          championshipFrequency: data.championshipFrequency || {},
        })
        fetch('/api/analytics/insight', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            event: 'simulation_run',
            entry_id: entryId,
            insight_type: 'bracket_review',
            placement: 'bracket_review_page',
            simulations: data.simulations,
          }),
        }).catch(() => {})
      })
      .catch(() => {
        setSimError(t('bracket.intel.simulate.error'))
      })
      .finally(() => {
        setSimLoading(false)
      })

    // Review
    fetch('/api/bracket/intelligence/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entryId }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })).catch(() => ({ ok: false, data: {} })))
      .then(({ ok, data }) => {
        if (!ok || !data?.ok) {
          setReviewError(data?.error || t('bracket.intel.review.error'))
          return
        }
        const m = data.metrics || {}
        setMetrics({
          totalUpsets: m.totalUpsets || 0,
          upsetRate: m.upsetRate || 0,
          upsetsByRound: m.upsetsByRound || {},
          uniqueness: {
            score: m.uniqueness?.score ?? 0,
            percentile: m.uniqueness?.percentile ?? null,
          },
          champion: {
            pick: m.champion?.pick ?? null,
            popularity: m.champion?.popularity ?? null,
          },
          riskScore: m.riskScore ?? undefined,
        })
        setAiReview(
          data.aiReview && typeof data.aiReview === 'object'
            ? {
                strengths: Array.isArray(data.aiReview.strengths)
                  ? data.aiReview.strengths
                  : [],
                risks: Array.isArray(data.aiReview.risks) ? data.aiReview.risks : [],
                strategyNotes: Array.isArray(data.aiReview.strategyNotes)
                  ? data.aiReview.strategyNotes
                  : [],
                summary:
                  typeof data.aiReview.summary === 'string'
                    ? data.aiReview.summary
                    : '',
              }
            : null
        )
        fetch('/api/analytics/insight', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            event: 'ai_bracket_review_viewed',
            entry_id: entryId,
            insight_type: 'bracket_review',
            placement: 'bracket_review_page',
          }),
        }).catch(() => {})
      })
      .catch(() => {
        setReviewError(t('bracket.intel.review.error'))
      })
      .finally(() => {
        setReviewLoading(false)
      })

  }, [entryId, t])

  const championProbability = useMemo(() => {
    if (!metrics?.champion?.pick || !simResult) return 0
    const freq = simResult.championshipFrequency[metrics.champion.pick] || 0
    return freq
  }, [metrics, simResult])

  function riskLabel(score?: number) {
    if (score == null) return t('bracket.review.risk.level.unknown')
    if (score < 35) return t('bracket.review.risk.level.low')
    if (score < 70) return t('bracket.review.risk.level.medium')
    return t('bracket.review.risk.level.high')
  }

  function uniquenessLabel(percentile?: number | null) {
    if (percentile == null) return t('bracket.review.uniqueness.label.unknown')
    if (percentile < 40) return t('bracket.review.uniqueness.label.low')
    if (percentile < 75) return t('bracket.review.uniqueness.label.medium')
    return t('bracket.review.uniqueness.label.high')
  }

  if (!entryId) {
    return (
      <main className="min-h-screen mode-readable" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-16 text-center text-sm text-white/80">
          <p className="mb-3 font-semibold">{t('bracket.review.missingEntry')}</p>
          <Link
            href="/bracket"
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-sm hover:bg-gray-100"
          >
            {t('bracket.review.backToBracketHub')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen flex flex-col mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <header className="w-full border-b border-white/10/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/75 hover:bg-white/10"
            >
              {t('bracket.review.back')}
            </button>
            <h1 className="text-sm font-semibold text-white sm:text-base">
              {t('bracket.review.page.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/70 sm:text-xs">
            <LanguageToggle />
          </div>
        </div>
      </header>

      <section className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <p className="max-w-2xl text-xs text-white/70 sm:text-sm">
            {t('bracket.review.page.subtitle')}
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 space-y-2 mode-panel-soft">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-white/80">
                  {t('bracket.review.simulation.title')}
                </div>
                {simLoading && (
                  <div className="text-[10px] text-white/60">
                    {t('bracket.intel.simulate.running')}
                  </div>
                )}
              </div>
              {simError && (
                <p className="text-[11px] text-red-300">{simError}</p>
              )}
              {simResult && !simError && (
                <div className="space-y-1.5 text-[11px] text-white/80">
                  <div>
                    <span className="text-white/60">
                      {t('bracket.intel.simulate.winChance')}:{" "}
                    </span>
                    <span>
                      {Math.round(simResult.winLeagueProbability * 1000) / 10}%
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">
                      {t('bracket.intel.simulate.top5')}:{" "}
                    </span>
                    <span>
                      {Math.round(simResult.top5Probability * 1000) / 10}%
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">
                      {t('bracket.intel.simulate.expectedRank')}:{" "}
                    </span>
                    <span>
                      {Math.round(simResult.expectedRank * 10) / 10}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-white/45">
                    {t('bracket.intel.simulate.note')}
                  </p>
                </div>
              )}
            </div>

            {/* Health score card (compact) */}
            <HealthBadge entryId={entryId} />

            {/* Popularity & uniqueness card */}
            {metrics && (
              <div className="rounded-2xl border border-purple-400/25 bg-purple-500/5 p-4 space-y-2 mode-panel-soft">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-white/85">
                    {t('bracket.review.popularityUniqueness.title')}
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px] text-white/85">
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.uniqueness.score')}:{" "}
                    </span>
                    <span>{Math.round(metrics.uniqueness.score)}</span>
                    {typeof metrics.uniqueness.percentile === 'number' && (
                      <span className="text-white/50">
                        {" "}
                        · {uniquenessLabel(metrics.uniqueness.percentile)}
                      </span>
                    )}
                  </div>
                  {metrics.champion.pick && metrics.champion.popularity?.pct != null && (
                    <div>
                      <span className="text-white/60">
                        {t('bracket.review.champion.popularity')}:{" "}
                      </span>
                      <span>
                        {metrics.champion.pick} ·{" "}
                        {Math.round(metrics.champion.popularity.pct * 10) / 10}%
                      </span>
                      <span className="ml-1 text-white/50">
                        {metrics.champion.popularity.pct > 50
                          ? t('bracket.review.champion.label.chalk')
                          : metrics.champion.popularity.pct < 20
                          ? t('bracket.review.champion.label.contrarian')
                          : t('bracket.review.champion.label.mixed')}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.upsetRate')}:{" "}
                    </span>
                    <span>{Math.round(metrics.upsetRate * 1000) / 10}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Risk analysis */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 space-y-2 mode-panel-soft">
              <div className="text-xs font-semibold text-white/80">
                {t('bracket.review.risk.title')}
              </div>
              {reviewError && (
                <p className="text-[11px] text-red-300">{reviewError}</p>
              )}
              {metrics && !reviewError && (
                <div className="space-y-1.5 text-[11px] text-white/80">
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.risk.score')}:{" "}
                    </span>
                    <span>{metrics.riskScore ?? "—"}</span>
                  </div>
                  <div className="text-white/60">
                    {riskLabel(metrics.riskScore)}
                  </div>
                </div>
              )}
            </div>

            {/* Uniqueness */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 space-y-2 mode-panel-soft">
              <div className="text-xs font-semibold text-white/80">
                {t('bracket.review.uniqueness.title')}
              </div>
              {metrics && (
                <div className="space-y-1.5 text-[11px] text-white/80">
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.uniqueness.score')}:{" "}
                    </span>
                    <span>
                      {metrics.uniqueness.score}
                      {metrics.uniqueness.percentile != null &&
                        ` (P${metrics.uniqueness.percentile})`}
                    </span>
                  </div>
                  <div className="text-white/60">
                    {uniquenessLabel(metrics.uniqueness.percentile ?? null)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upset + champion row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Upset distribution */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 space-y-2 mode-panel-soft">
              <div className="text-xs font-semibold text-white/80">
                {t('bracket.review.upset.title')}
              </div>
              {metrics && (
                <div className="space-y-1.5 text-[11px] text-white/80">
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.upset.total')}:{" "}
                    </span>
                    <span>{metrics.totalUpsets}</span>
                  </div>
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.upset.rate')}:{" "}
                    </span>
                    <span>
                      {Math.round((metrics.upsetRate || 0) * 1000) / 10}%
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(metrics.upsetsByRound).map(([round, count]) => (
                      <div key={round}>
                        <span className="text-white/60">
                          {t(`bracket.review.upset.roundLabel.${round}`)}:{" "}
                        </span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Champion probability */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 space-y-2 mode-panel-soft">
              <div className="text-xs font-semibold text-white/80">
                {t('bracket.review.champion.title')}
              </div>
              {metrics && (
                <div className="space-y-1.5 text-[11px] text-white/80">
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.champion.pick')}:{" "}
                    </span>
                    <span>{metrics.champion.pick || "—"}</span>
                  </div>
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.champion.modelProb')}:{" "}
                    </span>
                    <span>
                      {metrics.champion.pick && championProbability
                        ? `${Math.round(championProbability * 1000) / 10}%`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">
                      {t('bracket.review.champion.popularity')}:{" "}
                    </span>
                    <span>
                      {metrics.champion.popularity
                        ? `${metrics.champion.popularity.pct}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI explanation */}
          <div className="rounded-2xl border border-white/12 bg-white/5 p-4 space-y-2 mode-panel-soft">
            <div className="text-xs font-semibold text-white/80">
              {t('bracket.review.ai.title')}
            </div>
            {reviewLoading && (
              <p className="text-[11px] text-white/60">
                {t('bracket.intel.review.running')}
              </p>
            )}
            {aiReview && !reviewError && (
              <div className="space-y-2 text-[11px] text-white/80">
                {aiReview.summary && (
                  <p className="text-[11px] text-white/80">{aiReview.summary}</p>
                )}
                {aiReview.strengths?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-emerald-300">
                      {t('bracket.intel.review.strengths')}
                    </div>
                    <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                      {aiReview.strengths.slice(0, 3).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiReview.risks?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-amber-300">
                      {t('bracket.intel.review.risks')}
                    </div>
                    <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                      {aiReview.risks.slice(0, 3).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiReview.strategyNotes?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-sky-300">
                      {t('bracket.intel.review.strategy')}
                    </div>
                    <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                      {aiReview.strategyNotes.slice(0, 3).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-1 text-[10px] text-white/45">
                  {t('bracket.intel.review.note')}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] text-white/50 sm:text-xs">
            {t('bracket.review.disclaimer')}
          </div>
        </div>
      </section>
    </main>
  )
}

export default function BracketReviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen mode-readable" />}>
      <BracketReviewInner />
    </Suspense>
  )
}

