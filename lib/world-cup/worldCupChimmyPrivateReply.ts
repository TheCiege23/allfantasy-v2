import "server-only"

import { appendChatHistory, buildChimmyConversationId } from "@/lib/ai-memory/chat-history-store"
import { routeTextCall } from "@/lib/ai/providerRouter"
import { getAiLanguageInstruction } from "./worldCupI18n"
import type { WorldCupChimmyContext } from "./worldCupChimmyContext"

const MAX_REPLY_CHARS = 2000

function sanitizeChimmyText(value: string) {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripChimmyMention(value: string) {
  return sanitizeChimmyText(value.replace(/(^|[\s*_~\]])@chimmy\b/gi, "$1"))
}

/**
 * Serializes a WorldCupChimmyContext into a compact text block for injection
 * into the AI prompt. Keeps total length under ~1200 chars so it doesn't
 * dominate the token budget.
 */
function serializeChimmyContext(ctx: WorldCupChimmyContext): string {
  const lines: string[] = []

  // Pool summary
  lines.push(`POOL: "${ctx.poolName}" | ${ctx.participantCount} participants | ${ctx.isLocked ? "LOCKED" : "open"}`)
  lines.push(`SCORING: R32=${ctx.scoring.roundOf32Points} R16=${ctx.scoring.roundOf16Points} QF=${ctx.scoring.quarterFinalPoints} SF=${ctx.scoring.semiFinalPoints} F=${ctx.scoring.finalPoints} Champion=${ctx.scoring.championBonusPoints}`)

  // User's entry
  if (ctx.entry) {
    const e = ctx.entry
    const rankStr = e.rank != null ? `#${e.rank}` : "unranked"
    lines.push(`YOUR ENTRY: ${rankStr} | ${e.totalScore}pts | max possible ${e.maxPossibleScore}pts | champion pick: ${e.championPick ?? "none"}`)
    lines.push(`  correct picks: ${e.correctPicks} | incorrect: ${e.incorrectPicks} | complete: ${e.isComplete ? "yes" : "no"}`)

    // Gap to leader — pre-computed so AI doesn't have to do arithmetic
    if (ctx.leaderboard.length > 0) {
      const leader = ctx.leaderboard[0]
      if (leader.rank === 1 && e.rank !== 1) {
        const gap = leader.totalScore - e.totalScore
        const maxEarnable = e.maxPossibleScore - e.totalScore
        lines.push(`  gap to leader: +${gap}pts behind | max you can still earn: ${maxEarnable}pts`)
      } else if (e.rank === 1) {
        lines.push(`  gap to leader: YOU ARE LEADING`)
      }
    }

    // Individual picks — alive vs lost
    if (e.knockoutPicks.length > 0) {
      const alive = e.knockoutPicks.filter((p) => p.isCorrect !== false)
      const lost = e.knockoutPicks.filter((p) => p.isCorrect === false)
      if (alive.length > 0) {
        lines.push(`  PICKS ALIVE: ${alive.map((p) => `${p.pickedTeam}(${p.round})`).join(", ")}`)
      }
      if (lost.length > 0) {
        lines.push(`  PICKS LOST: ${lost.map((p) => `${p.pickedTeam}(${p.round})`).join(", ")}`)
      }
    }
  } else {
    lines.push("YOUR ENTRY: not entered yet")
  }

  // Leaderboard
  if (ctx.leaderboard.length > 0) {
    lines.push(`LEADERBOARD (top ${ctx.leaderboard.length}):`)
    for (const row of ctx.leaderboard) {
      lines.push(`  ${row.rank}. ${row.entryName} — ${row.totalScore}pts / max ${row.maxPossibleScore} | champion: ${row.championPickName ?? "?"}`)
    }
  } else {
    lines.push("LEADERBOARD: no ranked entries yet")
  }

  // Live matches — with picks-at-risk cross-reference
  if (ctx.liveMatches.length > 0) {
    lines.push("LIVE NOW:")
    const alivePicks =
      ctx.entry?.knockoutPicks
        ? new Set(ctx.entry.knockoutPicks.filter((p) => p.isCorrect !== false).map((p) => p.pickedTeam.toLowerCase()))
        : new Set<string>()

    for (const m of ctx.liveMatches.slice(0, 5)) {
      const score = m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : "vs"
      const min = m.minute != null ? ` (${m.minute}')` : ""
      const homeLower = m.homeTeamName.toLowerCase()
      const awayLower = m.awayTeamName.toLowerCase()
      const userPickHome = alivePicks.has(homeLower)
      const userPickAway = alivePicks.has(awayLower)
      const pickFlag = userPickHome
        ? ` ← YOUR PICK: ${m.homeTeamName}`
        : userPickAway
          ? ` ← YOUR PICK: ${m.awayTeamName}`
          : ""
      lines.push(`  ${m.homeTeamName} ${score} ${m.awayTeamName}${min} [${m.round}]${pickFlag}`)
    }
  }

  // Upcoming matches
  if (ctx.upcomingMatches.length > 0) {
    lines.push("UPCOMING (next 48h):")
    for (const m of ctx.upcomingMatches.slice(0, 6)) {
      const when = m.startsAt ? new Date(m.startsAt).toUTCString().slice(0, 22) : "TBD"
      lines.push(`  ${m.homeTeamName} vs ${m.awayTeamName} — ${when} UTC [${m.round}]`)
    }
  }

  // Recent results
  if (ctx.recentMatches.length > 0) {
    lines.push("RECENT RESULTS:")
    for (const m of ctx.recentMatches.slice(0, 4)) {
      const score = m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : "?"
      const winner = m.winnerTeamName ? ` (winner: ${m.winnerTeamName})` : ""
      lines.push(`  ${m.homeTeamName} ${score} ${m.awayTeamName}${winner} [${m.round}]`)
    }
  }

  // Group standings — all groups, top 3 per group (covers 3rd-place advancers)
  if (ctx.groupStandings.length > 0) {
    const byGroup = new Map<string, typeof ctx.groupStandings>()
    for (const s of ctx.groupStandings) {
      const arr = byGroup.get(s.groupName) ?? []
      arr.push(s)
      byGroup.set(s.groupName, arr)
    }
    const groupKeys = Array.from(byGroup.keys()).sort()
    const parts = groupKeys.map((g) => {
      const rows = (byGroup.get(g) ?? []).slice(0, 3)
      return `Grp ${g}: ${rows.map((r) => `${r.teamName}(${r.points}pts${r.isThirdPlaceAdvancer ? ",3rd✓" : ""})`).join(" > ")}`
    })
    lines.push("STANDINGS SNAPSHOT: " + parts.join(" | "))
  }

  // Data freshness
  lines.push(`DATA AS OF: ${ctx.fetchedAt.slice(0, 16)}Z | live data: ${ctx.liveDataStatus}`)

  return lines.join("\n")
}

