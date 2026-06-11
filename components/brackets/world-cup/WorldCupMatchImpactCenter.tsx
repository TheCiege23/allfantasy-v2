"use client"

import { useState, useEffect, useMemo } from "react"
import { Target, Shield } from "lucide-react"
import { ChimmyFreshnessChip } from "./ChimmyFreshnessChip"
import type {
  WorldCupMatchView,
  WorldCupPickView,
  WorldCupScoringValues,
  WorldCupLeaderboardRow,
} from "@/lib/world-cup/types"
import { WORLD_CUP_ROUNDS } from "@/lib/world-cup/types"
import type { WorldCupDataTrustReport } from "@/lib/world-cup/worldCupDataTrustService"

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROUND_POINTS_KEY: Record<string, keyof WorldCupScoringValues> = {
  round_of_32: "roundOf32Points",
  round_of_16: "roundOf16Points",
  quarterfinal: "quarterFinalPoints",
  semifinal: "semiFinalPoints",
  third_place: "thirdPlacePoints",
  final: "finalPoints",
}

const ROUND_LABEL: Record<string, string> = {
  round_of_32: "Round of 32",
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  third_place: "Third Place",
  final: "Final",
}

function pointsForRound(round: string, scoring: WorldCupScoringValues): number {
  const key = ROUND_POINTS_KEY[round]
  if (!key) return 0
  const val = scoring[key]
  return typeof val === "number" && val > 0 ? val : 0
}

function roundOrder(round: string): number {
  return (WORLD_CUP_ROUNDS as readonly string[]).indexOf(round)
}

