import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import type { LineupActionSummaryPayload } from '@/lib/lineup-actions/types'
import { getChimmyOfficialTimePrefix } from '@/lib/time-engine/chimmyPromptPrefix'

async function chimmyLineupAdvice(
  leagueName: string,
  issueMessages: string[],
  timePrefix: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey || issueMessages.length === 0) {
    return issueMessages.length
      ? `Review ${issueMessages.length} issue(s) above — set your starters in Team before lock.`
      : 'Your lineups look set.'
  }
  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: 'You are Chimmy, a fantasy sports assistant. Be brief and specific.',
      messages: [
        {
          role: 'user',
          content: `${timePrefix ? `${timePrefix}\n\n` : ''}League: ${leagueName}. Issues: ${issueMessages.join(', ')}. In 1-2 sentences, tell the manager what to do right now to fix their lineup.`,
        },
      ],
    })
    const block = msg.content[0]
    return block?.type === 'text' ? block.text.trim() : ''
  } catch {
    return 'Open your team tab and adjust starters before the weekly lock.'
  }
}

/**
 * Adds Chimmy blurbs per league when actionable issues exist (critical/warning only).
 */
export async function attachChimmyAdviceToLineupSummary(
  summary: LineupActionSummaryPayload,
  userId: string
): Promise<LineupActionSummaryPayload> {
  const timePrefix = await getChimmyOfficialTimePrefix(userId)

  const [profile, autoSettings] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: { autoCoachGlobalEnabled: true },
    }),
    prisma.autoCoachSetting.findMany({
      where: { userId },
      include: { league: { select: { autoCoachEnabled: true } } },
    }),
  ])

  const autoCoachByLeague = new Map(
    autoSettings.map((s) => [
      s.leagueId,
      {
        enabled: s.enabled,
        blocked: s.blockedByCommissioner,
        leagueOn: s.league.autoCoachEnabled !== false,
      },
    ])
  )

  const leagues = [...summary.leagues]
  for (let i = 0; i < leagues.length; i++) {
    const lg = leagues[i]!
    const msgs = lg.issues
      .filter((x) => x.severity !== 'info')
      .map((x) => x.message)
    if (msgs.length === 0) {
      leagues[i] = { ...lg, chimmyAdvice: '' }
      continue
    }
    let advice = await chimmyLineupAdvice(lg.leagueName ?? 'League', msgs, timePrefix)

    const ac = autoCoachByLeague.get(lg.leagueId)
    const autoCoachEnabledForLeague = Boolean(
      profile?.autoCoachGlobalEnabled !== false && ac?.enabled && ac.leagueOn && !ac?.blocked
    )
    if (autoCoachEnabledForLeague && lg.issues.some((x) => x.type === 'injured_starter')) {
      advice += ' (AutoCoach will handle this swap automatically)'
    }

    leagues[i] = { ...lg, chimmyAdvice: advice }
  }
  return { ...summary, leagues }
}
