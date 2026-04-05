// PRIVACY BOUNDARY: This module never reads chat data.
// Monitoring is based solely on lineup decisions, waiver activity,
// and on-field performance data.

import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import { notifyCommissionerOfFlag } from "./integrityNotifier"

export type TankingEvidence = {
  rosterId: string
  teamName: string
  currentRecord: { wins: number; losses: number }
  weekNumber: number
  illegalOrSuspiciousStarters: {
    slotPosition: string
    startedPlayerId: string
    startedPlayerName: string
    startedPlayerStatus: string
    benchedBetterOption?: string
    benchedBetterOptionProjection?: number
    startedPlayerProjection?: number
  }[]
  consecutiveWeeksWithSuspiciousLineup: number
  winsBelowExpected: number
  pointsLeftOnBench: number
  eliminatedFromPlayoffs: boolean
  weeksUntilPlayoffs: number | null
  redFlags: string[]
}

export type TankingScanResult = {
  leagueId: string
  weekNumber: number
  flags: {
    severity: "low" | "medium" | "high"
    confidence: number
    summary: string
    evidence: TankingEvidence
  }[]
  scannedAt: string
}

async function runClaudeTankingPrompt(input: {
  leagueId: string
  weekNumber: number
  evidence: TankingEvidence
}): Promise<{
  verdict: "clean" | "suspicious" | "likely_tanking"
  confidence: number
  severity: "low" | "medium" | "high"
  summary: string
  redFlags: string[]
} | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) return null
  const client = new Anthropic({ apiKey: key })
  const user = `League: ${input.leagueId}. Week ${input.weekNumber}.
Team: ${input.evidence.teamName} (${input.evidence.currentRecord.wins}-${input.evidence.currentRecord.losses}, eliminated: ${input.evidence.eliminatedFromPlayoffs}).
Suspicious lineup slots: ${JSON.stringify(input.evidence.illegalOrSuspiciousStarters)}
Pattern: ${input.evidence.consecutiveWeeksWithSuspiciousLineup} consecutive weeks with suspicious lineups.
Points left on bench (heuristic): ${input.evidence.pointsLeftOnBench}
Analyze for tanking using ONLY this lineup data.`

  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    system: `You are an anti-tanking AI for fantasy sports leagues.
You analyze lineup decisions using ONLY on-field data.
Respond ONLY with JSON: {
  "verdict": "clean" | "suspicious" | "likely_tanking",
  "confidence": 0.0,
  "severity": "low" | "medium" | "high",
  "summary": "plain English",
  "redFlags": ["..."]
}`,
    messages: [{ role: "user", content: user }],
  })
  const text = res.content.find((b) => b.type === "text")
  if (!text || text.type !== "text") return null
  const raw = text.text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as {
      verdict: "clean" | "suspicious" | "likely_tanking"
      confidence: number
      severity: "low" | "medium" | "high"
      summary: string
      redFlags: string[]
    }
  } catch {
    return null
  }
}

function parseLineupSnapshots(raw: unknown): { rosterId: string; starters: { playerId: string; status?: string; proj?: number }[]; bench: { playerId: string; proj?: number }[] }[] {
  if (raw == null) return []
  if (!Array.isArray(raw)) return []
  const out: { rosterId: string; starters: { playerId: string; status?: string; proj?: number }[]; bench: { playerId: string; proj?: number }[] }[] = []
  for (const block of raw) {
    if (!block || typeof block !== "object") continue
    const o = block as Record<string, unknown>
    const rid = typeof o.rosterId === "string" ? o.rosterId : ""
    if (!rid) continue
    const starters = Array.isArray(o.starters) ? o.starters : Array.isArray(o.lineup) ? o.lineup : []
    const bench = Array.isArray(o.bench) ? o.bench : []
    const mapS = starters
      .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
      .map((x) => ({
        playerId: String(x.playerId ?? x.id ?? ""),
        status: typeof x.injuryStatus === "string" ? x.injuryStatus : typeof x.status === "string" ? x.status : undefined,
        proj: typeof x.projection === "number" ? x.projection : undefined,
      }))
    const mapB = bench
      .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
      .map((x) => ({
        playerId: String(x.playerId ?? x.id ?? ""),
        proj: typeof x.projection === "number" ? x.projection : undefined,
      }))
    out.push({ rosterId: rid, starters: mapS, bench: mapB })
  }
  return out
}

