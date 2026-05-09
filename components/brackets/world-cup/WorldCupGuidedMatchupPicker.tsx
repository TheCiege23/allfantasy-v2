"use client"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Radio,
  Trophy,
  X,
} from "lucide-react"
import { WORLD_CUP_ROUND_LABELS } from "@/lib/world-cup/types"
import type { WorldCupMatchView, WorldCupPickView, WorldCupRound } from "@/lib/world-cup/types"
import {
  formatWorldCupKickoffShort,
  formatWorldCupMatchStatus,
  getWorldCupMatchDisplayScore,
  getWorldCupPickLiveState,
  isWorldCupMatchFinal,
  isWorldCupMatchLive,
} from "@/lib/world-cup/worldCupMatchStatus"
import {
  buildWorldCupProjectedMatches,
  countRemainingPicks,
  findFirstUnpickedMatch,
  findNextMatchInGuidedOrder,
  getWorldCupUnpickableReason,
  getInvalidDownstreamPickIds,
  hasWorldCupPickSelection,
  getOrderedRounds,
  isBracketComplete,
  isWorldCupMatchPickable,
} from "@/lib/world-cup/worldCupProjectedBracket"
import WorldCupMatchupIntelligencePanel from "@/components/brackets/world-cup/WorldCupMatchupIntelligencePanel"

// ── Types ─────────────────────────────────────────────────────────────────────

export type GuidedPickPayload = {
  activeEntryId: string
  matchId: string
  selectedTeamId: string | null
  selectedTeamName?: string | null
  selectedSlotKey: string | null
  selectedSide: "home" | "away"
  round: WorldCupRound
  sourceSlotKey?: string | null
  nextMatchId?: string | null
  nextMatchSlot?: "home" | "away" | null
  matchNumber?: number
}

type SaveState = "idle" | "saving" | "saved" | "error"

// ── Small helpers ─────────────────────────────────────────────────────────────

function TeamLogo({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={56}
        height={56}
        className="h-16 w-16 rounded-full bg-white object-contain p-0.5 sm:h-14 sm:w-14"
      />
    )
  }
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl font-black text-white/60 sm:h-14 sm:w-14 sm:text-lg">
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function formatMatchDate(iso: string | null): string {
  if (!iso) return "Time TBD"
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "Time TBD"
  }
}

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return ""
  return `${home} – ${away}`
}

// ── Team selection card ───────────────────────────────────────────────────────

