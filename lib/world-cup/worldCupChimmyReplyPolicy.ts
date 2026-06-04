/**
 * Pure World Cup Chimmy reply policy — prompt text, context serialization,
 * and hallucination guards. Safe to import from Vitest (no server-only).
 */

import { getAiLanguageInstruction, getWorldCupLocale, type WorldCupLocale } from "./worldCupI18n"
import type { WorldCupChimmyContext } from "./worldCupChimmyContext"

const LIVE_FEED_UNAVAILABLE: Record<WorldCupLocale, string> = {
  en: "I don't have a live score feed for this pool right now — live match data isn't synced yet. I can still help with your bracket picks, pool standings, and how scoring works once results land.",
  es: "Ahora mismo no tengo marcador en vivo para este pool: los datos en vivo aún no están sincronizados. Sí puedo ayudarte con tus picks, la tabla del pool y cómo suman los puntos cuando entren resultados.",
  zh: "目前這個 pool 沒有即時比分來源，直播資料尚未同步。我仍可協助你的 bracket 選擇、pool 排名與計分方式。",
  fil: "Wala akong live score feed para sa pool na ito ngayon — hindi pa naka-sync ang live data. Makakatulong pa rin ako sa bracket picks mo, standings, at scoring.",
  vi: "Hiện tại tôi chưa có nguồn tỉ số trực tiếp cho pool này — dữ liệu trực tiếp chưa được đồng bộ. Tôi vẫn có thể giúp bạn về pick bracket, bảng xếp hạng pool và cách tính điểm.",
}

const INVENTED_SCORE_BLOCKED: Record<WorldCupLocale, string> = {
  en: "I won't guess a live score — that number isn't in our pool's live feed. Check back after sync, or ask about your bracket and standings.",
  es: "No voy a inventar un marcador en vivo: ese resultado no está en el feed del pool. Pregúntame por tu bracket o la tabla cuando quieras.",
  zh: "我不會猜測即時比分——這個數字不在 pool 的直播資料裡。你可以改問 bracket 或排名。",
  fil: "Hindi ako manghuhula ng live score — wala iyang numero sa live feed ng pool. Puwede mong itanong ang bracket at standings mo.",
  vi: "Tôi không đoán tỉ số trực tiếp — con số đó không có trong feed trực tiếp của pool. Hãy hỏi về bracket và bảng xếp hạng của bạn.",
}

