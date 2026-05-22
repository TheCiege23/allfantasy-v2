/**
 * AI Usage Monitor Panel — admin-only Server Component.
 *
 * Drop this into any existing admin-gated page:
 *
 *   import { getAiUsageReport } from '@/lib/ai/aiUsageMonitor'
 *   import { AiUsageMonitorPanel } from '@/components/admin/AiUsageMonitorPanel'
 *
 *   export default async function AdminPage() {
 *     const report = await getAiUsageReport()
 *     return <AiUsageMonitorPanel report={report} />
 *   }
 *
 * Auth: handled by the parent page/layout. This component renders as-is.
 * No API route needed — queries are resolved server-side via getAiUsageReport().
 */
import type { AiUsageReport, AiCapFeatureRow } from '@/lib/ai/aiUsageMonitor'

interface Props {
  report: AiUsageReport
}

function StatusDot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${on ? 'bg-green-400' : 'bg-zinc-600'}`}
      aria-hidden="true"
    />
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">{title}</h3>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      {children}
    </div>
  )
}

function NotTracked() {
  return <span className="text-xs text-zinc-600 italic">Not tracked yet</span>
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtUsd(n: number) {
  return `$${n.toFixed(4)}`
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function ProviderStatusSection({ status }: { status: AiUsageReport['providerStatus'] }) {
  const providers: [string, boolean][] = [
    ['OpenAI', status.openai],
    ['Anthropic', status.anthropic],
    ['xAI / Grok', status.xai],
    ['DeepSeek', status.deepseek],
  ]

  return (
    <Card>
      <SectionHeader title="Provider Configuration" />
      <ul className="grid grid-cols-2 gap-2">
        {providers.map(([name, configured]) => (
          <li key={name} className="flex items-center gap-2 text-sm text-zinc-300">
            <StatusDot on={configured} />
            <span>{name}</span>
            <span className={`ml-auto text-xs ${configured ? 'text-green-400' : 'text-zinc-600'}`}>
              {configured ? 'configured' : 'not set'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-zinc-600">No API keys are shown.</p>
    </Card>
  )
}

function CapSummarySection({ caps }: { caps: AiUsageReport['caps'] }) {
  return (
    <Card>
      <SectionHeader title={`Daily Cap Usage — ${caps.windowDate} UTC`} />
      {!caps.dataAvailable ? (
        <NotTracked />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
            {[
              ['Total Calls', caps.totalCallsToday],
              ['Active Users', caps.totalUsersToday],
              ['Near Cap (≥80%)', caps.usersNearCap],
              ['Blocked by Cap', caps.usersAtCap],
            ].map(([label, value]) => (
              <div key={label as string} className="text-center">
                <div className="text-2xl font-bold text-white">{fmt(value as number)}</div>
                <div className="text-xs text-zinc-500">{label as string}</div>
              </div>
            ))}
          </div>
          {caps.byFeature.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-white/5">
                  <th className="pb-1 font-medium">Feature</th>
                  <th className="pb-1 font-medium text-right">Users</th>
                  <th className="pb-1 font-medium text-right">Calls</th>
                  <th className="pb-1 font-medium text-right">Near Cap</th>
                  <th className="pb-1 font-medium text-right">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {caps.byFeature.map((row: AiCapFeatureRow) => (
                  <tr key={row.feature} className="border-b border-white/[0.03] text-zinc-300">
                    <td className="py-1 font-mono text-xs">{row.feature}</td>
                    <td className="py-1 text-right">{fmt(row.totalUsers)}</td>
                    <td className="py-1 text-right">{fmt(row.totalCalls)}</td>
                    <td className={`py-1 text-right ${row.usersNearCap > 0 ? 'text-yellow-400' : ''}`}>
                      {fmt(row.usersNearCap)}
                    </td>
                    <td className={`py-1 text-right ${row.usersAtCap > 0 ? 'text-red-400' : ''}`}>
                      {fmt(row.usersAtCap)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Card>
  )
}

function CacheStatsSection({ cache }: { cache: AiUsageReport['cache'] }) {
  return (
    <Card>
      <SectionHeader title="AI Response Cache" />
      {!cache.dataAvailable ? (
        <NotTracked />
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-white">{fmt(cache.activeCacheEntries)}</span>
            <span className="text-xs text-zinc-500">active (unexpired) entries</span>
          </div>
          {cache.byFeature.length > 0 && (
            <ul className="space-y-1">
              {cache.byFeature.map(({ feature, count }) => (
                <li key={feature} className="flex justify-between text-sm text-zinc-300">
                  <span className="font-mono text-xs">{feature}</span>
                  <span>{fmt(count)} cached</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-zinc-600">{cache.note}</p>
        </>
      )}
    </Card>
  )
}

function TelemetrySection({ telemetry }: { telemetry: AiUsageReport['telemetry'] }) {
  return (
    <Card>
      <SectionHeader title="Call Telemetry (Today)" />
      {!telemetry.tracked ? (
        <p className="text-xs text-zinc-600 italic">
          ChimmyContextRun telemetry not available yet — table may not be migrated.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
            {[
              ['Total Runs', telemetry.totalRuns],
              ['Cache Hits', telemetry.totalCacheHits],
              ['Provider Failures', telemetry.totalProviderFailures],
              ['Avg Latency ms', telemetry.avgDurationMs],
            ].map(([label, value]) => (
              <div key={label as string} className="text-center">
                <div className="text-2xl font-bold text-white">{fmt(value as number)}</div>
                <div className="text-xs text-zinc-500">{label as string}</div>
              </div>
            ))}
          </div>

          {telemetry.byProvider.length > 0 && (
            <>
              <p className="text-xs text-zinc-500 mb-1">By provider</p>
              <ul className="space-y-1 mb-3">
                {telemetry.byProvider.map((p) => (
                  <li key={p.provider} className="flex gap-3 text-sm text-zinc-300">
                    <span className="font-mono text-xs w-24 shrink-0">{p.provider}</span>
                    <span>{fmt(p.totalCalls)} calls</span>
                    <span className="text-green-400">{fmt(p.cachedCalls)} cached</span>
                    {p.failedCalls > 0 && (
                      <span className="text-red-400">{fmt(p.failedCalls)} failed</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {telemetry.byIntent.length > 0 && (
            <>
              <p className="text-xs text-zinc-500 mb-1">By intent</p>
              <ul className="space-y-0.5">
                {telemetry.byIntent.slice(0, 8).map(({ intent, count }) => (
                  <li key={intent} className="flex justify-between text-xs text-zinc-400">
                    <span className="font-mono">{intent}</span>
                    <span>{fmt(count)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Card>
  )
}

function CostEstimateSection({ cost }: { cost: AiUsageReport['costEstimate'] }) {
  return (
    <Card>
      <SectionHeader title="Cost Estimate (Today)" />
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-white">
          {fmtUsd(cost.totalLowUsd)}–{fmtUsd(cost.totalHighUsd)}
        </span>
        <span className="text-xs text-yellow-500">est.</span>
      </div>
      <p className="text-xs text-zinc-500 mb-3">{cost.note}</p>
      {cost.byFeature.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 border-b border-white/5">
              <th className="pb-1 font-medium">Feature</th>
              <th className="pb-1 font-medium text-center">Profile</th>
              <th className="pb-1 font-medium text-right">Calls</th>
              <th className="pb-1 font-medium text-right">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {cost.byFeature.map((row) => (
              <tr key={row.feature} className="border-b border-white/[0.03] text-zinc-300">
                <td className="py-1 font-mono text-xs">{row.feature}</td>
                <td className="py-1 text-center text-xs text-zinc-500">{row.profile}</td>
                <td className="py-1 text-right">{fmt(row.paidCalls)}</td>
                <td className="py-1 text-right text-xs">
                  {fmtUsd(row.estimatedLowUsd)}–{fmtUsd(row.estimatedHighUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AiUsageMonitorPanel({ report }: Props) {
  return (
    <section aria-label="AI usage monitor" className="space-y-4 text-zinc-100">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">AI Usage Monitor</h2>
        <span className="text-xs text-zinc-600">
          Generated {report.generatedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC
        </span>
      </div>

      <ProviderStatusSection status={report.providerStatus} />
      <CapSummarySection caps={report.caps} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CacheStatsSection cache={report.cache} />
        <TelemetrySection telemetry={report.telemetry} />
      </div>

      <CostEstimateSection cost={report.costEstimate} />

      <p className="text-xs text-zinc-700">
        Admin-only surface. No raw API keys, user IDs, emails, or prompt text displayed.
      </p>
    </section>
  )
}
