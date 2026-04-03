export type TradeAnalysis = {
  grade: string
  summary: string
  collusionFlag: boolean
}

export async function analyzeTrade(_tradeId: string): Promise<TradeAnalysis> {
  return { grade: 'B', summary: 'Analysis pending wiring.', collusionFlag: false }
}

export type CollusionAlert = { tradeId: string; reason: string }

export async function detectCollusion(_leagueId: string): Promise<CollusionAlert[]> {
  return []
}
