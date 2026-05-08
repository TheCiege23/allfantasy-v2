"use client"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Bot, Check, ChevronLeft, ClipboardList, Loader2, PlayCircle, RefreshCw, Share2, Sparkles, Trophy, Users } from "lucide-react"
import { toast } from "sonner"
import type { WorldCupAiBuilderProgress, WorldCupAiStrategy, WorldCupChallengeView, WorldCupMatchView, WorldCupPickView } from "@/lib/world-cup/types"
import { isWorldCupChallengeLocked } from "@/lib/world-cup/worldCupBracketBuilder"
import type {
  WorldCupBracketEntryClient,
  WorldCupChallengeIntegrityReport,
  WorldCupAdminSyncProvider,
  WorldCupAdminSyncTeamsResult,
  WorldCupAdminSyncFixturesResult,
  WorldCupAdminSyncLiveResult,
  WorldCupAdminSimulationStrategy,
} from "@/lib/world-cup/worldCupClientApi"
import {
  adminResetWorldCupSimulation,
  adminSimulateWorldCupMatch,
  adminSimulateWorldCupRound,
  adminSimulateWorldCupTournament,
  adminSyncWorldCupFixtures,
  adminSyncWorldCupLive,
  adminSyncWorldCupTeams,
  clearWorldCupBracketEntryPicks,
  createWorldCupBracketEntry,
  deleteWorldCupBracketEntry,
  getWorldCupIntegrityReport,
  listWorldCupBracketEntries,
  renameWorldCupBracketEntry,
  saveWorldCupBracketEntryPick,
} from "@/lib/world-cup/worldCupClientApi"
import {
  countRemainingPicks,
  getInvalidDownstreamPickIds,
} from "@/lib/world-cup/worldCupProjectedBracket"
import {
  buildWorldCupProjectedMatches,
  getOrderedRounds,
} from "@/lib/world-cup/worldCupProjectedBracket"
import { getWorldCupPickRecommendation } from "@/lib/world-cup/worldCupAiInsights"
import WorldCupBracketBoard from "./WorldCupBracketBoard"
import WorldCupBracketHealthCard from "./WorldCupBracketHealthCard"
import WorldCupEntryDashboard from "./WorldCupEntryDashboard"
import type { GuidedPickPayload } from "./WorldCupGuidedMatchupPicker"
import WorldCupGuidedMatchupPicker from "./WorldCupGuidedMatchupPicker"
import WorldCupInvitePanel from "./WorldCupInvitePanel"
import WorldCupLeaderboard from "./WorldCupLeaderboard"
import WorldCupLeaderboardInsights from "./WorldCupLeaderboardInsights"
import WorldCupLiveScoreTicker from "./WorldCupLiveScoreTicker"
type Tab = "picks" | "leaderboard" | "rules" | "invite"
const TABS: Array<{ id: Tab; label: string; icon: typeof ClipboardList }> = [{ id: "picks", label: "Picks", icon: ClipboardList }, { id: "leaderboard", label: "Leaderboard", icon: Trophy }, { id: "rules", label: "Rules", icon: Users }, { id: "invite", label: "Invite", icon: Share2 }]
function normalizeWorldCupView(input: WorldCupChallengeView | (Partial<WorldCupChallengeView> & { id?: string; name?: string }) | undefined): WorldCupChallengeView {
  const raw = input as any
  if (raw?.challenge) return raw as WorldCupChallengeView
  return {
    challenge: {
      id: raw?.id ?? "",
      name: raw?.name ?? "World Cup Bracket",
      ownerUserId: raw?.ownerUserId ?? "",
      seasonYear: raw?.seasonYear ?? 2026,
      inviteCode: raw?.inviteCode ?? "",
      inviteUrl: raw?.inviteUrl ?? null,
      visibility: raw?.visibility ?? "private",
      pickLockStrategy: raw?.pickLockStrategy ?? "tournament_start",
      pickLockAt: raw?.pickLockAt ?? null,
      maxParticipants: raw?.maxParticipants ?? 100,
      maxEntriesPerParticipant: raw?.maxEntriesPerParticipant ?? 5,
      effectivePickLockAt: raw?.effectivePickLockAt ?? null,
      status: raw?.status ?? "open",
      includeThirdPlace: Boolean(raw?.includeThirdPlace),
      isTestMode: Boolean(raw?.isTestMode),
      simulationEnabled: Boolean(raw?.simulationEnabled),
      simulatedAt: raw?.simulatedAt ?? null,
      simulationStatus: raw?.simulationStatus ?? null,
      hasSimulatedResults: Boolean(raw?.hasSimulatedResults),
      lastSyncedAt: raw?.lastSyncedAt ?? null,
      createdAt: raw?.createdAt ?? new Date().toISOString(),
      updatedAt: raw?.updatedAt ?? new Date().toISOString(),
    },
    scoring: raw?.scoring ?? {
      roundOf32Points: 10,
      roundOf16Points: 20,
      quarterFinalPoints: 40,
      semiFinalPoints: 80,
      finalPoints: 160,
      championBonusPoints: 320,
      thirdPlacePoints: 4,
    },
    slots: raw?.slots ?? [],
    matches: raw?.matches ?? [],
    participant: raw?.participant ?? null,
    activeEntry: raw?.activeEntry ?? null,
    entries: raw?.entries ?? [],
    picks: raw?.picks ?? [],
    leaderboard: raw?.leaderboard ?? [],
    isOwner: Boolean(raw?.isOwner),
    isAdmin: Boolean(raw?.isAdmin),
  }
}

