import type { AIAction, AIActionContext } from './AIActionModel'
import { validateActionExecution } from './AIActionExecutionValidator'
import { resolveLeagueAccess } from '@/lib/league-access'
import { prisma } from '@/lib/prisma'

export interface ServerValidationResult {
  allowed: boolean
  status: number
  message: string
  issues: Array<{ code: string; message: string; field?: string }>
  context: AIActionContext
}

function inferRoleFromAccess(
  hasAccess: boolean,
  isCommissioner: boolean,
): AIActionContext['role'] {
  if (!hasAccess) return null
  if (isCommissioner) return 'commissioner'
  return 'member'
}

function getUtcWeekStart(date = new Date()): Date {
  const day = date.getUTCDay() // Sunday=0
  const diffToMonday = (day + 6) % 7
  const start = new Date(date)
  start.setUTCDate(date.getUTCDate() - diffToMonday)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

async function resolveTeamRosterId(
  leagueId: string,
  authenticatedUserId: string,
  teamId?: string | null,
): Promise<string | null> {
  if (teamId) {
    const roster = await prisma.roster.findFirst({
      where: {
        leagueId,
        OR: [
          { id: teamId },
          { platformUserId: authenticatedUserId },
        ],
      },
      select: { id: true },
    })
    return roster?.id ?? null
  }

  const roster = await prisma.roster.findFirst({
    where: {
      leagueId,
      platformUserId: authenticatedUserId,
    },
    select: { id: true },
  })
  return roster?.id ?? null
}

async function populateTransactionState(
  context: AIActionContext,
  authenticatedUserId: string,
): Promise<AIActionContext['transactionState']> {
  const leagueId = context.leagueId
  if (!leagueId) return context.transactionState

  const [league, waiverSettings, rosterId] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { lockAllMoves: true },
    }),
    prisma.leagueWaiverSettings.findUnique({
      where: { leagueId },
      select: { claimLimitPerPeriod: true },
    }),
    resolveTeamRosterId(leagueId, authenticatedUserId, context.teamId),
  ])

  const lockAllMoves = Boolean(league?.lockAllMoves)

  const transactionState: NonNullable<AIActionContext['transactionState']> = {
    ...context.transactionState,
    canTransact: !lockAllMoves,
    rosterMoveLocked: lockAllMoves,
  }

  if (!rosterId) {
    return transactionState
  }

  const weekStart = getUtcWeekStart()
  const [pendingApprovalCount, weeklyTransactionsCount] = await Promise.all([
    prisma.waiverClaim.count({
      where: {
        leagueId,
        rosterId,
        status: {
          in: ['pending', 'awaiting_commissioner', 'needs_commissioner_approval'],
        },
      },
    }),
    prisma.waiverTransaction.count({
      where: {
        leagueId,
        rosterId,
        processedAt: { gte: weekStart },
      },
    }),
  ])

  const claimLimitPerPeriod = waiverSettings?.claimLimitPerPeriod
  if (typeof claimLimitPerPeriod === 'number' && Number.isFinite(claimLimitPerPeriod)) {
    transactionState.maxTransactionsReached = weeklyTransactionsCount >= claimLimitPerPeriod
  }
  transactionState.pendingCommissionerApproval = pendingApprovalCount > 0

  return transactionState
}

export async function validateActionExecutionServerSide(
  action: AIAction,
  context: AIActionContext,
  authenticatedUserId: string,
): Promise<ServerValidationResult> {
  const normalizedContext: AIActionContext = {
    ...context,
    userId: authenticatedUserId,
  }

  if (action.leagueId) {
    const access = await resolveLeagueAccess(action.leagueId, authenticatedUserId)
    const role = inferRoleFromAccess(Boolean(access?.isMember), Boolean(access?.isCommissioner))
    normalizedContext.role = role

    if (!access?.isMember) {
      return {
        allowed: false,
        status: 403,
        message: 'Forbidden',
        issues: [
          {
            code: 'permission_denied',
            message: 'User is not a member of the requested league.',
            field: 'leagueId',
          },
        ],
        context: normalizedContext,
      }
    }

    try {
      normalizedContext.transactionState = await populateTransactionState(
        normalizedContext,
        authenticatedUserId,
      )
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[AIActionServerValidation] Failed to populate transaction state:', error)
      }
    }
  }

  const validation = validateActionExecution(action, normalizedContext)
  return {
    allowed: validation.allowed,
    status: validation.allowed ? 200 : 400,
    message: validation.allowed
      ? 'Action execution validated successfully.'
      : 'Action execution validation failed.',
    issues: validation.issues,
    context: normalizedContext,
  }
}
