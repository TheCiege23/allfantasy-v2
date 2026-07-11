import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LeagueAnalyticsView } from "@/components/commissioner-os/analytics/LeagueAnalyticsView"
import { stubAnalyticsClient } from "@/lib/commissioner-os/analytics/decision-os-client/stub"
import { demoAnalyticsClient } from "@/lib/commissioner-os/analytics/decision-os-client/demo"
import { liveAnalyticsClient } from "@/lib/commissioner-os/analytics/decision-os-client/live"
import { buildAnalyticsCsv } from "@/lib/commissioner-os/analytics/exportCsv"
import type { LeagueAnalyticsSnapshot } from "@/lib/commissioner-os/analytics/decision-os-client"

describe("commissioner-os analytics — client parity", () => {
  it("stub, demo, and live all satisfy the same method surface", () => {
    expect(typeof stubAnalyticsClient.getSnapshot).toBe('function')
    expect(typeof stubAnalyticsClient.getSummary).toBe('function')
    expect(typeof demoAnalyticsClient.getSnapshot).toBe('function')
    expect(typeof demoAnalyticsClient.getSummary).toBe('function')
    expect(typeof liveAnalyticsClient.getSnapshot).toBe('function')
    expect(typeof liveAnalyticsClient.getSummary).toBe('function')
  })

  it("stub and demo are source-tagged and error-free; live is an honest, typed placeholder error", async () => {
    const stubSnapshot = await stubAnalyticsClient.getSnapshot()
    const demoSnapshot = await demoAnalyticsClient.getSnapshot()
    expect(stubSnapshot.source).toBe('stub')
    expect(stubSnapshot.error).toBeNull()
    expect(demoSnapshot.source).toBe('demo')
    expect(demoSnapshot.error).toBeNull()

    const liveSnapshot = await liveAnalyticsClient.getSnapshot()
    const liveSummary = await liveAnalyticsClient.getSummary()
    for (const response of [liveSnapshot, liveSummary]) {
      expect(response.data).toBeNull()
      expect(response.error?.category).toBe('upstream_unavailable')
      expect(response.error?.retryable).toBe(false)
      expect(response.source).toBe('live')
    }
  })

  it("demo summary's kpiCount matches the snapshot's actual kpi count", async () => {
    const snapshotResponse = await demoAnalyticsClient.getSnapshot()
    const summaryResponse = await demoAnalyticsClient.getSummary()
    expect(summaryResponse.data!.kpiCount).toBe(snapshotResponse.data!.kpis.length)
  })

  it("demo snapshot's trend series all have the same number of points", async () => {
    const response = await demoAnalyticsClient.getSnapshot()
    const lengths = new Set(response.data!.trends.map((series) => series.points.length))
    expect(lengths.size).toBe(1)
  })

  it("demo snapshot's scoring distribution, roster utilization, and season comparison are all non-empty", async () => {
    const response = await demoAnalyticsClient.getSnapshot()
    expect(response.data!.scoringDistribution.length).toBeGreaterThan(0)
    expect(response.data!.rosterUtilization.length).toBeGreaterThan(0)
    expect(response.data!.seasonComparison.length).toBeGreaterThan(0)
  })
})

describe("commissioner-os analytics — CSV export", () => {
  const snapshot: LeagueAnalyticsSnapshot = {
    kpis: [{ id: 'k1', label: 'Engagement', value: '91' }],
    trends: [{ id: 't1', name: 'Engagement Trend', points: [{ label: 'Wk 1', value: 82 }, { label: 'Wk 2', value: 85 }] }],
    competitiveBalance: [{ label: 'Point differential', value: '142.3 pts', interpretation: 'Tight season.' }],
    scoringDistribution: [{ rangeLabel: '100-119', teamCount: 58 }],
    transactionsByWeek: [{ weekLabel: 'Wk 6', tradeCount: 2, waiverClaimCount: 9 }],
    rosterUtilization: [{ teamName: 'Priya Natarajan', utilizationPercent: 98 }],
    seasonComparison: [{ seasonLabel: '2025', value: 91 }],
    generatedAt: new Date().toISOString(),
  }

  it("produces one header row plus one row per data point across every section", () => {
    const csv = buildAnalyticsCsv(snapshot)
    const rows = csv.split('\n')
    // header + 1 kpi + 2 trend points + 1 balance metric + 1 scoring bucket + 2 transaction rows (trades+waivers) + 1 roster entry + 1 season point
    expect(rows).toHaveLength(1 + 1 + 2 + 1 + 1 + 2 + 1 + 1)
    expect(rows[0]).toBe('Section,Label,Value')
  })

  it("escapes values containing commas or quotes", () => {
    const csv = buildAnalyticsCsv({
      ...snapshot,
      competitiveBalance: [{ label: 'A label, with a comma', value: 'A "quoted" value', interpretation: '' }],
    })
    expect(csv).toContain('"A label, with a comma"')
    expect(csv).toContain('"A ""quoted"" value"')
  })
})

describe("commissioner-os analytics — view", () => {
  it("renders the preview data banner, KPIs, and the export button", async () => {
    const response = await demoAnalyticsClient.getSnapshot()
    render(<LeagueAnalyticsView snapshot={response.data} dataMode="demo" />)

    expect(screen.getByRole('status')).toHaveTextContent(/preview data/i)
    for (const kpi of response.data!.kpis) {
      expect(screen.getByText(kpi.label)).toBeInTheDocument()
      expect(screen.getByText(kpi.value)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeInTheDocument()
  })

  it("renders each chart with an accessible role and label", async () => {
    const response = await demoAnalyticsClient.getSnapshot()
    render(<LeagueAnalyticsView snapshot={response.data} dataMode="demo" />)

    const images = screen.getAllByRole('img')
    // League Trends + Scoring Distribution + Roster Utilization + Season Comparison = 4 charts
    expect(images.length).toBe(4)
    expect(images.some((img) => img.getAttribute('aria-label')?.includes('League trends'))).toBe(true)
  })

  it("renders the transaction analytics table and competitive balance metrics", async () => {
    const response = await demoAnalyticsClient.getSnapshot()
    render(<LeagueAnalyticsView snapshot={response.data} dataMode="demo" />)

    for (const week of response.data!.transactionsByWeek) {
      expect(screen.getByText(week.weekLabel)).toBeInTheDocument()
    }
    for (const metric of response.data!.competitiveBalance) {
      expect(screen.getByText(metric.label)).toBeInTheDocument()
      expect(screen.getByText(metric.interpretation)).toBeInTheDocument()
    }
  })

  it("renders ErrorState when there is no snapshot", () => {
    render(<LeagueAnalyticsView snapshot={null} dataMode="live" errorMessage="The live Decision OS backend is not yet integrated in this environment." />)
    expect(screen.getByRole('alert')).toHaveTextContent(/not yet integrated/i)
  })

  it("renders ErrorState with a default message when snapshot is null but no explicit error is set", () => {
    render(<LeagueAnalyticsView snapshot={null} dataMode="stub" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it("hides the preview data banner in live mode", async () => {
    const response = await demoAnalyticsClient.getSnapshot()
    render(<LeagueAnalyticsView snapshot={response.data} dataMode="live" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
