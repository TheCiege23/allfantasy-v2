import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import {
  getOrCreateSurvivorGameState,
  syncWeeklyScores,
  finalizeWeeklyScores,
  allScoresFinalizedForWeek,
  triggerTribalOpen,
  processTribalDeadline,
  tryAutomaticPhaseAdvance,
} from '@/lib/survivor/gameStateMachine'
import { lockChallengeSubmissions, tallyChallengeResults } from '@/lib/survivor/challengeEngine'
import { processNotificationQueue } from '@/lib/survivor/notificationEngine'
import { scoreExileWeek } from '@/lib/survivor/exileEngine'
import { generateAndPostWeeklyRecap } from '@/lib/survivor/weeklyRecapGenerator'
import { expireIdolsByWeek } from '@/lib/survivor/SurvivorIdolRegistry'
import { processExileWeeklyScoring, processExileReturn } from '@/lib/survivor/exileTeamDraft'
import { shouldTriggerExileMiniGame, createExileMiniGame } from '@/lib/survivor/exileMiniGames'
import { getSportSchedule } from '@/lib/survivor/sportScheduleEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SCORE_SYNC_PHASES = ['pre_merge', 'post_swap', 'merge', 'post_merge', 'jury', 'finale']

function phaseAllowsScoreSync(phase: string | null | undefined): boolean {
  if (!phase) return false
  return SCORE_SYNC_PHASES.includes(phase)
}

