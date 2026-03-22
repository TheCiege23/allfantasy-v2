import type { AICommissionerSeverity } from './types'

export interface CollusionTradeSignalInput {
  tradeId: string
  valueGiven: number | null
  valueReceived: number | null
  partnerKey: string | null
  createdAt: Date
}

export interface CollusionSignal {
  signalKey: string
  severity: AICommissionerSeverity
  summary: string
  managerIds: string[]
  tradeId: string | null
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function detectCollusionSignals(input: {
  trades: CollusionTradeSignalInput[]
  rosterTurnoverFactor: number
}): CollusionSignal[] {
  const out: CollusionSignal[] = []
  if (input.trades.length === 0) return out

  for (const trade of input.trades) {
    if (trade.valueGiven == null || trade.valueReceived == null) continue
    const maxValue = Math.max(Math.abs(trade.valueGiven), Math.abs(trade.valueReceived), 1)
    const delta = Math.abs(trade.valueGiven - trade.valueReceived)
    const deltaRatio = delta / maxValue
    const weightedDelta = deltaRatio * Math.max(0.8, input.rosterTurnoverFactor)

    if (weightedDelta < 0.42) continue
    const severity: AICommissionerSeverity =
      weightedDelta > 0.78 ? 'critical' : weightedDelta > 0.58 ? 'high' : 'medium'
    out.push({
      signalKey: `trade-imbalance:${trade.tradeId}`,
      severity,
      summary: `Trade value imbalance detected (${round(deltaRatio * 100)}%). Manual review recommended.`,
      managerIds: trade.partnerKey ? [trade.partnerKey] : [],
      tradeId: trade.tradeId,
    })
  }

  const partnerFrequency = new Map<string, number>()
  for (const trade of input.trades) {
    if (!trade.partnerKey) continue
    partnerFrequency.set(trade.partnerKey, (partnerFrequency.get(trade.partnerKey) ?? 0) + 1)
  }
  for (const [partnerKey, count] of partnerFrequency) {
    if (count < 3) continue
    out.push({
      signalKey: `repeat-partner:${partnerKey}`,
      severity: count >= 5 ? 'high' : 'medium',
      summary: `Repeated trade concentration with the same manager/roster (${count} recent trades).`,
      managerIds: [partnerKey],
      tradeId: null,
    })
  }

  return out
}
