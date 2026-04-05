// PRIVACY BOUNDARY: This module never reads chat data.
// Monitoring is based solely on on-field actions and trade data.

import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import type { Prisma } from "@prisma/client"

import { pricePick, pricePlayer, type ValuationContext } from "@/lib/hybrid-valuation"
import { prisma } from "@/lib/prisma"

import { notifyCommissionerOfFlag } from "./integrityNotifier"

export type CollusionEvidence = {
  tradeTransactionId: string
  team1: { rosterId: string; teamName: string; wins: number; losses: number }
  team2: { rosterId: string; teamName: string; wins: number; losses: number }
  assetsTeam1Gave: { name: string; position: string; estimatedValue: number }[]
  assetsTeam2Gave: { name: string; position: string; estimatedValue: number }[]
  team1TotalValue: number
  team2TotalValue: number
  valueDifferential: number
  valueDifferentialPct: number
  priorTradesBetweenPair: number
  isPlayoffContender: { team1: boolean; team2: boolean }
  redFlags: string[]
}

export type CollusionScanResult = {
  leagueId: string
  flags: {
    severity: "low" | "medium" | "high"
    confidence: number
    summary: string
    evidence: CollusionEvidence
  }[]
  scannedAt: string
}

type OfferPiece =
  | { kind: "player"; name: string; position: string }
  | { kind: "pick"; name: string; position: string; year: number; round: number }

function parseOffers(raw: unknown): OfferPiece[] {
  if (!Array.isArray(raw)) return []
  const out: OfferPiece[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    if (typeof o.type === "string" && o.type.toLowerCase() === "pick") {
      const year = typeof o.year === "number" ? o.year : typeof o.season === "number" ? o.season : new Date().getFullYear()
      const round = typeof o.round === "number" ? o.round : Number(o.round ?? 1)
      out.push({
        kind: "pick",
        name: `Pick ${year} R${round}`,
        position: "PICK",
        year,
        round: Number.isFinite(round) ? round : 1,
      })
      continue
    }
    const name =
      (typeof o.playerName === "string" && o.playerName) ||
      (typeof o.name === "string" && o.name) ||
      (typeof o.player_name === "string" && o.player_name) ||
      ""
    if (!name) continue
    const position = typeof o.position === "string" ? o.position : "UNK"
    out.push({ kind: "player", name, position })
  }
  return out
}

async function valueOffers(pieces: OfferPiece[], ctx: ValuationContext): Promise<{ name: string; position: string; estimatedValue: number }[]> {
  const rows: { name: string; position: string; estimatedValue: number }[] = []
  for (const p of pieces) {
    if (p.kind === "player") {
      const priced = await pricePlayer(p.name, ctx)
      rows.push({
        name: p.name,
        position: priced.position ?? p.position,
        estimatedValue: Math.round(priced.value),
      })
    } else {
      const priced = await pricePick({ year: p.year, round: p.round }, ctx)
      rows.push({
        name: p.name,
        position: "PICK",
        estimatedValue: Math.round(priced.value),
      })
    }
  }
  return rows
}

function sumValues(rows: { estimatedValue: number }[]): number {
  return rows.reduce((a, b) => a + b.estimatedValue, 0)
}

function playoffContender(wins: number, losses: number, playoffWeek: number | null | undefined): boolean {
  const total = wins + losses
  if (total < 3) return true
  if (playoffWeek != null && total >= playoffWeek - 1) {
    return wins >= Math.ceil((playoffWeek - 1) * 0.45)
  }
  return wins >= 6
}

async function runClaudeCollusionPrompt(payload: {
  leagueId: string
  evidence: CollusionEvidence
}): Promise<{
  verdict: "clean" | "suspicious" | "likely_collusion"
  confidence: number
  severity: "low" | "medium" | "high"
  summary: string
  redFlags: string[]
} | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) return null

  const client = new Anthropic({ apiKey: key })
  const user = `League: ${payload.leagueId}. Trade analysis:
Team1 (${payload.evidence.team1.wins}-${payload.evidence.team1.losses}, playoff contender: ${payload.evidence.isPlayoffContender.team1}) gives: ${JSON.stringify(payload.evidence.assetsTeam1Gave)}
Team2 (${payload.evidence.team2.wins}-${payload.evidence.team2.losses}, playoff contender: ${payload.evidence.isPlayoffContender.team2}) gives: ${JSON.stringify(payload.evidence.assetsTeam2Gave)}
Value differential: ${payload.evidence.valueDifferentialPct.toFixed(1)}%
Prior trades between these managers this season: ${payload.evidence.priorTradesBetweenPair}
Analyze for collusion using ONLY this data.`

  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You are an anti-collusion AI for fantasy sports leagues.
You analyze trades using ONLY on-field data — never chat messages.
Respond ONLY with JSON: {
  "verdict": "clean" | "suspicious" | "likely_collusion",
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
      verdict: "clean" | "suspicious" | "likely_collusion"
      confidence: number
      severity: "low" | "medium" | "high"
      summary: string
      redFlags: string[]
    }
  } catch {
    return null
  }
}

