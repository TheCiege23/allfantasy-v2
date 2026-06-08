/**
 * Pure World Cup Chimmy reply policy — prompt text, context serialization,
 * and hallucination guards. Safe to import from Vitest (no server-only).
 */

import { getAiLanguageInstruction, getWorldCupLocale } from "./worldCupI18n"
import type { WorldCupChimmyContext } from "./worldCupChimmyContext"

const LIVE_FEED_UNAVAILABLE: Record<string, string> = {
  en: "I don't have a live score feed for this pool right now — live match data isn't synced yet. I can still help with your bracket picks, pool standings, and how scoring works once results land.",
  es: "Ahora mismo no tengo marcador en vivo para este pool: los datos en vivo aún no están sincronizados. Sí puedo ayudarte con tus picks, la tabla del pool y cómo suman los puntos cuando entren resultados.",
  zh: "目前這個 pool 沒有即時比分來源，直播資料尚未同步。我仍可協助你的 bracket 選擇、pool 排名與計分方式。",
  fil: "Wala akong live score feed para sa pool na ito ngayon — hindi pa naka-sync ang live data. Makakatulong pa rin ako sa bracket picks mo, standings, at scoring.",
  vi: "Hiện tại tôi chưa có nguồn tỉ số trực tiếp cho pool này — dữ liệu trực tiếp chưa được đồng bộ. Tôi vẫn có thể giúp bạn về pick bracket, bảng xếp hạng pool và cách tính điểm.",
}

const INVENTED_SCORE_BLOCKED: Record<string, string> = {
  en: "I won't guess a live score — that number isn't in our pool's live feed. Check back after sync, or ask about your bracket and standings.",
  es: "No voy a inventar un marcador en vivo: ese resultado no está en el feed del pool. Pregúntame por tu bracket o la tabla cuando quieras.",
  zh: "我不會猜測即時比分——這個數字不在 pool 的直播資料裡。你可以改問 bracket 或排名。",
  fil: "Hindi ako manghuhula ng live score — wala iyang numero sa live feed ng pool. Puwede mong itanong ang bracket at standings mo.",
  vi: "Tôi không đoán tỉ số trực tiếp — con số đó không có trong feed trực tiếp của pool. Hãy hỏi về bracket và bảng xếp hạng của bạn.",
}

const SCORE_PATTERN = /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/g
const MINUTE_PATTERN = /\b(\d{1,3})\s*(?:'|′|min(?:ute)?s?)\b/gi

const RELIABLE_DATA_UNAVAILABLE: Record<string, string> = {
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

    // --- Grounding contract ---
    "GROUNDING CONTRACT: The user message contains a GROUNDING PACKET (JSON). That packet is your ONLY source of facts about this pool, bracket, schedule, scores, standings, injuries, odds, teams, and players.",
    "STRICT RULE: Only answer using facts present in the GROUNDING PACKET. If the packet does not contain a fact, explicitly say what data is missing and suggest where the user can check.",
    "ALLOWED CLAIMS: Only assert claims that correspond to items in allowedClaims. Never assert facts from missingData.",
    "MISSING DATA: When asked for something in missingData, name what is missing clearly and do not guess.",

    // --- Data source disclosure rule (critical for user trust) ---
    "DATA DISCLOSURE RULE: Every answer about live scores, match events, standings, or schedule MUST begin with the relevant disclosure label from dataSourceDisclosure in the GROUNDING PACKET.",
    "Use dataSourceDisclosure.liveMatchLabel when answering about live scores, current minutes, or in-progress match events (tier=live).",
    "Use dataSourceDisclosure.cachedDataLabel when answering from cached scores or fixture schedule (tier=cached or schedule_only).",
    "Use dataSourceDisclosure.poolDataLabel when answering about pool standings, bracket picks, or scoring (always include this for pool questions).",
    "When tier is 'none' or 'pool_only', open with dataSourceDisclosure.unavailableExplanation and pivot to pool/bracket help. NEVER answer a live score or match-event question without first stating the data source.",

    // --- Soccer knowledge ---
    "SOCCER BASICS: Stable general soccer concepts (offside, formations, pressing, false nine, counterattack, penalty shootouts, tiebreakers) are allowed only when listed in allowedClaims. Clearly separate general concepts from current tournament facts.",

    // --- Hard rules ---
    "LIVE DATA: Use only scores and minutes present in sportsData.liveScores. Never invent scores, minutes, stats, or outcomes.",
    "NOT in scope: betting advice, rumors, private user data, or any fact not in the GROUNDING PACKET.",

    // --- Voice and format ---
    "VOICE: Sharp, friendly World Cup analyst in a group chat — confident, specific, warm. Short bullets or 1–2 tight paragraphs.",
    `Respond in ${lang}.`,
    "Keep team and country names exactly as written in the GROUNDING PACKET.",
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
  return /\b(when\s+(is|does|do)|kickoff|schedule|fixture|starts?\s+at|next\s+match|games?\s+today|play\s+next|plays?\s+next|horario|calendario)\b/i.test(p)
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
    /\b(path\s+to\s+win|explain\s+my\s+path|how\s+can\s+i\s+win|still\s+alive|mathematically\s+alive)\b/i.test(p) ||
    (/\b(bracket|pick|path\s+to\s+win|champion\s+pick|still\s+alive|eliminated|busted)\b/i.test(p) &&
      /\b(affect|impact|hurt|help|points|lose|gain|if\s+.+\s+wins?)\b/i.test(p))
  )
}