function formatSyncAgo(iso: string | null | undefined): string | null {
  if (!iso) return null
  const ageMs = Date.now() - new Date(iso).getTime()
  if (ageMs < 0) return null
  const m = Math.floor(ageMs / 60_000)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.floor(h / 24)}d ago`
}

function buildTrustChip(
  dt: WorldCupDataTrustReport | null
): { tier: string; label: string } | null {
  if (!dt) return null
  switch (dt.dataFreshness) {
    case "live": {
      const ago = formatSyncAgo(dt.lastScoreSyncAt)
      return { tier: "live", label: ago ? `Live · synced ${ago}` : "Live scores active" }
    }
    case "cached": {
      const ago = formatSyncAgo(dt.lastFixtureSyncAt)
      return { tier: "cached", label: ago ? `Cached · synced ${ago}` : "Updated within 24 hrs" }
    }
    case "schedule_only":
      return { tier: "schedule_only", label: "Schedule only" }
    case "pool_only":
      return { tier: "pool_only", label: "Pool data only" }
    default:
      return { tier: "none", label: "No data loaded" }
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchImpact = {
  matchId: string
  round: string
  matchLabel: string
  roundLabel: string
  homeTeamName: string
  awayTeamName: string
  rootFor: string
  worstResult: string
  pointsAtStake: number
  isChampionMatch: boolean
  championName: string | null
}

export type WorldCupMatchImpactCenterProps = {
  challengeId: string
  picks: WorldCupPickView[]
  matches: WorldCupMatchView[]
  scoring: WorldCupScoringValues
  userLeaderboardRow: WorldCupLeaderboardRow | null
  /** Total pool participant count — shown for context ("X people in this pool"). */
  poolParticipantCount?: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorldCupMatchImpactCenter({
  challengeId,
  picks,
  matches,
  scoring,
  userLeaderboardRow,
  poolParticipantCount,
}: WorldCupMatchImpactCenterProps) {
  const [dataTrust, setDataTrust] = useState<WorldCupDataTrustReport | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/brackets/world-cup/${challengeId}/data-trust`)
      .then((res) => (res.ok ? (res.json() as Promise<{ report?: WorldCupDataTrustReport }>) : null))
      .then((data) => {
        if (!cancelled && data?.report) setDataTrust(data.report)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [challengeId])

  const topImpact = useMemo<MatchImpact | null>(() => {
    const active = matches.filter(
      (m) =>
        (m.status === "scheduled" || m.status === "live" || m.status === "halftime") &&
        m.homeTeamId !== null &&
        m.awayTeamId !== null
    )

    const championTeamId = userLeaderboardRow?.championTeamId ?? null
    const championPickName = userLeaderboardRow?.championPickName ?? null

    const candidates: MatchImpact[] = []

    for (const match of active) {
      const pick = picks.find((p) => p.matchId === match.id)
      if (!pick?.selectedTeamId) continue

      const rootFor =
        pick.selectedTeamId === match.homeTeamId
          ? match.homeTeamName
          : pick.selectedTeamId === match.awayTeamId
            ? match.awayTeamName
            : null
      if (!rootFor) continue

      const pts = pointsForRound(match.round, scoring)
      if (pts <= 0) continue

      const worstResult =
        rootFor === match.homeTeamName ? match.awayTeamName : match.homeTeamName

      const isChampionMatch = Boolean(
        championTeamId &&
          (match.homeTeamId === championTeamId || match.awayTeamId === championTeamId)
      )

      candidates.push({
        matchId: match.id,
        round: match.round,
        matchLabel: `${match.homeTeamName} vs ${match.awayTeamName}`,
        roundLabel: ROUND_LABEL[match.round] ?? match.round,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        rootFor,
        worstResult,
        pointsAtStake: pts,
        isChampionMatch,
        championName: isChampionMatch ? championPickName : null,
      })
    }

    candidates.sort((a, b) => {
      // Finals/semis first
      const roundDiff = roundOrder(b.round) - roundOrder(a.round)
      if (roundDiff !== 0) return roundDiff
      // Champion match takes priority at same round
      if (a.isChampionMatch !== b.isChampionMatch) return b.isChampionMatch ? 1 : -1
      return b.pointsAtStake - a.pointsAtStake
    })

    return candidates[0] ?? null
  }, [picks, matches, scoring, userLeaderboardRow])

  if (!topImpact) return null

  const trustChip = buildTrustChip(dataTrust)

  return (
    <section
      data-testid="world-cup-match-impact-center"
      className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-amber-300/70" aria-hidden />
          <h3 className="text-sm font-black text-white">Why This Match Matters</h3>
        </div>
        {trustChip && (
          <ChimmyFreshnessChip tier={trustChip.tier} label={trustChip.label} />
        )}
      </div>

      {/* Match title */}
      <div
        className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3"
        data-testid="match-impact-match-title"
      >
        <p className="text-sm font-black text-white/95">{topImpact.matchLabel}</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          {topImpact.roundLabel}
        </p>
      </div>

      {/* Impact grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ImpactCell
          label="Root for"
          value={topImpact.rootFor}
          valueClass="text-emerald-300"
          testId="match-impact-root-for"
        />
        <ImpactCell
          label="Worst result"
          value={topImpact.worstResult}
          valueClass="text-rose-300/80"
          testId="match-impact-worst-result"
        />
        <ImpactCell
          label="Points at stake"
          value={`${topImpact.pointsAtStake} pts`}
          valueClass="text-amber-200/90"
          testId="match-impact-points"
        />
        {poolParticipantCount != null && poolParticipantCount > 1 && (
          <ImpactCell
            label="Pool size"
            value={`${poolParticipantCount} people`}
            valueClass="text-white/70"
          />
        )}
      </div>

      {/* Champion risk */}
      {topImpact.isChampionMatch && (
        <div
          className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2.5"
          data-testid="match-impact-champion-risk"
        >
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" aria-hidden />
          <p className="text-[11px] text-amber-200/90">
            <span className="font-bold">Champion risk:</span> Your champion{" "}
            <span className="font-semibold">{topImpact.championName}</span> is playing. A loss
            ends your champion bonus points.
          </p>
        </div>
      )}
    </section>
  )
}

function ImpactCell({
  label,
  value,
  valueClass,
  testId,
}: {
  label: string
  value: string
  valueClass?: string
  testId?: string
}) {
  return (
    <div
      className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
      data-testid={testId}
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-white/35">{label}</p>
      <p className={`mt-0.5 text-xs font-bold ${valueClass ?? "text-white/80"}`}>{value}</p>
    </div>
  )
}