const SCORE_PATTERN = /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/g
const MINUTE_PATTERN = /\b(\d{1,3})\s*(?:'|′|min(?:ute)?s?)\b/gi

const RELIABLE_DATA_UNAVAILABLE: Record<WorldCupLocale, string> = {
  en: "I don't have reliable data for that yet. I can still help with saved bracket picks, pool standings, scoring rules, and what is visible in this pool.",
  es: "No tengo datos confiables para eso todavia. Si puedo ayudarte con picks guardados, tabla del pool, reglas de puntuacion y lo que esta visible en este pool.",
  zh: "I don't have reliable data for that yet. I can still help with saved bracket picks, pool standings, scoring rules, and what is visible in this pool.",
  fil: "I don't have reliable data for that yet. I can still help with saved bracket picks, pool standings, scoring rules, and what is visible in this pool.",
  vi: "I don't have reliable data for that yet. I can still help with saved bracket picks, pool standings, scoring rules, and what is visible in this pool.",
}

export function buildWorldCupChimmySystemPrompt(locale: string | null | undefined): string {
  const lang = getAiLanguageInstruction(locale)
  return [
    "You are Chimmy, AllFantasy's World Cup bracket pool analyst for THIS pool only.",
    "SCOPE: Answer questions about this bracket pool — picks, standings, scoring rules, how results affect points, and schedule/live scores ONLY using the POOL DATA block.",
    "NOT in scope: general sports chat, other leagues, betting advice, rumors, or World Cup trivia unrelated to this pool.",
    "LIVE DATA: Use only scores, minutes, and results listed under LIVE NOW, RECENT RESULTS, or UPCOMING. Never invent scores, minutes, stats, teams, or outcomes.",
    "SOURCE CUE: For factual answers, plainly say whether the answer is based on live match data, stored pool data, or unavailable reliable data. Use the live-data cue only when LIVE NOW or RECENT RESULTS support it.",
    `If DATA AS OF shows live data: unavailable, say clearly the live feed is not available and pivot to bracket/standings/scoring help.`,
    "If asked for schedules, match times, player stats, injuries, lineups, odds, or other facts not present in POOL DATA, say: \"I don't have reliable data for that yet.\"",
    "VOICE: Sound like a sharp, friendly World Cup analyst in a group chat — confident, specific, warm. Short bullets or 1–2 tight paragraphs. No robotic disclaimers.",
    `Respond in ${lang}.`,
    "Keep team and country names exactly as written in POOL DATA.",
    "You may discuss leaderboard names and champion picks (public in the pool). Never mention user IDs, emails, or invite codes.",
    "Product terms: bracket pool, Chimmy, Bracket Brain.",
  ].join(" ")
}

export function serializeChimmyContext(ctx: WorldCupChimmyContext): string {
  const lines: string[] = []

  lines.push(`POOL: "${ctx.poolName}" | ${ctx.participantCount} participants | ${ctx.isLocked ? "LOCKED" : "open"}`)
  lines.push(
    `SCORING: R32=${ctx.scoring.roundOf32Points} R16=${ctx.scoring.roundOf16Points} QF=${ctx.scoring.quarterFinalPoints} SF=${ctx.scoring.semiFinalPoints} F=${ctx.scoring.finalPoints} Champion=${ctx.scoring.championBonusPoints}`
  )

  if (ctx.entry) {
    const e = ctx.entry
    const rankStr = e.rank != null ? `#${e.rank}` : "unranked"
    lines.push(
      `YOUR ENTRY: ${rankStr} | ${e.totalScore}pts | max possible ${e.maxPossibleScore}pts | champion pick: ${e.championPick ?? "none"}`
    )
    lines.push(`  correct picks: ${e.correctPicks} | incorrect: ${e.incorrectPicks} | complete: ${e.isComplete ? "yes" : "no"}`)

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

  if (ctx.leaderboard.length > 0) {
    lines.push(`LEADERBOARD (top ${ctx.leaderboard.length}):`)
    for (const row of ctx.leaderboard) {
      lines.push(
        `  ${row.rank}. ${row.entryName} — ${row.totalScore}pts / max ${row.maxPossibleScore} | champion: ${row.championPickName ?? "?"}`
      )
    }
  } else {
    lines.push("LEADERBOARD: no ranked entries yet")
  }

  if (ctx.liveMatches.length > 0) {
    lines.push("LIVE NOW:")
    const alivePicks = new Set(
      (ctx.entry?.knockoutPicks ?? [])
        .filter((p) => p.isCorrect !== false)
        .map((p) => p.pickedTeam.toLowerCase())
    )

    for (const m of ctx.liveMatches.slice(0, 5)) {
      const score = m.homeScore != null && m.awayScore != null ? `${m.homeScore}-${m.awayScore}` : "vs"
      const min = m.minute != null ? ` (${m.minute}')` : ""
      const userPickHome = alivePicks.has(m.homeTeamName.toLowerCase())
      const userPickAway = alivePicks.has(m.awayTeamName.toLowerCase())
      const pickFlag = userPickHome
        ? ` ← YOUR PICK: ${m.homeTeamName}`
        : userPickAway
          ? ` ← YOUR PICK: ${m.awayTeamName}`
          : ""
      lines.push(`  ${m.homeTeamName} ${score} ${m.awayTeamName}${min} [${m.round}]${pickFlag}`)
    }
  }

  if (ctx.upcomingMatches.length > 0) {
    lines.push("UPCOMING (next 48h):")
    for (const m of ctx.upcomingMatches.slice(0, 6)) {
      const when = m.startsAt ? new Date(m.startsAt).toUTCString().slice(0, 22) : "TBD"
      lines.push(`  ${m.homeTeamName} vs ${m.awayTeamName} — ${when} UTC [${m.round}]`)
    }
  }

  if (ctx.recentMatches.length > 0) {
    lines.push("RECENT RESULTS:")
    for (const m of ctx.recentMatches.slice(0, 4)) {
      const score =
        m.homeScore != null && m.awayScore != null ? `${m.homeScore}-${m.awayScore}` : "?"
      const winner = m.winnerTeamName ? ` (winner: ${m.winnerTeamName})` : ""
      lines.push(`  ${m.homeTeamName} ${score} ${m.awayTeamName}${winner} [${m.round}]`)
    }
  }

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

  lines.push(`DATA AS OF: ${ctx.fetchedAt.slice(0, 16)}Z | live data: ${ctx.liveDataStatus}`)

  return lines.join("\n")
}

export function isLiveScoreQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return (
    /\b(live\s+score|score\s+now|current\s+score|what'?s\s+the\s+score|marcador|t[ií]so|比分)\b/i.test(p) ||
    (/\bscore\b/i.test(p) && /\b(live|now|right\s+now|minute|minuto)\b/i.test(p))
  )
}

export function isScheduleQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(when\s+(is|does|do)|kickoff|schedule|fixture|starts?\s+at|next\s+match|horario|calendario)\b/i.test(p)
}

export function isUnsupportedVerifiedDataQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(player\s+stats?|key\s+players?|lineups?|rosters?|injur(?:y|ies|ed)|suspensions?|odds|over\s*\/\s*under|over-under|spread|goalscorers?|cards?)\b/i.test(p)
}

export function isPoolStandingQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(standing|leaderboard|rank|table|who\s+is\s+leading|top\s+of\s+the\s+pool|tabla|clasificaci[oó]n)\b/i.test(p)
}

