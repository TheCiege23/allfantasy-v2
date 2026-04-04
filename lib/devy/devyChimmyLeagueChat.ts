/**
 * League chat @Chimmy routing for Devy leagues (free info + AfSub-gated AI).
 */

import { prisma } from '@/lib/prisma'
import { isDevyLeague } from '@/lib/devy/DevyLeagueConfig'
import { isCommissioner } from '@/lib/commissioner/permissions'
import {
  evaluateDevyProspect,
  generateImportSummary,
  getDevyChimmyHelpText,
  getDevyRankings,
} from '@/lib/devy/ai/devyChimmy'

export type DevyLeagueChatProcessResult =
  | { outcome: 'post_user_only' }
  | { outcome: 'suppress_public'; privateNotice: string }
  | {
      outcome: 'post_user_and_chimmy'
      chimmyMessages: Array<{ text: string; metadata?: Record<string, unknown> }>
    }

function chimmyMeta(extra?: Record<string, unknown>): Record<string, unknown> {
  return { chimmy: true, devy: true, ...extra }
}

function stripChimmy(raw: string): string {
  const lower = raw.toLowerCase()
  const idx = lower.indexOf('@chimmy')
  if (idx < 0) return raw.trim()
  return raw.slice(idx + '@chimmy'.length).trim()
}

function subGate(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('Commissioner Subscription')) {
    return '🔒 This feature requires the AF Commissioner Subscription.'
  }
  return null
}

async function hasDevyEngine(leagueId: string): Promise<boolean> {
  const row = await prisma.devyLeague.findUnique({ where: { leagueId }, select: { id: true } })
  if (row) return true
  return isDevyLeague(leagueId)
}

async function getUserRedraftRosterId(leagueId: string, userId: string): Promise<string | null> {
  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId },
    orderBy: { season: 'desc' },
    select: { id: true },
  })
  if (!season) return null
  const roster = await prisma.redraftRoster.findFirst({
    where: { seasonId: season.id, ownerId: userId },
    select: { id: true },
  })
  return roster?.id ?? null
}

