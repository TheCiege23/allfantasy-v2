"use client"
import Image from "next/image"
import { Check, Clock, Lock, Radio, Trophy, X } from "lucide-react"
import type { WorldCupMatchView, WorldCupPickView } from "@/lib/world-cup/types"
import {
  formatWorldCupKickoffShort,
  formatWorldCupMatchStatus,
  getWorldCupPickLiveState,
  isWorldCupMatchFinal,
  isWorldCupMatchLive,
} from "@/lib/world-cup/worldCupMatchStatus"
import {
  getWorldCupUnpickableReason,
  isWorldCupMatchPickable,
} from "@/lib/world-cup/worldCupProjectedBracket"

function isImageAsset(src?: string | null): src is string {
  return Boolean(src && (/^https?:\/\//i.test(src) || src.startsWith("/")))
}

function Logo({ src, name }: { src?: string | null; name: string }) {
  return isImageAsset(src) ? (
    <Image src={src} alt={`${name} flag`} width={28} height={28} className="h-7 w-7 shrink-0 rounded-full bg-white object-contain p-0.5" />
  ) : src ? (
    <span aria-label={`${name} flag`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">
      {src}
    </span>
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white/70">
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function formatLockTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export { formatWorldCupPlaceholder } from "@/lib/world-cup/worldCupBracketUtils"
import { formatWorldCupPlaceholder } from "@/lib/world-cup/worldCupBracketUtils"

export default function WorldCupMatchupCard({
  match,
  pick,
  locked,
  lockStrategy,
  tournamentLockAt,
  onPick,
  onOpenMatchupPicker,
}: {
  match: WorldCupMatchView
  pick?: WorldCupPickView
  locked?: boolean
  /** "per_match" | "tournament_start" */
  lockStrategy?: string
  /** ISO string — used when lockStrategy === "tournament_start" */
  tournamentLockAt?: string | null
  onPick?: (match: WorldCupMatchView, side: "home" | "away") => void
  onOpenMatchupPicker?: (matchId: string) => void
}) {
  const isLive = isWorldCupMatchLive(match)
  const isFinal = isWorldCupMatchFinal(match)
  const pickLiveState = getWorldCupPickLiveState(match, pick)
  const statusLabel = formatWorldCupMatchStatus(match)
  const showScore = isLive || isFinal
  const matchIsPickable = isWorldCupMatchPickable(match)
  const unpickableReason = matchIsPickable ? null : getWorldCupUnpickableReason(match)

  const teams = [
    { side: "home" as const, slotKey: match.homeSlotKey, teamId: match.homeTeamId, name: match.homeTeamName, logo: match.homeTeamLogo, score: match.homeScore },
    { side: "away" as const, slotKey: match.awaySlotKey, teamId: match.awayTeamId, name: match.awayTeamName, logo: match.awayTeamLogo, score: match.awayScore },
  ]

  // Derive human-readable lock hint
  let lockHint: string | null = null
  if (!locked) {
    if (lockStrategy === "tournament_start" && tournamentLockAt) {
      lockHint = `Locks ${formatLockTime(tournamentLockAt)}`
    } else if (lockStrategy === "per_match" || !lockStrategy) {
      if (match.startsAt) {
        lockHint = `Locks at kickoff · ${formatLockTime(match.startsAt as string)}`
      } else {
        lockHint = "Locks at kickoff"
      }
    }
  }

  const isScheduled = match.status === "scheduled"
  const isPostponed = match.status === "postponed"
  const isCancelled = match.status === "cancelled"
  const isSimulated = match.apiStatusShort === "SIM"
  const isTestFixture = match.apiStatusShort === "TEST"

  // Pick live state color helpers
  const pickStateBorderClass =
    pickLiveState === "correct" ? "border-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.12)]"
    : pickLiveState === "incorrect" ? "border-rose-400/30"
    : pickLiveState === "winning" ? "border-cyan-300/50"
    : pickLiveState === "losing" ? "border-rose-400/30"
    : "border-white/10"

  return (
    <article
      data-testid={`world-cup-match-${match.id}`}
      className={`w-72 shrink-0 rounded-lg border bg-zinc-950/80 p-3 shadow-2xl shadow-black/30 transition ${pickStateBorderClass}`}
    >
      {/* Header row — clicking opens guided picker */}
      <div
        className={`mb-2 flex items-center justify-between gap-2 ${onOpenMatchupPicker ? "cursor-pointer rounded hover:bg-white/[0.04] -mx-1 px-1 py-0.5 transition" : ""}`}
        onClick={onOpenMatchupPicker ? () => onOpenMatchupPicker(match.id) : undefined}
        role={onOpenMatchupPicker ? "button" : undefined}
        tabIndex={onOpenMatchupPicker ? 0 : undefined}
        onKeyDown={onOpenMatchupPicker ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenMatchupPicker(match.id) } } : undefined}
        aria-label={onOpenMatchupPicker ? `Open guided picker for match ${match.matchNumber}` : undefined}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
          Match {match.matchNumber}
        </span>
        <div className="flex items-center gap-1">
          {/* Live / HT status pill */}
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200">
              <Radio className="h-3 w-3" />
              {statusLabel}
            </span>
          )}
          {isFinal && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              Final
            </span>
          )}
          {isPostponed && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              Postponed
            </span>
          )}
          {isCancelled && (
            <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
              Cancelled
            </span>
          )}
          {isSimulated && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              Simulated
            </span>
          )}
          {isTestFixture && (
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-200">
              Test Fixture
            </span>
          )}
          {!matchIsPickable && !isFinal && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200" title={unpickableReason ?? "unknown"}>
              Not ready for picks
            </span>
          )}
          {/* Pick result badges */}
          {pickLiveState === "correct" && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
              <Check className="h-2.5 w-2.5" /> Correct
            </span>
          )}
          {pickLiveState === "incorrect" && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-400/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
              <X className="h-2.5 w-2.5" /> Incorrect
            </span>
          )}
          {locked && !isLive && !isFinal ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white/35">
              <Lock className="h-3 w-3" />
            </span>
          ) : null}
        </div>
      </div>

      {/* Score row — shown during / after match */}
      {showScore && (
        <div className="mb-2 flex items-center justify-center gap-2 text-center">
          <span className="text-xl font-black tabular-nums text-white">{match.homeScore ?? 0}</span>
          <span className="text-xs text-white/35">–</span>
          <span className="text-xl font-black tabular-nums text-white">{match.awayScore ?? 0}</span>
          {(match.homePenaltyScore !== null || match.awayPenaltyScore !== null) && (
            <span className="text-[10px] text-white/40">
              ({match.homePenaltyScore ?? 0}–{match.awayPenaltyScore ?? 0} pens)
            </span>
          )}
        </div>
      )}

      {/* Kickoff date — only before match */}
      {isScheduled && match.startsAt && (
        <div className="mb-2 text-center text-[10px] text-white/40">
          {formatWorldCupKickoffShort(match.startsAt)}
        </div>
      )}

      {/* Venue — small hint line */}
      {match.venueName && isScheduled && (
        <div className="mb-2 truncate text-center text-[10px] text-white/25">
          {match.venueName}{match.venueCity ? `, ${match.venueCity}` : ""}
        </div>
      )}

      {/* Team buttons */}
      <div className="space-y-2">
        {teams.map((t) => {
          const displayName = formatWorldCupPlaceholder(t.slotKey, t.name, t.teamId)
          const selected =
            pick?.selectedSlotKey === t.slotKey ||
            Boolean(pick?.selectedTeamId && t.teamId && pick.selectedTeamId === t.teamId)
          const winner =
            isFinal &&
            (match.winnerTeamName === t.name || Boolean(match.winnerTeamId && t.teamId === match.winnerTeamId))
          const isPlaceholder = !t.name || t.name.toLowerCase().startsWith("tbd") || !t.teamId

          // Live state color for individual team row
          const teamIsLeading = isLive && t.score !== null && (
            t.side === "home"
              ? (match.homeScore ?? 0) > (match.awayScore ?? 0)
              : (match.awayScore ?? 0) > (match.homeScore ?? 0)
          )

          return (
            <button
              key={t.side}
              type="button"
              data-testid={`world-cup-team-${match.id}-${t.side}`}
              aria-pressed={selected}
              disabled={locked || !matchIsPickable}
              onClick={() => locked || !matchIsPickable ? undefined : onPick?.(match, t.side)}
              title={locked ? "Picks are locked for this match" : !matchIsPickable ? "This matchup is not ready for picks yet" : undefined}
              className={[
                "flex h-14 w-full items-center gap-2 rounded-md border px-2 text-left transition",
                winner ? "border-emerald-300/70 bg-emerald-400/[0.08]"
                : selected && isFinal && !winner ? "border-rose-400/30 bg-rose-400/[0.06] opacity-60"
                : selected && isLive && pickLiveState === "winning" ? "border-cyan-300/60 bg-cyan-300/[0.08]"
                : selected && isLive && pickLiveState === "losing" ? "border-rose-400/30 bg-rose-400/[0.06]"
                : selected ? "border-cyan-300/70 bg-cyan-300/10"
                : teamIsLeading ? "border-white/20 bg-white/[0.06]"
                : "border-white/10 bg-white/[0.03]",
                locked || !matchIsPickable ? "cursor-not-allowed opacity-60" : "hover:bg-white/[0.06]",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Logo src={t.logo} name={displayName} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-bold ${isPlaceholder ? "italic text-white/40" : "text-white"}`}>
                  {displayName}
                </span>
                <span className="block truncate text-[10px] text-white/30">{t.slotKey}</span>
              </span>
              {showScore && t.score != null && (
                <span className={`text-sm font-black ${teamIsLeading ? "text-white" : "text-white/70"}`}>{t.score}</span>
              )}
              {selected && !locked && matchIsPickable && !winner && !isFinal && <Check className="h-4 w-4 shrink-0 text-cyan-200" />}
              {selected && locked && !winner && <Lock className="h-3.5 w-3.5 shrink-0 text-white/25" />}
              {winner && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase text-emerald-200">
                  <Trophy className="h-4 w-4" />
                  Winner
                </span>
              )}
              {selected && isFinal && !winner && <X className="h-3.5 w-3.5 shrink-0 text-rose-300/60" />}
            </button>
          )
        })}
      </div>

      {/* Lock hint / venue footer */}
      {lockHint && isScheduled && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-white/30">
          <Clock className="h-3 w-3" />
          {lockHint}
        </div>
      )}
    </article>
  )
}
