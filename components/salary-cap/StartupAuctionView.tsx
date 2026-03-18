'use client'

import { Gavel, ArrowLeft } from 'lucide-react'
import type { SalaryCapSummary } from './types'

export function StartupAuctionView({
  summary,
  leagueId,
  onBack,
}: {
  summary: SalaryCapSummary
  leagueId: string
  onBack: () => void
}) {
  const config = summary.config

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Gavel className="h-5 w-5 text-emerald-400" />
          Startup & future drafts
        </h2>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <dt className="text-xs text-white/50">Startup draft</dt>
            <dd className="text-sm font-medium text-white/90 capitalize">
              {config.startupDraftType?.replace(/_/g, ' ')}
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <dt className="text-xs text-white/50">Future acquisition draft</dt>
            <dd className="text-sm font-medium text-white/90 capitalize">
              {config.futureDraftType?.replace(/_/g, ' ')}
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <dt className="text-xs text-white/50">Auction holdback</dt>
            <dd className="text-sm font-medium text-white/90">${config.auctionHoldback}</dd>
          </div>
        </dl>

        {config.weightedLotteryEnabled && (
          <div className="mt-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
            <h3 className="mb-2 text-sm font-medium text-cyan-200">Weighted lottery</h3>
            <p className="text-sm text-white/70">
              Draft order is set by weighted lottery. Seed is stored for audit.
            </p>
            {summary.lottery?.order && (
              <p className="mt-2 text-xs text-white/50">
                Result for this year: {Array.isArray(summary.lottery.order) ? `${(summary.lottery.order as unknown[]).length} slots` : '—'}
              </p>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-white/50">
          Startup auction recap: see Contracts for current roster. Rookie draft uses slot-based
          salary scale.
        </p>
      </section>
    </div>
  )
}
