import "server-only"
import { prisma } from "@/lib/prisma"
import { analyzeWorldCupEntryPickCompletion } from "./worldCupBracketCompletionService"
import {
  isWorldCupChallengeLocked,
  resolveWorldCupEffectivePickLockAt,
} from "./worldCupBracketBuilder"
import { worldCupBracketPicksPublicUrl } from "./worldCupBracketReminderService"
import { buildWorldCupLeaderboardRows } from "./worldCupScoringService"
import type { WorldCupRound } from "./types"

export type WorldCupCommissionerBrainSnapshot = {
  incompleteBracketCount: number
  completedBracketCount: number
  totalEntries: number
  totalMissingPicks: number
  maxEntriesPerParticipant: number
  lockCountdownMs: number | null
  effectiveLockAt: string | null
  isLocked: boolean
  mostPopularChampion: { teamName: string; count: number } | null
  /** Heuristic: pick that appears least often across entries (may be null). */
  mostUniqueLean: string | null
  usersMaxedEntries: number
  biggestUpsetLean: string | null
  /** Users who still have at least one incomplete bracket entry. */
  usersWithIncompleteBrackets: Array<{
    userId: string
    displayName: string
    incompleteEntryCount: number
    missingPicks: number
  }>
  /** Entries that still need picks (projection-based). */
  entriesMissingPicks: Array<{
    entryId: string
    entryName: string
    missingPicks: number
    userId: string
  }>
}

export async function getWorldCupCommissionerBrainSnapshot(
  challengeId: string
): Promise<WorldCupCommissionerBrainSnapshot | null> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      matches: true,
      scoringProfile: true,
      entries: {
        include: {
          picks: true,
          participant: true,
        },
      },
    },
  })
  if (!challenge) return null

  const entries = challenge.entries
  const analyses = entries.map((e) =>
    analyzeWorldCupEntryPickCompletion({
      matches: challenge.matches as any,
      picks: e.picks as any,
      includeThirdPlace: challenge.includeThirdPlace,
      entryId: e.id,
      userId: e.userId,
      entryName: e.name,
      displayName: e.participant?.displayName ?? "Player",
    })
  )
  const incompleteAnalyses = analyses.filter((a) => !a.isComplete)
  const completedAnalyses = analyses.filter((a) => a.isComplete)
  const incompleteBracketCount = incompleteAnalyses.length
  const completedBracketCount = completedAnalyses.length
  const totalMissingPicks = incompleteAnalyses.reduce(
    (s, a) => s + a.missingPickCount,
    0
  )

  const userAgg = new Map<
    string,
    { displayName: string; incompleteEntryCount: number; missingPicks: number }
  >()
  for (const a of incompleteAnalyses) {
    const cur = userAgg.get(a.userId) ?? {
      displayName: a.displayName,
      incompleteEntryCount: 0,
      missingPicks: 0,
    }
    cur.incompleteEntryCount += 1
    cur.missingPicks += a.missingPickCount
    userAgg.set(a.userId, cur)
  }
  const usersWithIncompleteBrackets = [...userAgg.entries()].map(([userId, v]) => ({
    userId,
    displayName: v.displayName,
    incompleteEntryCount: v.incompleteEntryCount,
    missingPicks: v.missingPicks,
  }))
  const entriesMissingPicks = incompleteAnalyses.map((a) => ({
    entryId: a.entryId,
    entryName: a.entryName,
    missingPicks: a.missingPickCount,
    userId: a.userId,
  }))

  const championCounts = new Map<string, number>()
  for (const e of entries) {
    const name =
      e.championTeamName?.trim() ||
      e.picks?.find((p) => p.round === "final")?.selectedTeamName?.trim()
    if (!name) continue
    championCounts.set(name, (championCounts.get(name) ?? 0) + 1)
  }
  let mostPopularChampion: { teamName: string; count: number } | null = null
  for (const [teamName, count] of championCounts) {
    if (!mostPopularChampion || count > mostPopularChampion.count) {
      mostPopularChampion = { teamName, count }
    }
  }

  const pickSignatures = entries.map((e) =>
    (e.picks ?? [])
      .map((p) => `${p.matchId}:${p.selectedTeamId ?? p.selectedTeamName}`)
      .sort()
      .join("|")
  )
  const sigCount = new Map<string, number>()
  for (const s of pickSignatures) sigCount.set(s, (sigCount.get(s) ?? 0) + 1)
  let mostUniqueLean: string | null = null
  let minC = Infinity
  for (const [sig, c] of sigCount) {
    if (c < minC && sig.length > 0) {
      minC = c
      mostUniqueLean = `Bracket signature shared by ${c} entr${c === 1 ? "y" : "ies"}`
    }
  }

  const byUser = new Map<string, number>()
  for (const e of entries) {
    byUser.set(e.userId, (byUser.get(e.userId) ?? 0) + 1)
  }
  const usersMaxedEntries = [...byUser.values()].filter(
    (n) => n >= challenge.maxEntriesPerParticipant
  ).length

  const eff = resolveWorldCupEffectivePickLockAt({
    pickLockStrategy: challenge.pickLockStrategy,
    pickLockAt: challenge.pickLockAt,
    matches: challenge.matches,
  })
  const effectiveLockAt = eff ? eff.toISOString() : null
  const lockMs = eff ? eff.getTime() - Date.now() : null

  const locked = isWorldCupChallengeLocked({
    challenge,
    matches: challenge.matches,
  }).locked

  const rows = buildWorldCupLeaderboardRows({
    entries: entries as any,
    matches: challenge.matches as any,
    scoring: challenge.scoringProfile,
  })
  let biggestUpsetLean: string | null = null
  if (rows.length > 0) {
    const top = rows[0]
    biggestUpsetLean = `${top.entryName} leads at ${top.totalScore} pts — compare chalk vs darlings in pool chat.`
  }

  return {
    incompleteBracketCount,
    completedBracketCount,
    totalEntries: entries.length,
    totalMissingPicks,
    maxEntriesPerParticipant: challenge.maxEntriesPerParticipant,
    lockCountdownMs: lockMs,
    effectiveLockAt,
    isLocked: locked,
    mostPopularChampion,
    mostUniqueLean,
    usersMaxedEntries,
    biggestUpsetLean,
    usersWithIncompleteBrackets,
    entriesMissingPicks,
  }
}

