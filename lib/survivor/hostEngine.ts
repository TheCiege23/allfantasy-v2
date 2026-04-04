/**
 * AI host (Chimmy) outbound messages — persisted for posting to chat / approval queue.
 */

import { prisma } from '@/lib/prisma'
import { logSurvivorAuditEntry } from './auditEntry'
import { shouldBlockTwist } from './twistEngine'

export type HostMessageContext = Record<string, unknown>

export const FORBIDDEN_INFO_REPLY =
  "I can't share that — information is currency out here."

const COMMISSIONER_GATE_TYPES = new Set([
  'tribe_swap_execute',
  'exile_return_grant',
  'dual_immunity_activate',
  'force_revote_activate',
])

/** Tone hints prefixed for downstream LLM / formatter (deterministic tag). */
export function getHostToneDirective(messageType: string): string {
  switch (messageType) {
    case 'tribal_announcement':
    case 'tribal_result':
    case 'tribal_scroll':
      return '[tone:dramatic_tense_slow]'
    case 'challenge_post':
    case 'challenge_result':
      return '[tone:energetic_competitive]'
    case 'idol_play':
    case 'power_reveal':
      return '[tone:theatrical_surprised]'
    case 'elimination':
      return '[tone:solemn_respectful]'
    case 'merge_celebration':
    case 'merge_foreshadow':
      return '[tone:triumphant_ceremonial]'
    case 'winner_reveal':
      return '[tone:finale_maximum_drama]'
    default:
      return '[tone:neutral_host]'
  }
}

export async function logForbiddenInfoAttempt(
  leagueId: string,
  actorUserId: string | undefined,
  snippet: string,
  week?: number | null,
): Promise<void> {
  await logSurvivorAuditEntry({
    leagueId,
    week: week ?? null,
    category: 'chat',
    action: 'FORBIDDEN_INFO_REQUEST',
    actorUserId: actorUserId ?? null,
    data: { snippet: snippet.slice(0, 500) },
    isVisibleToPublic: false,
  })
}

function lastChallengeKeyFromAudit(leagueId: string): Promise<string | null> {
  return prisma.survivorAuditEntry
    .findFirst({
      where: { leagueId, category: 'challenge', action: 'CHALLENGE_CREATED' },
      orderBy: { createdAt: 'desc' },
      select: { data: true },
    })
    .then((row) => {
      const d = row?.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {}
      return typeof d.challengeKey === 'string' ? d.challengeKey : null
    })
}

/**
 * Enforce host rules: no consecutive identical challengeKey (via audit), swap-week social first challenge, merge template phase.
 */
export async function validateHostChallengeContext(
  leagueId: string,
  proposedChallengeKey: string,
  opts?: { week?: number; afterTribeSwap?: boolean; postMerge?: boolean },
): Promise<{ ok: boolean; reason?: string }> {
  const prev = await lastChallengeKeyFromAudit(leagueId)
  if (prev && prev === proposedChallengeKey) {
    return { ok: false, reason: 'Do not repeat the exact same challengeKey in consecutive weeks.' }
  }
  if (opts?.afterTribeSwap) {
    const tpl = await prisma.survivorChallengeTemplate.findUnique({
      where: { challengeKey: proposedChallengeKey },
      select: { category: true },
    })
    if (tpl && tpl.category !== 'strategy_social') {
      return { ok: false, reason: 'After tribe swap, first challenge should be strategy/social for trust-building.' }
    }
  }
  if (opts?.postMerge) {
    const tpl = await prisma.survivorChallengeTemplate.findUnique({
      where: { challengeKey: proposedChallengeKey },
      select: { phaseValidity: true },
    })
    if (tpl && tpl.phaseValidity === 'pre_merge') {
      return { ok: false, reason: 'Post-merge weeks must use post_merge challenge templates.' }
    }
  }
  return { ok: true }
}

export async function postHostMessage(
  leagueId: string,
  messageType: string,
  context: HostMessageContext,
  channelType: string,
  tribeId?: string,
  targetUserId?: string,
): Promise<void> {
  const preview =
    typeof context.leagueName === 'string'
      ? String(context.leagueName)
      : `Survivor update (${messageType})`
  const tone = getHostToneDirective(messageType)
  const content = `${tone} [${messageType}] ${preview}`

  let requiresApproval = Boolean(context.requiresCommissionerApproval === true)
  if (COMMISSIONER_GATE_TYPES.has(messageType)) {
    requiresApproval = true
  }

  const twistType = typeof context.twistType === 'string' ? context.twistType : null
  const weekNum = typeof context.week === 'number' ? context.week : Number(context.week)
  if (twistType && !Number.isNaN(weekNum)) {
    const block = await shouldBlockTwist(leagueId, twistType, weekNum)
    if (block.blocked) {
      requiresApproval = true
      context = { ...context, twistBlockedReason: block.reason }
    }
  }

  const tplKey = typeof context.challengeKey === 'string' ? context.challengeKey : null
  if (tplKey) {
    const tpl = await prisma.survivorChallengeTemplate.findUnique({
      where: { challengeKey: tplKey },
      select: { commissionerApprovalRecommended: true },
    })
    if (tpl?.commissionerApprovalRecommended) requiresApproval = true
  }

  await prisma.survivorHostMessage.create({
    data: {
      leagueId,
      channelType,
      tribeId: tribeId ?? null,
      targetUserId: targetUserId ?? null,
      messageType,
      content,
      isPosted: false,
      requiresApproval,
    },
  })
}
