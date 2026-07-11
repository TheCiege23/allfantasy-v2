'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { KpiCard, InfoCard, TrendLineChart, DistributionBarChart } from '@/components/commissioner-os/cards'
import { PreviewDataBanner } from '@/components/commissioner-os/PreviewDataBanner'
import { ErrorState } from '@/components/commissioner-os/states'
import { downloadAnalyticsCsv } from '@/lib/commissioner-os/analytics/exportCsv'
import type { CommissionerDataMode } from '@/lib/commissioner-os/demo-mode/constants'
import type { LeagueAnalyticsSnapshot } from '@/lib/commissioner-os/analytics/decision-os-client'

export interface LeagueAnalyticsViewProps {
  snapshot: LeagueAnalyticsSnapshot | null
  dataMode: CommissionerDataMode
  errorMessage?: string | null
}

/**
 * League Analytics owns executive KPIs, trends, participation,
 * competitive balance, scoring distributions, transaction analytics,
 * roster utilization, and season-over-season comparisons — distinct
 * from League Health's *current-condition* score/risk narrative. Every
 * visualization here reuses one of two shared chart primitives
 * (`TrendLineChart`, `DistributionBarChart`) rather than a bespoke chart
 * per metric.
 */
export function LeagueAnalyticsView({ snapshot, dataMode, errorMessage }: LeagueAnalyticsViewProps) {
  return (
    <div>
      <PreviewDataBanner mode={dataMode} />

      {errorMessage || !snapshot ? (
        <ErrorState message={errorMessage ?? "Couldn't load league analytics right now."} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="outline" onClick={() => downloadAnalyticsCsv(snapshot)}>
              <Download size={14} aria-hidden /> Export CSV
            </Button>
          </div>

          <section aria-labelledby="analytics-kpis-heading">
            <h2 id="analytics-kpis-heading" className="mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Executive KPIs
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {snapshot.kpis.map((kpi) => (
                <KpiCard key={kpi.id} label={kpi.label} value={kpi.value} trend={kpi.trend} />
              ))}
            </div>
          </section>

          <section aria-labelledby="analytics-trends-heading">
            <h2 id="analytics-trends-heading" className="mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
              League Trends
            </h2>
            <TrendLineChart
              series={snapshot.trends.map((series) => ({ id: series.id, name: series.name, points: series.points }))}
              ariaLabel={`League trends over ${snapshot.trends[0]?.points.length ?? 0} weeks: ${snapshot.trends.map((s) => s.name).join(', ')}`}
            />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section aria-labelledby="analytics-balance-heading">
              <h2 id="analytics-balance-heading" className="mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Competitive Balance
              </h2>
              <InfoCard title="Season Snapshot">
                <ul className="space-y-2">
                  {snapshot.competitiveBalance.map((metric) => (
                    <li key={metric.label}>
                      <div className="flex justify-between">
                        <span>{metric.label}</span>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>
                          {metric.value}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--muted2)' }}>
                        {metric.interpretation}
                      </p>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            </section>

            <section aria-labelledby="analytics-scoring-heading">
              <h2 id="analytics-scoring-heading" className="mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Scoring Distribution
              </h2>
              <DistributionBarChart
                data={snapshot.scoringDistribution.map((bucket) => ({ label: bucket.rangeLabel, value: bucket.teamCount }))}
                ariaLabel="Distribution of team-weeks by final score range"
                valueLabel="Team-weeks"
              />
            </section>
          </div>

          <section aria-labelledby="analytics-transactions-heading">
            <h2 id="analytics-transactions-heading" className="mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Transaction Analytics
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Waiver Claims</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.transactionsByWeek.map((week) => (
                  <TableRow key={week.weekLabel}>
                    <TableCell>{week.weekLabel}</TableCell>
                    <TableCell>{week.tradeCount}</TableCell>
                    <TableCell>{week.waiverClaimCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section aria-labelledby="analytics-roster-heading">
              <h2 id="analytics-roster-heading" className="mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Roster Utilization
              </h2>
              <DistributionBarChart
                data={snapshot.rosterUtilization.map((entry) => ({ label: entry.teamName, value: entry.utilizationPercent }))}
                ariaLabel="Roster utilization percentage by team"
                valueLabel="Utilization %"
                height={320}
              />
            </section>

            <section aria-labelledby="analytics-season-heading">
              <h2 id="analytics-season-heading" className="mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Season-over-Season Comparison
              </h2>
              <DistributionBarChart
                data={snapshot.seasonComparison.map((point) => ({ label: point.seasonLabel, value: point.value }))}
                ariaLabel="League engagement score by season"
                valueLabel="Score"
              />
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
