'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AdminAIMetricsBundle } from '@/lib/ai/admin/getAIMetrics'

export function AIFeatureBreakdown({ rows }: { rows: AdminAIMetricsBundle['featureBreakdown'] }) {
  const data = rows.map((r) => ({
    name: r.label,
    usage: r.usageCount,
    follow: r.followRatePct ?? 0,
    outcome: r.avgOutcomeScore != null ? Math.round(r.avgOutcomeScore * 1000) / 1000 : 0,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
        <h3 className="text-sm font-semibold text-white">Usage by feature</h3>
        <p className="text-[11px] text-white/45">Draft / trade / waiver / coaching (heuristic from feature tags)</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="usage" fill="#6366f1" radius={[4, 4, 0, 0]} name="Usage" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.feature} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">{r.label}</span>
              <span className="text-xs text-white/45">{r.usageCount} uses</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <p className="text-white/45">Follow rate</p>
                <p className="font-mono text-cyan-300">{r.followRatePct != null ? `${r.followRatePct.toFixed(1)}%` : '—'}</p>
              </div>
              <div>
                <p className="text-white/45">Avg outcome</p>
                <p className="font-mono text-violet-300">{r.avgOutcomeScore != null ? r.avgOutcomeScore.toFixed(3) : '—'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
