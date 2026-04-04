import type { C2CPlayerState } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getScoringEligibility } from '@/lib/c2c/scoringEngine'

export type LineupValidationResult = {
  valid: boolean
  errors: string[]
}

const CAMPUS_BUCKETS = new Set(['campus_starter', 'bench', 'taxi', 'devy', 'ir'])
const CANTON_BUCKETS = new Set(['canton_starter', 'bench', 'taxi', 'devy', 'ir'])

function allowedBucketsForSide(side: string): Set<string> {
  return side === 'campus' ? CAMPUS_BUCKETS : CANTON_BUCKETS
}

export async function movePlayer(
  leagueId: string,
  rosterId: string,
  playerId: string,
  targetBucket: string,
): Promise<C2CPlayerState> {
  const cfg = await prisma.c2CLeague.findUnique({ where: { leagueId } })
  if (!cfg) throw new Error('C2C league not found')

  const row = await prisma.c2CPlayerState.findUnique({
    where: { leagueId_rosterId_playerId: { leagueId, rosterId, playerId } },
  })
  if (!row) throw new Error('Player not on C2C roster')

  const side = row.playerSide
  if (!allowedBucketsForSide(side).has(targetBucket)) {
    throw new Error(`Invalid bucket ${targetBucket} for playerSide ${side}`)
  }
  if (targetBucket === 'campus_starter' && side !== 'campus') {
    throw new Error('Canton players cannot occupy campus starter slots')
  }
  if (targetBucket === 'canton_starter' && side !== 'canton') {
    throw new Error('Campus players cannot occupy canton starter slots')
  }

  if (targetBucket === 'taxi') {
    if (cfg.taxiRookieOnly && !row.isRookieEligible) throw new Error('Taxi is rookie-only for this league')
    if (cfg.taxiLockDeadline && cfg.taxiLockDeadline.getTime() < Date.now()) {
      throw new Error('Taxi lock deadline has passed')
    }
  }

  const scoringEligibility = getScoringEligibility(side, targetBucket, cfg.devyScoringEnabled)

  return prisma.c2CPlayerState.update({
    where: { leagueId_rosterId_playerId: { leagueId, rosterId, playerId } },
    data: { bucketState: targetBucket, scoringEligibility },
  })
}

export async function validateLineup(leagueId: string, rosterId: string): Promise<LineupValidationResult> {
  const cfg = await prisma.c2CLeague.findUnique({ where: { leagueId } })
  if (!cfg) return { valid: false, errors: ['C2C league not found'] }

  const rows = await prisma.c2CPlayerState.findMany({ where: { leagueId, rosterId } })
  const errors: string[] = []

  const campusStarters = rows.filter((r) => r.bucketState === 'campus_starter' && r.playerSide === 'campus')
  const cantonStarters = rows.filter((r) => r.bucketState === 'canton_starter' && r.playerSide === 'canton')

  if (campusStarters.length !== cfg.campusStarterSlots) {
    errors.push(`Campus starters: need ${cfg.campusStarterSlots}, have ${campusStarters.length}`)
  }
  if (cantonStarters.length !== cfg.cantonStarterSlots) {
    errors.push(`Canton starters: need ${cfg.cantonStarterSlots}, have ${cantonStarters.length}`)
  }

  for (const r of rows) {
    if (r.playerSide === 'campus' && r.bucketState === 'canton_starter') {
      errors.push('Campus player in canton starter slot')
    }
    if (r.playerSide === 'canton' && r.bucketState === 'campus_starter') {
      errors.push('Canton player in campus starter slot')
    }
    if (!cfg.devyScoringEnabled && r.bucketState === 'devy' && r.playerType === 'campus_devy') {
      /* stash-only — allowed */
    }
  }

  return { valid: errors.length === 0, errors }
}

export async function processCollegeToProTransition(
  leagueId: string,
  playerId: string,
  proEntryYear: number,
  proEntryMethod: string,
): Promise<{ record: { id: string }; updated: number }> {
  const cfg = await prisma.c2CLeague.findUnique({ where: { leagueId } })
  if (!cfg) throw new Error('C2C league not found')

  const states = await prisma.c2CPlayerState.findMany({
    where: { leagueId, playerId },
  })
  if (states.length === 0) throw new Error('No C2C player state for this player')

  const destinationBucket = 'canton_taxi'
  const newBucket = 'taxi'

  let updated = 0
  for (const s of states) {
    await prisma.c2CPlayerState.update({
      where: { id: s.id },
      data: {
        playerType: 'canton_rookie',
        playerSide: 'canton',
        bucketState: newBucket,
        hasEnteredPro: true,
        proEntryYear,
        proEntryMethod,
        transitionedFrom: s.playerType,
        transitionedAt: new Date(),
        transitionReason: 'college_to_pro',
        scoringEligibility: getScoringEligibility('canton', newBucket, cfg.devyScoringEnabled),
      },
    })
    updated++
  }

  const rec = await prisma.c2CTransitionRecord.create({
    data: {
      leagueId,
      rosterId: states[0]?.rosterId,
      playerId,
      playerName: states[0]?.playerName ?? playerId,
      fromState: 'campus_college',
      toState: 'canton_rookie',
      proEntryYear,
      proEntryMethod,
      destinationBucket,
      wasAutoTransitioned: true,
      transitionedAt: new Date(),
    },
  })

  return { record: { id: rec.id }, updated }
}
