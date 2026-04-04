/**
 * League chat @Chimmy routing for IDP leagues (AfSub-gated features).
 */

import { isIdpLeague } from '@/lib/idp'
import { prisma } from '@/lib/prisma'
import {
  getDefenderStartSitRec,
  getIDPWaiverTargets,
  getIDPMatchupAnalysis,
  getWeeklyIDPRankings,
  getSleeperDefenders,
  getSnapShareInsights,
  getIDPScarcityReport,
  generateIDPPowerRankings,
  getIdpChimmyHelpText,
} from '@/lib/idp/ai/idpChimmy'
import { isCommissioner } from '@/lib/commissioner/permissions'

export type IdpLeagueChatProcessResult =
  | { outcome: 'post_user_only' }
  | { outcome: 'suppress_public'; privateNotice: string }
  | {
      outcome: 'post_user_and_chimmy'
      chimmyMessages: Array<{ text: string; metadata?: Record<string, unknown> }>
    }

function chimmyMeta(extra?: Record<string, unknown>): Record<string, unknown> {
  return { chimmy: true, idp: true, ...extra }
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

export async function processIdpLeagueChatInput(
  leagueId: string,
  userId: string,
  rawMessage: string
): Promise<IdpLeagueChatProcessResult | null> {
  const isIdp = await isIdpLeague(leagueId)
  if (!isIdp) return null

  if (!rawMessage.toLowerCase().includes('@chimmy')) {
    return null
  }

  const rest = stripChimmy(rawMessage)
  const low = rest.toLowerCase()

  if (low.startsWith('help idp') || low.includes('help idp')) {
    return {
      outcome: 'post_user_and_chimmy',
      chimmyMessages: [{ text: getIdpChimmyHelpText(), metadata: chimmyMeta({ idpCard: 'help' }) }],
    }
  }

  const weekMatch = rawMessage.match(/\b(?:week\s*)?(\d{1,2})\b/i)
  const week = weekMatch ? Math.min(18, Math.max(1, parseInt(weekMatch[1]!, 10))) : 1

  const roster = await prisma.roster.findFirst({
    where: { leagueId, platformUserId: userId },
    select: { id: true },
  })
  const managerId = userId

  const privateNotice = (text: string) => ({
    outcome: 'suppress_public' as const,
    privateNotice: text,
  })

  try {
    if (low.includes('idp rankings') || low.startsWith('idp rankings')) {
      const pos = rest.match(/idp rankings\s+(\w+)/i)?.[1]
      try {
        const list = await getWeeklyIDPRankings(leagueId, week, pos)
        const lines = list.entries
          .slice(0, 8)
          .map((e) => `${e.rank}. ${e.name} (${e.position}, ${e.team ?? '—'}) — ${e.projectedPts} proj`)
          .join('\n')
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [
            {
              text: `🏈 Top IDP Rankings — Week ${week}:\n${lines}`,
              metadata: chimmyMeta({ idpAction: 'rankings' }),
            },
          ],
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('start sit defense') || (low.includes('start sit') && low.includes('defense'))) {
      if (!roster) return privateNotice('Could not resolve your roster.')
      try {
        const a = await getDefenderStartSitRec(leagueId, managerId, week)
        return {
          outcome: 'suppress_public',
          privateNotice: `🔒 Start/Sit (private)\n\nSTART: ${a.starters.join(', ')}\nSIT: ${a.sitters.join(', ')}\n\n${a.analysis}`,
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('waiver targets defense') || (low.includes('waiver') && low.includes('targets'))) {
      const lim = parseInt(rest.match(/(\d+)\s*$/)?.[1] ?? '5', 10) || 5
      try {
        const targets = await getIDPWaiverTargets(leagueId, week, Math.min(10, lim))
        const lines = targets.map((t) => `${t.rank}. ${t.name} (${t.position}, ${t.team ?? '—'}) — ${t.reasoning}`).join('\n')
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [{ text: `🏈 Top IDP Waiver Targets:\n${lines}`, metadata: chimmyMeta({ idpAction: 'waivers' }) }],
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('matchup analysis')) {
      if (!roster) return privateNotice('Could not resolve your roster.')
      try {
        const a = await getIDPMatchupAnalysis(leagueId, managerId, week)
        return {
          outcome: 'suppress_public',
          privateNotice: `🔒 Matchup analysis (private)\n\n${a.analysis}`,
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('snap analysis')) {
      if (!roster) return privateNotice('Could not resolve your roster.')
      try {
        const s = await getSnapShareInsights(leagueId, managerId)
        const text = [
          'Snap share snapshot:',
          ...s.concerns.map((c) => `⚠️ ${c.player}: ${c.snap_share}% (${c.trend}) — ${c.note}`),
          ...s.positives.map((c) => `✓ ${c.player}: ${c.snap_share}% (${c.trend}) — ${c.note}`),
        ].join('\n')
        return { outcome: 'suppress_public', privateNotice: `🔒 ${text}` }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('idp sleepers')) {
      try {
        const sl = await getSleeperDefenders(leagueId, week)
        const lines = sl.map((x) => `• ${x.name} (${x.position}) ~${x.mockOwnershipPct}% owned — ${x.reasoning}`).join('\n')
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [{ text: `💎 IDP Sleepers:\n${lines}`, metadata: chimmyMeta({ idpAction: 'sleepers' }) }],
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('idp scarcity')) {
      try {
        const sc = await getIDPScarcityReport(leagueId, week)
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [
            {
              text: `📊 IDP Scarcity\n${sc.summary}\n${Object.entries(sc.byPosition)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n')}`,
              metadata: chimmyMeta({ idpAction: 'scarcity' }),
            },
          ],
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.includes('power rankings') && low.includes('idp')) {
      if (!(await isCommissioner(leagueId, userId))) {
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [{ text: '⚠️ Only the commissioner can generate IDP power rankings.', metadata: chimmyMeta() }],
        }
      }
      try {
        const pr = await generateIDPPowerRankings(leagueId, week)
        return {
          outcome: 'post_user_and_chimmy',
          chimmyMessages: [{ text: pr.fullText, metadata: chimmyMeta({ idpAction: 'power_rankings' }) }],
        }
      } catch (e) {
        const g = subGate(e)
        if (g) return privateNotice(g)
        throw e
      }
    }

    if (low.trim().startsWith('idp') || /\bidp\b/.test(low)) {
      return {
        outcome: 'post_user_and_chimmy',
        chimmyMessages: [
          {
            text: "🤖 Try `@chimmy help idp` for IDP commands (e.g. `@chimmy idp rankings`).",
            metadata: chimmyMeta(),
          },
        ],
      }
    }
  } catch (e) {
    return {
      outcome: 'post_user_and_chimmy',
      chimmyMessages: [
        {
          text: `⚠️ ${e instanceof Error ? e.message : 'IDP Chimmy error'}`,
          metadata: chimmyMeta({ error: true }),
        },
      ],
    }
  }

  return null
}