export async function scanWeekForTanking(leagueId: string, weekNumber: number): Promise<TankingScanResult> {
  const scannedAt = new Date().toISOString()
  const settings = await prisma.leagueIntegritySettings.findUnique({ where: { leagueId } })
  if (!settings?.tankingMonitorEnabled) {
    return { leagueId, weekNumber, flags: [], scannedAt }
  }

  const matchups = await prisma.redraftMatchup.findMany({
    where: { leagueId, week: weekNumber },
    include: {
      homeRoster: true,
      awayRoster: true,
    },
  })

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { playoffStartWeek: true },
  })
  const playoffWeek = league?.playoffStartWeek ?? 15
  const weeksUntilPlayoffs = Math.max(0, playoffWeek - weekNumber)

  const flags: TankingScanResult["flags"] = []

  for (const m of matchups) {
    for (const side of [
      { roster: m.homeRoster, snap: m.lineupSnapshots },
      m.awayRoster ? { roster: m.awayRoster, snap: m.lineupSnapshots } : null,
    ]) {
      if (!side) continue
      const roster = side.roster
      const parsed = parseLineupSnapshots(side.snap)
      const block = parsed.find((p) => p.rosterId === roster.id) ?? parsed[0]
      const suspicious: TankingEvidence["illegalOrSuspiciousStarters"] = []
      let pointsLeft = 0
      if (block) {
        const benchBest = Math.max(0, ...block.bench.map((b) => b.proj ?? 0))
        for (const st of block.starters) {
          const stProj = st.proj ?? 0
          const status = (st.status ?? "").toUpperCase()
          const out =
            status.includes("OUT") || status.includes("IR") || status === "DOUBTFUL" || status === "D"
          if (out) {
            suspicious.push({
              slotPosition: "FLEX",
              startedPlayerId: st.playerId,
              startedPlayerName: st.playerId,
              startedPlayerStatus: status || "OUT",
              benchedBetterOption: benchBest > stProj ? "bench" : undefined,
              benchedBetterOptionProjection: benchBest > stProj ? benchBest : undefined,
              startedPlayerProjection: stProj,
            })
          } else if (benchBest - stProj >= 5) {
            pointsLeft += benchBest - stProj
            suspicious.push({
              slotPosition: "FLEX",
              startedPlayerId: st.playerId,
              startedPlayerName: st.playerId,
              startedPlayerStatus: "ACTIVE",
              benchedBetterOption: "higher projection on bench",
              benchedBetterOptionProjection: benchBest,
              startedPlayerProjection: stProj,
            })
          }
        }
      }

      const eliminated = roster.isEliminated === true
      const evidence: TankingEvidence = {
        rosterId: roster.id,
        teamName: roster.teamName?.trim() || roster.ownerName,
        currentRecord: { wins: roster.wins, losses: roster.losses },
        weekNumber,
        illegalOrSuspiciousStarters: suspicious,
        consecutiveWeeksWithSuspiciousLineup: suspicious.length > 0 ? 1 : 0,
        winsBelowExpected: 0,
        pointsLeftOnBench: pointsLeft,
        eliminatedFromPlayoffs: eliminated,
        weeksUntilPlayoffs,
        redFlags: [],
      }

      if (suspicious.length === 0) continue

      const ai = await runClaudeTankingPrompt({ leagueId, weekNumber, evidence })
      const verdict = ai?.verdict ?? "suspicious"
      const confidence = ai?.confidence ?? 0.5
      const severity = ai?.severity ?? "medium"
      if (ai?.redFlags?.length) evidence.redFlags = ai.redFlags

      if (verdict === "suspicious" || verdict === "likely_tanking") {
        const summary = ai?.summary ?? "Lineup card shows starters in worse health or projection than bench alternatives."
        const row = await prisma.integrityFlag.create({
          data: {
            leagueId,
            flagType: "tanking",
            severity,
            status: "open",
            affectedRosterIds: [roster.id],
            affectedTeamNames: [evidence.teamName],
            summary,
            evidenceJson: evidence as unknown as Prisma.InputJsonValue,
            aiConfidence: confidence,
          },
        })
        await notifyCommissionerOfFlag(row.id)
        flags.push({ severity, confidence, summary, evidence })
      }
    }
  }

  await prisma.leagueIntegritySettings.upsert({
    where: { leagueId },
    create: { leagueId, lastTankingScanAt: new Date(), tankingMonitorEnabled: true },
    update: { lastTankingScanAt: new Date() },
  })

  return { leagueId, weekNumber, flags, scannedAt }
}
