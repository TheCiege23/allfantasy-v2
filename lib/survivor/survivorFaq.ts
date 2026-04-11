/**
 * Dynamic Survivor + Exile FAQ for league chat (broadcast + pin).
 */

import { prisma } from '@/lib/prisma'
import { getLeagueChatThreadId } from '@/lib/commissioner-settings/CommissionerAnnouncementService'
import { createPlatformThreadTypedMessage } from '@/lib/platform/chat-service'
import { getExileLeagueId } from '@/lib/survivor/SurvivorExileEngine'
import { seasonWeekBoundsForSport } from '@/lib/survivor/survivorSeasonCalendar'

export function buildSurvivorFaqMarkdown(args: {
  leagueName: string
  sportLabel: string
  tribeCount: number
  mergeWeek: number | null
  mergeTrigger: string
  exileReturnEnabled: boolean
  exileReturnTokens: number
  challengesSystemRun: boolean
  seasonThemeLabel: string | null
  firstWeek?: number
  lastWeek?: number
  exileConfigured: boolean
}): string {
  const theme =
    args.seasonThemeLabel?.trim() ||
    `${args.tribeCount} tribes — theme set by your commissioner in Survivor settings`
  const lines = [
    `📜 SURVIVOR LEAGUE FAQ — ${args.leagueName}`,
    ``,
    `Season theme: ${theme}`,
    `Sport: ${args.sportLabel} · Tribes: ${args.tribeCount} · Merge: ${args.mergeTrigger}${args.mergeWeek != null ? ` (week ${args.mergeWeek})` : ''}`,
    `Regular-season scoring weeks (no playoffs): ${args.firstWeek ?? 1}–${args.lastWeek ?? '?'}.`,
    ``,
    `Challenges: ${args.challengesSystemRun ? 'SYSTEM-GENERATED from the challenge catalog each week (commissioner is not picking props by hand — reduces collusion).' : 'Manual / commissioner — confirm with your host.'}`,
    `Votes: cast with @Chimmy in chat. Scroll reveals are posted when Tribal closes.`,
    ``,
    `Exile: ${args.exileConfigured ? `Enabled. Return tokens required: ${args.exileReturnTokens}. Exile weeks follow the same regular-season window as the main island.` : 'Not linked for this league.'}`,
    ``,
    `Conduct: compete hard; harassment and leaking host DMs are out. Information is currency.`,
  ]
  return lines.join('\n')
}

/**
 * Posts FAQ as broadcast and pins it. Idempotent when `faqSeededAt` is set (caller can skip).
 */
export async function seedSurvivorFaqToLeagueChat(args: {
  leagueId: string
  commissionerUserId: string
  /** Post a fresh FAQ even if one was already seeded (e.g. after settings change). */
  force?: boolean
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const { leagueId, commissionerUserId, force } = args

  const row = await prisma.survivorLeagueConfig.findUnique({
    where: { leagueId },
    include: { league: { select: { name: true, sport: true } } },
  })
  if (!row) return { ok: false, error: 'Survivor config missing' }

  if (row.faqSeededAt && !force) {
    return { ok: true }
  }

  const league = row.league

  const threadId = await getLeagueChatThreadId(leagueId)
  if (!threadId) {
    return {
      ok: false,
      error: 'Link a league chat thread in league settings (leagueChatThreadId) before posting the FAQ.',
    }
  }

  const exileId = await getExileLeagueId(leagueId).catch(() => null)
  const bounds = seasonWeekBoundsForSport(league.sport, row.regularSeasonEndWeek ?? null)

  const text = buildSurvivorFaqMarkdown({
    leagueName: league.name ?? 'League',
    sportLabel: String(league.sport ?? 'NFL'),
    tribeCount: row.tribeCount,
    mergeWeek: row.mergeWeek,
    mergeTrigger: row.mergeTrigger,
    exileReturnEnabled: row.exileReturnEnabled,
    exileReturnTokens: row.exileReturnTokens,
    challengesSystemRun: row.challengesSystemRun,
    seasonThemeLabel: row.seasonThemeLabel,
    firstWeek: bounds.firstWeek,
    lastWeek: bounds.lastWeek,
    exileConfigured: Boolean(exileId),
  })

  const created = await createPlatformThreadTypedMessage(
    commissionerUserId,
    threadId,
    'broadcast',
    { announcement: text },
    { survivorFaq: true, leagueId },
  )
  if (!created?.id) {
    return { ok: false, error: 'Unable to post FAQ broadcast' }
  }

  await createPlatformThreadTypedMessage(commissionerUserId, threadId, 'pin', { messageId: created.id })

  await prisma.survivorLeagueConfig.update({
    where: { leagueId },
    data: { faqSeededAt: new Date() },
  })

  return { ok: true, messageId: created.id }
}
