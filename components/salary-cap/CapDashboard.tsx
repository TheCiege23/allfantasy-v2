'use client'

import { Wallet, AlertTriangle, ArrowLeft } from 'lucide-react'
import type { SalaryCapSummary } from './types'

export function CapDashboard({
  summary,
  leagueId,
  onBack,
}: {
  summary: SalaryCapSummary
  leagueId: string
  onBack: () => void
}) {
  const ledger = summary.ledger
  const config = summary.config
  const effectiveCap = config.startupCap + (ledger?.rolloverUsed ?? 0)
  const totalHit = (ledger?.totalCapHit ?? 0) + (ledger?.deadMoneyHit ?? 0)
  const overCap = totalHit > effectiveCap
  const underFloor =
    config.capFloorEnabled && config.capFloorAmount != null && ledger && totalHit < config.capFloorAmount

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
          <Wallet className="h-5 w-5 text-emerald-400" />
          Cap Dashboard
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/50">Current cap space</p>
            <p className="text-2xl font-bold text-emerald-300">
              {ledger ? `$${ledger.capSpace}` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/50">Committed cap (this year)</p>
            <p className="text-2xl font-semibold text-white/90">
              {ledger ? `$${ledger.totalCapHit}` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/50">Dead money</p>
            <p className="text-2xl font-semibold text-amber-300">
              ${summary.deadMoneyTotal}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/50">Effective cap (with rollover)</p>
            <p className="text-xl font-semibold text-white/80">${effectiveCap}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/50">Rollover used</p>
            <p className="text-xl font-semibold text-white/80">
              ${ledger?.rolloverUsed ?? 0}
            </p>
          </div>
        </div>

        {(overCap || underFloor) && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-950/20 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <div className="text-sm text-amber-200">
              {overCap && <p>You are over the cap by ${totalHit - effectiveCap}.</p>}
              {underFloor && <p>You are below the cap floor.</p>}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-white/80">Committed cap by future year</h3>
          <ul className="space-y-2">
            {summary.futureProjection.map((y) => (
              <li
                key={y.capYear}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
              >
                <span className="text-white/80">{y.capYear}</span>
                <span className="tabular-nums text-white/80">${y.totalCapHit} hit</span>
                <span className="tabular-nums text-emerald-300">${y.projectedSpace} space</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
