'use client'

import { Sparkles, ArrowLeft } from 'lucide-react'
import type { SalaryCapSummary } from './types'

export function SalaryCapAIPanel({
  summary,
  leagueId,
  onBack,
}: {
  summary: SalaryCapSummary
  leagueId: string
  onBack: () => void
}) {
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-cyan-200">
          <Sparkles className="h-5 w-5" />
          AI Salary Cap Tools
        </h2>

        <p className="mb-4 text-sm text-white/80">
          AI helps with strategy and advice only. Cap numbers and eligibility are always
          computed by the league engine.
        </p>

        <ul className="space-y-3 text-sm text-white/80">
          <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <strong className="text-cyan-200">Cap strategy</strong> — How to allocate cap, when to
            spend vs save
          </li>
          <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <strong className="text-cyan-200">Extension suggestions</strong> — Extend or let walk,
            fair price
          </li>
          <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <strong className="text-cyan-200">Contract length guidance</strong> — Short vs long
            term for your roster
          </li>
          <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <strong className="text-cyan-200">Title-window analysis</strong> — Win-now vs future
          </li>
          <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <strong className="text-cyan-200">Contend vs rebuild</strong> — Strategic direction
          </li>
        </ul>

        <a
          href={`/app/league/${leagueId}?tab=Intelligence`}
          className="mt-4 inline-block rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-950/50"
        >
          Open Intelligence tab for AI →
        </a>
      </section>
    </div>
  )
}