export async function buildIncompleteBracketReminderLines(challengeId: string) {
  const snap = await getWorldCupCommissionerBrainSnapshot(challengeId)
  if (!snap) return []
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: { name: true },
  })
  const lines: string[] = []
  lines.push(`You're not done yet — ${snap.incompleteBracketCount} bracket${snap.incompleteBracketCount === 1 ? "" : "s"} still incomplete in "${challenge?.name ?? "this pool"}".`)
  lines.push(`Tap Picks and finish every matchup before the lock.`)
  return lines
}

/** Full commissioner reminder: league name, lock time, missing picks, deep link, sample rows. */
export async function buildIncompleteBracketReminderDetailedLines(
  challengeId: string
): Promise<string[]> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: { name: true },
  })
  const snap = await getWorldCupCommissionerBrainSnapshot(challengeId)
  if (!snap || !challenge) return []

  const lockLabel = snap.effectiveLockAt
    ? new Date(snap.effectiveLockAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "TBD"

  const url = worldCupBracketPicksPublicUrl(challengeId)
  const lines: string[] = [
    `Finish your bracket in "${challenge.name}" before the lock (${lockLabel}).`,
    `${snap.incompleteBracketCount} incomplete entr${snap.incompleteBracketCount === 1 ? "y" : "ies"}, ~${snap.totalMissingPicks} pick${snap.totalMissingPicks === 1 ? "" : "s"} still needed across the pool.`,
    `Open picks: ${url}`,
  ]
  if (snap.entriesMissingPicks.length > 0) {
    lines.push(
      snap.entriesMissingPicks
        .slice(0, 6)
        .map(
          (e) =>
            `• ${e.entryName}: missing ${e.missingPicks} pick${e.missingPicks === 1 ? "" : "s"}`
        )
        .join("\n")
    )
  }
  return lines
}

/** Generic pool reminder (no per-entry breakdown). */
export async function buildPoolBroadcastReminderLines(
  challengeId: string
): Promise<string[]> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: { name: true },
  })
  const snap = await getWorldCupCommissionerBrainSnapshot(challengeId)
  const lockLabel = snap?.effectiveLockAt
    ? new Date(snap.effectiveLockAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "soon"
  const url = worldCupBracketPicksPublicUrl(challengeId)
  return [
    `Pool reminder: "${challenge?.name ?? "Bracket"}" — submit picks before ${lockLabel}.`,
    url,
  ]
}

export async function buildStandingsSummaryLines(challengeId: string) {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      matches: true,
      scoringProfile: true,
      entries: { include: { picks: true, participant: true } },
    },
  })
  if (!challenge) return []
  const rows = buildWorldCupLeaderboardRows({
    entries: challenge.entries as any,
    matches: challenge.matches as any,
    scoring: challenge.scoringProfile,
  })
  const lines: string[] = [`Standings (${challenge.name})`]
  rows.slice(0, 12).forEach((r, i) => {
    lines.push(`${i + 1}. ${r.entryName} — ${r.totalScore} pts`)
  })
  return lines
}