export function isBracketImpactQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return (
    /\b(bracket|pick|path\s+to\s+win|champion\s+pick|still\s+alive|eliminated|busted)\b/i.test(p) &&
    /\b(affect|impact|hurt|help|points|lose|gain|if\s+.+\s+wins?)\b/i.test(p)
  )
}

export function isScoringExplanationQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(scoring|points?\s+work|how\s+(many\s+)?points|round\s+of\s+32|champion\s+bonus|puntos)\b/i.test(p)
}

export function collectKnownScoreTokens(ctx: WorldCupChimmyContext | null | undefined): Set<string> {
  const tokens = new Set<string>()
  if (!ctx) return tokens
  for (const m of [...ctx.liveMatches, ...ctx.recentMatches]) {
    if (typeof m.homeScore === "number" && typeof m.awayScore === "number") {
      tokens.add(`${m.homeScore}-${m.awayScore}`)
    }
  }
  return tokens
}

export function collectKnownMinuteTokens(ctx: WorldCupChimmyContext | null | undefined): Set<string> {
  const tokens = new Set<string>()
  if (!ctx) return tokens
  for (const m of ctx.liveMatches) {
    if (typeof m.minute === "number") tokens.add(String(m.minute))
  }
  return tokens
}

export function extractScoreTokens(text: string): string[] {
  const found: string[] = []
  for (const match of text.matchAll(SCORE_PATTERN)) {
    found.push(`${match[1]}-${match[2]}`)
  }
  return found
}

export function extractMinuteTokens(text: string): string[] {
  const found: string[] = []
  for (const match of text.matchAll(MINUTE_PATTERN)) {
    found.push(String(match[1]))
  }
  return found
}

export function liveFeedUnavailableMessage(locale: string | null | undefined): string {
  return LIVE_FEED_UNAVAILABLE[getWorldCupLocale(locale)]
}

export function inventedScoreBlockedMessage(locale: string | null | undefined): string {
  return INVENTED_SCORE_BLOCKED[getWorldCupLocale(locale)]
}

export function reliableDataUnavailableMessage(locale: string | null | undefined): string {
  return RELIABLE_DATA_UNAVAILABLE[getWorldCupLocale(locale)]
}

/**
 * Skip the LLM when a user asks for facts the pool context cannot verify.
 */
export function tryDeterministicWorldCupChimmyReply(input: {
  prompt: string
  context: WorldCupChimmyContext | null | undefined
  locale?: string | null
}): string | null {
  const prompt = input.prompt.trim()
  const context = input.context

  if (isUnsupportedVerifiedDataQuestion(prompt)) {
    return reliableDataUnavailableMessage(input.locale)
  }

  if (isScheduleQuestion(prompt)) {
    const hasScheduleData = Boolean(
      context &&
        [...context.liveMatches, ...context.upcomingMatches, ...context.recentMatches].some(
          (match) => Boolean(match.startsAt)
        )
    )
    if (!hasScheduleData) {
      return reliableDataUnavailableMessage(input.locale)
    }
  }

  if (!isLiveScoreQuestion(prompt)) return null

  const status = context?.liveDataStatus ?? "unavailable"
  if (status === "unavailable" || !context) {
    return liveFeedUnavailableMessage(input.locale)
  }

  if (status === "fixture_only" && context.liveMatches.length === 0) {
    return liveFeedUnavailableMessage(input.locale)
  }

  return null
}

/**
 * Post-process model output — block scores/minutes not present in POOL DATA.
 */
export function enforceWorldCupChimmyReplyGuard(input: {
  reply: string
  prompt: string
  context: WorldCupChimmyContext | null | undefined
  locale?: string | null
}): string {
  const reply = input.reply.trim()
  if (!reply) return reply

  const status = input.context?.liveDataStatus ?? "unavailable"
  const knownScores = collectKnownScoreTokens(input.context)
  const knownMinutes = collectKnownMinuteTokens(input.context)
  const scoresInReply = extractScoreTokens(reply)
  const minutesInReply = extractMinuteTokens(reply)

  const hasUnknownScore = scoresInReply.some((s) => !knownScores.has(s))
  const hasUnknownMinute =
    minutesInReply.length > 0 && minutesInReply.some((m) => !knownMinutes.has(m))

  if (status === "unavailable" && (hasUnknownScore || (isLiveScoreQuestion(input.prompt) && scoresInReply.length > 0))) {
    return liveFeedUnavailableMessage(input.locale)
  }

  if (hasUnknownScore) {
    return inventedScoreBlockedMessage(input.locale)
  }

  if (hasUnknownMinute && (isLiveScoreQuestion(input.prompt) || status !== "live" || input.context?.liveMatches.length === 0)) {
    return liveFeedUnavailableMessage(input.locale)
  }

  return reply
}