async function runAutomation(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const errors: string[] = []
  let processed = 0

  const leagues = await prisma.league.findMany({
    where: {
      survivorMode: true,
      survivorPhase: { notIn: ['pre_draft', 'drafting', 'complete'] },
    },
    select: {
      id: true,
      survivorPhase: true,
      survivorExileEnabled: true,
      survivorExileReturnWeek: true,
      sport: true,
    },
  })

  for (const L of leagues) {
    const leagueId = L.id
    try {
      const gs = await getOrCreateSurvivorGameState(leagueId)
      const phase = gs.phase
      if (phase === 'pre_draft' || phase === 'complete') continue
      if (typeof gs.lastError === 'string' && gs.lastError.startsWith('PAUSED:')) continue

      const season = await prisma.redraftSeason.findFirst({
        where: { leagueId },
        orderBy: { createdAt: 'desc' },
      })
      const week = Math.max(1, gs.currentWeek || season?.currentWeek || 1)

      if (gs.needsChallengeLock && gs.activeChallengeId) {
        const ch = await prisma.survivorChallenge.findUnique({ where: { id: gs.activeChallengeId } })
        const lockAt = ch?.locksAt ?? ch?.lockAt
        if (ch && lockAt && new Date(lockAt) <= new Date()) {
          await lockChallengeSubmissions(ch.id)
          await tallyChallengeResults(ch.id)
          await prisma.survivorGameState.update({
            where: { leagueId },
            data: {
              needsChallengeLock: false,
              challengeLockedAt: new Date(),
              challengeResultAt: new Date(),
            },
          })
        }
      }

      const leaguePhase = L.survivorPhase ?? phase
      if (phaseAllowsScoreSync(phase) || phaseAllowsScoreSync(leaguePhase)) {
        await syncWeeklyScores(leagueId, week)
      }

      await tryAutomaticPhaseAdvance(leagueId)

      // Expire idols past their configured cutoff week
      await expireIdolsByWeek(leagueId, week).catch(() => {})

      // Process exile team scoring + boss challenge
      const exileLeague = await prisma.survivorExileLeague.findFirst({ where: { mainLeagueId: leagueId } })
      if (exileLeague) {
        await processExileWeeklyScoring(leagueId, exileLeague.id, week).catch(() => {})

        // Check if it's return week
        const returnWeek = L.survivorExileReturnWeek
        if (returnWeek && week >= returnWeek) {
          const exileReturnAlreadyProcessed = await prisma.survivorCommissionerAction.findFirst({
            where: {
              leagueId,
              actionType: 'auto_exile_return_processed',
              ...(season?.createdAt ? { executedAt: { gte: season.createdAt } } : {}),
            },
            select: { id: true },
          })
          if (!exileReturnAlreadyProcessed) {
            const exileReturnResult = await processExileReturn(leagueId).catch(() => null)
            if (exileReturnResult?.returneeId) {
              await prisma.survivorCommissionerAction
                .create({
                  data: {
                    leagueId,
                    commissionerId: 'system',
                    week,
                    actionType: 'auto_exile_return_processed',
                    description: 'Automated exile return processed',
                    targetUserId: exileReturnResult.returneeId,
                    newState: {
                      returnWeek,
                      tiebreakUsed: exileReturnResult.tiebreakUsed,
                    },
                  },
                })
                .catch(() => {})
            }
          }
        }
      }

      let gsMid = await prisma.survivorGameState.findUnique({ where: { leagueId } })
      if (
        gsMid &&
        (await allScoresFinalizedForWeek(leagueId, week)) &&
        !gsMid.weekScoringFinalAt
      ) {
        await finalizeWeeklyScores(leagueId, week)
        gsMid = await prisma.survivorGameState.findUnique({ where: { leagueId } })
      }

      if (gsMid?.needsTribalLock && gsMid.weekScoringFinalAt && !gsMid.activeCouncilId) {
        await triggerTribalOpen(leagueId)
      }

      const gsTribal = await prisma.survivorGameState.findUnique({ where: { leagueId } })
      if (
        gsTribal?.activeCouncilId &&
        gsTribal.tribalDeadline &&
        new Date(gsTribal.tribalDeadline) <= new Date() &&
        !gsTribal.tribalRevealAt
      ) {
        await processTribalDeadline(leagueId)
      }

      const gsExile = await prisma.survivorGameState.findUnique({ where: { leagueId } })
      let didClearNeedsExileScore = false
      if (gsExile?.needsExileScore) {
        await scoreExileWeek(leagueId, week)
        didClearNeedsExileScore = true
      }

      // Random exile mini-game trigger
      const sportSched = getSportSchedule(L.sport ?? 'NFL')
      if (shouldTriggerExileMiniGame(sportSched.weekStructure)) {
        await createExileMiniGame(leagueId, week, L.sport ?? 'NFL').catch(() => {})
      }

      await processNotificationQueue(leagueId)

      // Post weekly recap if tribal completed this cycle and recap not yet posted
      const gsRecap = await prisma.survivorGameState.findUnique({ where: { leagueId } })
      let didClearNeedsWeeklyRecap = false
      let recapError: unknown = null
      if (gsRecap?.needsWeeklyRecap) {
        try {
          await generateAndPostWeeklyRecap(leagueId, week)
          didClearNeedsWeeklyRecap = true
        } catch (error) {
          recapError = error
        }
      }

      await prisma.$transaction(async (tx) => {
        // Apply week advancement and automation metadata in one atomic write.
        const gsFinal = await tx.survivorGameState.findUnique({ where: { leagueId } })
        if (!gsFinal) return
        const needsExileScore = didClearNeedsExileScore ? false : (gsFinal.needsExileScore ?? false)
        // If tribal is complete but recap wasn't generated yet, keep recap pending and block week advance.
        const needsWeeklyRecap =
          didClearNeedsWeeklyRecap ? false : gsFinal.needsWeeklyRecap || Boolean(gsFinal.tribalCompleteAt)
        const needsWaiverProcess = gsFinal.needsWaiverProcess ?? false

        const shouldAdvanceWeek =
          Boolean(gsFinal.weekScoringFinalAt) &&
          Boolean(gsFinal.tribalCompleteAt) &&
          !gsFinal.needsChallengeLock &&
          !needsWaiverProcess &&
          !gsFinal.needsTribalLock &&
          !needsExileScore &&
          !needsWeeklyRecap

        const nextNeedsExileScore = shouldAdvanceWeek && L.survivorExileEnabled !== false ? true : (needsExileScore ?? false)
        const nextNeedsWeeklyRecap = shouldAdvanceWeek ? false : (needsWeeklyRecap ?? false)

        await tx.survivorGameState.update({
          where: { leagueId },
          data: {
            needsExileScore: nextNeedsExileScore,
            needsWeeklyRecap: nextNeedsWeeklyRecap,
            needsWaiverProcess,
            ...(shouldAdvanceWeek
              ? {
                  currentWeek: Math.max(1, gsFinal.currentWeek || week) + 1,
                  weekStartedAt: null,
                  weekScoringLockedAt: null,
                  weekScoringFinalAt: null,
                  activeChallengeId: null,
                  challengeLockedAt: null,
                  challengeResultAt: null,
                  activeCouncilId: null,
                  tribalOpenedAt: null,
                  tribalDeadline: null,
                  tribalRevealAt: null,
                  tribalCompleteAt: null,
                  immuneTribeId: null,
                  immunePlayerId: null,
                  needsChallengeLock: true,
                  needsTribalLock: true,
                  needsPhaseAdvance: true,
                }
              : {}),
            lastAutomationRun: new Date(),
            lastError: null,
          },
        })
      })
      if (recapError) {
        const recapMsg = recapError instanceof Error ? recapError.message : String(recapError)
        console.warn(`[Survivor automation] non-critical weekly recap failure (${leagueId}): ${recapMsg}`)
      }
      processed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${leagueId}: ${msg}`)
      await prisma.survivorGameState
        .update({
          where: { leagueId },
          data: { lastError: msg },
        })
        .catch(() => {})
    }
  }

  return NextResponse.json({ processed, errors })
}

/** Vercel Cron invokes GET; manual triggers may use POST. */
export async function GET(req: NextRequest) {
  return runAutomation(req)
}

export async function POST(req: NextRequest) {
  return runAutomation(req)
}