export async function generateWorldCupChimmyPrivateReply(input: {
  userId: string
  challengeId: string
  prompt: string
  challengeName?: string | null
  locale?: string | null
  context?: WorldCupChimmyContext | null
}) {
  const userPrompt = stripChimmyMention(input.prompt)
  const conversationId = buildChimmyConversationId({
    userId: input.userId,
    explicitConversationId: `chimmy:${input.userId}:world-cup:${input.challengeId}`,
  })

  await appendChatHistory({
    conversationId,
    role: "user",
    content: userPrompt || input.prompt,
    userId: input.userId,
    leagueId: null,
    meta: {
      source: "world_cup_pool_chat",
      challengeId: input.challengeId,
      surface: "world_cup_pool_chat",
    },
  })

  const lang = getAiLanguageInstruction(input.locale)
  const system = [
    "You are Chimmy — AllFantasy's World Cup bracket sidekick. You know the user's bracket inside out and love talking about it.",
    "You may discuss leaderboard positions and champion picks (they're visible to all pool members). Never reference user IDs, emails, or invite codes.",
    "Focus on the user's pool and picks — but also answer general World Cup match and team questions when asked.",
    "Use the POOL DATA block below to give accurate, data-grounded answers. Do not invent standings, scores, or rankings not in the block.",
    "If a question requires data not in the block, say so briefly and share what you do know.",
    "Be enthusiastic and direct — like a knowledgeable fan in a group chat. Use short punchy bullets or 1-2 paragraphs. No hedging, no corporate disclaimers.",
    `Respond in ${lang}. Use conversational sports language.`,
    "Keep country/team/player names exactly as provided in the data block.",
    "When referencing features, use: 'bracket pool', 'Chimmy', 'Bracket Brain'.",
    "Never reference user IDs, emails, or invite codes.",
  ].join(" ")

  const contextBlock = input.context ? serializeChimmyContext(input.context) : null
  const challengeLine = input.challengeName
    ? `Pool: ${input.challengeName}.`
    : "Pool: World Cup bracket challenge."

  const userContent = [
    challengeLine,
    contextBlock ? `\n--- POOL DATA ---\n${contextBlock}\n--- END POOL DATA ---` : "",
    `\nUser private prompt: ${userPrompt || input.prompt}`,
  ]
    .filter(Boolean)
    .join("")

  const result = await routeTextCall({
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    profile: "cheap",
    temperature: 0.65,
    maxTokens: 520,
    skipCache: true,
  })

  const reply = result.ok
    ? sanitizeChimmyText(result.text).slice(0, MAX_REPLY_CHARS)
    : "I could not reach Chimmy AI right now. Your prompt stayed private, and you can try again in a moment."

  await appendChatHistory({
    conversationId,
    role: "assistant",
    content: reply,
    userId: input.userId,
    leagueId: null,
    meta: {
      source: "world_cup_pool_chat",
      challengeId: input.challengeId,
      surface: "world_cup_pool_chat",
      provider: result.ok ? result.provider : "unavailable",
      model: result.ok ? result.model : "unavailable",
    },
  })

  return {
    reply,
    conversationId,
    provider: result.ok ? result.provider : "unavailable",
    model: result.ok ? result.model : "unavailable",
  }
}