function TeamCard({
  teamId,
  teamName,
  teamLogo,
  score,
  penaltyScore,
  isWinner,
  isPicked,
  isSaving,
  isLocked,
  matchStatus,
  pickState,
  aiStaged,
  onPick,
}: {
  teamId: string | null
  teamName: string
  teamLogo: string | null
  score: number | null
  penaltyScore: number | null
  isWinner: boolean
  isPicked: boolean
  isSaving: boolean
  isLocked: boolean
  matchStatus: string
  pickState?: "not_started" | "winning" | "drawing" | "losing" | "correct" | "incorrect" | "unknown"
  aiStaged?: boolean
  onPick: () => void
}) {
  const showScore = matchStatus === "live" || matchStatus === "halftime" || matchStatus === "final"
  const tbd = !teamId && teamName === "TBD"

  const winLabel = `Pick ${teamName} to win`
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={isLocked || isSaving || tbd || !teamId}
      aria-pressed={isPicked}
      aria-label={winLabel}
      className={[
        "relative flex min-h-[148px] w-full touch-manipulation flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-7 text-center transition-all active:scale-[0.98] sm:min-h-0 sm:gap-3 sm:px-6 sm:py-8",
        "disabled:cursor-not-allowed",
        pickState === "correct"
          ? "border-emerald-400 bg-emerald-400/[0.10] shadow-[0_0_32px_rgba(52,211,153,0.15)]"
          : pickState === "incorrect"
          ? "border-rose-400/40 bg-rose-400/[0.06] opacity-70"
          : pickState === "winning"
          ? "border-cyan-300 bg-cyan-300/[0.12] shadow-[0_0_32px_rgba(103,232,249,0.15)]"
          : pickState === "losing"
          ? "border-rose-400/30 bg-rose-400/[0.05]"
          : pickState === "drawing"
          ? "border-amber-300/40 bg-amber-300/[0.06]"
          : isPicked
          ? "border-cyan-300 bg-cyan-300/[0.12] shadow-[0_0_32px_rgba(103,232,249,0.15)]"
          : isWinner
          ? "border-emerald-400 bg-emerald-400/[0.08]"
          : tbd
          ? "border-white/5 bg-white/[0.02] opacity-50"
          : aiStaged
          ? "border-cyan-300/90 bg-cyan-300/[0.14] shadow-[0_0_28px_rgba(103,232,249,0.25)]"
          : isLocked
          ? "border-white/10 bg-white/[0.04] opacity-70"
          : "border-white/15 bg-white/[0.05] hover:border-white/30 hover:bg-white/[0.09]",
      ].join(" ")}
    >
      {pickState === "correct" && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400">
          <Check className="h-3.5 w-3.5 text-black" />
        </span>
      )}
      {pickState === "incorrect" && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose-400">
          <X className="h-3.5 w-3.5 text-black" />
        </span>
      )}
      {isPicked && !pickState?.startsWith("correct") && !pickState?.startsWith("incorrect") && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300">
          <Check className="h-3.5 w-3.5 text-black" />
        </span>
      )}
      {isWinner && !isPicked && pickState !== "correct" && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400">
          <Trophy className="h-3.5 w-3.5 text-black" />
        </span>
      )}

      <TeamLogo src={teamLogo} name={teamName} />
      <span className="hyphens-auto break-words px-1 text-lg font-black leading-tight text-white sm:text-xl">{teamName}</span>
      {showScore && (
        <span className="text-2xl font-black tabular-nums text-white/80">
          {score ?? 0}
          {penaltyScore !== null ? (
            <span className="ml-1 text-sm font-normal text-white/40">
              ({penaltyScore})
            </span>
          ) : null}
        </span>
      )}
      {tbd && (
        <span className="text-xs text-white/30">Awaiting result</span>
      )}
    </button>
  )
}

// ── Match status badge ────────────────────────────────────────────────────────

