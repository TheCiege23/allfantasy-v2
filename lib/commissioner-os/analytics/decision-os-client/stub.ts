import type { AnalyticsClient } from './types'

export const stubAnalyticsClient: AnalyticsClient = {
  async getSnapshot() {
    return {
      data: {
        kpis: [{ id: 'stub-kpi-1', label: 'Test KPI', value: '1' }],
        trends: [{ id: 'stub-trend-1', name: 'Test Trend', points: [{ label: 'Week 1', value: 1 }] }],
        competitiveBalance: [{ label: 'Test Metric', value: '1', interpretation: 'Stub fixture.' }],
        scoringDistribution: [{ rangeLabel: '100-119', teamCount: 1 }],
        transactionsByWeek: [{ weekLabel: 'Week 1', tradeCount: 1, waiverClaimCount: 1 }],
        rosterUtilization: [{ teamName: 'Test Team', utilizationPercent: 90 }],
        seasonComparison: [{ seasonLabel: '2025', value: 90 }],
        generatedAt: new Date().toISOString(),
      },
      error: null,
      source: 'stub',
      timestamp: new Date().toISOString(),
    }
  },

  async getSummary() {
    return {
      data: { headline: '1 KPI tracked', kpiCount: 1 },
      error: null,
      source: 'stub',
      timestamp: new Date().toISOString(),
    }
  },
}