export async function processDevyLeagueChatInput(
  leagueId: string,
  userId: string,
  rawMessage: string,
): Promise<DevyLeagueChatProcessResult | null> {
  const devyOk = await hasDevyEngine(leagueId)
  if (!devyOk) return null

  if (!rawMessage.toLowerCase().includes('@chimmy')) {
    return null
  }

  const rest = stripChimmy(rawMessage)
  const low = rest.toLowerCase()

  const cfg = await prisma.devyLeague.findUnique({ where: { leagueId } })

  const privateNotice = (text: string) => ({
    outcome: 'suppress_public' as const,
    privateNotice: text,
  })

  try {
    if (low.trim() === 'help' || low.includes('help') && !low.includes('evaluate')) {
      return {
        outcome: 'post_user_and_chimmy',
        chimmyMessages: [{ text: getDevyChimmyHelpText(), metadata: chimmyMeta({ devyCard: 'help' }) }],
      }
    }

    if (low.includes('devy rules')) {
      if (!cfg) {
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [
            {
              text: '📘 Devy rules: this league does not have a full DevyLeague row yet — configure Devy in commissioner settings.',
              metadata: chimmyMeta(),
            },
          ],
        }
      }
      const text = [
        '📘 Devy rules (summary)',
        `• Devy slots per team: **${cfg.devySlots}** (max on one team: **${cfg.maxDevyPerTeam}**).`,
        `• Devy freshmen eligible: **${cfg.devyFreshmenEligible ? 'yes' : 'no'}**`,
        `• Auto-promote devy → rookie: **${cfg.devyAutoPromoteToRookie ? 'on' : 'off'}**`,
        `• Declaration visibility: **${cfg.devyDeclarationVisibility ? 'on' : 'off'}**`,
        `• Devy pick trading: **${cfg.devyPickTradingEnabled ? 'allowed' : 'off'}**`,
        `• On NFL grad: **${cfg.devyGradBehavior}**`,
      ].join('\n')
      return { outcome: 'post_user_and_chimmy', chimmyMessages: [{ text, metadata: chimmyMeta({ devyCard: 'rules' }) }] }
    }

    if (low.includes('taxi rules')) {
      if (!cfg) {
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [{ text: '🚕 Taxi: configure Devy league settings first.', metadata: chimmyMeta() }],
        }
      }
      const lock = cfg.taxiLockDeadline ? new Date(cfg.taxiLockDeadline).toLocaleString() : 'not set'
      const text = [
        '🚕 Taxi rules (summary)',
        `• Slots: **${cfg.taxiSlots}**`,
        `• Rookie-only: **${cfg.taxiRookieOnly ? 'yes' : 'no'}** · allow non-rookies: **${cfg.taxiAllowNonRookies ? 'yes' : 'no'}**`,
        `• Max experience years: **${cfg.taxiMaxExperienceYears}**`,
        `• Lock deadline: **${lock}**`,
        `• Devy→rookie taxi eligible: **${cfg.taxiDevyToRookieEligible ? 'yes' : 'no'}**`,
      ].join('\n')
      return { outcome: 'post_user_and_chimmy', chimmyMessages: [{ text, metadata: chimmyMeta({ devyCard: 'taxi' }) }] }
    }

    if (low.includes('draft format')) {
      if (!cfg) {
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [{ text: '📋 Draft format: no DevyLeague config found.', metadata: chimmyMeta() }],
        }
      }
      const text = `📋 Draft format\n• Startup: **${cfg.startupDraftFormat}**\n• Future rookie/devy: **${cfg.futureDraftFormat}**`
      return { outcome: 'post_user_and_chimmy', chimmyMessages: [{ text, metadata: chimmyMeta({ devyCard: 'drafts' }) }] }
    }

    if (low.includes('rookie transition')) {
      const rosterId = await getUserRedraftRosterId(leagueId, userId)
      if (!rosterId) return privateNotice('Could not resolve your roster for this league.')
      const pending = await prisma.devyRookieTransition.findMany({
        where: { leagueId, rosterId, transitionedAt: null },
        take: 25,
        orderBy: { nflEntryYear: 'desc' },
      })
      if (pending.length === 0) {
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [
            { text: '🔁 No pending devy→rookie transitions on file for your roster.', metadata: chimmyMeta() },
          ],
        }
      }
      const lines = pending
        .map(
          (t) =>
            `• ${t.playerName}${t.school ? ` (${t.school})` : ''} → **${t.destinationState}** (${t.nflEntryMethod}, ${t.nflEntryYear})`,
        )
        .join('\n')
      return {
        outcome: 'post_user_and_chimmy',
        chimmyMessages: [{ text: `🔁 Pending transitions:\n${lines}`, metadata: chimmyMeta({ devyCard: 'transitions' }) }],
      }
    }

    if (low.includes('import summary')) {
      if (!(await isCommissioner(leagueId, userId))) {
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [{ text: '⚠️ `@chimmy import summary` is commissioner-only.', metadata: chimmyMeta() }],
        }
      }
      try {
        const sess = await prisma.devyImportSession.findFirst({
          where: { leagueId },
          orderBy: { updatedAt: 'desc' },
        })
        if (!sess) {
          return {
            outcome: 'post_user_and_chimmy',
            chimmyMessages: [{ text: 'No import sessions found for this league yet.', metadata: chimmyMeta() }],
          }
        }
        const sum = await generateImportSummary(sess.id)
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [
            {
              text: `📥 **Import summary (commissioner)**\n\n${sum.narrative}\n\n_Confidence: ${sum.auditConfidence}_`,
              metadata: chimmyMeta({ devyAction: 'import_summary' }),
            },
          ],
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('evaluate prospect') || low.includes('evaluate ')) {
      const rosterId = await getUserRedraftRosterId(leagueId, userId)
      if (!rosterId) return privateNotice('Could not resolve your roster.')
      const namePart = rest.replace(/^\s*evaluate\s+prospect\s*/i, '').replace(/^\s*evaluate\s+/i, '').trim()
      if (!namePart) {
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [
            { text: 'Usage: `@chimmy evaluate prospect <name>` (AfSub).', metadata: chimmyMeta() },
          ],
        }
      }
      const slot = await prisma.devyDevySlot.findFirst({
        where: {
          leagueId,
          playerName: { contains: namePart.slice(0, 48), mode: 'insensitive' },
        },
      })
      if (!slot) {
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [{ text: `No devy slot matched “${namePart}”. Try a shorter substring.`, metadata: chimmyMeta() }],
        }
      }
      try {
        const managerRoster = await prisma.devyPlayerState.findMany({ where: { leagueId, rosterId } })
        const ev = await evaluateDevyProspect(slot.playerId, leagueId, managerRoster)
        const text = [
          `🔎 **${slot.playerName}** (${slot.position})`,
          `**Ceiling:** ${ev.ceiling}`,
          `**Timeline:** ${ev.timeline}`,
          `**Fit:** ${ev.fit}`,
          `**Grade:** ${ev.grade}`,
          `**Risks:** ${ev.risks.join('; ') || '—'}`,
          `**Verdict:** ${ev.verdict}`,
        ].join('\n')
        return { outcome: 'suppress_public', privateNotice: `🔒 Prospect eval (private)\n\n${text}` }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('devy rankings')) {
      const posMatch = rest.match(/devy rankings\s+(\S+)/i)
      const position = posMatch?.[1] && posMatch[1].toLowerCase() !== 'devy' ? posMatch[1] : undefined
      try {
        const list = await getDevyRankings(leagueId, position)
        const lines = list.entries
          .slice(0, 12)
          .map((e) => `${e.rank}. ${e.name} (${e.school ?? '—'}) — ${e.grade}: ${e.note}`)
          .join('\n')
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [
            {
              text: `🏈 Devy rankings${position ? ` (${position})` : ''}:\n${lines}`,
              metadata: chimmyMeta({ devyAction: 'rankings' }),
            },
          ],
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    return {
      outcome: 'post_user_and_chimmy',
      chimmyMessages: [
        {
          text: '🤖 Try `@chimmy help` for Devy commands (`devy rules`, `taxi rules`, `draft format`, `rookie transition`, …).',
          metadata: chimmyMeta(),
        },
      ],
    }
  } catch (e) {
    return {
      outcome: 'post_user_and_chimmy',
      chimmyMessages: [
        {
          text: `⚠️ ${e instanceof Error ? e.message : 'Devy Chimmy error'}`,
          metadata: chimmyMeta({ error: true }),
        },
      ],
    }
  }
}