export function isScoringExplanationQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(scoring|points?\s+work|how\s+(many\s+)?points|round\s+of\s+32|champion\s+bonus|puntos)\b/i.test(p)
}

function isPoolSummaryQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(summarize|summary|pool\s+health|commissioner\s+summary|health\s+report|recap|storylines?)\b/i.test(p)
}

function isBestBracketQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(best\s+bracket|who\s+has\s+the\s+best|who\s+is\s+leading|leader|top\s+bracket|favorite)\b/i.test(p)
}

function isWatchTodayQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(watch\s+today|watch\s+now|matches?\s+matter|what\s+picks\s+should\s+i\s+watch|root\s+for|support)\b/i.test(p)
}

function isGroupDangerQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(group|grupo).*\b(danger|dangerous|strong|weak|tight|upset|hard)\b/i.test(p)
}

function isUserPointsQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(how\s+many\s+points\s+do\s+i\s+have|my\s+points|what'?s\s+my\s+score|what\s+is\s+my\s+score|score\s+in\s+this\s+pool)\b/i.test(p)
}

function isChampionPickQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(show\s+my\s+champion|my\s+champion\s+pick|who\s+did\s+i\s+pick\s+to\s+win|champion\s+pick)\b/i.test(p)
}

function isMostPickedChampionQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(most\s+picked\s+champion|popular\s+champion|most\s+popular\s+champion|champion\s+most\s+people)\b/i.test(p)
}

function isTopThreeQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(top\s*3|top\s+three|first\s+three|podium)\b/i.test(p)
}

function isIncompleteEntriesQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(incomplete|not\s+complete|unfinished|who\s+has\s+not\s+completed|who\s+hasn'?t\s+completed)\b/i.test(p)
}

function isSoccerKnowledgeQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase()
  return /\b(false\s+nine|pressing|low\s+block|counter(?:attack|ing)|offside|penalt(?:y|ies)|shootout|formation|tiebreakers?|tie-breakers?|group\s+stage\s+rules|why\s+is\s+\w+\s+dangerous)\b/i.test(p)
}

function dataDisclosure(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx) return "Source: no pool context was available, so I will not guess."
  const live =
    ctx.liveDataStatus === "live"
      ? "live match data is synced"
      : ctx.liveDataStatus === "fixture_only"
        ? "fixtures are cached, but live scores are not active"
        : "live scores are not synced"
  return `Source: stored pool data as of ${ctx.fetchedAt.slice(0, 16)}Z; ${live}.`
}