export async function scanTradeForCollusion(leagueId: string, tradeTransactionId: string): Promise<CollusionScanResult> {
  const scannedAt = new Date().toISOString()
  const trade = await prisma.redraftLeagueTrade.findFirst({
    where: { id: tradeTransactionId, leagueId },
    include: {
      proposerRoster: true,
      receiverRoster: true,
      league: { select: { playoffStartWeek: true, sport: true } },
      season: true,
    },
  })

  if (!trade) {
    return { leagueId, flags: [], scannedAt }
  }

  const ctx: ValuationContext = {
    asOfDate: new Date().toISOString().slice(0, 10),
    isSuperFlex: false,
    numTeams: 12,
  }

  const proposerPieces = parseOffers(trade.proposerOffers as unknown)
  const receiverPieces = parseOffers(trade.receiverOffers as unknown)
  const assetsTeam1Gave = await valueOffers(proposerPieces, ctx)
  const assetsTeam2Gave = await valueOffers(receiverPieces, ctx)

  const team1Total = sumValues(assetsTeam1Gave)
  const team2Total = sumValues(assetsTeam2Gave)
  const valueDifferential = Math.abs(team1Total - team2Total)
  const hi = Math.max(team1Total, team2Total, 1)
  const valueDifferentialPct = (valueDifferential / hi) * 100

  const prior = await prisma.redraftLeagueTrade.count({
    where: {
      leagueId,
      seasonId: trade.seasonId,
      id: { not: trade.id },
      status: { in: ["accepted", "completed"] },
      OR: [
        {
          proposerRosterId: trade.proposerRosterId,
          receiverRosterId: trade.receiverRosterId,
        },
        {
          proposerRosterId: trade.receiverRosterId,
          receiverRosterId: trade.proposerRosterId,
        },
      ],
    },
  })

  const pw = trade.league.playoffStartWeek ?? 14
  const t1 = trade.proposerRoster
  const t2 = trade.receiverRoster
  const evidence: CollusionEvidence = {
    tradeTransactionId: trade.id,
    team1: {
      rosterId: t1.id,
      teamName: t1.teamName?.trim() || t1.ownerName,
      wins: t1.wins,
      losses: t1.losses,
    },
    team2: {
      rosterId: t2.id,
      teamName: t2.teamName?.trim() || t2.ownerName,
      wins: t2.wins,
      losses: t2.losses,
    },
    assetsTeam1Gave,
    assetsTeam2Gave,
    team1TotalValue: team1Total,
    team2TotalValue: team2Total,
    valueDifferential,
    valueDifferentialPct,
    priorTradesBetweenPair: prior,
    isPlayoffContender: {
      team1: playoffContender(t1.wins, t1.losses, pw),
      team2: playoffContender(t2.wins, t2.losses, pw),
    },
    redFlags: [],
  }

  if (valueDifferentialPct >= 15 && team1Total !== team2Total) {
    evidence.redFlags.push(`Value differential ~${valueDifferentialPct.toFixed(0)}%`)
  }
  if (prior >= 2) evidence.redFlags.push("Repeated trades between same managers this season")

  const ai = await runClaudeCollusionPrompt({ leagueId, evidence })
  if (ai?.redFlags?.length) {
    evidence.redFlags = [...new Set([...evidence.redFlags, ...ai.redFlags])]
  }

  const verdict = ai?.verdict ?? (valueDifferentialPct >= 35 ? "suspicious" : "clean")
  const confidence = ai?.confidence ?? (valueDifferentialPct >= 35 ? 0.55 : 0.2)
  const severity = ai?.severity ?? (valueDifferentialPct >= 40 ? "high" : valueDifferentialPct >= 25 ? "medium" : "low")

  const flags: CollusionScanResult["flags"] = []
  if (verdict === "suspicious" || verdict === "likely_collusion") {
    const summary = ai?.summary ?? "Trade shows a large market value imbalance between sides."
    const existing = await prisma.integrityFlag.findFirst({
      where: { leagueId, tradeTransactionId: trade.id, status: "open" },
    })
    if (!existing) {
      const row = await prisma.integrityFlag.create({
        data: {
          leagueId,
          flagType: "collusion",
          severity,
          status: "open",
          affectedRosterIds: [t1.id, t2.id],
          affectedTeamNames: [evidence.team1.teamName, evidence.team2.teamName],
          summary,
          evidenceJson: evidence as unknown as Prisma.InputJsonValue,
          aiConfidence: confidence,
          tradeTransactionId: trade.id,
        },
      })
      await notifyCommissionerOfFlag(row.id)
    }
    flags.push({ severity, confidence, summary, evidence })
  }

  await prisma.leagueIntegritySettings.upsert({
    where: { leagueId },
    create: { leagueId, lastCollusionScanAt: new Date() },
    update: { lastCollusionScanAt: new Date() },
  })

  return { leagueId, flags, scannedAt }
}

export async function fullLeagueCollusionScan(leagueId: string): Promise<CollusionScanResult> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const trades = await prisma.redraftLeagueTrade.findMany({
    where: {
      leagueId,
      status: "accepted",
      createdAt: { gte: since },
    },
    select: { id: true },
  })

  const flags: CollusionScanResult["flags"] = []
  let scannedAt = new Date().toISOString()
  for (const t of trades) {
    const dup = await prisma.integrityFlag.findFirst({
      where: { leagueId, tradeTransactionId: t.id },
    })
    if (dup) continue
    const r = await scanTradeForCollusion(leagueId, t.id)
    scannedAt = r.scannedAt
    flags.push(...r.flags)
  }
  return { leagueId, flags, scannedAt }
}
