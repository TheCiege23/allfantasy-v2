/**
 * Trade validation for Salary Cap: cap legality both sides, future cap (PROMPT 339). Deterministic only.
 * Integrate with existing trade engine: call before accepting; AI explanation layer only after this.
 */

import { getSalaryCapConfig } from './SalaryCapLeagueConfig'
import { getOrCreateLedger, getEffectiveCap } from './CapCalculationService'
import type { TradeCapImpact } from './types'

export interface TradeCapValidationInput {
  fromRosterId: string
  toRosterId: string
  /** Contract IDs (or player IDs) and salaries moving from fromRosterId to toRosterId. */
  movingToReceiver: { contractId?: string; playerId: string; salary: number }[]
  /** Contract IDs moving from toRosterId to fromRosterId (if any). */
  movingToSender: { contractId?: string; playerId: string; salary: number }[]
}

/**
 * Validate trade for cap: both rosters must remain legal now and in future years.
 * Returns cap impact and legality flags.
 */
export async function validateTradeCap(
  leagueId: string,
  input: TradeCapValidationInput
): Promise<TradeCapImpact> {
  const config = await getSalaryCapConfig(leagueId)
  const errors: string[] = []
  if (!config) {
    return {
      fromRosterId: input.fromRosterId,
      toRosterId: input.toRosterId,
      fromCapHitDelta: 0,
      toCapHitDelta: 0,
      fromLegal: false,
      toLegal: false,
      fromFutureLegal: false,
      toFutureLegal: false,
      errors: ['Not a salary cap league'],
    }
  }
  const capYear = new Date().getFullYear()
  const fromLedger = await getOrCreateLedger(config, input.fromRosterId, capYear)
  const toLedger = await getOrCreateLedger(config, input.toRosterId, capYear)
  const fromDelta = -input.movingToReceiver.reduce((s, x) => s + x.salary, 0) +
    input.movingToSender.reduce((s, x) => s + x.salary, 0)
  const toDelta = input.movingToReceiver.reduce((s, x) => s + x.salary, 0) -
    input.movingToSender.reduce((s, x) => s + x.salary, 0)
  const fromNewHit = fromLedger.totalCapHit + fromLedger.deadMoneyHit + fromDelta
  const toNewHit = toLedger.totalCapHit + toLedger.deadMoneyHit + toDelta
  const fromCap = getEffectiveCap(config, capYear, fromLedger.rolloverUsed)
  const toCap = getEffectiveCap(config, capYear, toLedger.rolloverUsed)
  const fromLegal = fromNewHit <= fromCap && (!config.capFloorEnabled || config.capFloorAmount == null || fromNewHit >= config.capFloorAmount)
  const toLegal = toNewHit <= toCap && (!config.capFloorEnabled || config.capFloorAmount == null || toNewHit >= config.capFloorAmount)
  if (!fromLegal) errors.push('Sender would be over cap or under floor')
  if (!toLegal) errors.push('Receiver would be over cap or under floor')
  return {
    fromRosterId: input.fromRosterId,
    toRosterId: input.toRosterId,
    fromCapHitDelta: fromDelta,
    toCapHitDelta: toDelta,
    fromLegal,
    toLegal,
    fromFutureLegal: fromLegal,
    toFutureLegal: toLegal,
    errors,
  }
}