function confidenceDisclosure(ctx: WorldCupChimmyContext | null | undefined, confidence: "high" | "medium" | "low" = "high"): string {
  if (!ctx) return "Confidence: none; missing pool context."
  const freshness = ctx.lastSyncedAt ? `cached provider sync ${ctx.lastSyncedAt}` : "provider freshness timestamp unavailable"
  return `Confidence: ${confidence}; ${freshness}.`
}

function topLeaderboardLine(ctx: WorldCupChimmyContext): string {
  if (ctx.leaderboard.length === 0) return "No ranked entries are available yet."
  return ctx.leaderboard
    .slice(0, 3)
    .map((row) => `#${row.rank} ${row.entryName}: ${row.totalScore} pts, max ${row.maxPossibleScore}, champion ${row.championPickName ?? "not picked"}`)
    .join("; ")
}

function buildScoringReply(ctx: WorldCupChimmyContext | null | undefined): string {
  const scoring = ctx?.scoring
  if (!scoring) return reliableDataUnavailableMessage(ctx?.locale)
  return [
    dataDisclosure(ctx),
    `Scoring rules: Round of 32 ${scoring.roundOf32Points}, Round of 16 ${scoring.roundOf16Points}, quarterfinal ${scoring.quarterFinalPoints}, semifinal ${scoring.semiFinalPoints}, final ${scoring.finalPoints}, champion bonus ${scoring.championBonusPoints}.`,
    "Later rounds matter more, and the champion bonus is the swing piece. I can explain your path using only your saved picks and the current leaderboard.",
    confidenceDisclosure(ctx),
  ].join(" ")
}

function buildUserPointsReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx?.entry) {
    return [
      dataDisclosure(ctx),
      "I do not see a saved bracket entry for you yet, so I cannot report your points. Open or create a bracket entry and I can read your score from the stored pool data.",
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }
  const entry = ctx.entry
  return [
    dataDisclosure(ctx),
    `Your stored score is ${entry.totalScore} pts. Max possible is ${entry.maxPossibleScore} pts, and your rank is ${entry.rank ? `#${entry.rank}` : "not ranked yet"}.`,
    `Your champion pick is ${entry.championPick ?? "not picked"}.`,
    confidenceDisclosure(ctx),
  ].join(" ")
}

function buildStandingReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx || ctx.leaderboard.length === 0) {
    return [
      dataDisclosure(ctx),
      "No ranked leaderboard rows are available yet. Once entries finalize or scoring lands, I can call out the leader, closest chase pack, and path-to-win storylines.",
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }
  const leader = ctx.leaderboard[0]
  const entry = ctx.entry
  const gap =
    entry && entry.rank !== 1
      ? ` Your entry is ${entry.rank ? `#${entry.rank}` : "unranked"} with ${entry.totalScore} pts, ${Math.max(0, leader.totalScore - entry.totalScore)} behind the leader.`
      : entry?.rank === 1
        ? " Your entry is currently leading."
        : ""
  return [
    dataDisclosure(ctx),
    `Best bracket so far: #${leader.rank} ${leader.entryName} with ${leader.totalScore} pts and max possible ${leader.maxPossibleScore}.`,
    `Top pool snapshot: ${topLeaderboardLine(ctx)}.`,
    gap,
    confidenceDisclosure(ctx),
  ].join(" ")
}

function buildTopThreeReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx || ctx.leaderboard.length === 0) return buildStandingReply(ctx)
  return [
    dataDisclosure(ctx),
    `Top 3: ${ctx.leaderboard.slice(0, 3).map((row) => `#${row.rank} ${row.entryName} (${row.totalScore} pts, max ${row.maxPossibleScore}, champion ${row.championPickName ?? "not picked"})`).join("; ")}.`,
    confidenceDisclosure(ctx),
  ].join(" ")
}

function buildChampionPickReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx?.entry) {
    return [
      dataDisclosure(ctx),
      "I do not see your saved entry in this pool context yet, so I cannot name your champion pick.",
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }
  return [
    dataDisclosure(ctx),
    `Your champion pick is ${ctx.entry.championPick ?? "not picked yet"}.`,
    `Entry: ${ctx.entry.entryName}; rank ${ctx.entry.rank ? `#${ctx.entry.rank}` : "not ranked yet"}; score ${ctx.entry.totalScore} pts.`,
    confidenceDisclosure(ctx),
  ].join(" ")
}

function buildMostPickedChampionReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx || ctx.leaderboard.length === 0) {
    return [
      dataDisclosure(ctx),
      "I do not have ranked entries with champion picks yet, so I cannot identify the most picked champion.",
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }
  const counts = new Map<string, number>()
  for (const row of ctx.leaderboard) {
    if (!row.championPickName) continue
    counts.set(row.championPickName, (counts.get(row.championPickName) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3)
  if (top.length === 0) {
    return [
      dataDisclosure(ctx),
      "Champion picks are not stored on the ranked rows I can see yet.",
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }
  return [
    dataDisclosure(ctx),
    `Most picked champion from visible leaderboard rows: ${top.map(([team, count]) => `${team} (${count})`).join(", ")}.`,
    "This is based on the leaderboard rows in the pool context, not every hidden or unranked entry.",
    confidenceDisclosure(ctx, "medium"),
  ].join(" ")
}

function buildPathReply(ctx: WorldCupChimmyContext | null | undefined): string {
  const entry = ctx?.entry
  if (!ctx || !entry) {
    return [
      dataDisclosure(ctx),
      "I do not see a saved entry for you yet. Create or open a bracket and I can explain champion exposure, alive picks, and what needs to break your way.",
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }
  const leader = ctx.leaderboard[0]
  const gap = leader && entry.rank !== 1 ? Math.max(0, leader.totalScore - entry.totalScore) : 0
  const alive = entry.knockoutPicks.filter((pick) => pick.isCorrect !== false).slice(0, 6)
  const lost = entry.knockoutPicks.filter((pick) => pick.isCorrect === false).slice(0, 4)
  return [
    dataDisclosure(ctx),
    `Your path: ${entry.entryName} is ${entry.rank ? `#${entry.rank}` : "unranked"} with ${entry.totalScore} pts, max possible ${entry.maxPossibleScore}, champion ${entry.championPick ?? "not picked"}.`,
    gap > 0 ? `You are ${gap} pts behind the current leader.` : "You are not behind the current leader in the stored leaderboard.",
    alive.length > 0 ? `Still useful picks: ${alive.map((pick) => `${pick.pickedTeam} (${pick.round})`).join(", ")}.` : "I do not see scored alive knockout picks yet.",
    lost.length > 0 ? `Damaged picks: ${lost.map((pick) => `${pick.pickedTeam} (${pick.round})`).join(", ")}.` : "No incorrect knockout picks are stored for your entry yet.",
    confidenceDisclosure(ctx, entry.knockoutPicks.length > 0 || ctx.leaderboard.length > 0 ? "medium" : "low"),
  ].join(" ")
}

function buildPoolSummaryReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx) return reliableDataUnavailableMessage(null)
  const completeText = ctx.entry
    ? `Your bracket is ${ctx.entry.isComplete ? "complete" : "not complete"} and champion is ${ctx.entry.championPick ?? "not picked"}.`
    : "You do not have a saved bracket entry in this context yet."
  return [
    dataDisclosure(ctx),
    `${ctx.poolName} has ${ctx.participantCount} participant${ctx.participantCount === 1 ? "" : "s"} and ${ctx.leaderboard.length} ranked entr${ctx.leaderboard.length === 1 ? "y" : "ies"} in the stored leaderboard.`,
    `Top snapshot: ${topLeaderboardLine(ctx)}.`,
    completeText,
    "Commissioner note: remind unfinished entries to finalize before lock; that is the highest-confidence action I can suggest from stored pool data.",
    confidenceDisclosure(ctx),
  ].join(" ")
}

function buildIncompleteEntriesReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx) return reliableDataUnavailableMessage(null)
  const finalized = ctx.finalizedEntryCount ?? null
  const totalEntries = ctx.entryCount ?? null
  const openEntries =
    finalized != null && totalEntries != null ? Math.max(0, totalEntries - finalized) : null
  return [
    dataDisclosure(ctx),
    totalEntries != null && finalized != null
      ? `Completion snapshot: ${finalized} finalized entr${finalized === 1 ? "y" : "ies"} out of ${totalEntries}. ${openEntries} entr${openEntries === 1 ? "y is" : "ies are"} not finalized yet.`
      : "I do not have full entry completion counts loaded yet.",
    ctx.entry ? `Your bracket is ${ctx.entry.isComplete ? "complete" : "not complete"}.` : "I do not see your entry in this context.",
    "I will not name specific unfinished users without a stored completion roster in the grounding data.",
    confidenceDisclosure(ctx, totalEntries != null && finalized != null ? "medium" : "low"),
  ].join(" ")
}

function buildWatchReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx) return reliableDataUnavailableMessage(null)
  const matches = [...ctx.liveMatches, ...ctx.upcomingMatches].slice(0, 5)
  if (matches.length === 0) {
    return [
      dataDisclosure(ctx),
      "I do not have a reliable live/upcoming match list in cache right now. Based on saved bracket data, watch your champion pick and any still-alive knockout picks because those are the biggest scoring swings.",
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }
  const entryPicks = new Set((ctx.entry?.knockoutPicks ?? []).map((pick) => pick.pickedTeam.toLowerCase()))
  const lines = matches.map((match) => {
    const tagged =
      entryPicks.has(match.homeTeamName.toLowerCase()) || entryPicks.has(match.awayTeamName.toLowerCase())
        ? " affects one of your saved picks"
        : ""
    const when = match.startsAt ? new Date(match.startsAt).toUTCString().slice(0, 22) + " UTC" : "time TBD"
    return `${match.homeTeamName} vs ${match.awayTeamName} (${match.round}, ${when})${tagged}`
  })
  return [dataDisclosure(ctx), `Picks to watch: ${lines.join("; ")}.`, confidenceDisclosure(ctx, "medium")].join(" ")
}

function buildGroupReply(ctx: WorldCupChimmyContext | null | undefined): string {
  if (!ctx || ctx.groupStandings.length === 0) {
    return [
      dataDisclosure(ctx),
      "I do not have reliable official group standings cached yet. I can still review your saved group picks once they are available, but I will not invent group strength or current form.",
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }
  const groups = new Map<string, typeof ctx.groupStandings>()
  for (const row of ctx.groupStandings) groups.set(row.groupName, [...(groups.get(row.groupName) ?? []), row])
  const ranked = [...groups.entries()]
    .map(([group, rows]) => {
      const sorted = [...rows].sort((a, b) => b.points - a.points)
      const spread = (sorted[0]?.points ?? 0) - (sorted[2]?.points ?? 0)
      return { group, spread, rows: sorted.slice(0, 4) }
    })
    .sort((a, b) => a.spread - b.spread)
  const tight = ranked[0]
  if (!tight) return reliableDataUnavailableMessage(ctx.locale)
  return [
    dataDisclosure(ctx),
    `Most dangerous group from cached standings: ${tight.group}, because the top-to-third points spread is ${tight.spread}.`,
    `Snapshot: ${tight.rows.map((row) => `${row.teamName} ${row.points} pts`).join(", ")}.`,
    confidenceDisclosure(ctx, "medium"),
  ].join(" ")
}

function allCachedMatches(ctx: WorldCupChimmyContext | null | undefined): NonNullable<WorldCupChimmyContext["liveMatches"]> {
  return ctx ? [...ctx.liveMatches, ...ctx.upcomingMatches, ...ctx.recentMatches] : []
}

function promptTeamMatch(prompt: string, matches: NonNullable<WorldCupChimmyContext["liveMatches"]>): string | null {
  const p = prompt.toLowerCase()
  const candidates = new Set<string>()
  for (const match of matches) {
    if (match.homeTeamName && match.homeTeamName !== "?") candidates.add(match.homeTeamName)
    if (match.awayTeamName && match.awayTeamName !== "?") candidates.add(match.awayTeamName)
  }
  return [...candidates].find((team) => p.includes(team.toLowerCase())) ?? null
}

function buildScheduleReply(ctx: WorldCupChimmyContext | null | undefined, prompt: string): string {
  const matches = allCachedMatches(ctx)
  if (!ctx || matches.length === 0) {
    return [
      reliableDataUnavailableMessage(ctx?.locale),
      dataDisclosure(ctx),
      "Missing data: cached fixture schedule.",
    ].join(" ")
  }

  const requestedTeam = promptTeamMatch(prompt, matches)
  const now = new Date()
  const relevant = requestedTeam
    ? matches
        .filter((match) =>
          match.homeTeamName.toLowerCase() === requestedTeam.toLowerCase() ||
          match.awayTeamName.toLowerCase() === requestedTeam.toLowerCase()
        )
        .filter((match) => !match.startsAt || new Date(match.startsAt) >= now || match.status === "live")
    : matches.filter((match) => match.startsAt && new Date(match.startsAt) >= now).slice(0, 5)

  if (requestedTeam && relevant.length === 0) {
    return [
      reliableDataUnavailableMessage(ctx.locale),
      dataDisclosure(ctx),
      `Missing data: no fresh cached fixture for ${requestedTeam} in this pool context.`,
      confidenceDisclosure(ctx, "low"),
    ].join(" ")
  }

  const rows = (relevant.length > 0 ? relevant : matches.slice(0, 5)).slice(0, 5).map((match) => {
    const when = match.startsAt ? `${new Date(match.startsAt).toUTCString().slice(0, 22)} UTC` : "time TBD"
    const score = match.homeScore != null && match.awayScore != null ? ` score ${match.homeScore}-${match.awayScore}` : ""
    const minute = match.minute != null ? ` ${match.minute}'` : ""
    return `${match.homeTeamName} vs ${match.awayTeamName} (${match.round}, ${when}, ${match.status}${score}${minute})`
  })

  return [
    dataDisclosure(ctx),
    requestedTeam ? `${requestedTeam} fixture from cache: ${rows.join("; ")}.` : `Cached World Cup fixtures: ${rows.join("; ")}.`,
    confidenceDisclosure(ctx, ctx.lastSyncedAt ? "medium" : "low"),
  ].join(" ")
}

function buildSoccerKnowledgeReply(ctx: WorldCupChimmyContext | null | undefined, prompt: string): string {
  const p = prompt.toLowerCase()
  let answer: string
  if (p.includes("false nine")) {
    answer = "A false nine is a forward who drops away from the defensive line instead of staying as a traditional striker. That can pull center backs out, open lanes for runners, and make marking assignments messy."
  } else if (p.includes("pressing")) {
    answer = "Pressing means a team tries to win the ball back quickly by closing space after the opponent receives it. High pressing can create turnovers near goal, but it can also leave space behind."
  } else if (p.includes("low block")) {
    answer = "A low block is a compact defensive shape near a team's own box. It is hard to break down, but it can invite pressure and make counters the main attacking outlet."
  } else if (p.includes("counter")) {
    answer = "A counterattack is a fast attack right after winning the ball. The idea is to hit open space before the opponent's defense resets."
  } else if (p.includes("offside")) {
    answer = "Offside is called when an attacker is nearer to the opponent's goal than both the ball and the second-last defender when a teammate plays the ball, and then becomes involved in the play."
  } else if (p.includes("penalt") || p.includes("shootout")) {
    answer = "In knockout soccer, a tied match can go to extra time and then penalties. A shootout is not the same as normal goals for team style, but it decides who advances."
  } else if (p.includes("tiebreak") || p.includes("tie-break") || p.includes("group stage rules")) {
    answer = "Group-stage tiebreakers usually start with points, then goal difference, goals scored, and head-to-head or fair-play style rules depending on the tournament rulebook. I need cached official rules to claim the exact 2026 order."
  } else if (/\bwhy\s+is\s+\w+\s+dangerous\b/.test(p)) {
    const team = prompt.match(/\bwhy\s+is\s+([a-zA-Z .'-]+?)\s+dangerous\b/i)?.[1]?.trim()
    answer = `Based on general soccer principles, ${team || "a team"} can be dangerous when it defends compactly, transitions quickly, wins set pieces, or creates overloads in wide areas. I do not have fresh squad, form, or injury data loaded here.`
  } else {
    answer = "I can explain stable soccer basics, but I need cached provider/team data before making fresh claims about current squads, form, injuries, odds, or exact tournament facts."
  }
  return [
    "Source: stable soccer knowledge, not live provider data.",
    answer,
    ctx ? dataDisclosure(ctx) : "No pool context was needed for this general soccer answer.",
    "Confidence: high for the general concept; low for any current team-specific facts not in cache.",
  ].join(" ")
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
  return LIVE_FEED_UNAVAILABLE[getWorldCupLocale(locale)] ?? LIVE_FEED_UNAVAILABLE.en
}

export function inventedScoreBlockedMessage(locale: string | null | undefined): string {
  return INVENTED_SCORE_BLOCKED[getWorldCupLocale(locale)] ?? INVENTED_SCORE_BLOCKED.en
}

export function reliableDataUnavailableMessage(locale: string | null | undefined): string {
  return RELIABLE_DATA_UNAVAILABLE[getWorldCupLocale(locale)] ?? RELIABLE_DATA_UNAVAILABLE.en
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
    return [
      reliableDataUnavailableMessage(input.locale),
      context ? ` ${dataDisclosure(context)} Ask me for pool standings, scoring rules, path to win, or a commissioner summary and I can answer from saved pool data.` : "",
    ].join("")
  }

  if (isSoccerKnowledgeQuestion(prompt)) {
    return buildSoccerKnowledgeReply(context, prompt)
  }

  if (isUserPointsQuestion(prompt)) {
    return buildUserPointsReply(context)
  }

  if (isMostPickedChampionQuestion(prompt)) {
    return buildMostPickedChampionReply(context)
  }

  if (isChampionPickQuestion(prompt)) {
    return buildChampionPickReply(context)
  }

  if (isTopThreeQuestion(prompt)) {
    return buildTopThreeReply(context)
  }

  if (isIncompleteEntriesQuestion(prompt)) {
    return buildIncompleteEntriesReply(context)
  }

  if (isScoringExplanationQuestion(prompt)) {
    return buildScoringReply(context)
  }

  if (isPoolStandingQuestion(prompt) || isBestBracketQuestion(prompt)) {
    return buildStandingReply(context)
  }

  if (isBracketImpactQuestion(prompt)) {
    return buildPathReply(context)
  }

  if (isPoolSummaryQuestion(prompt)) {
    return buildPoolSummaryReply(context)
  }

  if (isWatchTodayQuestion(prompt)) {
    return buildWatchReply(context)
  }

  if (isGroupDangerQuestion(prompt)) {
    return buildGroupReply(context)
  }

  if (isScheduleQuestion(prompt)) {
    return buildScheduleReply(context, prompt)
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
