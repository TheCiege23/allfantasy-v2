import 'server-only'

import type { SportsPlayerRecord } from '@prisma/client'
import type { PricedAsset } from '@/lib/hybrid-valuation'
import type { SupportedSport } from '@/lib/sport-scope'

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function extractProjectionPoints(projections: unknown): number | null {
  if (!projections || typeof projections !== 'object' || Array.isArray(projections)) return null
  const o = projections as Record<string, unknown>
  const keys = ['fantasyPoints', 'projectedPoints', 'points', 'fp', 'total', 'ros']
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v)
  }
  return null
}

function injuryVolatility(status: string | null | undefined): number {
  if (!status) return 0.22
  const s = status.toLowerCase()
  if (s.includes('out') || s.includes('ir')) return 0.45
  if (s.includes('doubt')) return 0.4
  if (s.includes('quest')) return 0.32
  if (s.includes('prob')) return 0.26
  return 0.24
}

export function missingPlayerPriced(name: string, sport: SupportedSport): PricedAsset {
  const h = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const market = 450 + (h % 600)
  return {
    name,
    type: 'player',
    value: market,
    assetValue: {
      marketValue: market,
      impactValue: Math.round(market * 0.52),
      vorpValue: Math.round(market * 0.24),
      volatility: 0.42,
    },
    position: 'UNK',
    source: 'unknown',
  }
}

export function sportsRecordToPricedAsset(row: SportsPlayerRecord): PricedAsset {
  const dyn = row.dynastyValue
  const projPts = extractProjectionPoints(row.projections)
  let market = typeof dyn === 'number' && dyn > 0 ? Math.round(dyn * 75) : 0
  if (market <= 0 && projPts != null) {
    market = Math.round(clamp(projPts * 45, 200, 9000))
  }
  if (market <= 0) {
    market = 1200
  }
  const vol = injuryVolatility(row.injuryStatus)
  const impact = Math.round(market * 0.62)
  const vorp = Math.round(market * 0.28)
  return {
    name: row.name,
    type: 'player',
    value: market,
    assetValue: {
      marketValue: market,
      impactValue: impact,
      vorpValue: vorp,
      volatility: vol,
    },
    position: row.position,
    source: 'unknown',
  }
}

export { clamp }
