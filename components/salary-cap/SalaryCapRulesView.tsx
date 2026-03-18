'use client'

import { Settings, ArrowLeft } from 'lucide-react'
import type { SalaryCapSummary } from './types'

export function SalaryCapRulesView({
  summary,
  leagueId,
  onBack,
}: {
  summary: SalaryCapSummary
  leagueId: string
  onBack: () => void
}) {
  const c = summary.config

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
          <Settings className="h-5 w-5 text-white/60" />
          Rules & settings
        </h2>

        <h3 className="mb-2 text-sm font-medium text-white/80">Salary cap</h3>
        <dl className="mb-6 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-white/50">Startup cap</dt><dd className="text-white/90">${c.startupCap}</dd></div>
          <div><dt className="text-white/50">Cap growth</dt><dd className="text-white/90">{c.capGrowthPercent}%</dd></div>
          <div><dt className="text-white/50">Rollover</dt><dd className="text-white/90">{c.rolloverEnabled ? `Yes (max $${c.rolloverMax})` : 'No'}</dd></div>
        </dl>

        <h3 className="mb-2 text-sm font-medium text-white/80">Contract</h3>
        <dl className="mb-6 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-white/50">Min / max years</dt><dd className="text-white/90">{c.contractMinYears}–{c.contractMaxYears}</dd></div>
          <div><dt className="text-white/50">Rookie contract years</dt><dd className="text-white/90">{c.rookieContractYears}</dd></div>
          <div><dt className="text-white/50">Minimum salary</dt><dd className="text-white/90">${c.minimumSalary}</dd></div>
          <div><dt className="text-white/50">Dead money</dt><dd className="text-white/90">{c.deadMoneyEnabled ? 'On' : 'Off'}</dd></div>
          <div><dt className="text-white/50">Extensions</dt><dd className="text-white/90">{c.extensionsEnabled ? 'On' : 'Off'}</dd></div>
          <div><dt className="text-white/50">Franchise tag</dt><dd className="text-white/90">{c.franchiseTagEnabled ? 'On' : 'Off'}</dd></div>
        </dl>

        <h3 className="mb-2 text-sm font-medium text-white/80">Draft</h3>
        <dl className="mb-6 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-white/50">Startup</dt><dd className="text-white/90 capitalize">{c.startupDraftType?.replace(/_/g, ' ')}</dd></div>
          <div><dt className="text-white/50">Future draft</dt><dd className="text-white/90 capitalize">{c.futureDraftType?.replace(/_/g, ' ')}</dd></div>
          <div><dt className="text-white/50">Auction holdback</dt><dd className="text-white/90">${c.auctionHoldback}</dd></div>
          <div><dt className="text-white/50">Weighted lottery</dt><dd className="text-white/90">{c.weightedLotteryEnabled ? 'On' : 'Off'}</dd></div>
        </dl>

        {c.offseasonPhase && (
          <p className="text-xs text-white/50">Current offseason phase: {c.offseasonPhase}</p>
        )}

        <a
          href={`/app/league/${leagueId}?tab=Settings`}
          className="mt-4 inline-block text-sm text-cyan-400 hover:underline"
        >
          League Settings →
        </a>
      </section>
    </div>
  )
}