function MatchStatusBadge({ match }: { match: WorldCupMatchView }) {
  const label = formatWorldCupMatchStatus(match)
  const isLive = isWorldCupMatchLive(match)
  const isFinal = isWorldCupMatchFinal(match)
  if (isLive)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-200">
        <Radio className="h-3 w-3" /> {label}
      </span>
    )
  if (isFinal)
    return (
      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200">
        Final
      </span>
    )
  if (match.status === "postponed")
    return (
      <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
        Postponed
      </span>
    )
  return null
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  done,
  total,
  round,
  roundDone,
  roundTotal,
}: {
  done: number
  total: number
  round: WorldCupRound
  roundDone: number
  roundTotal: number
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span>
          {WORLD_CUP_ROUND_LABELS[round]} · {roundDone}/{roundTotal} picks
        </span>
        <span>{pct}% overall</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-300 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Complete state ────────────────────────────────────────────────────────────

function BracketCompleteView({
  champion,
  onClose,
  onReview,
}: {
  champion: WorldCupPickView | null
  onClose: () => void
  onReview: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-300/20">
        <Trophy className="h-10 w-10 text-amber-300" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-white">Bracket Complete!</h2>
        <p className="mt-2 text-sm text-white/50">
          You've picked every match.
        </p>
        {champion?.selectedTeamName && (
          <p className="mt-3 text-lg font-black text-amber-200">
            🏆 {champion.selectedTeamName}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReview}
          className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-bold text-white"
        >
          Review Bracket
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-black"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WorldCupGuidedMatchupPicker({
  challengeId,
  entryId,
  entryName,
  matches,
  picks: initialPicks,
  isOpen,
  initialMatchId,
  isLocked,
  entryIsComplete = null,
  lockAt = null,
  tournamentStartAt = null,
  includeThirdPlace = false,
  hasBracketBrainAi = false,
  onClose,
  onSavePick,
  onPicksUpdated,
}: {
  challengeId: string
  entryId: string
  entryName: string
  matches: WorldCupMatchView[]
  picks: WorldCupPickView[]
  isOpen: boolean
  initialMatchId?: string | null
  isLocked: boolean
  entryIsComplete?: boolean | null
  lockAt?: string | null
  tournamentStartAt?: string | null
  includeThirdPlace?: boolean
  /** AF Pro — enables Bracket Brain AI actions in matchup intelligence. */
  hasBracketBrainAi?: boolean
  onClose: () => void
  /** Called to persist a pick. Should throw on failure. */
  onSavePick: (
    payload: GuidedPickPayload,
    currentPicks: WorldCupPickView[],
    options?: { suppressToast?: boolean }
  ) => Promise<WorldCupPickView[]>
  /** Called after picks are successfully updated — lets the shell refresh its state. */
  onPicksUpdated?: (picks: WorldCupPickView[]) => void
}) {
  // Local picks mirror — updated on successful saves
  const [picks, setPicks] = useState<WorldCupPickView[]>(initialPicks)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showComplete, setShowComplete] = useState(false)

  // Sync external picks changes into local state
  useEffect(() => {
    setPicks(initialPicks)
  }, [initialPicks])

  const orderedRounds = useMemo(
    () => getOrderedRounds(matches, includeThirdPlace),
    [matches, includeThirdPlace]
  )

  // Projected matches (teams filled forward from picks)
  const projected = useMemo(
    () => buildWorldCupProjectedMatches(matches, picks),
    [matches, picks]
  )
  const pickableProjected = useMemo(
    () => projected.filter(isWorldCupMatchPickable),
    [projected]
  )
  const unpickableDebug = useMemo(
    () =>
      matches
        .filter((m) => !isWorldCupMatchPickable(m))
        .slice(0, 5)
        .map((m) => ({ matchNumber: m.matchNumber, reason: getWorldCupUnpickableReason(m) })),
    [matches]
  )
  const hasPickableMatchups = useMemo(
    () => pickableProjected.length > 0,
    [pickableProjected]
  )
  const projectedPickableMatchCount = pickableProjected.length
  const requiredPickableMatches = useMemo(
    () => pickableProjected.filter((m) => m.round !== "third_place" || includeThirdPlace),
    [pickableProjected, includeThirdPlace]
  )
  const totalRequired = requiredPickableMatches.length
  const totalPicked = useMemo(() => {
    const requiredMatchIds = new Set(requiredPickableMatches.map((m) => m.id))
    return picks.filter(
      (pick) => requiredMatchIds.has(pick.matchId) && hasWorldCupPickSelection(pick)
    ).length
  }, [requiredPickableMatches, picks])
  const remainingPickCount = useMemo(
    () => countRemainingPicks(pickableProjected, picks, includeThirdPlace),
    [pickableProjected, picks, includeThirdPlace]
  )
  const firstUnpickedMatch = useMemo(
    () => findFirstUnpickedMatch(pickableProjected, picks, orderedRounds),
    [pickableProjected, picks, orderedRounds]
  )
  const firstUnpickedMatchId = firstUnpickedMatch?.id ?? null
  const computedIsComplete =
    projectedPickableMatchCount > 0 &&
    totalPicked > 0 &&
    remainingPickCount === 0 &&
    isBracketComplete(pickableProjected, picks, includeThirdPlace)

  // Determine the current match to display
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(() => {
    if (initialMatchId) return initialMatchId
    const unpicked = findFirstUnpickedMatch(
      buildWorldCupProjectedMatches(matches, initialPicks).filter(isWorldCupMatchPickable),
      initialPicks,
      getOrderedRounds(matches, includeThirdPlace)
    )
    return unpicked?.id ?? null
  })

  // When opener changes initialMatchId (e.g. user clicked a specific match on the board)
  useEffect(() => {
    if (!isOpen) return
    if (initialMatchId) {
      const requested = projected.find((m) => m.id === initialMatchId)
      setCurrentMatchId(requested && isWorldCupMatchPickable(requested) ? initialMatchId : null)
      setShowComplete(false)
      return
    }
    if (firstUnpickedMatch) {
      setCurrentMatchId(firstUnpickedMatch.id)
      setShowComplete(false)
    } else {
      setCurrentMatchId(null)
      setShowComplete(computedIsComplete)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMatchId, projected, firstUnpickedMatch, computedIsComplete])

  // Detect completion
  useEffect(() => {
    setShowComplete(computedIsComplete)
  }, [computedIsComplete])

  const currentMatch = useMemo(
    () => projected.find((m) => m.id === currentMatchId) ?? null,
    [projected, currentMatchId]
  )

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const derivedTournamentStartAt =
      tournamentStartAt ??
      matches
        .map((match) => match.startsAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ??
      null

    console.debug("[WorldCupGuidedMatchupPicker:debug]", {
      activeEntryId: entryId,
      "activeEntry.picks.length": picks.length,
      completedPickCount: totalPicked,
      projectedPickableMatchCount,
      remainingPickCount,
      isComplete: computedIsComplete,
      entryIsCompleteFlag: entryIsComplete,
      firstUnpickedMatchId,
      bracketLocked: isLocked,
      lockAt,
      tournamentStartAt: derivedTournamentStartAt,
    })
  }, [
    computedIsComplete,
    entryId,
    entryIsComplete,
    firstUnpickedMatchId,
    isLocked,
    lockAt,
    matches,
    picks.length,
    projectedPickableMatchCount,
    remainingPickCount,
    totalPicked,
    tournamentStartAt,
  ])

  // Stats for header
  const roundMatches = useMemo(
    () =>
      currentMatch
        ? pickableProjected.filter((m) => m.round === currentMatch.round)
        : [],
    [pickableProjected, currentMatch]
  )
  const roundPickedCount = useMemo(
    () =>
      roundMatches.filter((m) =>
        picks.some((p) => p.matchId === m.id && hasWorldCupPickSelection(p))
      ).length,
    [roundMatches, picks]
  )

  // Navigation
  const canGoBack = useMemo(() => {
    if (!currentMatch) return false
    const sameRound = pickableProjected
      .filter((m) => m.round === currentMatch.round)
      .sort((a, b) => a.matchNumber - b.matchNumber)
    const idx = sameRound.findIndex((m) => m.id === currentMatch.id)
    if (idx > 0) return true
    const roundIdx = orderedRounds.indexOf(currentMatch.round)
    return roundIdx > 0
  }, [currentMatch, pickableProjected, orderedRounds])

  function goBack() {
    if (!currentMatch) return
    const sameRound = pickableProjected
      .filter((m) => m.round === currentMatch.round)
      .sort((a, b) => a.matchNumber - b.matchNumber)
    const idx = sameRound.findIndex((m) => m.id === currentMatch.id)
    if (idx > 0) {
      setCurrentMatchId(sameRound[idx - 1].id)
      return
    }
    const roundIdx = orderedRounds.indexOf(currentMatch.round)
    if (roundIdx > 0) {
      const prevRound = orderedRounds[roundIdx - 1]
      const prevRoundMatches = pickableProjected
        .filter((m) => m.round === prevRound)
        .sort((a, b) => a.matchNumber - b.matchNumber)
      if (prevRoundMatches.length > 0) {
        setCurrentMatchId(prevRoundMatches[prevRoundMatches.length - 1].id)
      }
    }
  }

  function goToNext(afterMatchId: string, updatedPicks: WorldCupPickView[]) {
    const nextProjected = buildWorldCupProjectedMatches(matches, updatedPicks)
    const nextPickableProjected = nextProjected.filter(isWorldCupMatchPickable)
    const nextMatch = findNextMatchInGuidedOrder(
      afterMatchId,
      nextPickableProjected,
      updatedPicks,
      orderedRounds
    )
    if (nextMatch) {
      setCurrentMatchId(nextMatch.id)
    } else {
      const requiredMatchIds = new Set(
        nextPickableProjected
          .filter((m) => m.round !== "third_place" || includeThirdPlace)
          .map((m) => m.id)
      )
      const nextPickedCount = updatedPicks.filter(
        (pick) => requiredMatchIds.has(pick.matchId) && hasWorldCupPickSelection(pick)
      ).length
      const nextRemainingCount = countRemainingPicks(
        nextPickableProjected,
        updatedPicks,
        includeThirdPlace
      )
      setCurrentMatchId(null)
      setShowComplete(
        nextPickableProjected.length > 0 &&
          nextPickedCount > 0 &&
          nextRemainingCount === 0 &&
          isBracketComplete(nextPickableProjected, updatedPicks, includeThirdPlace)
      )
    }
  }

  // ── Pick handler ───────────────────────────────────────────────────────
  const handlePick = useCallback(
    async (side: "home" | "away") => {
      if (!currentMatch || isLocked || saveState === "saving") return
      const selectedTeamId =
        side === "home" ? currentMatch.homeTeamId : currentMatch.awayTeamId
      const selectedSlotKey =
        side === "home" ? currentMatch.homeSlotKey : currentMatch.awaySlotKey
      const selectedTeamName =
        side === "home" ? currentMatch.homeTeamName : currentMatch.awayTeamName
      if (!selectedSlotKey || !selectedTeamId || !isWorldCupMatchPickable(currentMatch)) {
        setSaveState("error")
        setSaveError("This matchup is not ready for picks yet.")
        return
      }

      // Find invalid downstream picks we need to clear locally
      const invalidIds = getInvalidDownstreamPickIds(
        projected,
        picks,
        currentMatch.id,
        selectedTeamId
      )

      // Optimistic local update — apply new pick and clear invalids
      const optimistic: WorldCupPickView = {
        id: `optimistic-${currentMatch.id}`,
        matchId: currentMatch.id,
        round: currentMatch.round,
        selectedTeamId,
        selectedSlotKey,
        selectedTeamName,
        pointsAwarded: 0,
        isCorrect: null,
        lockedAt: null,
      }

      const optimisticPicks: WorldCupPickView[] = [
        ...picks.filter(
          (p) =>
            p.matchId !== currentMatch.id &&
            !invalidIds.includes(p.id)
        ),
        optimistic,
      ]

      setPicks(optimisticPicks)
      setSaveState("saving")
      setSaveError(null)

      try {
        const payload: GuidedPickPayload = {
          activeEntryId: entryId,
          matchId: currentMatch.id,
          selectedTeamId,
          selectedTeamName,
          selectedSlotKey,
          selectedSide: side,
          round: currentMatch.round,
          sourceSlotKey: selectedSlotKey,
          nextMatchId: currentMatch.nextMatchId,
          nextMatchSlot: currentMatch.nextMatchSlot,
          matchNumber: currentMatch.matchNumber,
        }
        // onSavePick returns the updated picks array from the server
        const serverPicks = await onSavePick(payload, picks)
        setPicks(serverPicks)
        onPicksUpdated?.(serverPicks)
        setSaveState("saved")

        // Auto-advance after short visual feedback
        setTimeout(() => {
          setSaveState("idle")
          goToNext(currentMatch.id, serverPicks)
        }, 400)
      } catch (err) {
        // Roll back optimistic update
        setPicks(picks)
        setSaveState("error")
        setSaveError(err instanceof Error ? err.message : "Failed to save pick")
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentMatch, entryId, isLocked, saveState, picks, projected, orderedRounds]
  )

  // Trap focus & keyboard navigation
  const modalRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const pick = currentMatch
    ? picks.find((p) => p.matchId === currentMatch.id && hasWorldCupPickSelection(p)) ?? null
    : null
  const champion = picks.find((p) => p.round === "final" && hasWorldCupPickSelection(p)) ?? null
  const guardedShowComplete = showComplete && computedIsComplete
  const headerTitle =
    isLocked
      ? "Bracket Locked"
      : projectedPickableMatchCount === 0
        ? "Fixtures Not Ready"
        : showComplete && totalPicked === 0
          ? "Start Making Picks"
          : guardedShowComplete
            ? "Bracket Complete"
            : currentMatch
              ? WORLD_CUP_ROUND_LABELS[currentMatch.round]
              : totalPicked === 0
                ? "Start Making Picks"
                : "Guided Picks"

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Guided Matchup Picker"
      className="fixed inset-0 z-[80] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#05070b] pt-[env(safe-area-inset-top)] text-white"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-zinc-950/95 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/35">
              {entryName}
            </p>
            <h1 className="truncate text-sm font-black text-white sm:text-base">
              {headerTitle}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-white/40">
            <span className="tabular-nums">
              {totalPicked}/{totalRequired}
            </span>
          </div>
          <button
            type="button"
            data-testid="world-cup-guided-close"
            onClick={onClose}
            className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/80 hover:text-white"
            aria-label="Close guided picker"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {currentMatch && !guardedShowComplete && (
          <div className="mt-2">
            <ProgressBar
              done={totalPicked}
              total={totalRequired}
              round={currentMatch.round}
              roundDone={roundPickedCount}
              roundTotal={roundMatches.length}
            />
          </div>
        )}
        {saveError && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {saveError}
          </div>
        )}
        {isLocked && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/50">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            This bracket is locked. Picks can no longer be changed.
          </div>
        )}
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {guardedShowComplete ? (
          <BracketCompleteView
            champion={champion}
            onClose={onClose}
            onReview={() => setShowComplete(false)}
          />
        ) : currentMatch ? (
          <MatchView
            match={currentMatch}
            pick={pick}
            saveState={saveState}
            isLocked={isLocked}
            onPick={handlePick}
            challengeId={challengeId}
            entryId={entryId}
            hasBracketBrainAi={hasBracketBrainAi}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-sm text-white/40">
            <Clock className="h-8 w-8" />
            <p>
              {hasPickableMatchups
                ? "Teams for this round will appear once earlier matches are picked."
                : "Fixtures are loaded, but real team matchups are not resolved yet."}
            </p>
            {!hasPickableMatchups && unpickableDebug.length > 0 && (
              <p className="max-w-xl text-[11px] text-white/35">
                Debug: {unpickableDebug.map((item) => `M${item.matchNumber}:${item.reason}`).join(" · ")}
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/[0.06] px-5 py-2.5 text-sm font-bold text-white/70"
            >
              Close
            </button>
          </div>
        )}
      </main>

      {/* ── Footer nav ────────────────────────────────────────────────────── */}
      {!guardedShowComplete && currentMatch && !isLocked && (
        <footer className="shrink-0 border-t border-white/10 bg-zinc-950/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2.5 sm:px-4 sm:pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="order-2 grid grid-cols-2 gap-2 sm:order-1 sm:flex sm:flex-1 sm:justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={!canGoBack || saveState === "saving"}
                className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs font-bold text-white/70 disabled:opacity-30 sm:min-h-0 sm:px-4 sm:py-2"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                Back
              </button>

              <button
                type="button"
                onClick={() => goToNext(currentMatch.id, picks)}
                disabled={saveState === "saving"}
                className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs font-bold text-white/70 disabled:opacity-30 sm:min-h-0 sm:px-4 sm:py-2"
              >
                Skip
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            </div>

            <div
              className="order-1 text-center text-[10px] leading-snug text-white/35 sm:order-2 sm:flex-1 sm:px-2"
              data-testid="world-cup-guided-footer-context"
            >
              Match {currentMatch.matchNumber}
              {currentMatch.startsAt ? (
                <span className="mt-0.5 block sm:ml-1 sm:mt-0 sm:inline">
                  {formatMatchDate(currentMatch.startsAt)}
                </span>
              ) : null}
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

// ── Match content view ────────────────────────────────────────────────────────

function MatchView({
  match,
  pick,
  saveState,
  isLocked,
  onPick,
  challengeId,
  entryId,
  hasBracketBrainAi,
}: {
  match: WorldCupMatchView
  pick: WorldCupPickView | null
  saveState: SaveState
  isLocked: boolean
  onPick: (side: "home" | "away") => void
  challengeId: string
  entryId: string
  hasBracketBrainAi: boolean
}) {
  const isSaving = saveState === "saving"
  const isFinal = isWorldCupMatchFinal(match)
  const isLive = isWorldCupMatchLive(match)
  const showScore = isLive || isFinal
  const pickLiveState = getWorldCupPickLiveState(match, pick)
  const scoreStr = showScore ? getWorldCupMatchDisplayScore(match) : null

  const homePickState = pick?.selectedTeamId === match.homeTeamId ||
    (pick?.selectedSlotKey && pick.selectedSlotKey === match.homeSlotKey)
    ? pickLiveState : "not_started"
  const awayPickState = pick?.selectedTeamId === match.awayTeamId ||
    (pick?.selectedSlotKey && pick.selectedSlotKey === match.awaySlotKey)
    ? pickLiveState : "not_started"

  const [stagedSide, setStagedSide] = useState<"home" | "away" | null>(null)
  useEffect(() => {
    setStagedSide(null)
  }, [match.id])

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:py-10">
      {/* Match meta */}
      <div className="flex flex-col items-center gap-2 text-center">
        <MatchStatusBadge match={match} />
        {scoreStr && (
          <div className="text-3xl font-black tabular-nums text-white">{scoreStr}</div>
        )}
        {match.startsAt && match.status === "scheduled" && (
          <div className="flex items-center gap-1.5 text-sm text-white/45">
            <Clock className="h-3.5 w-3.5" />
            {formatWorldCupKickoffShort(match.startsAt)}
          </div>
        )}
        {match.venueName && (
          <div className="text-xs text-white/30">
            {match.venueName}{match.venueCity ? `, ${match.venueCity}` : ""}
          </div>
        )}
        {isSaving && (
          <div className="text-xs text-cyan-300">Saving…</div>
        )}
        {saveState === "saved" && (
          <div
            className="flex flex-col items-center gap-1 text-xs text-emerald-300"
            data-testid="world-cup-guided-next-transition"
          >
            <span className="flex items-center gap-1 font-bold">
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> Saved
            </span>
            <span className="text-[11px] font-semibold text-emerald-200/90">Next matchup…</span>
          </div>
        )}
      </div>

      {/* vs. divider */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:gap-4">
        <TeamCard
          teamId={match.homeTeamId}
          teamName={match.homeTeamName || "TBD"}
          teamLogo={match.homeTeamLogo}
          score={match.homeScore}
          penaltyScore={match.homePenaltyScore}
          isWinner={isFinal && match.winnerTeamId === match.homeTeamId}
          isPicked={
            pick !== null &&
            (pick.selectedTeamId === match.homeTeamId ||
              (pick.selectedSlotKey !== null &&
                pick.selectedSlotKey === match.homeSlotKey))
          }
          isSaving={isSaving}
          isLocked={isLocked || isFinal}
          matchStatus={match.status}
          pickState={homePickState as "not_started" | "winning" | "drawing" | "losing" | "correct" | "incorrect" | "unknown"}
          aiStaged={stagedSide === "home"}
          onPick={() => onPick("home")}
        />

        <div className="flex shrink-0 items-center justify-center">
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-black text-white/25">
            VS
          </span>
        </div>

        <TeamCard
          teamId={match.awayTeamId}
          teamName={match.awayTeamName || "TBD"}
          teamLogo={match.awayTeamLogo}
          score={match.awayScore}
          penaltyScore={match.awayPenaltyScore}
          isWinner={isFinal && match.winnerTeamId === match.awayTeamId}
          isPicked={
            pick !== null &&
            (pick.selectedTeamId === match.awayTeamId ||
              (pick.selectedSlotKey !== null &&
                pick.selectedSlotKey === match.awaySlotKey))
          }
          isSaving={isSaving}
          isLocked={isLocked || isFinal}
          matchStatus={match.status}
          pickState={awayPickState as "not_started" | "winning" | "drawing" | "losing" | "correct" | "incorrect" | "unknown"}
          aiStaged={stagedSide === "away"}
          onPick={() => onPick("away")}
        />
      </div>

      {/* Pick hint */}
      {!isLocked && !isFinal && !pick && (
        <p className="text-center text-xs text-white/35">
          Tap a team to select the winner
        </p>
      )}
      {!isWorldCupMatchPickable(match) && (
        <p className="text-center text-xs text-amber-200/90">
          This matchup is not ready for picks yet.
        </p>
      )}
      {pick && !isLocked && !isFinal && (
        <p className="text-center text-xs text-white/35">
          Tap the other team to change your pick
        </p>
      )}
      {(isLocked || isFinal) && (
        <p className="text-center text-xs text-white/30">
          {isFinal ? "This match has ended." : "Picks are locked for this match."}
        </p>
      )}

      {/* Matchup intelligence — scroll-contained on small screens so team picks stay primary */}
      {!isFinal && (
        <div className="max-sm:-mx-1 sm:mx-0">
          <WorldCupMatchupIntelligencePanel
            challengeId={challengeId}
            entryId={entryId}
            matchId={match.id}
            homeName={match.homeTeamName || match.homeSlotKey}
            awayName={match.awayTeamName || match.awaySlotKey}
            disabled={isLocked}
            hasBracketBrainAi={hasBracketBrainAi}
            stagedSide={stagedSide}
            onStageSide={setStagedSide}
            onUseThisPick={(side) => {
              void onPick(side)
            }}
          />
        </div>
      )}
    </div>
  )
}