export async function buildLeagueHypeLines(challengeId: string) {
  const snap = await getWorldCupCommissionerBrainSnapshot(challengeId)
  if (!snap) return ["Let's go — bracket pool is heating up."]
  const crown = snap.mostPopularChampion
    ? `${snap.mostPopularChampion.teamName} (${snap.mostPopularChampion.count} picks)`
    : "split across the field"
  return [
    `${snap.totalEntries} brackets · ${snap.completedBracketCount} submitted`,
    `Chalk radar: ${crown}`,
    snap.lockCountdownMs != null && snap.lockCountdownMs > 0
      ? `Lock countdown ticking — finish picks.`
      : `Good luck — enjoy the tournament.`,
  ]
}

export async function buildWhatToWatchLines(challengeId: string) {
  const matches = await prisma.worldCupBracketMatch.findMany({
    where: { challengeId },
    orderBy: [{ startsAt: "asc" }],
    take: 16,
  })
  const soon = matches.filter(
    (m) =>
      m.status !== "final" &&
      m.startsAt &&
      new Date(m.startsAt).getTime() - Date.now() < 48 * 3600 * 1000
  )
  const lines: string[] = ["What to watch"]
  for (const m of soon.slice(0, 8)) {
    const t = m.startsAt ? new Date(m.startsAt).toISOString() : "TBD"
    lines.push(`${m.homeTeamName} vs ${m.awayTeamName} — ${m.status} (${t})`)
  }
  if (lines.length === 1) lines.push("Sync live scores to populate kickoff times.")
  return lines
}

export async function buildPostRoundRecapLines(challengeId: string, round: WorldCupRound) {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      matches: true,
      scoringProfile: true,
      entries: { include: { picks: { include: { match: true } }, participant: true } },
    },
  })
  if (!challenge) return []
  const inRound = challenge.matches.filter((m) => m.round === round && m.status === "final")
  const lines: string[] = [`${round.replace(/_/g, " ")} recap`]
  lines.push(`${inRound.length} match${inRound.length === 1 ? "" : "es"} final.`)

  const rows = buildWorldCupLeaderboardRows({
    entries: challenge.entries as any,
    matches: challenge.matches as any,
    scoring: challenge.scoringProfile,
  })
  if (rows[0]) lines.push(`Leader: ${rows[0].entryName} (${rows[0].totalScore} pts)`)
  return lines
}

export async function buildPathToWinLines(challengeId: string, entryId: string) {
  const entry = await prisma.worldCupBracketEntry.findUnique({
    where: { id: entryId },
    include: { picks: { include: { match: true } }, challenge: { include: { matches: true } } },
  })
  if (!entry || entry.challengeId !== challengeId) return []
  const remaining = entry.picks.filter((p) => p.match?.status !== "final").length
  return [
    `${entry.name}: ${remaining} matchup${remaining === 1 ? "" : "s"} still pending.`,
    `Max points path depends on remaining picks hitting favorites — stay sharp.`,
  ]
}

async function maybeEnhanceWithOpenAi(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.WORLD_CUP_BRAIN_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Chimmy, calm bracket commissioner copywriter. Short paragraphs, no hype slang.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}

export async function generateAiWrappedLines(
  kind:
    | "hype"
    | "standings"
    | "watch"
    | "recap"
    | "path"
    | "reminder"
    | "incomplete_reminder"
    | "pool_broadcast",
  challengeId: string,
  extra?: { round?: WorldCupRound; entryId?: string }
): Promise<string[]> {
  let base: string[] = []
  switch (kind) {
    case "hype":
      base = await buildLeagueHypeLines(challengeId)
      break
    case "standings":
      base = await buildStandingsSummaryLines(challengeId)
      break
    case "watch":
      base = await buildWhatToWatchLines(challengeId)
      break
    case "recap":
      base = await buildPostRoundRecapLines(challengeId, extra?.round ?? "round_of_16")
      break
    case "path":
      base = extra?.entryId
        ? await buildPathToWinLines(challengeId, extra.entryId)
        : []
      break
    case "reminder":
      base = await buildIncompleteBracketReminderLines(challengeId)
      break
    case "incomplete_reminder":
      base = await buildIncompleteBracketReminderDetailedLines(challengeId)
      break
    case "pool_broadcast":
      base = await buildPoolBroadcastReminderLines(challengeId)
      break
    default:
      base = []
  }
  const ai =
    kind === "incomplete_reminder"
      ? await maybeEnhanceWithOpenAi(
          `${base.join("\n")}\n\nVoice: confident commissioner nudge — clear, energetic, still professional.`
        )
      : await maybeEnhanceWithOpenAi(base.join("\n"))
  return ai ? [ai] : base
}
