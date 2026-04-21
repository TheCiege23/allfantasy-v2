'use client'

import type { AdminAIMetricsBundle } from '@/lib/ai/admin/getAIMetrics'

export function AILeagueSegments({ rows }: { rows: AdminAIMetricsBundle['leagueSegments'] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-wide text-white/50">
          <tr>
            <th className="px-3 py-2">League type</th>
            <th className="px-3 py-2">Scoring</th>
            <th className="px-3 py-2">AI usage</th>
            <th className="px-3 py-2">Follow rate</th>
            <th className="px-3 py-2">Avg outcome</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-white/45">
                No league-scoped logs in this window.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={`${r.leagueType}-${r.scoringFormat}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-white/90">{r.leagueType}</td>
                <td className="px-3 py-2 text-white/60">{r.scoringFormat}</td>
                <td className="px-3 py-2 tabular-nums">{r.aiUsage}</td>
                <td className="px-3 py-2 tabular-nums text-cyan-200/90">
                  {r.followRatePct != null ? `${r.followRatePct.toFixed(1)}%` : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-violet-200/90">
                  {r.avgOutcomeScore != null ? r.avgOutcomeScore.toFixed(3) : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
