/**
 * Decision OS Replay Framework — deterministic trade backtest executor.
 * Calls the existing, UNMODIFIED trade-engine (computeTradeDrivers() +
 * calibrateAcceptProbability()) against a normalized replay row, producing a
 * retroactive prediction to compare against the real, known outcome.
 *
 * Per docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md §6: this module never
 * writes to TradeOfferEvent/TradeOutcomeEvent/TradeLearningStats — it only
 * READS the current calibratedB0 (via the existing getCalibratedWeights(),
 * the same read every live trade-evaluation route already performs) to
 * score a historical trade the same way a live proposal would have been
 * scored, then hands the result to lib/replay-framework/writer.ts, which
 * only ever writes ReplayBacktestResult.
 */
import { calibrateAcceptProbability, getCalibratedWeights } from '@/lib/trade-engine/accept-calibration'
import { computeTradeDrivers } from '@/lib/trade-engine/trade-engine'
import type { Asset } from '@/lib/trade-engine/types'
import { computeDeterministicConfigVersion, resolveEngineVersionHash, TRADE_MODEL_VERSION } from '../versioning'
import type { BacktestResultInput, TradeBacktestOutput, TradeRealOutcome, TradeReplayPayload } from '../types'
import { mapSleeperStatusToOutcome } from '../normalize/sleeperTradeNormalizer'

function toAssets(items: TradeReplayPayload['assetsGiven']): Asset[] {
  return items.map((item, idx) => ({
    id: `replay-${idx}`,
    type: item.type === 'pick' ? 'PICK' : 'PLAYER',
    value: item.value,
    name: item.name,
  }))
}

export interface TradeBacktestInput {
  replayId: string
  season: number
  payload: TradeReplayPayload
  isSuperFlex: boolean
  providerStatus: string
  resolvedAt: Date | null
}

export async function runTradeBacktest(input: TradeBacktestInput): Promise<BacktestResultInput> {
  const give = toAssets(input.payload.assetsGiven)
  const receive = toAssets(input.payload.assetsReceived)

  const calWeights = await getCalibratedWeights(input.season, { isSuperFlex: input.isSuperFlex, scoringType: undefined })

  const drivers = computeTradeDrivers(
    give,
    receive,
    null,
    null,
    input.isSuperFlex,
    false,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    calWeights,
  )

  const { calibrated } = await calibrateAcceptProbability(drivers.acceptProbability, input.season)

  const backtestedOutput: TradeBacktestOutput = {
    acceptProb: calibrated,
    verdict: drivers.verdict,
    confidenceScore: drivers.confidenceScore,
    lineupImpactScore: drivers.lineupImpactScore,
    vorpScore: drivers.vorpScore,
    marketScore: drivers.marketScore,
    behaviorScore: drivers.behaviorScore,
  }

  // Per the ADR's exclusion (§4): a real outcome is only settled once the
  // underlying trade has actually resolved — a `pending` trade has no known
  // outcome to backtest against yet.
  const realOutcome: TradeRealOutcome | null =
    input.providerStatus === 'pending'
      ? null
      : { outcome: mapSleeperStatusToOutcome(input.providerStatus), providerStatus: input.providerStatus }

  return {
    replayId: input.replayId,
    decisionType: 'trade',
    modelVersion: TRADE_MODEL_VERSION,
    engineVersionHash: resolveEngineVersionHash(),
    deterministicConfigVersion: computeDeterministicConfigVersion(calWeights.b0),
    backtestedOutput,
    realOutcome,
  }
}
