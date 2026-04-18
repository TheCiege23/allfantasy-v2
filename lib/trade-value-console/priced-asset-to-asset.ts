import type { PricedAsset } from '@/lib/hybrid-valuation'
import type { Asset } from '@/lib/trade-engine/types'

/** Maps hybrid PricedAsset to trade-engine Asset; `id` is player/pick display name (matches trade sides). */
export function pricedAssetToEngineAsset(pa: PricedAsset, pickInfo?: { year: number; round: number }): Asset {
  return {
    id: pa.name,
    type: pa.type === 'pick' ? 'PICK' : 'PLAYER',
    value: pa.value,
    marketValue: pa.assetValue.marketValue,
    impactValue: pa.assetValue.impactValue,
    vorpValue: pa.assetValue.vorpValue,
    volatility: pa.assetValue.volatility,
    name: pa.name,
    pos: pa.position,
    age: pa.age,
    round: pickInfo?.round as 1 | 2 | 3 | 4 | undefined,
  }
}
