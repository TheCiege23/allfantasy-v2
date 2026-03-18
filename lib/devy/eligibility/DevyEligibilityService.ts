/**
 * Devy eligibility service: resolve adapter by sport and check eligibility. PROMPT 2/6.
 * Deterministic only; no AI.
 */

import { getDevyAdapterForSport, type DevyEligibilityResult, type DevySportAdapterId } from '../types'
import { NFL_DEVY_ADAPTER } from './nfl-devy-adapter'
import { NBA_DEVY_ADAPTER } from './nba-devy-adapter'
import type { LeagueSport } from '@prisma/client'

const ADAPTERS: Record<DevySportAdapterId, typeof NFL_DEVY_ADAPTER> = {
  nfl_devy: NFL_DEVY_ADAPTER,
  nba_devy: NBA_DEVY_ADAPTER,
}

export function getDevyAdapter(adapterId: DevySportAdapterId) {
  return ADAPTERS[adapterId] ?? null
}

export function getDevyAdapterForLeagueSport(sport: LeagueSport | string) {
  const id = getDevyAdapterForSport(sport)
  return id ? ADAPTERS[id] : null
}

/**
 * Check if a player is eligible for the devy pool (college prospect, not yet graduated).
 * position: player position (e.g. QB, RB, G, F).
 * isDevyPlayer: from data model (e.g. DevyPlayer.devyEligible, league=NCAA).
 * graduated: from data model (e.g. graduatedToNFL, graduatedToNBA).
 * excludeKDST: NFL only; when true, K/DST are not in devy pool (commissioner toggle).
 */
export function checkDevyEligibility(args: {
  sport: LeagueSport | string
  position: string
  isDevyPlayer: boolean
  graduated: boolean
  excludeKDST?: boolean
}): DevyEligibilityResult {
  const { sport, position, isDevyPlayer, graduated, excludeKDST } = args
  const adapterId = getDevyAdapterForSport(sport)
  const adapter = adapterId ? ADAPTERS[adapterId] : null

  if (!adapter) {
    return {
      eligible: false,
      reason: 'Sport does not support devy pool',
      isDevy: false,
      isGraduated: false,
      positionEligible: false,
      poolSource: 'pro',
    }
  }

  const positionEligible = adapter.isDevyPositionEligible(position)
  if (excludeKDST && String(sport).toUpperCase() === 'NFL') {
    const pos = (position ?? '').toUpperCase()
    if (pos === 'K' || pos === 'DST') {
      return {
        eligible: false,
        reason: 'K/DST excluded from devy pool',
        isDevy: false,
        isGraduated: false,
        positionEligible: false,
        poolSource: 'pro',
      }
    }
  }

  if (graduated) {
    return {
      eligible: false,
      reason: 'Player has graduated to pro pool',
      isDevy: true,
      isGraduated: true,
      positionEligible,
      poolSource: 'pro',
    }
  }

  if (!isDevyPlayer) {
    return {
      eligible: false,
      reason: 'Not a college/devy prospect',
      isDevy: false,
      isGraduated: false,
      positionEligible: false,
      poolSource: 'pro',
    }
  }

  if (!positionEligible) {
    return {
      eligible: false,
      reason: `Position ${position} not eligible for devy pool`,
      isDevy: true,
      isGraduated: false,
      positionEligible: false,
      poolSource: 'college',
    }
  }

  return {
    eligible: true,
    isDevy: true,
    isGraduated: false,
    positionEligible: true,
    poolSource: 'college',
  }
}