export default function WorldCupBracketShell({ initialView, challenge, defaultTab = "picks" }: { initialView?: WorldCupChallengeView; challenge?: WorldCupChallengeView | any; defaultTab?: Tab }) {
  const normalizedInitialView = normalizeWorldCupView(initialView ?? challenge)
  const [view, setView] = useState(normalizedInitialView)
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "locked">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Entry state ──────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<WorldCupBracketEntryClient[]>([])
  const [entriesLoaded, setEntriesLoaded] = useState(false)
  const [isEntriesLoading, setIsEntriesLoading] = useState(false)
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)
  const [isMutatingEntry, setIsMutatingEntry] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  // Picks per-entry: keyed by entryId → array of picks
  const [entryPicks, setEntryPicks] = useState<Record<string, WorldCupPickView[]>>({})

  // ── Guided picker state ──────────────────────────────────────────────────
  const [isGuidedPickerOpen, setIsGuidedPickerOpen] = useState(false)
  const [guidedInitialMatchId, setGuidedInitialMatchId] = useState<string | null>(null)

  // ── AI builder state ─────────────────────────────────────────────────────
  const [aiBuilder, setAiBuilder] = useState<WorldCupAiBuilderProgress>({
    state: "idle", current: 0, total: 0, message: "",
  })
  const [integrityReport, setIntegrityReport] = useState<WorldCupChallengeIntegrityReport | null>(null)
  const [isIntegrityLoading, setIsIntegrityLoading] = useState(false)

  // ── Admin sync state ────────────────────────────────────────────────────
  const [syncProvider, setSyncProvider] = useState<WorldCupAdminSyncProvider>("mock")
  const [syncDryRun, setSyncDryRun] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncTeamsResult, setSyncTeamsResult] = useState<WorldCupAdminSyncTeamsResult | null>(null)
  const [syncFixturesResult, setSyncFixturesResult] = useState<WorldCupAdminSyncFixturesResult | null>(null)
  const [syncLiveResult, setSyncLiveResult] = useState<WorldCupAdminSyncLiveResult | null>(null)
  const [simulationStrategy, setSimulationStrategy] = useState<WorldCupAdminSimulationStrategy>("random")
  const [simulationDryRun, setSimulationDryRun] = useState(false)
  const [simulationMatchId, setSimulationMatchId] = useState<string>("")
  const [simulationResult, setSimulationResult] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isSavingSimulationMode, setIsSavingSimulationMode] = useState(false)
  const aiBuildAbortRef = useRef(false)

  const challengeId = view.challenge.id

  const refreshChallengeView = useCallback(async () => {
    const latest = await fetch(`/api/brackets/world-cup/${challengeId}`)
    if (!latest.ok) return
    const data = await latest.json()
    const nextView = normalizeWorldCupView(data.view ?? data.challenge ?? data)
    setView(nextView)
  }, [challengeId])
  // Selected entry object
  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  )

  const lockState = useMemo(
    () =>
      isWorldCupChallengeLocked({
        challenge: view.challenge,
        matches: view.matches,
        entry: selectedEntry,
      }),
    [selectedEntry, view.challenge, view.matches]
  )
  const isLocked = lockState.locked
  // Picks for the selected entry (fall back to initial view picks for first entry)
  const picks: WorldCupPickView[] = useMemo(() => {
    if (!selectedEntryId) return []
    return entryPicks[selectedEntryId] ?? []
  }, [selectedEntryId, entryPicks])

  const progress = useMemo(
    () => ({ done: picks.length, required: view.matches.length }),
    [picks.length, view.matches.length]
  )
  const hasPickableFixtures = view.matches.length > 0

  // ── Load entries on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!challengeId || entriesLoaded) return
    setIsEntriesLoading(true)
    listWorldCupBracketEntries(challengeId)
      .then((rows) => {
        setEntries(rows)
        setEntriesLoaded(true)
        // Seed initial view picks for first entry if available
        if (rows.length > 0) {
          const first = rows[0]
          setSelectedEntryId(first.id)
          if (normalizedInitialView.picks.length > 0) {
            setEntryPicks((prev) => ({ ...prev, [first.id]: normalizedInitialView.picks }))
          }
        }
      })
      .catch(() => toast.error("Failed to load bracket entries"))
      .finally(() => setIsEntriesLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId])

  // ── Entry management callbacks ───────────────────────────────────────────
  const handleCreateEntry = useCallback(async () => {
    setIsCreatingEntry(true)
    try {
      const entry = await createWorldCupBracketEntry(challengeId)
      setEntries((prev) => [...prev, entry])
      setSelectedEntryId(entry.id)
      toast.success(`Created "${entry.name}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bracket")
    } finally {
      setIsCreatingEntry(false)
    }
  }, [challengeId])

  const handleSelectEntry = useCallback((entryId: string) => {
    setSelectedEntryId(entryId)
  }, [])

  const handleRenameEntry = useCallback(
    async (entryId: string, name: string) => {
      setIsMutatingEntry(true)
      try {
        const updated = await renameWorldCupBracketEntry(challengeId, entryId, name)
        setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, name: updated.name } : e)))
        toast.success(`Renamed to "${updated.name}"`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to rename")
      } finally {
        setIsMutatingEntry(false)
      }
    },
    [challengeId]
  )

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      setIsMutatingEntry(true)
      try {
        await deleteWorldCupBracketEntry(challengeId, entryId)
        setEntries((prev) => {
          const next = prev.filter((e) => e.id !== entryId)
          if (selectedEntryId === entryId) {
            setSelectedEntryId(next[0]?.id ?? null)
          }
          return next
        })
        setEntryPicks((prev) => {
          const next = { ...prev }
          delete next[entryId]
          return next
        })
        toast.success("Bracket deleted")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete bracket")
      } finally {
        setIsMutatingEntry(false)
      }
    },
    [challengeId, selectedEntryId]
  )

  // ── Pick saving ──────────────────────────────────────────────────────────
  async function persistPick(match: WorldCupMatchView, side: "home" | "away") {
    if (!selectedEntryId) {
      toast.error("Select a bracket entry first")
      return
    }
    if (isLocked) {
      toast.error("Bracket picks are locked")
      return
    }
    const currentPicks = entryPicks[selectedEntryId] ?? []
    const selectedTeamId = side === "home" ? match.homeTeamId : match.awayTeamId
    const selectedSlotKey = side === "home" ? match.homeSlotKey : match.awaySlotKey
    const selectedTeamName = side === "home" ? match.homeTeamName : match.awayTeamName
    const invalidIds = getInvalidDownstreamPickIds(
      view.matches,
      currentPicks,
      match.id,
      selectedTeamId
    )
    const invalidMatchIds = invalidIds
      .map((id) => currentPicks.find((p) => p.id === id)?.matchId)
      .filter((mid): mid is string => mid !== undefined)

    // Optimistic update
    const optimistic: WorldCupPickView = {
      id: `optimistic-${match.id}`,
      matchId: match.id,
      round: match.round,
      selectedTeamId,
      selectedSlotKey,
      selectedTeamName,
      pointsAwarded: 0,
      isCorrect: null,
      lockedAt: null,
    }
    setEntryPicks((prev) => ({
      ...prev,
      [selectedEntryId]: [
        ...(prev[selectedEntryId] ?? []).filter((p) => p.matchId !== match.id && !invalidIds.includes(p.id)),
        optimistic,
      ],
    }))
    setSaveState("saving")
    setSaveError(null)

    try {
      if (invalidMatchIds.length > 0) {
        await clearWorldCupBracketEntryPicks(challengeId, selectedEntryId, invalidMatchIds)
      }

      const result = await saveWorldCupBracketEntryPick(challengeId, selectedEntryId, {
        matchId: match.id,
        selectedTeamId,
        selectedSlotKey,
        selectedSide: side,
      })

      // Refresh the full view for leaderboard / scoring updates
      const latest = await fetch(`/api/brackets/world-cup/${challengeId}`)
      if (latest.ok) {
        const data = await latest.json()
        const nextView = normalizeWorldCupView(data.view ?? data.challenge ?? data)
        setView(nextView)
      }

      // Update entry in local list if returned
      if (result.entry) {
        setEntries((prev) =>
          prev.map((e) => (e.id === selectedEntryId ? (result.entry as WorldCupBracketEntryClient) : e))
        )
      }

      // Replace optimistic picks with actual picks from response
      const returnedPicks = Array.isArray(result.picks) ? result.picks : []
      if (returnedPicks.length > 0) {
        setEntryPicks((prev) => ({
          ...prev,
          [selectedEntryId]: returnedPicks as WorldCupPickView[],
        }))
      }

      setSaveState("saved")
      if (invalidMatchIds.length > 0) {
        toast.success(`Updated pick and cleared ${invalidMatchIds.length} downstream pick${invalidMatchIds.length === 1 ? "" : "s"}.`)
      } else {
        toast.success("Updated pick")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save"
      if (msg.toLowerCase().includes("locked")) {
        setSaveState("locked")
        setSaveError("This pick is locked — the match has already started.")
        // Roll back optimistic pick
        setEntryPicks((prev) => ({
          ...prev,
          [selectedEntryId]: (prev[selectedEntryId] ?? []).filter(
            (p) => p.id !== optimistic.id
          ),
        }))
      } else {
        setSaveState("error")
        setSaveError(msg)
        // Roll back optimistic pick
        setEntryPicks((prev) => ({
          ...prev,
          [selectedEntryId]: (prev[selectedEntryId] ?? []).filter(
            (p) => p.id !== optimistic.id
          ),
        }))
      }
    }
  }

  function runOwnerAction(action: "sync" | "recalculate") {
    startTransition(async () => {
      const res =
        action === "sync"
          ? await fetch("/api/brackets/world-cup/sync", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ challengeId }),
            })
          : await fetch(`/api/brackets/world-cup/${challengeId}/recalculate`, {
              method: "POST",
            })
      if (res.ok) {
        const latest = await fetch(`/api/brackets/world-cup/${challengeId}`)
        if (latest.ok) {
          const data = await latest.json()
          const nextView = normalizeWorldCupView(data.view ?? data.challenge ?? data)
          setView(nextView)
        }
      }
    })
  }

  const runIntegrityCheck = useCallback(async () => {
    setIsIntegrityLoading(true)
    try {
      const report = await getWorldCupIntegrityReport(challengeId)
      setIntegrityReport(report)
      if (report.ok) {
        toast.success("Integrity check passed")
      } else {
        toast.error(`Integrity check found ${report.errors.length} error(s)`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Integrity check failed")
    } finally {
      setIsIntegrityLoading(false)
    }
  }, [challengeId])

  const runSyncTeams = useCallback(async () => {
    setIsSyncing(true)
    setSyncTeamsResult(null)
    try {
      const result = await adminSyncWorldCupTeams({ provider: syncProvider, dryRun: syncDryRun })
      setSyncTeamsResult(result)
      toast.success(
        syncDryRun
          ? `Dry run: ${result.created + result.updated} team(s) would be synced`
          : `Synced ${result.created} created, ${result.updated} updated`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync teams failed")
    } finally {
      setIsSyncing(false)
    }
  }, [challengeId, syncProvider, syncDryRun])

  const runSyncFixtures = useCallback(async () => {
    setIsSyncing(true)
    setSyncFixturesResult(null)
    try {
      const result = await adminSyncWorldCupFixtures(challengeId, { provider: syncProvider, dryRun: syncDryRun })
      setSyncFixturesResult(result)
      toast.success(
        syncDryRun
          ? `Dry run: ${result.updated} fixture(s) would be updated`
          : `Fixtures synced: ${result.updated} updated`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync fixtures failed")
    } finally {
      setIsSyncing(false)
    }
  }, [challengeId, syncProvider, syncDryRun])

  const runSyncLive = useCallback(async () => {
    setIsSyncing(true)
    setSyncLiveResult(null)
    try {
      const result = await adminSyncWorldCupLive(challengeId, {
        provider: syncProvider,
        dryRun: syncDryRun,
        recalculate: true,
      })
      setSyncLiveResult(result)
      toast.success(
        syncDryRun
          ? `Dry run: ${result.updated} live score(s) would be updated`
          : `Live scores synced: ${result.updated} updated${result.recalculated ? ", leaderboard recalculated" : ""}`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync live failed")
    } finally {
      setIsSyncing(false)
    }
  }, [challengeId, syncProvider, syncDryRun])

  const saveSimulationMode = useCallback(
    async (patch: { isTestMode?: boolean; simulationEnabled?: boolean }) => {
      setIsSavingSimulationMode(true)
      try {
        const res = await fetch(`/api/brackets/world-cup/${challengeId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((body as { error?: string }).error ?? "Failed to update simulation mode")
        }
        await refreshChallengeView()
      } finally {
        setIsSavingSimulationMode(false)
      }
    },
    [challengeId, refreshChallengeView]
  )

  const runSimulateMatch = useCallback(async () => {
    if (!simulationMatchId) {
      toast.error("Select a match to simulate")
      return
    }

    setIsSimulating(true)
    setSimulationResult(null)
    try {
      const response = await adminSimulateWorldCupMatch(challengeId, {
        matchId: simulationMatchId,
        dryRun: simulationDryRun,
        status: "final",
      })
      const advanced = response.result.advancedMatchIds.length
      setSimulationResult(
        simulationDryRun
          ? `Dry run: simulated 1 match${advanced > 0 ? `, would advance ${advanced} next match slot(s)` : ""}`
          : `Simulated 1 match${advanced > 0 ? ` and advanced ${advanced} next match slot(s)` : ""}`
      )
      if (!simulationDryRun) {
        await refreshChallengeView()
      }
      toast.success(simulationDryRun ? "Dry run complete" : "Match simulated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulate match failed")
    } finally {
      setIsSimulating(false)
    }
  }, [challengeId, refreshChallengeView, simulationDryRun, simulationMatchId, simulationStrategy])

  const runSimulateRound = useCallback(async () => {
    const nextRound =
      view.matches.find((m) => m.status !== "final" && m.homeTeamName && m.awayTeamName)?.round ?? "round_of_32"
    setIsSimulating(true)
    setSimulationResult(null)
    try {
      const response = await adminSimulateWorldCupRound(challengeId, {
        round: nextRound,
        strategy: simulationStrategy,
        dryRun: simulationDryRun,
      })
      setSimulationResult(
        simulationDryRun
          ? `Dry run: ${response.result.simulatedMatches} match(es) in ${nextRound} would be simulated`
          : `Simulated ${response.result.simulatedMatches} match(es) in ${nextRound}`
      )
      if (!simulationDryRun) {
        await refreshChallengeView()
      }
      toast.success(simulationDryRun ? "Round dry run complete" : "Round simulated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulate round failed")
    } finally {
      setIsSimulating(false)
    }
  }, [challengeId, refreshChallengeView, simulationDryRun, simulationStrategy, view.matches])

  const runSimulateTournament = useCallback(async () => {
    setIsSimulating(true)
    setSimulationResult(null)
    try {
      const response = await adminSimulateWorldCupTournament(challengeId, {
        strategy: simulationStrategy,
        dryRun: simulationDryRun,
      })
      setSimulationResult(
        simulationDryRun
          ? `Dry run: ${response.result.rounds.reduce((sum, r) => sum + r.simulatedMatches, 0)} matches would be simulated`
          : `Tournament simulated. Champion: ${response.result.champion.winnerTeamName ?? "TBD"}`
      )
      if (!simulationDryRun) {
        await refreshChallengeView()
      }
      toast.success(simulationDryRun ? "Tournament dry run complete" : "Tournament simulated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulate tournament failed")
    } finally {
      setIsSimulating(false)
    }
  }, [challengeId, refreshChallengeView, simulationDryRun, simulationStrategy])

  const runResetSimulation = useCallback(async () => {
    setIsSimulating(true)
    setSimulationResult(null)
    try {
      const response = await adminResetWorldCupSimulation(challengeId, {
        dryRun: simulationDryRun,
      })
      setSimulationResult(
        simulationDryRun
          ? `Dry run: ${response.result.resetMatches} matches would be reset`
          : `Reset ${response.result.resetMatches} matches to scheduled state`
      )
      if (!simulationDryRun) {
        await refreshChallengeView()
      }
      toast.success(simulationDryRun ? "Reset dry run complete" : "Simulation reset")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset simulation failed")
    } finally {
      setIsSimulating(false)
    }
  }, [challengeId, refreshChallengeView, simulationDryRun])

  const saveStatus =
    saveState === "saving" ? "Saving..."
    : saveState === "saved" ? "Saved ✓"
    : saveState === "locked" ? "Pick locked"
    : saveState === "error" ? "Save failed"
    : selectedEntry ? `${selectedEntry.name}`
    : "World Cup 2026"

  // Remaining picks for selected entry
  const remainingPicks = useMemo(
    () =>
      selectedEntry
        ? countRemainingPicks(
            view.matches,
            picks,
            view.challenge.includeThirdPlace
          )
        : 0,
    [selectedEntry, view.matches, view.challenge.includeThirdPlace, picks]
  )

  // ── Guided picker save handler ───────────────────────────────────────────
  const handleGuidedSavePick = useCallback(
    async (
      payload: GuidedPickPayload,
      currentPicks: WorldCupPickView[],
      options?: { suppressToast?: boolean }
    ): Promise<WorldCupPickView[]> => {
      if (!selectedEntryId) throw new Error("No entry selected")
      if (isLocked) throw new Error("Bracket picks are locked")

      // Clear invalid downstream picks before saving the new one
      const invalidIds = getInvalidDownstreamPickIds(
        view.matches,
        currentPicks,
        payload.matchId,
        payload.selectedTeamId
      )
      const invalidMatchIds = invalidIds
        .map((id) => currentPicks.find((p) => p.id === id)?.matchId)
        .filter((mid): mid is string => mid !== undefined)

      if (invalidMatchIds.length > 0) {
        await clearWorldCupBracketEntryPicks(
          challengeId,
          selectedEntryId,
          invalidMatchIds
        )
      }

      // Save the actual pick
      const result = await saveWorldCupBracketEntryPick(challengeId, selectedEntryId, {
        matchId: payload.matchId,
        selectedTeamId: payload.selectedTeamId,
        selectedSlotKey: payload.selectedSlotKey,
        selectedSide: payload.selectedSide,
      })

      const returnedPicks = Array.isArray(result.picks)
        ? (result.picks as WorldCupPickView[])
        : currentPicks

      // Update shell entry picks state
      setEntryPicks((prev) => ({ ...prev, [selectedEntryId]: returnedPicks }))

      // Update entry metadata
      if (result.entry) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === selectedEntryId
              ? (result.entry as WorldCupBracketEntryClient)
              : e
          )
        )
      }

      // Refresh view for leaderboard
      fetch(`/api/brackets/world-cup/${challengeId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            const nextView = normalizeWorldCupView(data.view ?? data.challenge ?? data)
            setView(nextView)
          }
        })
        .catch(() => null)

      if (!options?.suppressToast) {
        const cleared = invalidMatchIds.length
        if (cleared > 0) {
          toast.success(`Updated pick and cleared ${cleared} downstream pick${cleared === 1 ? "" : "s"}.`)
        } else {
          toast.success("Updated pick")
        }
      }

      return returnedPicks
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challengeId, isLocked, selectedEntryId, view.matches]
  )

    // ── AI bracket builder ───────────────────────────────────────────────────
    const handleAiBuild = useCallback(
      async (strategy: WorldCupAiStrategy) => {
        if (!selectedEntryId) return
        if (isLocked) { toast.error("Bracket is locked"); return }
        if (!window.confirm(`Fill all unpicked matches using the "${strategy}" strategy? Existing picks will not be overwritten.`)) return

        const currentPicks = entryPicks[selectedEntryId] ?? []
        const projected = buildWorldCupProjectedMatches(view.matches, currentPicks)
        const orderedRounds = getOrderedRounds(view.matches, false)

        // Collect unpicked, available (both teams known) matches in order
        const unpicked = orderedRounds.flatMap((round) =>
          projected.filter(
            (m) =>
              m.round === round &&
              m.status !== "final" &&
              m.homeTeamId &&
              m.awayTeamId &&
              !currentPicks.some((p) => p.matchId === m.id && p.selectedTeamId)
          )
        )

        if (unpicked.length === 0) {
          toast.info("No picks to fill — all available matches already have picks.")
          return
        }

        aiBuildAbortRef.current = false
        setAiBuilder({ state: "running", current: 0, total: unpicked.length, message: "Building…" })

        let livePicks = [...currentPicks]

        for (let i = 0; i < unpicked.length; i++) {
          if (aiBuildAbortRef.current) break
          const match = unpicked[i]
          const rec = getWorldCupPickRecommendation(match, strategy)

          setAiBuilder((p) => ({
            ...p,
            current: i,
            message: `Picking ${match.round.replace(/_/g, " ")} (${i + 1}/${unpicked.length})…`,
          }))

          const payload: GuidedPickPayload = {
            matchId: match.id,
            selectedTeamId: rec.recommendedTeamId,
            selectedSlotKey: rec.recommendedSide === "home" ? match.homeSlotKey : match.awaySlotKey,
            selectedSide: rec.recommendedSide ?? "home",
          }

          try {
            livePicks = await handleGuidedSavePick(payload, livePicks, { suppressToast: true })
          } catch {
            setAiBuilder({ state: "error", current: i, total: unpicked.length, message: `Failed at pick ${i + 1}` })
            toast.error("AI builder stopped — error saving a pick")
            return
          }
        }

        setAiBuilder({ state: "done", current: unpicked.length, total: unpicked.length, message: "Done!" })
        toast.success(`AI filled ${unpicked.length} pick${unpicked.length !== 1 ? "s" : ""} using ${strategy} strategy.`)
        setTimeout(() => setAiBuilder({ state: "idle", current: 0, total: 0, message: "" }), 3000)
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [selectedEntryId, isLocked, entryPicks, view.matches, handleGuidedSavePick]
    )

  // Whether to show the full picks board or the entry dashboard
  const showBoard = tab === "picks" && selectedEntry !== null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05070b] text-white">
      <header className="shrink-0 border-b border-white/10 bg-zinc-950/95 backdrop-blur">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-5">
          {showBoard ? (
            <button
              type="button"
              onClick={() => setSelectedEntryId(null)}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/70"
              title="Back to My Brackets"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link href="/brackets" className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/70">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-white sm:text-lg">
              {showBoard ? selectedEntry!.name : view.challenge.name}
            </h1>
            <p className={`text-[11px] ${saveState === "locked" || saveState === "error" ? "text-rose-300" : "text-white/45"}`}>
              {showBoard
                ? `${progress.done} of ${progress.required} picks · ${saveStatus}`
                : view.challenge.name}
            </p>
          </div>
          {/* Entry switcher dropdown — visible when in board mode and multiple entries */}
          {showBoard && entries.length > 1 && (
            <select
              value={selectedEntryId ?? ""}
              onChange={(e) => setSelectedEntryId(e.target.value)}
              className="hidden rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white/80 sm:block"
            >
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          )}
          {view.isOwner || view.isAdmin ? (
            <button
              type="button"
              onClick={() => runOwnerAction("sync")}
              disabled={isPending}
              className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/[0.08] sm:inline-flex"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              Sync
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setTab("invite")}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-black"
          >
            <Share2 className="h-3.5 w-3.5" />
            Invite
          </button>
        </div>
        {saveError && (
          <div className="mx-3 mb-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {saveError}
          </div>
        )}
        {(view.challenge.isTestMode || view.challenge.simulationEnabled || view.challenge.hasSimulatedResults) && (
          <div className="mx-3 mb-2 rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            TEST MODE: results are simulated and can change leaderboard standings.
          </div>
        )}
        <WorldCupLiveScoreTicker matches={view.matches} />
        <nav className="hidden gap-1 px-5 pb-3 sm:flex">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${tab === id ? "bg-white text-black" : "bg-white/[0.04] text-white/55"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Entry header strip — shown when a bracket is open in picks tab */}
      {showBoard && (
        <div className="shrink-0 border-b border-white/[0.07] bg-white/[0.03]">
          <div className="grid grid-cols-4 gap-px">
            <EntryStatStrip label="Score" value={selectedEntry!.totalScore} />
            <EntryStatStrip
              label="Rank"
              value={selectedEntry!.rank != null ? `#${selectedEntry!.rank}` : "—"}
            />
            <EntryStatStrip label="Correct" value={selectedEntry!.correctPicks} />
            <EntryStatStrip
              label="Champion"
              value={selectedEntry!.championTeamName ?? "—"}
              small
            />
          </div>
          {/* Guided picks button */}
          {!isLocked && (
            <div className="flex justify-center px-4 py-2">
              <button
                type="button"
                disabled={!hasPickableFixtures}
                onClick={() => {
                  if (!hasPickableFixtures) {
                    toast.info("Fixtures are not synced yet. Ask the challenge owner/admin to run Sync first.")
                    return
                  }
                  setGuidedInitialMatchId(null)
                  setIsGuidedPickerOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:bg-cyan-300/45"
              >
                <PlayCircle className="h-4 w-4" />
                {!hasPickableFixtures
                  ? "Fixtures Not Synced"
                  : remainingPicks === 0
                  ? "Review Guided Picks"
                  : selectedEntry!.correctPicks > 0 || picks.length > 0
                  ? "Continue Guided Picks"
                  : "Start Guided Picks"}
              </button>
            </div>
          )}

          {!isLocked && !hasPickableFixtures && (
            <div className="px-4 pb-3 text-center text-[11px] text-white/50">
              Picks open after World Cup fixtures are synced for this challenge.
            </div>
          )}

          {!isLocked && selectedEntry && (
            <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI Bracket Builder
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["safe", "Safe"],
                  ["balanced", "Balanced"],
                  ["upset", "Upset"],
                  ["chaos", "Chaos"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => void handleAiBuild(value)}
                    disabled={aiBuilder.state === "running"}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {aiBuilder.state !== "idle" && (
                <div className="mt-2 rounded-lg bg-black/30 px-2.5 py-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-white/50">
                    <span>{aiBuilder.message}</span>
                    <span>{aiBuilder.current}/{aiBuilder.total}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${aiBuilder.state === "error" ? "bg-red-400" : "bg-cyan-300"}`}
                      style={{ width: `${aiBuilder.total > 0 ? Math.round((aiBuilder.current / aiBuilder.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedEntry && (
            <WorldCupBracketHealthCard
              entry={selectedEntry}
              matches={view.matches}
              picks={picks}
            />
          )}

          {(view.isOwner || view.isAdmin) && (
            <>
            <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-white/60">Admin Integrity</div>
                <button
                  type="button"
                  onClick={() => void runIntegrityCheck()}
                  disabled={isIntegrityLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/80 disabled:opacity-60"
                >
                  {isIntegrityLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Run Integrity Check
                </button>
              </div>
              {integrityReport ? (
                <div className="space-y-2 text-[11px]">
                  <div className="text-white/70">
                    {integrityReport.ok ? "No blocking integrity issues detected." : `${integrityReport.errors.length} error(s), ${integrityReport.warnings.length} warning(s)`}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-white/55 sm:grid-cols-4">
                    <span>Participants: {integrityReport.stats.participants}</span>
                    <span>Entries: {integrityReport.stats.entries}</span>
                    <span>Matches: {integrityReport.stats.matches}</span>
                    <span>Picks: {integrityReport.stats.picks}</span>
                  </div>
                  {integrityReport.errors.slice(0, 3).map((err) => (
                    <p key={err} className="text-rose-300">✗ {err}</p>
                  ))}
                  {integrityReport.warnings.slice(0, 3).map((warn) => (
                    <p key={warn} className="text-amber-300">⚠ {warn}</p>
                  ))}
                </div>
              ) : null}

              {/* Launch checklist */}
              <div className="mt-4 border-t border-white/[0.06] pt-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">Launch Checklist</div>
                <div className="space-y-1.5">
                  {[
                    {
                      label: "Integrity check passed",
                      ok: integrityReport?.ok ?? null,
                      hint: integrityReport ? undefined : "Run integrity check above",
                    },
                    {
                      label: "Fixtures synced",
                      ok: view.matches.length > 0 ? true : false,
                      hint: view.matches.length === 0 ? "No matches loaded — run Sync" : undefined,
                    },
                    {
                      label: "Teams/flags loaded",
                      ok: view.matches.some((m) => m.homeTeamId && m.awayTeamId) ? true : null,
                      hint: "At least one match has team IDs set",
                    },
                    {
                      label: "Lock time set",
                      ok: !!(view.challenge.pickLockAt || view.challenge.effectivePickLockAt),
                      hint: !view.challenge.pickLockAt && !view.challenge.effectivePickLockAt
                        ? "No lock time — set one or rely on per-match locking"
                        : undefined,
                    },
                    {
                      label: "Scoring profile active",
                      ok: view.scoring.roundOf32Points > 0,
                    },
                    {
                      label: "Invite link active",
                      ok: !!(view.challenge.inviteCode || view.challenge.inviteUrl),
                      hint: !view.challenge.inviteCode ? "No invite code found" : undefined,
                    },
                    {
                      label: "Leaderboard recalculation available",
                      ok: true,
                    },
                    {
                      label: "AI previews available",
                      ok: view.matches.some((m) => m.homeTeamId && m.awayTeamId) ? true : null,
                      hint: "Requires team IDs on matches",
                    },
                  ].map(({ label, ok, hint }) => (
                    <div key={label} className="flex items-start gap-2 text-[11px]">
                      <span
                        className={`mt-0.5 shrink-0 ${
                          ok === true
                            ? "text-emerald-400"
                            : ok === false
                            ? "text-rose-400"
                            : "text-white/30"
                        }`}
                      >
                        {ok === true ? "✓" : ok === false ? "✗" : "○"}
                      </span>
                      <div>
                        <span
                          className={
                            ok === true
                              ? "text-white/70"
                              : ok === false
                              ? "text-rose-300"
                              : "text-white/40"
                          }
                        >
                          {label}
                        </span>
                        {hint && (
                          <span className="ml-1 text-[10px] text-white/30">— {hint}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mx-4 mb-4 rounded-xl border border-amber-300/20 bg-amber-500/[0.06] p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-200">
                Simulation / Test Mode
              </div>
              <p className="mb-3 text-[11px] text-amber-100/80">
                Testing only. Simulated results can change scores and leaderboard standings.
              </p>

              <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-white/70">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={view.challenge.isTestMode}
                    onChange={(e) => void saveSimulationMode({ isTestMode: e.target.checked })}
                    disabled={isSavingSimulationMode || isSimulating}
                    className="h-3.5 w-3.5 accent-amber-300"
                  />
                  Test mode
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={view.challenge.simulationEnabled}
                    onChange={(e) => void saveSimulationMode({ simulationEnabled: e.target.checked })}
                    disabled={isSavingSimulationMode || isSimulating}
                    className="h-3.5 w-3.5 accent-amber-300"
                  />
                  Simulation enabled
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={simulationDryRun}
                    onChange={(e) => setSimulationDryRun(e.target.checked)}
                    disabled={isSimulating}
                    className="h-3.5 w-3.5 accent-amber-300"
                  />
                  Dry run
                </label>
                <select
                  value={simulationStrategy}
                  onChange={(e) => setSimulationStrategy(e.target.value as WorldCupAdminSimulationStrategy)}
                  disabled={isSimulating}
                  className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-[11px] text-white/80"
                >
                  <option value="random">Random</option>
                  <option value="higher_seed">Higher seed</option>
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                </select>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <select
                  value={simulationMatchId}
                  onChange={(e) => setSimulationMatchId(e.target.value)}
                  disabled={isSimulating}
                  className="min-w-[220px] rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-[11px] text-white/80"
                >
                  <option value="">Select match for manual simulation</option>
                  {view.matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      M{match.matchNumber} · {match.homeTeamName} vs {match.awayTeamName}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void runSimulateMatch()}
                  disabled={isSimulating || !simulationMatchId}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/80 disabled:opacity-50"
                >
                  Simulate Match
                </button>
                <button
                  type="button"
                  onClick={() => void runSimulateRound()}
                  disabled={isSimulating}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/80 disabled:opacity-50"
                >
                  Simulate Round
                </button>
                <button
                  type="button"
                  onClick={() => void runSimulateTournament()}
                  disabled={isSimulating}
                  className="rounded-lg border border-cyan-400/30 bg-cyan-900/30 px-3 py-1.5 text-[11px] font-bold text-cyan-100 disabled:opacity-50"
                >
                  Simulate Full Tournament
                </button>
                <button
                  type="button"
                  onClick={() => void runResetSimulation()}
                  disabled={isSimulating}
                  className="rounded-lg border border-rose-400/30 bg-rose-900/20 px-3 py-1.5 text-[11px] font-bold text-rose-100 disabled:opacity-50"
                >
                  Reset Simulation
                </button>
              </div>

              {simulationResult && <p className="text-[11px] text-white/70">{simulationResult}</p>}
            </div>

            {/* Data sync controls */}
            <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/60">
                Data Sync
              </div>

              {/* Provider + dry-run row */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  value={syncProvider}
                  onChange={(e) => setSyncProvider(e.target.value as WorldCupAdminSyncProvider)}
                  disabled={isSyncing}
                  className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-[11px] text-white/80 disabled:opacity-50"
                >
                  <option value="mock">Mock / Manual</option>
                  <option value="apifootball">API-Football</option>
                  <option value="sportsdata">SportsData.io</option>
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-white/60">
                  <input
                    type="checkbox"
                    checked={syncDryRun}
                    onChange={(e) => setSyncDryRun(e.target.checked)}
                    disabled={isSyncing}
                    className="h-3.5 w-3.5 accent-cyan-400"
                  />
                  Dry run
                </label>
              </div>

              {/* Sync buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void runSyncTeams()}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/80 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                  Sync Teams
                </button>
                <button
                  type="button"
                  onClick={() => void runSyncFixtures()}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/80 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Sync Fixtures
                </button>
                <button
                  type="button"
                  onClick={() => void runSyncLive()}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-cyan-900/30 px-3 py-1.5 text-[11px] font-bold text-cyan-200 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                  Sync Live Scores
                </button>
              </div>

              {/* Sync results */}
              {syncTeamsResult && (
                <SyncResultRow
                  label="Teams"
                  result={syncTeamsResult}
                />
              )}
              {syncFixturesResult && (
                <SyncResultRow
                  label="Fixtures"
                  result={syncFixturesResult}
                  extra={
                    syncFixturesResult.lockTimeInferred
                      ? `Lock inferred: ${new Date(syncFixturesResult.lockTimeInferred).toLocaleString()}`
                      : undefined
                  }
                />
              )}
              {syncLiveResult && (
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[11px]">
                  <div className="flex flex-wrap gap-3 text-white/60">
                    <span>Live <span className="font-bold text-white/80">{syncLiveResult.updated}</span></span>
                    <span>Final <span className="font-bold text-white/80">{syncLiveResult.finalMatches}</span></span>
                    <span>Recalc <span className="font-bold text-white/80">{syncLiveResult.recalculated ? "yes" : "no"}</span></span>
                    {syncLiveResult.dryRun && <span className="text-amber-300">dry run</span>}
                  </div>
                  {syncLiveResult.warnings.slice(0, 2).map((w) => (
                    <p key={w} className="mt-1 text-amber-300">{w}</p>
                  ))}
                  <p className="mt-1 text-white/30">{new Date(syncLiveResult.syncedAt).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-hidden">
        {tab === "picks" ? (
          selectedEntry ? (
            <WorldCupBracketBoard
              view={view}
              picks={picks}
              onPick={persistPick}
              onOpenMatchupPicker={(matchId) => {
                setGuidedInitialMatchId(matchId)
                setIsGuidedPickerOpen(true)
              }}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <WorldCupEntryDashboard
                challengeId={challengeId}
                entries={entries}
                maxEntriesPerParticipant={view.challenge.maxEntriesPerParticipant}
                isLocked={isLocked}
                selectedEntryId={selectedEntryId}
                onCreateEntry={handleCreateEntry}
                onSelectEntry={handleSelectEntry}
                onRenameEntry={handleRenameEntry}
                onDeleteEntry={handleDeleteEntry}
                isLoading={isEntriesLoading}
                isCreating={isCreatingEntry}
                isMutating={isMutatingEntry}
              />
            </div>
          )
        ) : null}
        {tab === "leaderboard" ? (
          <div className="h-full overflow-y-auto">
            <WorldCupLeaderboardInsights leaderboard={view.leaderboard} />
            <WorldCupLeaderboard view={view} busy={isPending} onRecalculate={() => runOwnerAction("recalculate")} />
          </div>
        ) : null}
        {tab === "invite" ? <WorldCupInvitePanel view={view} /> : null}
        {tab === "rules" ? (
          <div className="mx-auto max-w-2xl px-4 py-6 text-sm leading-7 text-white/60">
            <h2 className="mb-3 text-lg font-black text-white">Rules</h2>
            <p>
              Pick every winner from the Round of 32 through the champion. Picks lock at kickoff for each match (or at tournament start if the challenge uses a tournament-start lock).
            </p>
            <p className="mt-3">
              Correct picks score more each round. Final API results update match winners, advance teams, score entries, and refresh the leaderboard.
            </p>
            <p className="mt-3 font-bold text-white/70">Scoring (default)</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Round of 32: {view.scoring.roundOf32Points} pts</li>
              <li>Round of 16: {view.scoring.roundOf16Points} pts</li>
              <li>Quarterfinal: {view.scoring.quarterFinalPoints} pts</li>
              <li>Semifinal: {view.scoring.semiFinalPoints} pts</li>
              <li>Final: {view.scoring.finalPoints} pts</li>
              {view.challenge.includeThirdPlace && view.scoring.thirdPlacePoints != null ? (
                <li>3rd Place: {view.scoring.thirdPlacePoints} pts</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </main>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-white/10 bg-zinc-950/95 sm:hidden">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-bold ${tab === id ? "text-cyan-200" : "text-white/45"}`}
          >
            <Icon className="h-4 w-4" />
            {label === "Leaderboard" ? "Board" : label}
          </button>
        ))}
      </nav>

      {/* ── Guided matchup picker ── */}
      {selectedEntry && isGuidedPickerOpen && (
        <WorldCupGuidedMatchupPicker
          challengeId={challengeId}
          entryId={selectedEntry.id}
          entryName={selectedEntry.name}
          matches={view.matches}
          picks={picks}
          isOpen={isGuidedPickerOpen}
          initialMatchId={guidedInitialMatchId}
          isLocked={isLocked}
          includeThirdPlace={view.challenge.includeThirdPlace}
          onClose={() => {
            setIsGuidedPickerOpen(false)
            setGuidedInitialMatchId(null)
          }}
          onSavePick={handleGuidedSavePick}
          onPicksUpdated={(updatedPicks) => {
            if (selectedEntryId) {
              setEntryPicks((prev) => ({ ...prev, [selectedEntryId]: updatedPicks }))
            }
          }}
        />
      )}
    </div>
  )
}

function EntryStatStrip({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-2 px-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">{label}</div>
      <div className={`font-black text-white ${small ? "truncate max-w-[7rem] text-[11px]" : "text-sm"}`}>{value}</div>
    </div>
  )
}

function SyncResultRow({
  label,
  result,
  extra,
}: {
  label: string
  result: { created?: number; updated?: number; skipped?: number; warnings?: string[]; syncedAt?: string; dryRun?: boolean }
  extra?: string
}) {
  return (
    <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[11px]">
      <div className="flex flex-wrap gap-3 text-white/60">
        <span className="font-bold text-white/80">{label}</span>
        {result.created != null && <span>Created <strong className="text-white/80">{result.created}</strong></span>}
        {result.updated != null && <span>Updated <strong className="text-white/80">{result.updated}</strong></span>}
        {result.skipped != null && <span>Skipped <strong className="text-white/80">{result.skipped}</strong></span>}
        {result.dryRun && <span className="text-amber-300">dry run</span>}
      </div>
      {extra && <p className="mt-1 text-white/50">{extra}</p>}
      {(result.warnings ?? []).slice(0, 2).map((w) => (
        <p key={w} className="mt-1 text-amber-300">{w}</p>
      ))}
      {result.syncedAt && (
        <p className="mt-1 text-white/30">{new Date(result.syncedAt).toLocaleTimeString()}</p>
      )}
    </div>
  )
}
