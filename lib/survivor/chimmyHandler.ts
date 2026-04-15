/**
 * Private @Chimmy routing — never leaks hidden game state.
 * Handles: idol plays, voting, status checks, rule questions.
 * Settings-aware: reads commissioner config to answer league-specific questions.
 *
 * COMMISSIONER BLIND MODE: If commissioner is participating as a player,
 * @Chimmy NEVER reveals who has idols, vote counts, or any hidden info to them.
 * The system handles vote counting autonomously.
 */

import { prisma } from '@/lib/prisma'
// handleChimmyIdolPlayRequest is not (yet) exported from
// SurvivorIdolRegistry — the engine takes explicit args (idolId,
// rosterId, councilId, targetPlayerId) and requires the caller to
// pick which idol to burn. We stub the conversational entry point
// below so Chimmy gracefully tells the user to use the UI instead.
import { postIdolPlayAnnouncement } from './leagueChatPoster'
import { IDOL_POWER_DESCRIPTIONS, EXILE_KEY_POSITION_BY_SPORT } from './constants'
import { getSportSchedule } from './sportScheduleEngine'

const FORBIDDEN =
  "I can't share that — information is currency out here."

export async function handleChimmyPrivateMessage(leagueId: string, userId: string, message: string): Promise<string> {
  const lower = message.toLowerCase()
  const player = await prisma.survivorPlayer.findFirst({ where: { leagueId, userId } })
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { survivorPhase: true, sport: true },
  })

  // Block probing for others' idols
  if (
    lower.includes('idol') &&
    (lower.includes('other') || lower.includes('anyone') || lower.includes('who has'))
  ) {
    await prisma.survivorHostMessage.create({
      data: {
        leagueId,
        channelType: 'private',
        messageType: 'forbidden_probe',
        content: message.slice(0, 500),
        targetUserId: userId,
        isPosted: false,
      },
    })
    return FORBIDDEN
  }

  // Block vote count probing
  if (lower.includes('vote count') || lower.includes('tally')) {
    return FORBIDDEN
  }

  // ===== IDOL PLAY REQUEST =====
  // Matches: "use my idol", "play my idol", "i want to use my idol", "activate idol"
  if (
    (lower.includes('use') || lower.includes('play') || lower.includes('activate')) &&
    lower.includes('idol')
  ) {
    if (!player) return 'You are not registered as a Survivor player in this league.'
    if (player.playerState === 'eliminated') return 'Your journey has ended — you can no longer play idols.'

    // Conversational idol play isn't wired to the engine yet — the
    // engine needs (idolId, rosterId, councilId, targetPlayerId) which
    // Chimmy can't infer from freeform text reliably. Direct the user
    // to the Tribal Council UI which has the full picker.
    return 'To play an idol, open the active Tribal Council and tap "Play Idol" on your inventory — I need to know which idol and who you want to protect, which the UI will ask for.'
  }

  // ===== CHECK MY IDOLS =====
  // Matches: "do i have an idol", "my idols", "what powers do i have", "my inventory"
  if (
    (lower.includes('my idol') || lower.includes('my power') || lower.includes('do i have') ||
     lower.includes('my inventory') || lower.includes('what idol'))
  ) {
    if (!player) return 'You are not registered as a Survivor player in this league.'
    const roster = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: userId },
      select: { id: true },
    })
    if (!roster) return 'No roster found for you.'

    const idols = await prisma.survivorIdol.findMany({
      where: { leagueId, rosterId: roster.id, status: { in: ['hidden', 'revealed'] }, isUsed: false },
      select: { powerType: true, powerLabel: true, powerDesc: true },
    })

    if (idols.length === 0) {
      return 'You currently hold no idols or advantages.'
    }

    const lines = idols.map((i) => {
      const name = i.powerLabel ?? i.powerType.replace(/_/g, ' ')
      const desc = i.powerDesc ?? IDOL_POWER_DESCRIPTIONS[i.powerType] ?? ''
      return `• **${name}**: ${desc}`
    })
    return `Your powers:\n${lines.join('\n')}\n\nTo play an idol, message me: "I want to use my idol" before tribal votes are counted.`
  }

  // ===== VOTE REDIRECT =====
  if (lower.startsWith('i vote') || lower.includes('vote for')) {
    return 'Record your vote in the Tribal Council flow when voting is open — roster verification is required for your ballot.'
  }

  if (!player) {
    return 'You are not registered as a Survivor player in this league yet.'
  }

  if (player.playerState === 'eliminated') {
    return 'Your journey on the main island has ended — thanks for playing.'
  }

  if (lower.includes('immunity') && league?.survivorPhase) {
    return `Phase: ${league.survivorPhase}. Public immunity is announced in league chat when results are official.`
  }

  if (lower.includes('deadline') || lower.includes('when')) {
    const sport = league?.sport ?? 'NFL'
    const sched = getSportSchedule(sport)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `Tribal Council: ${days[sched.tribalCouncilDay]} at ${sched.tribalCouncilHourUtc}:00 UTC\nVote deadline: ${days[sched.voteDeadlineDay]} at ${sched.voteDeadlineHourUtc}:00 UTC\nChallenge posted: ${days[sched.challengePostDay]}\nScoring finalizes: ${days[sched.scoringFinalizeDay]}`
  }

  // ===== SETTINGS-AWARE RULE ANSWERS =====
  const fullLeague = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: {
      sport: true, survivorPlayerCount: true, survivorTribeCount: true,
      survivorMergeTrigger: true, survivorMergeWeek: true, survivorMergeAtCount: true,
      survivorJuryStart: true, survivorIdolsEnabled: true, survivorIdolCount: true,
      survivorIdolExpiryWeek: true, survivorExileEnabled: true,
      survivorSelfVoteAllowed: true, survivorRocksEnabled: true, survivorTieRule: true,
      survivorTokenEnabled: true, survivorBossResetEnabled: true,
    },
  })

  if (lower.includes('rule') || lower.includes('how does') || lower.includes('how do') || lower.includes('explain')) {
    if (lower.includes('voting') || lower.includes('vote') || lower.includes('tribal')) {
      return `**Voting Rules:**\n• Vote privately by messaging me\n• Self-voting: ${fullLeague?.survivorSelfVoteAllowed ? 'Allowed' : 'Not allowed'}\n• Tie resolution: ${(fullLeague?.survivorTieRule ?? 'rocks').replace(/_/g, ' ')}\n• Go to Rocks: ${fullLeague?.survivorRocksEnabled !== false ? 'Enabled' : 'Disabled'}\n• Votes MUST be in before the deadline. Late votes don't count.`
    }
    if (lower.includes('idol') || lower.includes('power')) {
      return `**Idol Rules:**\n• ${fullLeague?.survivorIdolCount ?? 9} idols in the pool, ~30-35% of players receive one\n• Each idol is unique\n• Must be played BEFORE votes are counted — message me "I want to use my idol"\n• Idols are attached to PLAYERS (not you) — if you trade the player, the idol goes with them\n• ${fullLeague?.survivorIdolExpiryWeek ? `Idols expire after Week ${fullLeague.survivorIdolExpiryWeek}` : 'Idols expire at Final 5'}`
    }
    if (lower.includes('merge')) {
      return `**Merge Rules:**\n• Trigger: ${fullLeague?.survivorMergeTrigger === 'week' ? `Week ${fullLeague?.survivorMergeWeek}` : `${fullLeague?.survivorMergeAtCount ?? 10} players remaining`}\n• After merge: individual immunity (highest scorer wins)\n• Pre-merge idols may expire at merge`
    }
    if (lower.includes('exile') || lower.includes('island')) {
      const keyPos = EXILE_KEY_POSITION_BY_SPORT[fullLeague?.sport ?? 'NFL'] ?? 'QB'
      return `**Exile Island:**\n• Voted-out players go to Exile\n• NO draft on Exile — waiver claims only!\n• Claim the ${keyPos} (key position) to win the entire team\n• Team with most points earns 1 token\n• ${fullLeague?.survivorBossResetEnabled !== false ? 'Boss wins = ALL tokens reset to 0' : 'No boss reset'}\n• Random mini-games for bonus tokens\n• Most tokens at return week = back to main island`
    }
    if (lower.includes('jury') || lower.includes('finale') || lower.includes('final')) {
      return `**Jury & Finale:**\n• Jury starts: ${(fullLeague?.survivorJuryStart ?? 'after merge').replace(/_/g, ' ')}\n• Eliminated post-jury-start players become Jurors\n• Final 3 face Jury questions + closing statements\n• Jury votes privately for the Sole Survivor`
    }
    if (lower.includes('challenge') || lower.includes('mini')) {
      const sched = getSportSchedule(fullLeague?.sport ?? 'NFL')
      return `**Challenges:**\n• ${sched.minigamesPerWeek} mini-game(s) per scoring period on Main Island\n• Exile mini-games are random (not every week) for bonus tokens\n• Challenges reward: immunity, FAAB, tokens, or idols`
    }
    return `Ask me about: voting, idols, merge, exile, jury, challenges, or deadlines. I know all the rules for this league!`
  }

  // ===== EXILE-SPECIFIC QUESTIONS =====
  if (player.playerState === 'exile' || player.canAccessExileChat) {
    if (lower.includes('token') || lower.includes('how many')) {
      return `Check the Token Pool screen for your current balance and history. I can't reveal other players' token counts.`
    }
    if (lower.includes('team') || lower.includes('available') || lower.includes('claim')) {
      const keyPos = EXILE_KEY_POSITION_BY_SPORT[fullLeague?.sport ?? 'NFL'] ?? 'QB'
      return `To claim a team on Exile: submit a waiver claim for any player. If you claim the **${keyPos}** (key position), you win the entire team! Use the Exile Team Draft screen to see available teams and submit claims.`
    }
    if (lower.includes('return') || lower.includes('go back') || lower.includes('main island')) {
      return `The manager with the most tokens at the return week goes back to the main island. Keep earning tokens through weekly scoring and mini-games!`
    }
  }

  // ===== STATUS CHECK =====
  if (lower.includes('status') || lower.includes('am i safe') || lower.includes('my status')) {
    const statuses: Record<string, string> = {
      active: 'You are ACTIVE on the main island.',
      immune: 'You have IMMUNITY this week — you cannot be voted out.',
      exile: 'You are on EXILE ISLAND. Compete to earn tokens and return.',
      jury: 'You are a JURY MEMBER. You will vote for the Sole Survivor.',
      finalist: 'You are a FINALIST — prepare for Final Tribal Council!',
      eliminated: 'You have been eliminated from the game.',
    }
    return statuses[player.playerState] ?? `Your status: ${player.playerState}`
  }

  return `I'm here, ${player.displayName}. Ask about rules, deadlines, voting, idols, exile, merge, jury — or play an idol: "I want to use my idol".`
}
