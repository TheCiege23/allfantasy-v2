/**
 * PsychologicalProfileEngine — orchestrates signal aggregation, label resolution, evidence build, and persistence.
 */

import { prisma } from '@/lib/prisma'
import { aggregateBehaviorSignals } from './BehaviorSignalAggregator'
import { resolveProfileLabels, resolveScores } from './ProfileLabelResolver'
import { buildEvidenceFromSignals } from './ProfileEvidenceBuilder'
import { normalizeSportForPsych, isSupportedPsychSport } from './SportBehaviorResolver'
import type { ProfileLabel } from './types'

export interface PsychEngineInput {
  leagueId: string
  managerId: string
  sport: string
  sleeperUsername?: string
  rosterId?: string
}

export interface PsychEngineResult {
  profileId: string
  created: boolean
  labels: ProfileLabel[]
}

/**
 * Run the psychological profile engine for one manager: aggregate signals, resolve labels/scores, upsert profile, store evidence.
 */
export async function runPsychologicalProfileEngine(
  input: PsychEngineInput
): Promise<PsychEngineResult> {
  const sportNorm = normalizeSportForPsych(input.sport)
  if (!isSupportedPsychSport(sportNorm)) {
    throw new Error(`Unsupported sport for psychological profiles: ${input.sport}`)
  }

  const signals = await aggregateBehaviorSignals(input.leagueId, input.managerId, sportNorm ?? input.sport, {
    sleeperUsername: input.sleeperUsername,
    rosterId: input.rosterId,
  })

  const labels = resolveProfileLabels(signals)
  const scores = resolveScores(signals)

  const existing = await prisma.managerPsychProfile.findUnique({
    where: { leagueId_managerId: { leagueId: input.leagueId, managerId: input.managerId } },
    include: { evidence: true },
  })

  let profileId: string
  if (existing) {
    await prisma.managerPsychProfile.update({
      where: { id: existing.id },
      data: {
        sport: sportNorm ?? input.sport,
        profileLabels: labels,
        aggressionScore: scores.aggressionScore,
        activityScore: scores.activityScore,
        tradeFrequencyScore: scores.tradeFrequencyScore,
        waiverFocusScore: scores.waiverFocusScore,
        riskToleranceScore: scores.riskToleranceScore,
      },
    })
    await prisma.profileEvidenceRecord.deleteMany({ where: { profileId: existing.id } })
    profileId = existing.id
  } else {
    const created = await prisma.managerPsychProfile.create({
      data: {
        leagueId: input.leagueId,
        managerId: input.managerId,
        sport: sportNorm ?? input.sport,
        profileLabels: labels,
        aggressionScore: scores.aggressionScore,
        activityScore: scores.activityScore,
        tradeFrequencyScore: scores.tradeFrequencyScore,
        waiverFocusScore: scores.waiverFocusScore,
        riskToleranceScore: scores.riskToleranceScore,
      },
    })
    profileId = created.id
  }

  const evidencePayloads = buildEvidenceFromSignals(signals, profileId)
  for (const ev of evidencePayloads) {
    await prisma.profileEvidenceRecord.create({
      data: {
        managerId: ev.managerId,
        leagueId: ev.leagueId,
        sport: ev.sport,
        evidenceType: ev.evidenceType,
        value: ev.value,
        sourceReference: ev.sourceReference ?? undefined,
        profileId,
      },
    })
  }

  return {
    profileId,
    created: !existing,
    labels,
  }
}
