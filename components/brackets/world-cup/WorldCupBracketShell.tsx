"use client"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowUp, BarChart3, Baseline, Bell, Bold, Bot, Check, ChevronLeft, ClipboardCheck, ClipboardList, Copy, Edit3, Film, ImageIcon, Italic, ListOrdered, Loader2, Lock, MessageSquare, Megaphone, Mic, Pin, PlayCircle, Plus, RefreshCw, Send, Settings, Share2, Smile, Sparkles, Strikethrough, Trophy, Underline, Users, X } from "lucide-react"
import { toast } from "sonner"
import type { WorldCupAiBuilderProgress, WorldCupAiStrategy, WorldCupChallengeView, WorldCupMatchView, WorldCupPickView } from "@/lib/world-cup/types"
import { isWorldCupChallengeLocked } from "@/lib/world-cup/worldCupBracketBuilder"
import type {
  WorldCupBracketEntryClient,
  WorldCupChallengeIntegrityReport,
  WorldCupAdminSyncProvider,
  WorldCupAdminSyncTeamsResult,
  WorldCupAdminSyncFixturesResult,
  WorldCupAdminSyncGroupStandingsResult,
  WorldCupAdminSyncLiveResult,
  WorldCupAdminSimulationStrategy,
  WorldCupEntryCompletionReviewClient,
  WorldCupGroupStageViewClient,
} from "@/lib/world-cup/worldCupClientApi"
import {
  adminLoadWorldCupTestFixtures,
  adminResetWorldCupSimulation,
  adminSimulateWorldCupMatch,
  adminSimulateWorldCupRound,
  adminSimulateWorldCupTournament,
  adminSyncWorldCupFixtures,
  adminSyncWorldCupGroupStandings,
  adminSyncWorldCupLive,
  adminSyncWorldCupTeams,
  clearWorldCupBracketEntryPicks,
  createWorldCupBracketEntry,
  deleteWorldCupBracketEntry,
  fetchWorldCupEntryCompletionReview,
  fetchWorldCupGroupStageView,
  finalizeWorldCupEntryClient,
  getWorldCupIntegrityReport,
  getWorldCupBracketEntry,
  listWorldCupBracketEntries,
  renameWorldCupBracketEntry,
  saveWorldCupBracketEntryPick,
} from "@/lib/world-cup/worldCupClientApi"
import {
  assertWorldCupPickPayloadReady,
  countRemainingPicks,
  findWorldCupPickForMatch,
  findFirstUnpickedMatch,
  getWorldCupPickMatchMethod,
  getWorldCupGuidedPicksState,
  getInvalidDownstreamPickIds,
  getWorldCupUnpickableReason,
  hasWorldCupPickSelection,
  isWorldCupMatchPickable,
  worldCupPickMatchesMatch,
} from "@/lib/world-cup/worldCupProjectedBracket"
import {
  buildWorldCupProjectedMatches,
  getOrderedRounds,
} from "@/lib/world-cup/worldCupProjectedBracket"
import { calculateWorldCupBracketHealth, getWorldCupPickRecommendation } from "@/lib/world-cup/worldCupAiInsights"
import { getBrowserWorldCupInviteUrl } from "@/lib/world-cup/worldCupBracketUtils"
import { resolveWorldCupEntitlementSummary } from "@/lib/world-cup/worldCupEntitlements"
import {
  parseWorldCupChatRichText,
  sanitizeWorldCupChatMessage,
  type WorldCupChatColor,
  type WorldCupChatFont,
  type WorldCupChatRichTextSegment,
} from "@/lib/world-cup/worldCupChatRichText"
import { worldCupTabToQueryValue, type WorldCupBracketTab } from "@/lib/world-cup/worldCupTabs"
import WorldCupBracketBoard from "./WorldCupBracketBoard"
import WorldCupBracketHealthCard from "./WorldCupBracketHealthCard"
import WorldCupEntryDashboard from "./WorldCupEntryDashboard"
import AllFantasyBracketBoard, { AllFantasyBracketPickSkeleton } from "@/components/brackets/shared/AllFantasyBracketBoard"
import { WorldCupCompactBracketPreview } from "./WorldCupCompactBracketPreview"
import type { GuidedPickPayload } from "./WorldCupGuidedMatchupPicker"
import WorldCupGuidedMatchupPicker from "./WorldCupGuidedMatchupPicker"
import WorldCupInvitePanel from "./WorldCupInvitePanel"
import WorldCupRoundBreakdown from "./WorldCupRoundBreakdown"
import WorldCupScoreSummary from "./WorldCupScoreSummary"
import WorldCupLeaderboard from "./WorldCupLeaderboard"
import WorldCupLeaderboardInsights from "./WorldCupLeaderboardInsights"
import WorldCupLiveScoreTicker from "./WorldCupLiveScoreTicker"
import WorldCupBracketSettingsPanel from "./WorldCupBracketSettingsPanel"
import WorldCupCommissionerBrainPanel from "./WorldCupCommissionerBrainPanel"
import WorldCupGroupStagePicks from "./WorldCupGroupStagePicks"
import WorldCupReadinessPanel from "./WorldCupReadinessPanel"
import WorldCupLeagueEventFeed from "./WorldCupLeagueEventFeed"
type Tab = WorldCupBracketTab
type WorldCupPoolChatMessage = {
  id: string
  userId: string | null
  authorName: string
  authorAvatarUrl: string | null
  body: string
  messageType: string
  gif?: WorldCupChatGifAttachment | null
  image?: WorldCupChatImageAttachment | null
  poll?: WorldCupChatPollAttachment | null
  visibility: string
  targetUserId: string | null
  mentions: unknown[]
  createdAt: string
  isOwnMessage: boolean
  isPrivate: boolean
}
type WorldCupChatGifAttachment = {
  id: string
  title: string
  previewUrl: string
  gifUrl: string
  width: number
  height: number
  provider: "klipy" | "tenor" | "giphy"
}
type WorldCupChatImageAttachment = {
  assetId: string
  publicId: string
  secureUrl: string
  width: number
  height: number
  format: string
  bytes: number
  provider: "cloudinary"
}
type WorldCupChatPollOption = {
  id: string
  label: string
  votes: number
  percentage: number
}
type WorldCupChatPollAttachment = {
  question: string
  options: WorldCupChatPollOption[]
  currentUserVote: string | null
  totalVotes: number
  closed: boolean
  closedAt: string | null
  createdByUserId: string | null
  createdAt: string | null
}
type WorldCupNotificationPreferenceState = {
  poolMuted: boolean
  inAppEnabled: boolean
  smsEnabled: boolean
  usernameMentionsEnabled: boolean
  allMentionsEnabled: boolean
  commissionerAnnouncementsEnabled: boolean
  deadlineRemindersEnabled: boolean
  bracketFinalizedEnabled: boolean
  resultsUpdatedEnabled: boolean
  leaderboardUpdatedEnabled: boolean
  generalChatEnabled: boolean
  chimmyRepliesEnabled: boolean
}
type WorldCupComposerPanel = "gif" | "poll" | "image" | "voice" | null
const WORLD_CUP_CHAT_COLOR_OPTIONS: Array<{ value: WorldCupChatColor; label: string }> = [
  { value: "default", label: "Default" },
  { value: "af-blue", label: "AF Blue" },
  { value: "red", label: "Red" },
  { value: "amber", label: "Amber" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
]
const WORLD_CUP_CHAT_FONT_OPTIONS: Array<{ value: WorldCupChatFont; label: string }> = [
  { value: "default", label: "Default" },
  { value: "clean", label: "Clean" },
  { value: "sport", label: "Sport" },
  { value: "mono", label: "Mono" },
]
const BASE_TABS: Array<{ id: Tab; label: string; icon: typeof ClipboardList }> = [
  { id: "home", label: "Home", icon: Trophy },
  { id: "group-stage", label: "Group Stage", icon: ListOrdered },
  { id: "picks", label: "Knockouts", icon: ClipboardList },
  { id: "review", label: "Review", icon: ClipboardCheck },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "rules", label: "Rules", icon: Users },
  { id: "invite", label: "Invite", icon: Share2 },
]

const DEFAULT_WORLD_CUP_VIEW_SCORING = {
  roundOf32Points: 10,
  roundOf16Points: 20,
  quarterFinalPoints: 40,
  semiFinalPoints: 80,
  finalPoints: 160,
  championBonusPoints: 320,
  thirdPlacePoints: 4,
}

function normalizeWorldCupView(input: WorldCupChallengeView | (Partial<WorldCupChallengeView> & { id?: string; name?: string }) | undefined): WorldCupChallengeView {
  const raw = input as any
  const challengeRaw = raw?.challenge ?? raw ?? {}
  if (raw?.challenge) {
    const v = raw as Partial<WorldCupChallengeView>
    return {
      ...v,
      challenge: {
        id: challengeRaw?.id ?? "",
        name: challengeRaw?.name ?? "World Cup Bracket",
        ownerUserId: challengeRaw?.ownerUserId ?? "",
        seasonYear: challengeRaw?.seasonYear ?? 2026,
        inviteCode: challengeRaw?.inviteCode ?? "",
        inviteUrl: challengeRaw?.inviteUrl ?? null,
        visibility: challengeRaw?.visibility ?? "private",
        pickLockStrategy: challengeRaw?.pickLockStrategy ?? "tournament_start",
        pickLockAt: challengeRaw?.pickLockAt ?? null,
        maxParticipants: challengeRaw?.maxParticipants ?? 100,
        maxEntriesPerParticipant: challengeRaw?.maxEntriesPerParticipant ?? 5,
        effectivePickLockAt: challengeRaw?.effectivePickLockAt ?? null,
        status: challengeRaw?.status ?? "open",
        includeThirdPlace: Boolean(challengeRaw?.includeThirdPlace),
        isTestMode: Boolean(challengeRaw?.isTestMode),
        simulationEnabled: Boolean(challengeRaw?.simulationEnabled),
        simulatedAt: challengeRaw?.simulatedAt ?? null,
        simulationStatus: challengeRaw?.simulationStatus ?? null,
        hasSimulatedResults: Boolean(challengeRaw?.hasSimulatedResults),
        lastSyncedAt: challengeRaw?.lastSyncedAt ?? null,
        createdAt: challengeRaw?.createdAt ?? new Date().toISOString(),
        updatedAt: challengeRaw?.updatedAt ?? new Date().toISOString(),
      },
      scoring: v.scoring ?? DEFAULT_WORLD_CUP_VIEW_SCORING,
      slots: v.slots ?? [],
      matches: v.matches ?? [],
      participant: v.participant ?? null,
      activeEntry: v.activeEntry ?? null,
      entries: v.entries ?? [],
      picks: v.picks ?? [],
      leaderboard: v.leaderboard ?? [],
      isOwner: Boolean(v.isOwner),
      isAdmin: Boolean(v.isAdmin),
      hasBracketBrainAi: Boolean(v.hasBracketBrainAi),
    }
  }
  return {
    challenge: {
      id: challengeRaw?.id ?? "",
      name: challengeRaw?.name ?? "World Cup Bracket",
      ownerUserId: challengeRaw?.ownerUserId ?? "",
      seasonYear: challengeRaw?.seasonYear ?? 2026,
      inviteCode: challengeRaw?.inviteCode ?? "",
      inviteUrl: challengeRaw?.inviteUrl ?? null,
      visibility: challengeRaw?.visibility ?? "private",
      pickLockStrategy: challengeRaw?.pickLockStrategy ?? "tournament_start",
      pickLockAt: challengeRaw?.pickLockAt ?? null,
      maxParticipants: challengeRaw?.maxParticipants ?? 100,
      maxEntriesPerParticipant: challengeRaw?.maxEntriesPerParticipant ?? 5,
      effectivePickLockAt: challengeRaw?.effectivePickLockAt ?? null,
      status: challengeRaw?.status ?? "open",
      includeThirdPlace: Boolean(challengeRaw?.includeThirdPlace),
      isTestMode: Boolean(challengeRaw?.isTestMode),
      simulationEnabled: Boolean(challengeRaw?.simulationEnabled),
      simulatedAt: challengeRaw?.simulatedAt ?? null,
      simulationStatus: challengeRaw?.simulationStatus ?? null,
      hasSimulatedResults: Boolean(challengeRaw?.hasSimulatedResults),
      lastSyncedAt: challengeRaw?.lastSyncedAt ?? null,
      createdAt: challengeRaw?.createdAt ?? new Date().toISOString(),
      updatedAt: challengeRaw?.updatedAt ?? new Date().toISOString(),
    },
    scoring: raw?.scoring ?? DEFAULT_WORLD_CUP_VIEW_SCORING,
    slots: raw?.slots ?? [],
    matches: raw?.matches ?? [],
    participant: raw?.participant ?? null,
    activeEntry: raw?.activeEntry ?? null,
    entries: raw?.entries ?? [],
    picks: raw?.picks ?? [],
    leaderboard: raw?.leaderboard ?? [],
    isOwner: Boolean(raw?.isOwner),
    isAdmin: Boolean(raw?.isAdmin),
    hasBracketBrainAi: Boolean(raw?.hasBracketBrainAi),
  }
}

function getSelectedEntryStorageKey(challengeId: string): string {
  return `world-cup:selected-entry:${challengeId}`
}

function mergeEntryScoresFromView(
  currentEntries: WorldCupBracketEntryClient[],
  nextView: WorldCupChallengeView
): WorldCupBracketEntryClient[] {
  if (currentEntries.length === 0) return currentEntries
  const summaries = new Map(nextView.entries.map((entry) => [entry.id, entry]))
  const leaderboard = new Map(nextView.leaderboard.map((row) => [row.entryId, row]))

  return currentEntries.map((entry) => {
    const summary = summaries.get(entry.id)
    const row = leaderboard.get(entry.id)
    if (!summary && !row) return entry

    return {
      ...entry,
      name: summary?.name ?? entry.name,
      totalScore: row?.totalScore ?? summary?.totalScore ?? entry.totalScore,
      maxPossibleScore: row?.maxPossibleScore ?? entry.maxPossibleScore,
      correctPicks: row?.correctPicks ?? entry.correctPicks,
      incorrectPicks: row?.incorrectPicks ?? entry.incorrectPicks,
      rank: row?.rank ?? summary?.rank ?? entry.rank,
      roundBreakdown: row?.roundBreakdown ?? entry.roundBreakdown,
      championTeamId: row?.championTeamId ?? entry.championTeamId,
      championTeamName: row?.championPickName ?? entry.championTeamName,
      isComplete: summary?.isComplete ?? entry.isComplete,
      updatedAt: row?.updatedAt ?? entry.updatedAt,
    }
  })
}

function entryClientsFromInitialView(view: WorldCupChallengeView): WorldCupBracketEntryClient[] {
  const leaderboardByEntry = new Map(view.leaderboard.map((row) => [row.entryId, row]))
  return view.entries.map((entry) => {
    const leaderboard = leaderboardByEntry.get(entry.id)
    return {
      id: entry.id,
      challengeId: view.challenge.id,
      participantId: leaderboard?.participantId ?? view.participant?.id ?? "",
      userId: leaderboard?.userId ?? view.participant?.userId ?? "",
      name: entry.name,
      championTeamId: leaderboard?.championTeamId ?? null,
      championTeamName: leaderboard?.championPickName ?? null,
      totalScore: leaderboard?.totalScore ?? entry.totalScore ?? 0,
      maxPossibleScore: leaderboard?.maxPossibleScore ?? 0,
      correctPicks: leaderboard?.correctPicks ?? 0,
      incorrectPicks: leaderboard?.incorrectPicks ?? 0,
      rank: leaderboard?.rank ?? entry.rank ?? null,
      roundBreakdown: leaderboard?.roundBreakdown ?? {},
      isComplete: entry.isComplete,
      isLocked: false,
      submittedAt: null,
      createdAt: entry.createdAt,
      updatedAt: leaderboard?.updatedAt ?? entry.createdAt,
    }
  })
}

function mergeWorldCupChallengeView(
  currentView: WorldCupChallengeView,
  nextView: WorldCupChallengeView
): WorldCupChallengeView {
  const sameChallenge =
    !nextView.challenge.id ||
    !currentView.challenge.id ||
    nextView.challenge.id === currentView.challenge.id

  if (!sameChallenge) return nextView

  const keepCurrentMatches =
    currentView.matches.length > 0 && nextView.matches.length === 0
  const keepCurrentSlots =
    currentView.slots.length > 0 && nextView.slots.length === 0

  return {
    ...currentView,
    ...nextView,
    challenge: {
      ...currentView.challenge,
      ...nextView.challenge,
      id: nextView.challenge.id || currentView.challenge.id,
    },
    scoring: nextView.scoring ?? currentView.scoring,
    slots: keepCurrentSlots ? currentView.slots : nextView.slots,
    matches: keepCurrentMatches ? currentView.matches : nextView.matches,
    entries: nextView.entries.length > 0 ? nextView.entries : currentView.entries,
    leaderboard: nextView.leaderboard.length > 0 ? nextView.leaderboard : currentView.leaderboard,
    participant: nextView.participant ?? currentView.participant,
    activeEntry: nextView.activeEntry ?? currentView.activeEntry,
    picks: nextView.picks,
  }
}

function worldCupReviewStatusClass(status: "correct" | "wrong" | "pending") {
  if (status === "correct") return "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
  if (status === "wrong") return "border-rose-300/35 bg-rose-400/10 text-rose-100"
  return "border-amber-300/30 bg-amber-400/10 text-amber-100"
}

function worldCupReviewStatusLabel(input: { isCorrect?: boolean | null; pointsAwarded?: number | null }) {
  if (input.isCorrect === true) return { status: "correct" as const, label: `Correct +${input.pointsAwarded ?? 0}` }
  if (input.isCorrect === false) return { status: "wrong" as const, label: "Wrong +0" }
  return { status: "pending" as const, label: "Pending" }
}

function teamNameFromGroupStageReview(view: WorldCupGroupStageViewClient, teamId: string) {
  for (const group of view.groups) {
    const team = group.teams.find((row) => row.teamId === teamId)
    if (team) return team.name
  }
  return teamId
}

export default function WorldCupBracketShell({
  initialView,
  challenge,
  defaultTab = "picks",
  initialGuidedOpen = false,
  initialEntryId = null,
}: {
  initialView?: WorldCupChallengeView
  challenge?: WorldCupChallengeView | any
  defaultTab?: Tab
  /** From `?guided=1` after join — opens guided picker once picks are loaded */
  initialGuidedOpen?: boolean
  /** From `?entry=` — selects bracket entry after join */
  initialEntryId?: string | null
}) {
  const router = useRouter()
  const normalizedInitialView = normalizeWorldCupView(initialView ?? challenge)
  const initialEntries = entryClientsFromInitialView(normalizedInitialView)
  const shouldAutoSelectInitialEntry =
    defaultTab === "picks" ||
    defaultTab === "group-stage" ||
    defaultTab === "review" ||
    Boolean(initialEntryId) ||
    initialGuidedOpen
  const initialSelectedEntryId =
    shouldAutoSelectInitialEntry
      ? initialEntryId && initialEntries.some((entry) => entry.id === initialEntryId)
        ? initialEntryId
        : normalizedInitialView.activeEntry?.id &&
            initialEntries.some((entry) => entry.id === normalizedInitialView.activeEntry?.id)
          ? normalizedInitialView.activeEntry.id
          : initialEntries[0]?.id ?? null
      : null
  const [view, setView] = useState(normalizedInitialView)
  const [tab, setTab] = useState<Tab>(() => {
    if (
      (defaultTab === "commissioner" || defaultTab === "settings") &&
      !normalizedInitialView.isOwner &&
      !normalizedInitialView.isAdmin
    ) {
      return "picks"
    }
    return defaultTab
  })
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "locked">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savingPickMatchIds, setSavingPickMatchIds] = useState<Set<string>>(() => new Set())
  const savingPickMatchIdsRef = useRef<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [lockNow, setLockNow] = useState(() => new Date())

  // ── Entry state ──────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<WorldCupBracketEntryClient[]>(initialEntries)
  const [entriesLoaded, setEntriesLoaded] = useState(false)
  const [isEntriesLoading, setIsEntriesLoading] = useState(false)
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)
  const [isMutatingEntry, setIsMutatingEntry] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialSelectedEntryId)
  const [headerRenameOpen, setHeaderRenameOpen] = useState(false)
  const [headerRenameValue, setHeaderRenameValue] = useState("")

  // Picks per-entry: keyed by entryId → array of picks
  const [entryPicks, setEntryPicks] = useState<Record<string, WorldCupPickView[]>>(() => {
    if (
      initialSelectedEntryId &&
      normalizedInitialView.activeEntry?.id === initialSelectedEntryId
    ) {
      return { [initialSelectedEntryId]: normalizedInitialView.picks }
    }
    return {}
  })
  const [loadedEntryPickIds, setLoadedEntryPickIds] = useState<Set<string>>(
    () =>
      new Set(
        initialSelectedEntryId &&
          normalizedInitialView.activeEntry?.id === initialSelectedEntryId
          ? [initialSelectedEntryId]
          : []
      )
  )

  // ── Guided picker state ──────────────────────────────────────────────────
  const [isGuidedPickerOpen, setIsGuidedPickerOpen] = useState(false)
  const [guidedInitialMatchId, setGuidedInitialMatchId] = useState<string | null>(null)
  const [hasUnsavedGroupChanges, setHasUnsavedGroupChanges] = useState(false)
  const [dashboardPreviewMode, setDashboardPreviewMode] = useState<"starting" | "ai">("starting")
  const [completionReview, setCompletionReview] = useState<WorldCupEntryCompletionReviewClient | null>(null)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [isCompletionLoading, setIsCompletionLoading] = useState(false)
  const [reviewGroupStageView, setReviewGroupStageView] = useState<WorldCupGroupStageViewClient | null>(null)
  const [reviewGroupStageError, setReviewGroupStageError] = useState<string | null>(null)
  const [isFinalizingEntry, setIsFinalizingEntry] = useState(false)
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
  const [syncStandingsResult, setSyncStandingsResult] = useState<WorldCupAdminSyncGroupStandingsResult | null>(null)
  const [simulationStrategy, setSimulationStrategy] = useState<WorldCupAdminSimulationStrategy>("random")
  const [simulationDryRun, setSimulationDryRun] = useState(false)
  const [simulationMatchId, setSimulationMatchId] = useState<string>("")
  const [simulationResult, setSimulationResult] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isSavingSimulationMode, setIsSavingSimulationMode] = useState(false)
  const [isLoadingTestFixtures, setIsLoadingTestFixtures] = useState(false)
  const aiBuildAbortRef = useRef(false)
  const pageScrollRef = useRef<HTMLDivElement | null>(null)
  const knockoutScrollRef = useRef<HTMLDivElement | null>(null)
  const guidedAutoOpenedRef = useRef(false)
  const latestViewRef = useRef(normalizedInitialView)

  const challengeId = view.challenge.id

  const showCommissionerTab = Boolean(view.isOwner || view.isAdmin)
  const entitlementSummary = useMemo(
    () => resolveWorldCupEntitlementSummary({
      isOwner: view.isOwner,
      isAdmin: view.isAdmin,
      hasBracketBrainAi: view.hasBracketBrainAi,
    }),
    [view.hasBracketBrainAi, view.isAdmin, view.isOwner]
  )
  const tabList = useMemo(() => {
    const list = [...BASE_TABS]
    if (showCommissionerTab) {
      list.push({
        id: "settings",
        label: "Settings",
        icon: Settings,
      })
      list.push({
        id: "commissioner",
        label: "Commissioner",
        icon: Sparkles,
      })
    }
    return list
  }, [showCommissionerTab])

  useEffect(() => {
    latestViewRef.current = view
  }, [view])

  const applyChallengeView = useCallback((nextView: WorldCupChallengeView) => {
    const mergedView = mergeWorldCupChallengeView(latestViewRef.current, nextView)
    latestViewRef.current = mergedView
    setView(mergedView)
    setEntries((prev) => mergeEntryScoresFromView(prev, mergedView))
  }, [])

  const persistSelectedEntryId = useCallback(
    (entryId: string | null) => {
      if (typeof window === "undefined") return
      const key = getSelectedEntryStorageKey(challengeId)
      if (entryId) {
        window.localStorage.setItem(key, entryId)
      } else {
        window.localStorage.removeItem(key)
      }
    },
    [challengeId]
  )

  const syncSelectedEntryUrl = useCallback(
    (entryId: string | null, mode: "push" | "replace" = "replace", targetTab?: "group-stage" | "picks") => {
      if (typeof window === "undefined") return
      const url = new URL(window.location.href)
      if (entryId) {
        const nextTab = targetTab ?? (tab === "group-stage" ? "group-stage" : "picks")
        url.searchParams.set("tab", worldCupTabToQueryValue(nextTab))
        url.searchParams.set("entry", entryId)
      } else {
        url.searchParams.delete("entry")
        if (url.searchParams.get("tab") === "picks" || url.searchParams.get("tab") === "knockouts" || url.searchParams.get("tab") === "group-stage") {
          url.searchParams.delete("tab")
        }
      }
      const nextUrl = url.pathname + (url.search ? url.search : "")
      if (mode === "push") {
        router.push(nextUrl)
      } else {
        router.replace(nextUrl)
      }
    },
    [router, tab]
  )

  const updateTabUrl = useCallback(
    (nextTab: Tab, entryId: string | null = selectedEntryId, mode: "push" | "replace" = "push") => {
      if (typeof window === "undefined") return
      const url = new URL(window.location.href)
      url.searchParams.set("tab", worldCupTabToQueryValue(nextTab))
      if (entryId) {
        url.searchParams.set("entry", entryId)
      } else {
        url.searchParams.delete("entry")
      }
      const nextUrl = url.pathname + (url.search ? url.search : "")
      if (mode === "replace") router.replace(nextUrl)
      else router.push(nextUrl)
    },
    [router, selectedEntryId]
  )

  const confirmLeavingGroupStage = useCallback(() => {
    if (tab !== "group-stage" || !hasUnsavedGroupChanges) return true
    const message = "You have unsaved group changes. Save before leaving, or your changes will be discarded."
    if (typeof window === "undefined") return true
    const confirmed = window.confirm(message)
    if (!confirmed) toast.info("Stayed on Group Stage. Save or discard your group changes before leaving.")
    return confirmed
  }, [hasUnsavedGroupChanges, tab])

  const switchTab = useCallback(
    (nextTab: Tab) => {
      if (nextTab === tab) return
      if (!confirmLeavingGroupStage()) return
      if (tab === "group-stage") setHasUnsavedGroupChanges(false)
      setTab(nextTab)
      updateTabUrl(nextTab)
    },
    [confirmLeavingGroupStage, tab, updateTabUrl]
  )

  const markEntryPicksLoaded = useCallback((entryId: string, nextPicks: WorldCupPickView[]) => {
    setEntryPicks((prev) => ({ ...prev, [entryId]: nextPicks }))
    setLoadedEntryPickIds((prev) => {
      const next = new Set(prev)
      next.add(entryId)
      return next
    })
  }, [])

  const refreshChallengeView = useCallback(async () => {
    const latest = await fetch(`/api/brackets/world-cup/${challengeId}`)
    if (!latest.ok) return
    const data = await latest.json()
    const nextView = normalizeWorldCupView(data.view ?? data.challenge ?? data)
    applyChallengeView(nextView)
    try {
      const refreshedEntries = await listWorldCupBracketEntries(challengeId)
      setEntries(refreshedEntries)
    } catch {
      // The challenge view still carries leaderboard totals; entry-list refresh is best effort.
    }
  }, [applyChallengeView, challengeId])
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
        now: lockNow,
      }),
    [lockNow, selectedEntry, view.challenge, view.matches]
  )
  const isLocked = lockState.locked
  useEffect(() => {
    if (lockState.locked || !lockState.lockAt) return
    const lockAt = new Date(lockState.lockAt)
    if (Number.isNaN(lockAt.getTime())) return
    const delay = lockAt.getTime() - Date.now()
    if (delay <= 0) {
      setLockNow(new Date())
      return
    }
    const timer = window.setTimeout(
      () => setLockNow(new Date()),
      Math.min(delay + 100, 2_147_483_647)
    )
    return () => window.clearTimeout(timer)
  }, [lockState.lockAt, lockState.locked])

  /** Keep lock countdown label fresh on phones while picks stay open */
  useEffect(() => {
    if (isLocked) return
    const id = window.setInterval(() => setLockNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [isLocked])

  const lockCountdownLabel = useMemo(() => {
    if (isLocked) return null
    if (!lockState.lockAt) return null
    const ms = new Date(lockState.lockAt).getTime() - lockNow.getTime()
    if (ms <= 0) return "Bracket locks soon"
    const totalM = Math.floor(ms / 60000)
    const d = Math.floor(totalM / 1440)
    const h = Math.floor((totalM % 1440) / 60)
    const m = totalM % 60
    if (d > 0) return `${d}d ${h}h until picks lock`
    if (h > 0) return `${h}h ${m}m until picks lock`
    return `${Math.max(1, m)}m until picks lock`
  }, [isLocked, lockState.lockAt, lockNow])
  // Picks for the selected entry.
  const picks: WorldCupPickView[] = useMemo(() => {
    if (!selectedEntryId) return []
    return entryPicks[selectedEntryId] ?? []
  }, [selectedEntryId, entryPicks])

  const entryPicksHydrated = useMemo(
    () => !selectedEntryId || loadedEntryPickIds.has(selectedEntryId),
    [selectedEntryId, loadedEntryPickIds]
  )

  const completedPickCount = useMemo(
    () => picks.filter(hasWorldCupPickSelection).length,
    [picks]
  )
  const projectedMatches = useMemo(
    () => buildWorldCupProjectedMatches(view.matches, picks),
    [view.matches, picks]
  )
  const pickableMatches = useMemo(
    () => projectedMatches.filter(isWorldCupMatchPickable),
    [projectedMatches]
  )
  const rawPickableMatches = useMemo(
    () => view.matches.filter(isWorldCupMatchPickable),
    [view.matches]
  )
  const progress = useMemo(
    () => {
      const required = pickableMatches.filter(
        (match) =>
          (match.round !== "third_place" || view.challenge.includeThirdPlace) &&
          isWorldCupMatchPickable(match)
      )
      return {
        done: required.filter((match) => Boolean(findWorldCupPickForMatch(picks, match))).length,
        required: required.length,
      }
    },
    [pickableMatches, picks, view.challenge.includeThirdPlace]
  )
  const projectedPickableMatchCount = pickableMatches.length
  const guidedPicksState = useMemo(
    () => getWorldCupGuidedPicksState(view.matches),
    [view.matches]
  )
  const hasPickableFixtures = projectedPickableMatchCount > 0
  const unresolvedMatchesCount = view.matches.length - rawPickableMatches.length

  const selectedLeaderboardRow = useMemo(
    () => view.leaderboard.find((r) => r.entryId === selectedEntry?.id) ?? null,
    [view.leaderboard, selectedEntry?.id]
  )

  const championStillAliveForSummary = useMemo(() => {
    if (!selectedEntry) return true
    if (selectedLeaderboardRow) return selectedLeaderboardRow.championStillAlive
    return calculateWorldCupBracketHealth(
      {
        championTeamId: selectedEntry.championTeamId,
        totalScore: selectedEntry.totalScore,
        maxPossibleScore: selectedEntry.maxPossibleScore,
      },
      view.matches,
      picks
    ).championAlive
  }, [selectedEntry, selectedLeaderboardRow, view.matches, picks])

  // ── Load entries on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!challengeId || entriesLoaded) return
    setIsEntriesLoading(true)
    listWorldCupBracketEntries(challengeId)
      .then((rows) => {
        setEntries(rows)
        setEntriesLoaded(true)
        // Seed initial view picks only when they belong to the exact active entry,
        // then hydrate the selected entry from the entry-detail API below.
        if (rows.length > 0) {
          if (!shouldAutoSelectInitialEntry) {
            setSelectedEntryId(null)
            persistSelectedEntryId(null)
            return
          }
          const storedEntryId =
            typeof window !== "undefined"
              ? window.localStorage.getItem(getSelectedEntryStorageKey(challengeId))
              : null
          const urlEntryId =
            initialEntryId && rows.some((row) => row.id === initialEntryId) ? initialEntryId : null
          const activeEntryId =
            urlEntryId ??
            (storedEntryId && rows.some((row) => row.id === storedEntryId)
              ? storedEntryId
              : normalizedInitialView.activeEntry?.id ?? rows[0].id)
          const active = rows.find((row) => row.id === activeEntryId) ?? rows[0]
          setSelectedEntryId(active.id)
          persistSelectedEntryId(active.id)
          if (
            normalizedInitialView.activeEntry?.id === active.id &&
            normalizedInitialView.picks.length > 0
          ) {
            setEntryPicks((prev) => ({ ...prev, [active.id]: normalizedInitialView.picks }))
          }
        }
      })
      .catch(() => toast.error("Failed to load bracket entries"))
      .finally(() => setIsEntriesLoading(false))
  }, [challengeId, persistSelectedEntryId, initialEntryId, normalizedInitialView.activeEntry?.id, shouldAutoSelectInitialEntry])

  // ── Entry management callbacks ───────────────────────────────────────────
  const handleCreateEntry = useCallback(async () => {
    setIsCreatingEntry(true)
    try {
      const entry = await createWorldCupBracketEntry(challengeId)
      setEntries((prev) => [...prev, entry])
      markEntryPicksLoaded(entry.id, [])
      setSelectedEntryId(entry.id)
      persistSelectedEntryId(entry.id)
      setTab("group-stage")
      syncSelectedEntryUrl(entry.id, "push", "group-stage")
      toast.success(`Created "${entry.name}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bracket")
    } finally {
      setIsCreatingEntry(false)
    }
  }, [challengeId, markEntryPicksLoaded, persistSelectedEntryId, syncSelectedEntryUrl])

  const handleSelectEntry = useCallback((entryId: string) => {
    setSelectedEntryId(entryId)
    setCompletionReview(null)
    setCompletionError(null)
    setReviewGroupStageView(null)
    setReviewGroupStageError(null)
    persistSelectedEntryId(entryId)
    setTab((current) => current === "group-stage" ? "group-stage" : "picks")
    syncSelectedEntryUrl(entryId, "push")
  }, [persistSelectedEntryId, syncSelectedEntryUrl])

  useEffect(() => {
    if (!selectedEntryId) return
    if (loadedEntryPickIds.has(selectedEntryId)) return

    let cancelled = false
    getWorldCupBracketEntry(challengeId, selectedEntryId)
      .then((detail) => {
        if (cancelled) return
        const detailPicks = Array.isArray(detail?.picks)
          ? (detail.picks as WorldCupPickView[])
          : []
        markEntryPicksLoaded(selectedEntryId, detailPicks)
      })
      .catch(() => {
        if (!cancelled) {
          setEntryPicks((prev) =>
            Object.prototype.hasOwnProperty.call(prev, selectedEntryId)
              ? prev
              : { ...prev, [selectedEntryId]: [] }
          )
          toast.error("Failed to load picks for this bracket")
        }
      })

    return () => {
      cancelled = true
    }
  }, [challengeId, loadedEntryPickIds, markEntryPicksLoaded, selectedEntryId])

  const handleRenameEntry = useCallback(
    async (entryId: string, name: string) => {
      setIsMutatingEntry(true)
      try {
        const updated = await renameWorldCupBracketEntry(challengeId, entryId, name)
        setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, name: updated.name } : e)))
        setView((prev) => ({
          ...prev,
          activeEntry: prev.activeEntry?.id === entryId ? { ...prev.activeEntry, name: updated.name } : prev.activeEntry,
          entries: prev.entries.map((entry) => entry.id === entryId ? { ...entry, name: updated.name } : entry),
          leaderboard: prev.leaderboard.map((row) => row.entryId === entryId ? { ...row, entryName: updated.name } : row),
        }))
        await refreshChallengeView()
        toast.success(`Renamed to "${updated.name}"`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to rename")
      } finally {
        setIsMutatingEntry(false)
      }
    },
    [challengeId, refreshChallengeView]
  )

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      setIsMutatingEntry(true)
      try {
        await deleteWorldCupBracketEntry(challengeId, entryId)
        const nextEntries = entries.filter((e) => e.id !== entryId)
        setEntries(nextEntries)
        if (selectedEntryId === entryId) {
          const nextSelectedEntryId = nextEntries[0]?.id ?? null
          setSelectedEntryId(nextSelectedEntryId)
          persistSelectedEntryId(nextSelectedEntryId)
          syncSelectedEntryUrl(nextSelectedEntryId, nextSelectedEntryId ? "replace" : "push")
        }
        setEntryPicks((prev) => {
          const next = { ...prev }
          delete next[entryId]
          return next
        })
        setLoadedEntryPickIds((prev) => {
          const next = new Set(prev)
          next.delete(entryId)
          return next
        })
        toast.success("Bracket deleted")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete bracket")
      } finally {
        setIsMutatingEntry(false)
      }
    },
    [challengeId, entries, persistSelectedEntryId, selectedEntryId, syncSelectedEntryUrl]
  )

  const loadCompletionReview = useCallback(async () => {
    if (!selectedEntryId) return
    setIsCompletionLoading(true)
    setCompletionError(null)
    setReviewGroupStageError(null)
    try {
      const [review, groupStageView] = await Promise.all([
        fetchWorldCupEntryCompletionReview(challengeId, selectedEntryId),
        fetchWorldCupGroupStageView(challengeId, selectedEntryId),
      ])
      setCompletionReview(review)
      setReviewGroupStageView(groupStageView)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load completion review"
      setCompletionError(message)
      setReviewGroupStageError(message)
    } finally {
      setIsCompletionLoading(false)
    }
  }, [challengeId, selectedEntryId])

  const refreshCompletionReviewAfterMeaningfulEdit = useCallback(() => {
    setCompletionReview(null)
    setCompletionError(null)
    setReviewGroupStageView(null)
    setReviewGroupStageError(null)
    if (tab === "review") void loadCompletionReview()
  }, [loadCompletionReview, tab])

  useEffect(() => {
    if (tab !== "review" || !selectedEntryId) return
    void loadCompletionReview()
  }, [loadCompletionReview, selectedEntryId, tab])

  const handleFinalizeEntry = useCallback(async () => {
    if (!selectedEntryId) return
    setIsFinalizingEntry(true)
    setCompletionError(null)
    try {
      const result = await finalizeWorldCupEntryClient(challengeId, selectedEntryId)
      setCompletionReview(result.completion)
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === selectedEntryId
            ? { ...entry, isComplete: true, isLocked: result.completion.isLocked, submittedAt: result.completion.submittedAt }
            : entry
        )
      )
      if (result.view) {
        applyChallengeView(normalizeWorldCupView(result.view))
      }
      toast.success("Bracket submitted")
    } catch (err) {
      const maybeCompletion = (err as { completion?: WorldCupEntryCompletionReviewClient })?.completion
      if (maybeCompletion) setCompletionReview(maybeCompletion)
      setCompletionError(err instanceof Error ? err.message : "Failed to finalize entry")
    } finally {
      setIsFinalizingEntry(false)
    }
  }, [applyChallengeView, challengeId, selectedEntryId])

  // ── Pick saving ──────────────────────────────────────────────────────────
  async function persistPick(match: WorldCupMatchView, side: "home" | "away") {
    if (!selectedEntryId) {
      toast.error("Select a bracket entry first")
      return
    }
    if (isLocked) {
      setSaveState("locked")
      setSaveError("Bracket is locked.")
      toast.error("Bracket is locked.")
      return
    }
    const currentPicks = entryPicks[selectedEntryId] ?? []
    const selectedTeamId = side === "home" ? match.homeTeamId : match.awayTeamId
    const selectedSlotKey = side === "home" ? match.homeSlotKey : match.awaySlotKey
    const selectedTeamName = side === "home" ? match.homeTeamName : match.awayTeamName
    const reason = getWorldCupUnpickableReason(match)
    const sideIsPickable =
      side === "home"
        ? Boolean(match.homeTeamId && match.homeTeamName)
        : Boolean(match.awayTeamId && match.awayTeamName)
    if (!isWorldCupMatchPickable(match) || !sideIsPickable || !selectedTeamId) {
      setSaveState("error")
      setSaveError(`This matchup is not ready for picks yet (${reason}).`)
      toast.error("This matchup is not ready for picks yet. Sync fixtures or use simulation data.")
      return
    }
    if (savingPickMatchIdsRef.current.has(match.id)) {
      setSaveState("saving")
      setSaveError("That pick is still saving. Please try again.")
      toast.info("That pick is still saving. Please try again.")
      return
    }
    const invalidIds = getInvalidDownstreamPickIds(
      view.matches,
      currentPicks,
      match.id,
      selectedTeamId
    )
    const invalidMatchIds = invalidIds
      .map((id) => currentPicks.find((p) => p.id === id)?.matchId)
      .filter((mid): mid is string => mid !== undefined)
      .filter((mid) => mid !== match.id)
    const existingPick = findWorldCupPickForMatch(currentPicks, match)
    const nextMatchNumber = projectedMatches.find((projected) => projected.id === match.nextMatchId)?.matchNumber ?? null
    if (process.env.NODE_ENV === "development") {
      console.debug("[WorldCupBracketShell:save-pick]", {
        activeEntryId: selectedEntryId,
        matchId: match.id,
        round: match.round,
        matchNumber: match.matchNumber,
        selectedTeamId,
        selectedSlotKey,
        nextMatchNumber,
        existingPickMatchedBy: existingPick ? getWorldCupPickMatchMethod(existingPick, match) : null,
        downstreamPicksCleared: invalidMatchIds,
      })
      if ([29, 30, 31].includes(match.matchNumber)) {
        console.debug("[WorldCupBracketShell:save-pick:knockout-debug]", {
          activeEntryId: selectedEntryId,
          round: match.round,
          matchNumber: match.matchNumber,
          payload: {
            matchId: match.id,
            selectedTeamId,
            selectedSlotKey,
            selectedTeamName,
            matchNumber: match.matchNumber,
          },
          downstreamPicksCleared: invalidMatchIds,
        })
      }
    }

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
        ...(prev[selectedEntryId] ?? []).filter((p) => !worldCupPickMatchesMatch(p, match) && !invalidIds.includes(p.id)),
        optimistic,
      ],
    }))
    setSaveState("saving")
    setSaveError(null)
    savingPickMatchIdsRef.current.add(match.id)
    setSavingPickMatchIds(new Set(savingPickMatchIdsRef.current))

    try {
      if (invalidMatchIds.length > 0) {
        await clearWorldCupBracketEntryPicks(challengeId, selectedEntryId, invalidMatchIds)
      }

      const result = await saveWorldCupBracketEntryPick(challengeId, selectedEntryId, {
        activeEntryId: selectedEntryId,
        matchId: match.id,
        selectedTeamId,
        selectedTeamName,
        selectedSlotKey,
        selectedSide: side,
        round: match.round,
        sourceSlotKey: selectedSlotKey,
        nextMatchId: match.nextMatchId,
        nextMatchSlot: match.nextMatchSlot,
        matchNumber: match.matchNumber,
      })

      // Keep pick saves fast: the save route returns entry/pick state only.
      // Admin/leaderboard/review paths refresh the full challenge view when needed.
      if (result.view) {
        applyChallengeView(normalizeWorldCupView(result.view))
      }

      // Update entry in local list if returned
      if (result.entry) {
        setEntries((prev) =>
          prev.map((e) => (e.id === selectedEntryId ? (result.entry as WorldCupBracketEntryClient) : e))
        )
      }

      // Replace optimistic picks with actual picks from response
      const returnedPicks = Array.isArray(result.picks)
        ? (result.picks as WorldCupPickView[])
        : currentPicks
      markEntryPicksLoaded(selectedEntryId, returnedPicks)
      refreshCompletionReviewAfterMeaningfulEdit()

      if (process.env.NODE_ENV === "development" && [29, 30, 31].includes(match.matchNumber)) {
        const saved = findWorldCupPickForMatch(returnedPicks, match)
        console.debug("[WorldCupBracketShell:save-pick:knockout-return]", {
          activeEntryId: selectedEntryId,
          round: match.round,
          matchNumber: match.matchNumber,
          returnedPickCount: returnedPicks.length,
          matchedBy: saved ? getWorldCupPickMatchMethod(saved, match) : null,
          savedPickId: saved?.id ?? null,
        })
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
        setSaveError("Bracket is locked.")
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
    } finally {
      savingPickMatchIdsRef.current.delete(match.id)
      setSavingPickMatchIds(new Set(savingPickMatchIdsRef.current))
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
        await refreshChallengeView()
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
      if (!syncDryRun) {
        await refreshChallengeView()
      }
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
  }, [challengeId, refreshChallengeView, syncProvider, syncDryRun])

  const runSyncGroupStandings = useCallback(async () => {
    setIsSyncing(true)
    setSyncStandingsResult(null)
    try {
      const result = await adminSyncWorldCupGroupStandings(challengeId, { provider: syncProvider })
      setSyncStandingsResult(result)
      if (result.view) {
        setView(result.view)
      } else {
        await refreshChallengeView()
      }
      toast.success(`Group standings synced: ${result.result.groupTeamsUpdated} team result(s) updated`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync group standings failed")
    } finally {
      setIsSyncing(false)
    }
  }, [challengeId, refreshChallengeView, syncProvider])

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

  const handleLoadTestFixtures = useCallback(async () => {
    const confirmed = window.confirm(
      "Seed demo teams into Round of 32 matches? This will populate 16 first-round matches with test teams so picks can be tested.\n\nExisting picks will not be deleted."
    )
    if (!confirmed) return

    setIsLoadingTestFixtures(true)
    try {
      const response = await adminLoadWorldCupTestFixtures(challengeId, {
        dryRun: simulationDryRun,
      })
      const data = response.result
      const modeLabel = simulationDryRun ? "Dry run" : "Test fixtures seeded"
      const msg = `${modeLabel}: ${data.matchesUpdated} matches updated, ${data.pickableMatchesAfter} pickable, ${data.unresolvedMatchesAfter} unresolved`
      setSimulationResult(msg)
      if (!simulationDryRun) {
        if (response.view) {
          applyChallengeView(normalizeWorldCupView(response.view))
          try {
            const refreshedEntries = await listWorldCupBracketEntries(challengeId)
            setEntries(refreshedEntries)
          } catch {
            // The refreshed challenge view is enough to update fixture readiness.
          }
        } else {
          await refreshChallengeView()
        }
      }
      toast.success(simulationDryRun ? "Seed Test Fixtures dry run complete" : "Test fixtures seeded successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed test fixtures")
    } finally {
      setIsLoadingTestFixtures(false)
    }
  }, [challengeId, refreshChallengeView, simulationDryRun])

  const saveStatus =
    isLocked ? "Bracket Locked"
    : saveState === "saving" ? "Saving..."
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
            pickableMatches,
            picks,
            view.challenge.includeThirdPlace
          )
        : 0,
    [selectedEntry, pickableMatches, view.challenge.includeThirdPlace, picks]
  )
  const firstUnpickedMatchId = useMemo(
    () =>
      findFirstUnpickedMatch(
        pickableMatches,
        picks,
        getOrderedRounds(pickableMatches, view.challenge.includeThirdPlace)
      )?.id ?? null,
    [pickableMatches, picks, view.challenge.includeThirdPlace]
  )
  const firstUnpickedMatch = useMemo(
    () => projectedMatches.find((match) => match.id === firstUnpickedMatchId) ?? null,
    [firstUnpickedMatchId, projectedMatches]
  )
  const blockedFuturePickCount = useMemo(
    () =>
      projectedMatches.filter(
        (match) =>
          (match.round !== "third_place" || view.challenge.includeThirdPlace) &&
          !isWorldCupMatchPickable(match)
      ).length,
    [projectedMatches, view.challenge.includeThirdPlace]
  )
  const computedIsComplete =
    projectedPickableMatchCount > 0 &&
    completedPickCount > 0 &&
    remainingPicks === 0
  const guidedPickerAvailable =
    !isLocked && projectedPickableMatchCount > 0 && (remainingPicks > 0 || computedIsComplete)
  const guidedPickerLabel =
    isLocked
      ? "Bracket Locked"
      : projectedPickableMatchCount === 0
        ? "Fixtures Not Ready"
        : completedPickCount === 0
          ? "Start Making Picks"
          : remainingPicks > 0
            ? "Continue Guided Picks"
            : "Review Guided Picks"
  const openNextActionablePick = useCallback(() => {
    if (!guidedPickerAvailable || !firstUnpickedMatchId) {
      toast.info(
        blockedFuturePickCount > 0
          ? "Pick earlier round winners first. More matchups unlock as your bracket advances."
          : "No available knockout picks are ready right now."
      )
      return
    }
    setGuidedInitialMatchId(firstUnpickedMatchId)
    setIsGuidedPickerOpen(true)
  }, [blockedFuturePickCount, firstUnpickedMatchId, guidedPickerAvailable])
  const showSeedTestFixturesCta =
    !isLocked &&
    (view.isOwner || view.isAdmin) &&
    (guidedPicksState === "fixtures_not_synced" || guidedPicksState === "fixtures_not_ready")

  const participantCount = Math.max(
    view.leaderboard.length > 0 ? new Set(view.leaderboard.map((row) => row.userId)).size : 0,
    view.participant ? 1 : 0
  )
  const inviteUrl = getBrowserWorldCupInviteUrl({
    inviteCode: view.challenge.inviteCode,
    fallbackInviteUrl: view.challenge.inviteUrl,
  })
  const fixturesReadyLabel =
    guidedPicksState === "ready"
      ? `${projectedPickableMatchCount} pickable matchup${projectedPickableMatchCount === 1 ? "" : "s"} ready`
      : guidedPicksState === "fixtures_not_synced"
        ? "Fixtures have not been synced yet"
        : "Fixtures loaded, but teams are still placeholders"

  async function copyPoolInvite() {
    if (!inviteUrl) return
    await navigator.clipboard?.writeText(getBrowserWorldCupInviteUrl({
      inviteCode: view.challenge.inviteCode,
      fallbackInviteUrl: view.challenge.inviteUrl,
    }))
    toast.success("Invite link copied")
  }

  useEffect(() => {
    if (!initialGuidedOpen || guidedAutoOpenedRef.current) return
    if (!selectedEntryId || !entriesLoaded) return
    if (!loadedEntryPickIds.has(selectedEntryId)) return
    const picksForEntry = entryPicks[selectedEntryId] ?? []
    if (picksForEntry.length > 0) return
    if (!guidedPickerAvailable) return

    guidedAutoOpenedRef.current = true
    setGuidedInitialMatchId(null)
    setIsGuidedPickerOpen(true)

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("guided")
      url.searchParams.delete("entry")
      router.replace(url.pathname + (url.search ? url.search : ""))
    }
  }, [
    initialGuidedOpen,
    selectedEntryId,
    entriesLoaded,
    loadedEntryPickIds,
    entryPicks,
    guidedPickerAvailable,
    router,
  ])

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const tournamentStartAt =
      view.challenge.effectivePickLockAt ??
      view.matches
        .map((match) => match.startsAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ??
      null

    console.debug("[WorldCupBracketShell:debug]", {
      activeEntryId: selectedEntryId,
      "activeEntry.picks.length": picks.length,
      completedPickCount,
      projectedPickableMatchCount,
      remainingPickCount: remainingPicks,
      isComplete: computedIsComplete,
      entryIsCompleteFlag: selectedEntry?.isComplete ?? null,
      firstUnpickedMatchId,
      bracketLocked: isLocked,
      lockAt: view.challenge.pickLockAt,
      tournamentStartAt,
    })
  }, [
    completedPickCount,
    computedIsComplete,
    firstUnpickedMatchId,
    isLocked,
    picks.length,
    projectedPickableMatchCount,
    remainingPicks,
    selectedEntryId,
    selectedEntry?.isComplete,
    view.challenge.effectivePickLockAt,
    view.challenge.pickLockAt,
    view.matches,
  ])

  // ── Guided picker save handler ───────────────────────────────────────────
  const handleGuidedSavePick = useCallback(
    async (
      payload: GuidedPickPayload,
      currentPicks: WorldCupPickView[],
      options?: { suppressToast?: boolean }
    ): Promise<WorldCupPickView[]> => {
      if (!selectedEntryId) throw new Error("No entry selected")
      if (isLocked) throw new Error("Bracket is locked.")
      if (payload.activeEntryId !== selectedEntryId) {
        throw new Error("This pick belongs to a different bracket entry")
      }
      assertWorldCupPickPayloadReady(payload)

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
        .filter((mid) => mid !== payload.matchId)
      const projectedForSave = buildWorldCupProjectedMatches(view.matches, currentPicks)
      const payloadMatch =
        projectedForSave.find((match) => match.id === payload.matchId) ??
        projectedForSave.find(
          (match) => match.round === payload.round && match.matchNumber === payload.matchNumber
        )
      const nextMatchNumber = projectedForSave.find((match) => match.id === payload.nextMatchId)?.matchNumber ?? null
      const existingPick = payloadMatch ? findWorldCupPickForMatch(currentPicks, payloadMatch) : null
      if (process.env.NODE_ENV === "development") {
        console.debug("[WorldCupBracketShell:guided-save-pick]", {
          activeEntryId: selectedEntryId,
          matchId: payload.matchId,
          round: payload.round,
          matchNumber: payload.matchNumber,
          selectedTeamId: payload.selectedTeamId,
          selectedSlotKey: payload.selectedSlotKey,
          nextMatchNumber,
          existingPickMatchedBy: payloadMatch && existingPick ? getWorldCupPickMatchMethod(existingPick, payloadMatch) : null,
          downstreamPicksCleared: invalidMatchIds,
        })
      }

      if (invalidMatchIds.length > 0) {
        await clearWorldCupBracketEntryPicks(
          challengeId,
          selectedEntryId,
          invalidMatchIds
        )
      }

      // Save the actual pick
      const result = await saveWorldCupBracketEntryPick(challengeId, selectedEntryId, {
        activeEntryId: selectedEntryId,
        matchId: payload.matchId,
        selectedTeamId: payload.selectedTeamId,
        selectedTeamName: payload.selectedTeamName ?? undefined,
        selectedSlotKey: payload.selectedSlotKey,
        selectedSide: payload.selectedSide,
        round: payload.round,
        sourceSlotKey: payload.sourceSlotKey,
        nextMatchId: payload.nextMatchId,
        nextMatchSlot: payload.nextMatchSlot,
        matchNumber: payload.matchNumber,
      })

      const returnedPicks = Array.isArray(result.picks)
        ? (result.picks as WorldCupPickView[])
        : currentPicks

      // Update shell entry picks state
      markEntryPicksLoaded(selectedEntryId, returnedPicks)
      refreshCompletionReviewAfterMeaningfulEdit()

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

      // Save responses are intentionally minimal so later-round picks remain fast.
      // Full challenge refreshes happen from explicit dashboard/leaderboard/review actions.
      if (result.view) {
        applyChallengeView(normalizeWorldCupView(result.view))
      }

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
    [applyChallengeView, challengeId, isLocked, markEntryPicksLoaded, refreshCompletionReviewAfterMeaningfulEdit, selectedEntryId, view.matches]
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
              !findWorldCupPickForMatch(currentPicks, m)
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
            activeEntryId: selectedEntryId,
            matchId: match.id,
            selectedTeamId: rec.recommendedTeamId,
            selectedTeamName: rec.recommendedTeamName,
            selectedSlotKey: rec.recommendedSide === "home" ? match.homeSlotKey : match.awaySlotKey,
            selectedSide: rec.recommendedSide ?? "home",
            round: match.round,
            sourceSlotKey: rec.recommendedSide === "home" ? match.homeSlotKey : match.awaySlotKey,
            nextMatchId: match.nextMatchId,
            nextMatchSlot: match.nextMatchSlot,
            matchNumber: match.matchNumber,
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

  useEffect(() => {
    if (tab !== "picks") return
    window.requestAnimationFrame(() => {
      if (knockoutScrollRef.current) knockoutScrollRef.current.scrollLeft = 0
      const nestedBoard = knockoutScrollRef.current?.querySelector<HTMLElement>('[data-testid="world-cup-knockout-board-scroll"]')
      if (nestedBoard) nestedBoard.scrollLeft = 0
    })
  }, [selectedEntryId, tab])

  const scrollToAnchor = useCallback(
    (anchorId: string, nextTab?: Tab) => {
      const tabChanged = Boolean(nextTab && tab !== nextTab)
      if (nextTab && tab !== nextTab) {
        if (!confirmLeavingGroupStage()) return
        if (tab === "group-stage") setHasUnsavedGroupChanges(false)
        setTab(nextTab)
        updateTabUrl(nextTab)
      }

      window.requestAnimationFrame(() => {
        window.setTimeout(
          () => {
            const anchor = document.getElementById(anchorId)
            if (!anchor) return
            anchor.scrollIntoView({ behavior: "smooth", block: "start" })
          },
          tabChanged ? 70 : 0
        )
      })
    },
    [confirmLeavingGroupStage, tab, updateTabUrl]
  )

  return (
    <div id="world-cup-top" className="fixed inset-0 z-50 flex flex-col bg-[#05070b] text-white">
      <header className="shrink-0 border-b border-white/10 bg-zinc-950/95 backdrop-blur pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
          {showBoard ? (
            <button
              type="button"
              onClick={() => {
                setSelectedEntryId(null)
                persistSelectedEntryId(null)
                syncSelectedEntryUrl(null, "push")
              }}
              className="min-h-11 min-w-11 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/70 touch-manipulation"
              title="Back to Knockouts"
              aria-label="Back to Knockouts"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/brackets"
              className="min-h-11 min-w-11 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/70 touch-manipulation"
              aria-label="Back to brackets hub"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            {showBoard && headerRenameOpen ? (
              <form
                className="flex min-w-0 items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const nextName = headerRenameValue.trim()
                  if (!selectedEntry || nextName.length < 2 || nextName.length > 60) return
                  void handleRenameEntry(selectedEntry.id, nextName).then(() => setHeaderRenameOpen(false))
                }}
              >
                <input
                  autoFocus
                  value={headerRenameValue}
                  onChange={(event) => setHeaderRenameValue(event.target.value)}
                  maxLength={64}
                  className="min-w-0 flex-1 rounded-lg border border-cyan-300/30 bg-black/40 px-2 py-1 text-sm font-black text-white outline-none"
                  aria-label="Bracket name"
                />
                <button
                  type="submit"
                  disabled={headerRenameValue.trim().length < 2 || headerRenameValue.trim().length > 60 || isMutatingEntry}
                  className="rounded-lg bg-cyan-300 px-2 py-1 text-[11px] font-black text-black disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setHeaderRenameOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-1 text-white/55"
                  aria-label="Cancel rename"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-sm font-black leading-tight text-white sm:text-lg">
                  {showBoard ? selectedEntry!.name : view.challenge.name}
                </h1>
                {showBoard && selectedEntry ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderRenameValue(selectedEntry.name)
                      setHeaderRenameOpen(true)
                    }}
                    disabled={isMutatingEntry}
                    className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-white/45 hover:text-white disabled:opacity-40"
                    aria-label="Rename bracket"
                    title="Rename bracket"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            )}
            <p className={`text-[10px] sm:text-[11px] ${saveState === "locked" || saveState === "error" ? "text-rose-300" : "text-white/45"}`}>
              {showBoard ? (
                <>
                  <span className="block truncate text-white/55">{view.challenge.name}</span>
                  <span className="mt-0.5 block">
                    {progress.done} of {progress.required} picks · {saveStatus}
                  </span>
                </>
              ) : (
                <span className="line-clamp-2">{view.challenge.name}</span>
              )}
            </p>
            {lockCountdownLabel ? (
              <p
                data-testid="world-cup-lock-countdown"
                className="mt-1 inline-flex max-w-full items-center rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-100/95"
              >
                {lockCountdownLabel}
              </p>
            ) : null}
          </div>
          {/* Entry switcher dropdown — visible when in board mode and multiple entries */}
          {showBoard && entries.length > 1 && (
            <select
              data-testid="world-cup-entry-switcher"
              value={selectedEntryId ?? ""}
              onChange={(e) => handleSelectEntry(e.target.value)}
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
            onClick={() => switchTab("invite")}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-black touch-manipulation sm:min-h-0 sm:min-w-0"
            aria-label="Invite friends"
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Invite</span>
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
        <nav
          aria-label="Section tabs"
          className="flex gap-px overflow-x-auto px-2 pb-1.5 [scrollbar-width:none] sm:px-4 sm:pb-2 [&::-webkit-scrollbar]:hidden"
        >
          {tabList.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide touch-manipulation ${tab === id ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50" : "border-transparent bg-white/[0.04] text-white/55"}`}
            >
              <Icon className="h-3 w-3 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div ref={pageScrollRef} className="flex-1 overflow-y-auto scroll-smooth">
        <nav
          data-testid="world-cup-sticky-subnav"
          className="sticky top-0 z-40 border-b border-white/10 bg-[#04060acc]/95 px-1 py-1 backdrop-blur sm:px-2"
        >
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:justify-center sm:pb-0 touch-pan-x">
            <JumpButton label="Top" onClick={() => scrollToAnchor("world-cup-top")} />
            <JumpButton label="Group Stage" onClick={() => scrollToAnchor("world-cup-group-stage", "group-stage")} />
            <JumpButton label="Knockouts" onClick={() => scrollToAnchor("world-cup-picks", "picks")} />
            <JumpButton label="Round of 32" onClick={() => {
              scrollToAnchor("world-cup-bracket", "picks")
              window.requestAnimationFrame(() => {
                if (knockoutScrollRef.current) knockoutScrollRef.current.scrollLeft = 0
                const nestedBoard = knockoutScrollRef.current?.querySelector<HTMLElement>('[data-testid="world-cup-knockout-board-scroll"]')
                if (nestedBoard) nestedBoard.scrollLeft = 0
              })
            }} />
            {(view.isOwner || view.isAdmin) ? (
              <JumpButton label="Admin/Test" onClick={() => scrollToAnchor("world-cup-admin", "picks")} />
            ) : null}
            <JumpButton label="Leaderboard" onClick={() => scrollToAnchor("world-cup-leaderboard", "leaderboard")} />
            <JumpButton label="Invite" onClick={() => scrollToAnchor("world-cup-invite", "invite")} />
          </div>
        </nav>

        {tab === "picks" && showBoard ? (
          <div className="sticky top-0 z-30 border-b border-white/10 bg-[#05070b]/92 px-3 py-2 backdrop-blur sm:hidden">
            <button
              data-testid="world-cup-mobile-start-picks-cta"
              type="button"
              disabled={!guidedPickerAvailable}
              onClick={openNextActionablePick}
              className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-black touch-manipulation disabled:bg-cyan-300/40 disabled:text-black/50"
            >
              <PlayCircle className="h-5 w-5 shrink-0" aria-hidden />
              {guidedPickerLabel}
            </button>
          </div>
        ) : null}

        {/* Entry header strip — shown when a bracket is open in picks tab */}
        {showBoard && (
        <div id="world-cup-picks" className="border-b border-white/[0.07] bg-white/[0.03] pb-2">
          <WorldCupScoreSummary
            entry={selectedEntry!}
            leaderboardRow={selectedLeaderboardRow}
            championStillAlive={championStillAliveForSummary}
            isLocked={isLocked}
            fixturesReady={hasPickableFixtures}
            scoresSynced={Boolean(view.challenge.lastSyncedAt)}
          />
          <WorldCupRoundBreakdown
            roundBreakdown={
              selectedLeaderboardRow?.roundBreakdown ?? selectedEntry!.roundBreakdown ?? {}
            }
            scoring={view.scoring}
            includeThirdPlace={view.challenge.includeThirdPlace}
          />
          {/* Guided picks button */}
          {!isLocked ? (
            <div className="flex justify-center px-4 py-2">
              <button
                type="button"
                disabled={!guidedPickerAvailable}
                onClick={openNextActionablePick}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:bg-cyan-300/45"
              >
                <PlayCircle className="h-4 w-4" />
                {guidedPickerLabel}
              </button>
            </div>
          ) : (
            <div className="flex justify-center px-4 py-2">
              <span className="rounded-lg border border-rose-400/30 bg-rose-400/15 px-3 py-2 text-xs font-bold text-rose-100">Bracket Locked</span>
            </div>
          )}

          {!isLocked && guidedPicksState === "fixtures_not_synced" && (
            <div className="px-4 pb-3 text-center text-[11px] text-white/50">
              <p>Picks open after World Cup fixtures are synced or test fixtures are seeded for this pool.</p>
              {showSeedTestFixturesCta && (
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadTestFixtures()}
                    disabled={isLoadingTestFixtures || isSimulating}
                    className="rounded-lg border border-amber-400/60 bg-amber-900/40 px-4 py-2 text-[12px] font-bold text-amber-100 hover:bg-amber-900/60 disabled:opacity-50"
                  >
                    {isLoadingTestFixtures ? "Seeding..." : "Seed Test Fixtures"}
                  </button>
                </div>
              )}
            </div>
          )}

          {!isLocked && guidedPicksState === "fixtures_not_ready" && (
            <div className="mx-4 mb-3 rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
              <p className="mb-2 text-center">
                Fixtures are loaded, but team matchups are not resolved yet. Run Sync Fixtures or use simulation/test data before making picks.
              </p>
              {showSeedTestFixturesCta && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadTestFixtures()}
                    disabled={isLoadingTestFixtures || isSimulating}
                    className="rounded-lg border border-amber-400/60 bg-amber-900/40 px-4 py-2 text-[12px] font-bold text-amber-100 hover:bg-amber-900/60 disabled:opacity-50"
                  >
                    {isLoadingTestFixtures ? "Seeding..." : "Seed Test Fixtures"}
                  </button>
                </div>
              )}
            </div>
          )}

          {(view.isOwner || view.isAdmin) && (
            <div className="mx-4 mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/55">
              Debug counts: total matches {view.matches.length} · pickable matches {pickableMatches.length} · unresolved matches {Math.max(unresolvedMatchesCount, 0)}
            </div>
          )}

          {!isLocked && selectedEntry && (
            <div className="mx-3 mb-4 max-h-[min(280px,45vh)] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:mx-4 sm:max-h-none sm:overflow-visible">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                AI Bracket Builder
              </div>
              <p className="mb-2 text-[10px] text-white/35 sm:hidden">
                Optional — scroll on small screens; guided picks above are the primary flow.
              </p>
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
            <div id="world-cup-admin" className="mx-4 mb-2 h-0" aria-hidden="true" />
            <WorldCupReadinessPanel
              challengeId={challengeId}
              seasonYear={view.challenge.seasonYear}
            />
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
                    <span>Brackets: {integrityReport.stats.entries}</span>
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

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleLoadTestFixtures()}
                  disabled={isLoadingTestFixtures || isSimulating}
                  title="Adds demo teams to unresolved Round of 32 matches so picks and simulation can be tested before real World Cup fixtures are synced."
                  className="rounded-lg border border-amber-400/50 bg-amber-900/30 px-3 py-1.5 text-[11px] font-bold text-amber-100 hover:bg-amber-900/50 disabled:opacity-50"
                >
                  {isLoadingTestFixtures ? "Seeding..." : "Seed Test Fixtures"}
                </button>
              </div>
              <p className="mb-3 text-[11px] text-amber-100/80">
                Adds demo teams to unresolved Round of 32 matches so picks and simulation can be tested before real World Cup fixtures are synced.
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
                <button
                  type="button"
                  onClick={() => void runSyncGroupStandings()}
                  disabled={isSyncing || syncDryRun}
                  title={syncDryRun ? "Disable dry run before applying official standings." : "Apply provider group standings, derive third-place actuals, and recalculate leaderboard."}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/80 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListOrdered className="h-3.5 w-3.5" />}
                  Sync Group Standings
                </button>
              </div>

              {/* Sync results */}
              {syncTeamsResult && (
                <SyncResultRow
                  label="Teams"
                  result={syncTeamsResult}
                  extra={
                    syncTeamsResult.officialGroupsReady
                      ? `Official groups ready (${syncTeamsResult.groupsAssigned ?? 0}/48 assigned)`
                      : syncTeamsResult.incompleteGroups?.length
                        ? `${syncTeamsResult.groupsAssigned ?? 0}/48 assigned; ${syncTeamsResult.incompleteGroups.length} incomplete group(s)`
                        : undefined
                  }
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
              {syncStandingsResult && (
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[11px]">
                  <div className="flex flex-wrap gap-3 text-white/60">
                    <span>Standings <span className="font-bold text-white/80">{syncStandingsResult.result.standingsReceived}</span></span>
                    <span>Groups <span className="font-bold text-white/80">{syncStandingsResult.result.groupsUpdated}</span></span>
                    <span>Teams <span className="font-bold text-white/80">{syncStandingsResult.result.groupTeamsUpdated}</span></span>
                    <span>Third-place <span className="font-bold text-white/80">{syncStandingsResult.result.thirdPlaceTeamsUpdated}</span></span>
                  </div>
                  {syncStandingsResult.result.warnings?.slice(0, 2).map((w) => (
                    <p key={w} className="mt-1 text-amber-300">{w}</p>
                  ))}
                  <p className="mt-1 text-white/30">{new Date(syncStandingsResult.syncedAt).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      )}

      <main className="min-h-0 px-2 pb-24 pt-3 sm:px-4 sm:pb-8">
        {tab === "home" ? (
          <div className="space-y-4 pb-28 sm:pb-8">
            <section className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 px-2 sm:px-0">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/70">
                    World Cup Pool Dashboard
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-black text-white">
                    {view.challenge.name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                    Start here: create or open your bracket, rank all Group Stage pools, make Knockout picks, review, then finalize to appear on the leaderboard.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyPoolInvite}
                    disabled={!inviteUrl}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 disabled:opacity-40"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab("invite")}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/75"
                  >
                    <Share2 className="h-4 w-4" />
                    Invite Panel
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PoolStatCard label="Participants" value={`${participantCount}/${view.challenge.maxParticipants}`} />
                <PoolStatCard label="Entries" value={`${entries.length}/${view.challenge.maxEntriesPerParticipant}`} />
                <PoolStatCard label="Finalized Entries" value={String(view.leaderboard.length)} />
                <PoolStatCard label="Fixture Status" value={guidedPicksState === "ready" ? "Ready" : "Not Ready"} tone={guidedPicksState === "ready" ? "ready" : "warn"} />
              </div>
            </section>

            <WorldCupPremiumAccessPanel
              entitlementSummary={entitlementSummary}
              maxEntriesPerParticipant={view.challenge.maxEntriesPerParticipant}
              currentEntryCount={entries.length}
              isOwnerOrAdmin={Boolean(view.isOwner || view.isAdmin)}
            />

            <WorldCupCommunityFoundationPanel
              challengeId={challengeId}
              entitlementSummary={entitlementSummary}
            />

            <section className="mx-auto max-w-[min(100%,1600px)] px-2 sm:px-4">
              <AllFantasyBracketBoard
                mode={dashboardPreviewMode === "starting" ? "preview" : "ai"}
                isReadOnly
                showBranding
                toolbar={
                  <WorldCupDashBracketPreviewToolbar
                    dashboardPreviewMode={dashboardPreviewMode}
                    setDashboardPreviewMode={setDashboardPreviewMode}
                    onOpenOrCreateBracket={() => {
                      if (selectedEntryId) {
                        handleSelectEntry(selectedEntryId)
                      } else if (entries[0]?.id) {
                        handleSelectEntry(entries[0].id)
                      } else {
                        void handleCreateEntry()
                      }
                    }}
                    isCreatingEntry={isCreatingEntry}
                    openDisabled={isCreatingEntry || (isLocked && !selectedEntryId && entries.length === 0)}
                    openLabel={selectedEntryId || entries.length > 0 ? "Open My Bracket" : "Create My Bracket"}
                  />
                }
              >
                {dashboardPreviewMode === "starting" ? (
                  <WorldCupCompactBracketPreview matches={view.matches} />
                ) : (
                  <AiSimulationLockPanel isCommissioner={Boolean(view.isOwner || view.isAdmin)} />
                )}
              </AllFantasyBracketBoard>
            </section>

            <section className="mx-auto grid max-w-5xl gap-4 px-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] sm:px-0">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white">Entries</h3>
                    <p className="mt-1 text-xs text-white/45">
                      Create or open your personal bracket when you are ready to make picks. Free play supports one bracket entry; AF Commissioner pool settings can allow multiple entries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateEntry}
                    disabled={isLocked || isCreatingEntry || entries.length >= view.challenge.maxEntriesPerParticipant}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isCreatingEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {isCreatingEntry ? "Creating..." : "Create My Bracket"}
                  </button>
                </div>

                {isEntriesLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading entries...
                  </div>
                ) : entries.length > 0 ? (
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleSelectEntry(entry.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left hover:bg-white/[0.06]"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">{entry.name}</div>
                          <div className="mt-1 text-xs text-white/45">
                            {entry.isComplete ? "Complete" : "Not complete"} · {entry.totalScore} pts · {entry.rank ? `Rank #${entry.rank}` : "Unranked"}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-black text-black">
                          Open Bracket
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
                    <Trophy className="mx-auto h-8 w-8 text-cyan-200/50" />
                    <p className="mt-3 text-sm font-black text-white">No brackets created yet</p>
                    <p className="mt-1 text-xs text-white/45">
                      Create your personal bracket first, then you can make picks once fixtures are ready.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <h3 className="text-base font-black text-white">Fixture Readiness</h3>
                  <p className="mt-1 text-sm text-white/55">{fixturesReadyLabel}</p>
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white/50">
                    {guidedPicksState === "ready" ? (
                      <p>Round of 32 matchups have teams and can be picked. Test fixtures are marked as test data when used.</p>
                    ) : (
                      <p>
                        Picks stay blocked while matchups are placeholders like Group Winner or Winner Match. Sync official fixtures when available, or seed test fixtures for local QA.
                      </p>
                    )}
                  </div>
                  {(view.isOwner || view.isAdmin) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {showSeedTestFixturesCta ? (
                        <button
                          type="button"
                          onClick={() => void handleLoadTestFixtures()}
                          disabled={isLoadingTestFixtures || isSimulating}
                          className="rounded-lg border border-amber-400/60 bg-amber-900/40 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-900/60 disabled:opacity-50"
                        >
                          {isLoadingTestFixtures ? "Seeding..." : "Seed Test Fixtures"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void runSyncFixtures()}
                        disabled={isSyncing}
                        className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/75 disabled:opacity-50"
                      >
                        {isSyncing ? "Syncing..." : "Sync Fixtures"}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchTab("settings")}
                        className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/75"
                      >
                        Commissioner Settings
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <h3 className="text-base font-black text-white">Leaderboard Preview</h3>
                  {view.leaderboard.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {view.leaderboard.slice(0, 5).map((row) => (
                        <div key={row.entryId} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs">
                          <span className="min-w-0 truncate text-white/70">#{row.rank} {row.entryName}</span>
                          <span className="font-black text-cyan-100">{row.totalScore} pts</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/40">
                      No scored brackets yet. Brackets appear here after users create them and scoring begins.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => switchTab("leaderboard")}
                    className="mt-3 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/70"
                  >
                    Open Full Leaderboard
                  </button>
                </div>

              </div>
            </section>
          </div>
        ) : null}
        {tab === "picks" ? (
          selectedEntry ? (
            <section id="world-cup-bracket" className="space-y-3">
              <div className="sticky top-[3.35rem] z-30 rounded-xl border border-white/10 bg-zinc-950/95 p-2 backdrop-blur sm:top-[3.6rem]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {!isLocked ? (
                    <button
                      type="button"
                      disabled={!guidedPickerAvailable}
                      onClick={openNextActionablePick}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:bg-cyan-300/45"
                    >
                      <PlayCircle className="h-4 w-4" />
                      {guidedPickerLabel}
                    </button>
                  ) : (
                    <span className="rounded-lg border border-rose-400/30 bg-rose-400/15 px-3 py-2 text-xs font-bold text-rose-100">Bracket Locked</span>
                  )}
                  <div
                    data-testid="world-cup-knockout-pick-guidance"
                    className="min-w-[min(100%,24rem)] rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-white/55"
                  >
                    <p className="font-bold text-white/75">
                      {progress.done}/{progress.required} currently available picks complete.
                    </p>
                    <p className="mt-1">
                      {firstUnpickedMatch
                        ? `Next pick: Match ${firstUnpickedMatch.matchNumber}.`
                        : blockedFuturePickCount > 0
                          ? "Pick earlier round winners first. More picks unlock as prior winners are selected."
                          : "No available knockout picks are ready right now."}
                    </p>
                  </div>
                  {!isLocked && guidedPicksState !== "ready" ? (
                    <div className="min-w-[min(100%,22rem)] rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                      <p className="font-bold">Knockout teams are not loaded yet.</p>
                      <p className="mt-1 text-amber-100/80">
                        Load test teams for local QA or sync official fixtures when available.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {showSeedTestFixturesCta ? (
                      <button
                        type="button"
                        onClick={() => void handleLoadTestFixtures()}
                        disabled={isLoadingTestFixtures || isSimulating}
                        className="rounded-lg border border-amber-400/60 bg-amber-900/40 px-3 py-2 text-[11px] font-bold text-amber-100 hover:bg-amber-900/60 disabled:opacity-50"
                      >
                        {isLoadingTestFixtures ? "Loading..." : "Load Test Knockout Teams"}
                      </button>
                    ) : null}
                    {(view.isOwner || view.isAdmin) ? (
                      <button
                        type="button"
                        onClick={() => scrollToAnchor("world-cup-admin", "picks")}
                        className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-bold text-white/70"
                      >
                        Jump to Admin/Test
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => scrollToAnchor("world-cup-top")}
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-bold text-white/70"
                    >
                      ↑ Top
                    </button>
                  </div>
                </div>
              </div>

              <div ref={knockoutScrollRef} data-testid="world-cup-bracket-scroll" className="max-h-[72vh] overflow-auto">
                {entryPicksHydrated ? (
                  <AllFantasyBracketBoard mode="pick" isReadOnly={false} showBranding frameClassName="w-max min-w-max !overflow-visible" contentClassName="min-h-0 w-max min-w-max">
                    <WorldCupBracketBoard
                      view={view}
                      picks={picks}
                      isLocked={isLocked}
                      savingMatchIds={savingPickMatchIds}
                      onPick={persistPick}
                      onOpenMatchupPicker={(matchId) => {
                        if (!hasPickableFixtures) {
                          toast.info("This matchup is not ready for picks yet. Sync fixtures or use simulation data.")
                          return
                        }
                        setGuidedInitialMatchId(matchId)
                        setIsGuidedPickerOpen(true)
                      }}
                    />
                  </AllFantasyBracketBoard>
                ) : (
                  <AllFantasyBracketBoard mode="pick" isReadOnly showBranding contentClassName="min-h-0">
                    <AllFantasyBracketPickSkeleton />
                  </AllFantasyBracketBoard>
                )}
              </div>
            </section>
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
        {tab === "group-stage" ? (
          <div id="world-cup-group-stage" className="pb-8">
            {selectedEntry ? (
              <WorldCupGroupStagePicks
                challengeId={challengeId}
                entryId={selectedEntry.id}
                onDirtyChange={setHasUnsavedGroupChanges}
                onCompletionChanged={() => {
                  setHasUnsavedGroupChanges(false)
                  refreshCompletionReviewAfterMeaningfulEdit()
                }}
              />
            ) : (
              <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-center">
                <Trophy className="mx-auto h-8 w-8 text-cyan-200/50" />
                <h2 className="mt-3 text-xl font-black text-white">Create an entry first</h2>
                <p className="mt-2 text-sm text-white/50">
                  Group-stage picks are saved per bracket entry. Create or open an entry before ranking groups.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {entries[0]?.id ? (
                    <button
                      type="button"
                      onClick={() => handleSelectEntry(entries[0].id)}
                      className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black"
                    >
                      Open My Bracket
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleCreateEntry}
                    disabled={isLocked || isCreatingEntry || entries.length >= view.challenge.maxEntriesPerParticipant}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/75 disabled:opacity-45"
                  >
                    {isCreatingEntry ? "Creating..." : "Create My Bracket"}
                  </button>
                </div>
              </section>
            )}
          </div>
        ) : null}
        {tab === "review" ? (
          <div id="world-cup-review" className="mx-auto max-w-4xl pb-8">
            {selectedEntry ? (
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">Review & Finalize</h2>
                    <p className="mt-1 text-sm text-white/50">
                      Finalize only after group stage and knockout picks are complete. You can still edit until the lock deadline.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadCompletionReview()}
                    disabled={isCompletionLoading}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/75 disabled:opacity-45"
                  >
                    {isCompletionLoading ? "Checking..." : "Refresh Review"}
                  </button>
                </div>

                {completionError ? (
                  <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                    {completionError}
                  </p>
                ) : null}

                {isCompletionLoading && !completionReview ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading completion review...
                  </div>
                ) : completionReview ? (
                  <div data-testid="world-cup-review-panel" className="mt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <PoolStatCard
                        label="Groups Ranked"
                        value={`${completionReview.groupsRankedCount}/12`}
                        tone={completionReview.groupsRankedCount === 12 ? "ready" : "warn"}
                      />
                      <PoolStatCard
                        label="Third-place"
                        value={`${completionReview.thirdPlaceSelectedCount}/8`}
                        tone={completionReview.thirdPlaceSelectedCount === 8 ? "ready" : "warn"}
                      />
                      <PoolStatCard
                        label="Knockout Picks"
                        value={`${completionReview.completedKnockoutPicks}/${completionReview.requiredKnockoutPicks}`}
                        tone={completionReview.knockoutComplete ? "ready" : "warn"}
                      />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">
                      <p className="font-bold text-white/80">Scoring note</p>
                      <p className="mt-1 text-xs leading-5 text-white/50">
                        Scores update as official or test results become available. Finalize when your entry is ready; edits remain available until the pool lock deadline.
                      </p>
                    </div>

                    <div data-testid="world-cup-review-saved-picks" className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-black text-white">Saved Group Stage Picks</p>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">
                            User picks · official results shown separately
                          </span>
                        </div>
                        {reviewGroupStageError ? (
                          <p className="mt-2 rounded-lg border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                            {reviewGroupStageError}
                          </p>
                        ) : reviewGroupStageView ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {reviewGroupStageView.groups.map((group) => {
                              const groupPicks = reviewGroupStageView.groupRankingPicks
                                .filter((pick) => pick.groupId === group.id)
                                .sort((a, b) => a.predictedRank - b.predictedRank)
                              return (
                                <div key={group.id} data-testid={`world-cup-review-group-${group.groupKey}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-xs font-black text-white">{group.displayName}</p>
                                    <span className="text-[10px] text-white/35">{groupPicks.length}/4 saved</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {groupPicks.length > 0 ? groupPicks.map((pick) => {
                                      const result = worldCupReviewStatusLabel(pick)
                                      return (
                                        <div key={pick.id} data-result-state={result.status} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs">
                                          <span className="min-w-0 truncate text-white/75">
                                            #{pick.predictedRank} {teamNameFromGroupStageReview(reviewGroupStageView, pick.teamId)}
                                          </span>
                                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${worldCupReviewStatusClass(result.status)}`}>
                                            {result.label}
                                          </span>
                                        </div>
                                      )
                                    }) : (
                                      <p className="rounded-md border border-amber-300/20 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-100">No saved ranking yet.</p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-white/40">Loading saved group-stage picks...</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-sm font-black text-white">Saved Third-Place Advancers</p>
                        {reviewGroupStageView ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {reviewGroupStageView.thirdPlaceAdvancerPicks.filter((pick) => pick.isSelected).length > 0 ? (
                              reviewGroupStageView.thirdPlaceAdvancerPicks.filter((pick) => pick.isSelected).map((pick) => {
                                const result = worldCupReviewStatusLabel(pick)
                                return (
                                  <span key={pick.id} data-result-state={result.status} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${worldCupReviewStatusClass(result.status)}`}>
                                    {teamNameFromGroupStageReview(reviewGroupStageView, pick.teamId)}
                                    <span className="text-[10px] opacity-80">{result.label}</span>
                                  </span>
                                )
                              })
                            ) : (
                              <p className="rounded-md border border-amber-300/20 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-100">No saved third-place advancers yet.</p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-white/40">Loading saved third-place picks...</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-sm font-black text-white">Saved Knockout Picks</p>
                        <div className="mt-2 space-y-1.5">
                          {picks.filter(hasWorldCupPickSelection).length > 0 ? (
                            picks.filter(hasWorldCupPickSelection).map((pick) => {
                              const match = projectedMatches.find((row) => row.id === pick.matchId || row.matchNumber === pick.matchNumber)
                              const result = worldCupReviewStatusLabel(pick)
                              return (
                                <div key={pick.id} data-testid={`world-cup-review-knockout-pick-${pick.matchId}`} data-result-state={result.status} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.035] px-2 py-1.5 text-xs">
                                  <span className="min-w-0 truncate text-white/75">
                                    {match ? `Match ${match.matchNumber} · ` : ""}{pick.selectedTeamName}
                                  </span>
                                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${worldCupReviewStatusClass(result.status)}`}>
                                    {result.label}
                                  </span>
                                </div>
                              )
                            })
                          ) : (
                            <p className="rounded-md border border-amber-300/20 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-100">No saved knockout picks yet.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {!completionReview.fullEntryComplete ? (
                      <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-xs text-amber-100">
                        <p className="font-black">Missing requirements</p>
                        {completionReview.needsRefinalize ? (
                          <p className="mt-1 font-bold">
                            Entry changed after submission. Complete missing picks and finalize again.
                          </p>
                        ) : null}
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {completionReview.missingGroups.length > 0 ? (
                            <li>Missing group rankings: {completionReview.missingGroups.join(", ")}</li>
                          ) : null}
                          {completionReview.thirdPlaceSelectedCount !== 8 ? (
                            <li>Third-place advancers selected: {completionReview.thirdPlaceSelectedCount}/8</li>
                          ) : null}
                          {completionReview.missingKnockoutPicks > 0 ? (
                            <li>Missing knockout picks: {completionReview.missingKnockoutPicks}</li>
                          ) : null}
                        </ul>
                      </div>
                    ) : null}

                    {completionReview.isLocked ? (
                      <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-sm font-bold text-rose-100">
                        Locked{completionReview.submittedAt ? ` · submitted ${new Date(completionReview.submittedAt).toLocaleString()}` : ""}
                      </div>
                    ) : completionReview.fullEntryComplete && completionReview.submittedAt ? (
                      <div className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-100">
                        Submitted. Edits remain available until lock deadline. Submitted {new Date(completionReview.submittedAt).toLocaleString()}.
                      </div>
                    ) : completionReview.fullEntryComplete ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-cyan-100/80">Complete. You can still edit until lock deadline.</p>
                        <button
                          type="button"
                          onClick={() => void handleFinalizeEntry()}
                          disabled={isFinalizingEntry}
                          className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isFinalizingEntry
                            ? "Finalizing..."
                            : completionReview.needsRefinalize || completionReview.isComplete
                              ? "Re-finalize Entry"
                              : "Finalize Entry"}
                        </button>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/45">
                        Complete all missing requirements to unlock Finalize.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
                    Tap Refresh Review to check completion.
                  </p>
                )}
              </section>
            ) : (
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-center">
                <Trophy className="mx-auto h-8 w-8 text-cyan-200/50" />
                <h2 className="mt-3 text-xl font-black text-white">Create an entry first</h2>
                <p className="mt-2 text-sm text-white/50">Review and finalization are saved per bracket entry.</p>
                <button
                  type="button"
                  onClick={handleCreateEntry}
                  disabled={isLocked || isCreatingEntry || entries.length >= view.challenge.maxEntriesPerParticipant}
                  className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black disabled:opacity-45"
                >
                  {isCreatingEntry ? "Creating..." : "Create My Bracket"}
                </button>
              </section>
            )}
          </div>
        ) : null}
        {tab === "leaderboard" ? (
          <div id="world-cup-leaderboard" className="h-full overflow-y-auto">
            <WorldCupLeaderboardInsights leaderboard={view.leaderboard} />
            <WorldCupLeaderboard view={view} busy={isPending} onRecalculate={() => runOwnerAction("recalculate")} />
          </div>
        ) : null}
        {tab === "invite" ? <div id="world-cup-invite"><WorldCupInvitePanel view={view} /></div> : null}
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
        {tab === "settings" ? (
          <div id="world-cup-settings" className="mx-auto max-w-3xl px-2">
            <WorldCupBracketSettingsPanel
              challengeId={challengeId}
              onSaved={() => void refreshChallengeView()}
            />
          </div>
        ) : null}
        {tab === "commissioner" ? (
          <div id="world-cup-commissioner" className="mx-auto max-w-3xl px-2">
            <WorldCupCommissionerBrainPanel
              challengeId={challengeId}
              onOpenLeagueSettings={() => switchTab("settings")}
            />
          </div>
        ) : null}
      </main>

      <button
        data-testid="world-cup-back-to-top"
        type="button"
        onClick={() => scrollToAnchor("world-cup-top")}
        className="fixed bottom-16 right-4 z-50 inline-flex items-center gap-1 rounded-full border border-white/20 bg-zinc-900/90 px-3 py-2 text-xs font-black text-white shadow-xl backdrop-blur sm:bottom-6"
      >
        <ArrowUp className="h-3.5 w-3.5" />
        Top
      </button>
      </div>

      <nav
        aria-label="Primary bracket tabs"
        className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-white/10 bg-zinc-950/95 pb-[env(safe-area-inset-bottom,0px)] sm:hidden"
      >
        {tabList.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`flex min-h-[52px] min-w-[68px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-bold touch-manipulation ${tab === id ? "text-cyan-200" : "text-white/45"}`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">
              {label === "Leaderboard" ? "Ranks" : label === "Commissioner" ? "Commish" : label === "Settings" ? "Setup" : label}
            </span>
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
          entryIsComplete={selectedEntry.isComplete}
          lockAt={view.challenge.pickLockAt}
          tournamentStartAt={view.challenge.effectivePickLockAt}
          includeThirdPlace={view.challenge.includeThirdPlace}
          hasBracketBrainAi={view.hasBracketBrainAi}
          onClose={() => {
            setIsGuidedPickerOpen(false)
            setGuidedInitialMatchId(null)
          }}
          onSavePick={handleGuidedSavePick}
          onPicksUpdated={(updatedPicks) => {
            if (selectedEntryId) {
              markEntryPicksLoaded(selectedEntryId, updatedPicks)
            }
          }}
        />
      )}
    </div>
  )
}

function JumpButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="whitespace-nowrap rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/65 touch-manipulation disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  )
}

function PoolStatCard({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "ready" | "warn"
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</div>
      <div
        className={`mt-1 text-xl font-black ${
          tone === "ready" ? "text-emerald-200" : tone === "warn" ? "text-amber-200" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function WorldCupDashBracketPreviewToolbar({
  dashboardPreviewMode,
  setDashboardPreviewMode,
  onOpenOrCreateBracket,
  isCreatingEntry,
  openDisabled,
  openLabel,
}: {
  dashboardPreviewMode: "starting" | "ai"
  setDashboardPreviewMode: (mode: "starting" | "ai") => void
  onOpenOrCreateBracket: () => void
  isCreatingEntry: boolean
  openDisabled: boolean
  openLabel: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/70">
          Starting Bracket Preview
        </p>
        <h3 className="mt-1 text-xl font-black text-white">World Cup Bracket Preview</h3>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">
          Display-only pool preview. Open your bracket to make picks.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-white/10 bg-black/35 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setDashboardPreviewMode("starting")}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-black ${dashboardPreviewMode === "starting" ? "bg-cyan-300 text-black" : "text-white/55 hover:text-white"}`}
          >
            Starting Bracket
          </button>
          <button
            type="button"
            onClick={() => setDashboardPreviewMode("ai")}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-black ${dashboardPreviewMode === "ai" ? "bg-cyan-300 text-black" : "text-white/55 hover:text-white"}`}
          >
            AI Simulation
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenOrCreateBracket}
          disabled={openDisabled}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-black text-black disabled:opacity-50"
        >
          {isCreatingEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {openLabel}
        </button>
      </div>
    </div>
  )
}

function AiSimulationLockPanel({ isCommissioner }: { isCommissioner: boolean }) {
  return (
    <div className="flex min-h-[200px] flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
      <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-cyan-100 shadow-lg shadow-cyan-500/10 backdrop-blur-[2px]">
        <Lock className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-100 backdrop-blur-[2px]">
          Locked Preview
        </div>
        <h4 className="mt-3 text-lg font-black text-cyan-50 drop-shadow-sm">AI Simulation Locked</h4>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-cyan-100/90 drop-shadow-sm">
          AI Simulation unlocks projected winners, bracket busters, and champion paths.
        </p>
        <p className="mt-3 text-xs font-black uppercase tracking-widest text-cyan-100/75">Requires AF Pro or AF Supreme</p>
        {isCommissioner ? (
          <p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.12] px-3 py-2 text-xs font-bold leading-5 text-amber-100/90 backdrop-blur-[2px]">
            Commissioner AI tools require AF Commissioner or AF Supreme.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function PremiumFeatureCard({
  title,
  description,
  tier,
  unlocked,
}: {
  title: string
  description: string
  tier: "AF Commissioner" | "AI/Pro"
  unlocked: boolean
}) {
  return (
    <div
      data-testid={`world-cup-premium-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      className={[
        "rounded-xl border p-3",
        unlocked
          ? "border-cyan-300/25 bg-cyan-300/[0.08]"
          : "border-white/10 bg-black/20",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-black text-white">{title}</p>
        <span
          className={[
            "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide",
            unlocked
              ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
              : tier === "AF Commissioner"
                ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                : "border-purple-300/30 bg-purple-400/10 text-purple-100",
          ].join(" ")}
        >
          {unlocked ? "Unlocked" : tier}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-white/50">{description}</p>
      {!unlocked ? (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
          Upgrade placeholder - billing UI is not active in this pass.
        </p>
      ) : null}
    </div>
  )
}

function WorldCupPremiumAccessPanel({
  entitlementSummary,
  maxEntriesPerParticipant,
  currentEntryCount,
  isOwnerOrAdmin,
}: {
  entitlementSummary: ReturnType<typeof resolveWorldCupEntitlementSummary>
  maxEntriesPerParticipant: number
  currentEntryCount: number
  isOwnerOrAdmin: boolean
}) {
  const commissionerUnlocked = entitlementSummary.commissioner
  const aiUnlocked = entitlementSummary.ai
  const freeEntryLimitCopy = maxEntriesPerParticipant > 1
    ? `This pool allows up to ${maxEntriesPerParticipant} entries. Free users can still create a valid first bracket; AF Commissioner controls manage multi-entry pool rules.`
    : "Free users can create one bracket entry in this pool."

  return (
    <section
      data-testid="world-cup-premium-access-panel"
      className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">World Cup Access</p>
          <h3 className="mt-1 text-lg font-black text-white">Free play stays open. Premium tools stay clearly gated.</h3>
          <p className="mt-2 text-xs leading-5 text-white/50">
            Join, create your first bracket, make Group Stage and Knockout picks, review, finalize, and view the leaderboard for free.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/55">
          <p>
            Entry cap: <span className="font-black text-white">{currentEntryCount}/{maxEntriesPerParticipant}</span>
          </p>
          <p className="mt-1 text-white/35">{freeEntryLimitCopy}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-black text-amber-100">AF Commissioner</p>
            <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
              {entitlementSummary.labels.commissioner}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <PremiumFeatureCard
              title="AF Commissioner Tools"
              tier="AF Commissioner"
              unlocked={commissionerUnlocked}
              description={isOwnerOrAdmin ? "Readiness, sync, simulation, settings, invites, and admin QA tools are available for all-access users." : "Private/public pool controls, invite management, custom scoring hooks, and commissioner setup."}
            />
            <PremiumFeatureCard
              title="Pool Chat"
              tier="AF Commissioner"
              unlocked={commissionerUnlocked}
              description="League chat placeholder for pool hosts, announcements, and moderated discussion."
            />
            <PremiumFeatureCard
              title="Export Leaderboard"
              tier="AF Commissioner"
              unlocked={entitlementSummary.exportLeaderboard}
              description="Export standings and bracket summaries for commissioner review."
            />
            <PremiumFeatureCard
              title="Multiple Entries"
              tier="AF Commissioner"
              unlocked={entitlementSummary.multipleEntries}
              description="Pool-level multi-entry controls beyond the default free first-entry experience."
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-black text-purple-100">AI/Pro</p>
            <span className="rounded-full border border-purple-300/25 bg-purple-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-100">
              {entitlementSummary.labels.ai}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <PremiumFeatureCard
              title="AI Bracket Builder"
              tier="AI/Pro"
              unlocked={aiUnlocked}
              description="Placeholder for guided bracket construction and deterministic context-aware suggestions."
            />
            <PremiumFeatureCard
              title="AI Matchup Preview"
              tier="AI/Pro"
              unlocked={aiUnlocked}
              description="Preview matchup lean, risks, and upset paths when official fixtures are available."
            />
            <PremiumFeatureCard
              title="AI What-If Scenarios"
              tier="AI/Pro"
              unlocked={aiUnlocked}
              description="Leaderboard scenarios for what needs to happen next."
            />
            <PremiumFeatureCard
              title="AI Alerts"
              tier="AI/Pro"
              unlocked={aiUnlocked}
              description="Future alerts for bracket swings, group-stage optimizer notes, and upset finder signals."
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function WorldCupCommunityFoundationPanel({
  challengeId,
  entitlementSummary,
}: {
  challengeId: string
  entitlementSummary: ReturnType<typeof resolveWorldCupEntitlementSummary>
}) {
  const commissionerUnlocked = entitlementSummary.commissioner
  const aiUnlocked = entitlementSummary.ai
  const [messages, setMessages] = useState<WorldCupPoolChatMessage[]>([])
  const [chatBody, setChatBody] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(true)
  const [isSendingChat, setIsSendingChat] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [composerPanel, setComposerPanel] = useState<WorldCupComposerPanel>(null)
  const [gifQuery, setGifQuery] = useState("")
  const [gifResults, setGifResults] = useState<WorldCupChatGifAttachment[]>([])
  const [selectedGif, setSelectedGif] = useState<WorldCupChatGifAttachment | null>(null)
  const [isGifSearching, setIsGifSearching] = useState(false)
  const [gifError, setGifError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<WorldCupChatImageAttachment | null>(null)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [isPollCreating, setIsPollCreating] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)
  const [pollVotingMessageId, setPollVotingMessageId] = useState<string | null>(null)
  const richPreviewSegments = useMemo(() => parseWorldCupChatRichText(chatBody), [chatBody])
  const isChimmyPrompt = /(^|[\s*_~\]])@chimmy\b/i.test(chatBody)

  function insertComposerText(value: string) {
    setChatBody((current) => `${current}${value}`)
  }

  function wrapComposerText(open: string, close = open) {
    setChatBody((current) => `${current}${open}text${close}`)
  }

  function applyComposerColor(color: WorldCupChatColor) {
    if (color === "default") return
    wrapComposerText(`[color=${color}]`, "[/color]")
  }

  function applyComposerFont(font: WorldCupChatFont) {
    if (font === "default") return
    wrapComposerText(`[font=${font}]`, "[/font]")
  }

  const loadChat = useCallback(async () => {
    setIsChatLoading(true)
    setChatError(null)
    try {
      const res = await fetch(`/api/brackets/world-cup/${challengeId}/chat`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not load pool chat")
      }
      setMessages(Array.isArray(data.messages) ? data.messages : [])
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not load pool chat")
    } finally {
      setIsChatLoading(false)
    }
  }, [challengeId])

  useEffect(() => {
    void loadChat()
  }, [loadChat])

  async function sendChatMessage() {
    const body = chatBody.trim()
    if (!body) return
    setIsSendingChat(true)
    setChatError(null)
    try {
      const res = await fetch(`/api/brackets/world-cup/${challengeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, gif: selectedGif ?? undefined, image: selectedImage ?? undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not send message")
      }
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages((prev) => [...prev, ...data.messages])
      } else if (data.message) {
        setMessages((prev) => [...prev, data.message])
      } else {
        await loadChat()
      }
      setChatBody("")
      setSelectedGif(null)
      setSelectedImage(null)
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not send message")
    } finally {
      setIsSendingChat(false)
    }
  }

  async function uploadWorldCupImage(file: File) {
    setImageError(null)
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setImageError("Only PNG, JPEG, WebP, and GIF images are allowed.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image too large (max 5MB).")
      return
    }
    setIsImageUploading(true)
    try {
      const formData = new FormData()
      formData.set("action", "upload_image")
      formData.set("file", file)
      const res = await fetch(`/api/brackets/world-cup/${challengeId}/chat?action=upload_image`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not upload image")
      if (!data.image) throw new Error("Upload response missing image metadata")
      setSelectedImage(data.image)
      if (!chatBody.trim()) setChatBody("Image")
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not upload image")
    } finally {
      setIsImageUploading(false)
    }
  }

  async function searchWorldCupGifs() {
    const query = gifQuery.trim()
    if (!query) {
      setGifResults([])
      return
    }
    setIsGifSearching(true)
    setGifError(null)
    try {
      const params = new URLSearchParams({ action: "gifs", q: query, limit: "12" })
      const res = await fetch(`/api/brackets/world-cup/${challengeId}/chat?${params.toString()}`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not search GIFs")
      setGifResults(Array.isArray(data.gifs) ? data.gifs : [])
    } catch (err) {
      setGifError(err instanceof Error ? err.message : "Could not search GIFs")
      setGifResults([])
    } finally {
      setIsGifSearching(false)
    }
  }

  async function createWorldCupPoll() {
    const question = pollQuestion.trim()
    const options = pollOptions.map((option) => option.trim()).filter(Boolean)
    if (!question) {
      setPollError("Poll question is required.")
      return
    }
    if (options.length < 2 || options.length > 6) {
      setPollError("Polls require 2 to 6 options.")
      return
    }
    const unique = new Set(options.map((option) => option.toLowerCase()))
    if (unique.size !== options.length) {
      setPollError("Poll options must be unique.")
      return
    }

    setIsPollCreating(true)
    setPollError(null)
    try {
      const res = await fetch(`/api/brackets/world-cup/${challengeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_poll", question, options }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not create poll")
      if (data.message) {
        setMessages((prev) => [...prev, data.message])
      } else {
        await loadChat()
      }
      setPollQuestion("")
      setPollOptions(["", ""])
      setComposerPanel(null)
    } catch (err) {
      setPollError(err instanceof Error ? err.message : "Could not create poll")
    } finally {
      setIsPollCreating(false)
    }
  }

  async function voteWorldCupPoll(messageId: string, optionId: string) {
    setPollVotingMessageId(messageId)
    setChatError(null)
    try {
      const res = await fetch(`/api/brackets/world-cup/${challengeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "poll_vote", messageId, optionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not vote in poll")
      if (data.message) {
        setMessages((prev) => prev.map((message) => message.id === messageId ? data.message : message))
      } else {
        await loadChat()
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not vote in poll")
    } finally {
      setPollVotingMessageId(null)
    }
  }

  return (
    <section
      data-testid="world-cup-community-foundation"
      className="mx-auto grid max-w-5xl gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]"
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-white">
              <MessageSquare className="h-4 w-4 text-cyan-200" aria-hidden />
              Pool Chat
            </p>
            <p className="mt-2 text-xs leading-5 text-white/50">
              Talk strategy, trash talk, and follow pool updates.
            </p>
          </div>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100">
            Community
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-cyan-50/75">
          Text chat, GIFs, uploads, and polls are live for pool members. Voice notes and real-time delivery stay on the roadmap.
        </div>
        <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-cyan-50/75">
          Mentions: @username creates in-app notification records, @all is commissioner-only, @global is blocked until broadcast fanout is built, and @chimmy is private/AI-gated.
        </div>
        <WorldCupNotificationSettingsCard challengeId={challengeId} />
        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/35">
              Pool Messages
            </p>
            <button
              type="button"
              onClick={() => void loadChat()}
              disabled={isChatLoading}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-white/55 disabled:opacity-40"
            >
              {isChatLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {isChatLoading ? (
            <div className="flex items-center gap-2 py-3 text-xs text-white/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading pool chat...
            </div>
          ) : messages.length > 0 ? (
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs",
                    message.isPrivate
                      ? "border-purple-300/20 bg-purple-400/10"
                      : "border-white/10 bg-white/[0.04]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-white/80">{message.authorName}</span>
                    <span className="text-[10px] text-white/30">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <WorldCupChatRichTextRenderer
                    text={message.body}
                    className="mt-1 whitespace-pre-wrap break-words leading-5 text-white/65"
                  />
                  {message.gif ? <WorldCupGifPreview gif={message.gif} compact /> : null}
                  {message.image ? <WorldCupImagePreview image={message.image} compact /> : null}
                  {message.poll ? (
                    <WorldCupPollMessage
                      poll={message.poll}
                      messageId={message.id}
                      isVoting={pollVotingMessageId === message.id}
                      onVote={(optionId) => void voteWorldCupPoll(message.id, optionId)}
                    />
                  ) : null}
                  {message.isPrivate ? (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-purple-100/80">
                      Private Chimmy reply · Only visible to you
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-3 text-xs text-white/35">
              No pool messages yet. Start the strategy talk.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={chatBody}
              onChange={(event) => setChatBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void sendChatMessage()
                }
              }}
              maxLength={1000}
              placeholder="Message your World Cup pool..."
              className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void sendChatMessage()}
              disabled={isSendingChat || !chatBody.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSendingChat ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              Send
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <ComposerFormatButton icon={Bold} label="Bold" onClick={() => wrapComposerText("**")} />
            <ComposerFormatButton icon={Italic} label="Italic" onClick={() => wrapComposerText("_")} />
            <ComposerFormatButton icon={Underline} label="Underline" onClick={() => wrapComposerText("__")} />
            <ComposerFormatButton icon={Strikethrough} label="Strike" onClick={() => wrapComposerText("~~")} />
            <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2 text-[11px] font-bold text-white/55">
              <Baseline className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Chat color</span>
              <select
                aria-label="Chat color"
                defaultValue="default"
                onChange={(event) => {
                  applyComposerColor(event.target.value as WorldCupChatColor)
                  event.target.value = "default"
                }}
                className="bg-transparent text-[11px] text-white/70 focus:outline-none"
              >
                {WORLD_CUP_CHAT_COLOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-950 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2 text-[11px] font-bold text-white/55">
              <span>Font</span>
              <select
                aria-label="Chat font"
                defaultValue="default"
                onChange={(event) => {
                  applyComposerFont(event.target.value as WorldCupChatFont)
                  event.target.value = "default"
                }}
                className="bg-transparent text-[11px] text-white/70 focus:outline-none"
              >
                {WORLD_CUP_CHAT_FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-950 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {["🔥", "😂", "👏", "🏆", "⚽", "👀"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertComposerText(emoji)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-base"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <ComposerUtilityButton icon={Smile} label="Emoji" onClick={() => insertComposerText("🙂")} />
            <ComposerUtilityButton icon={Film} label="GIF" onClick={() => setComposerPanel(composerPanel === "gif" ? null : "gif")} />
            <ComposerUtilityButton icon={BarChart3} label="Poll" onClick={() => setComposerPanel(composerPanel === "poll" ? null : "poll")} />
            <ComposerUtilityButton icon={ImageIcon} label="Image" onClick={() => setComposerPanel(composerPanel === "image" ? null : "image")} />
            <ComposerUtilityButton icon={Mic} label="Voice" onClick={() => setComposerPanel(composerPanel === "voice" ? null : "voice")} />
          </div>
          {sanitizeWorldCupChatMessage(chatBody).trim() ? (
            <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/35">Formatting Preview</p>
              <WorldCupChatRichTextSegments segments={richPreviewSegments} className="whitespace-pre-wrap break-words leading-5 text-white/65" />
            </div>
          ) : null}
          {isChimmyPrompt ? (
            <div className={[
              "mt-2 rounded-xl border px-3 py-2 text-xs leading-5",
              aiUnlocked
                ? "border-purple-300/25 bg-purple-400/10 text-purple-50/75"
                : "border-amber-300/25 bg-amber-400/10 text-amber-50/75",
            ].join(" ")}>
              {aiUnlocked
                ? "@chimmy replies are private. Only you will see your prompt and Chimmy's answer in this pool."
                : "@chimmy private replies require AI/Pro. Upgrade to ask Chimmy from this pool chat."}
            </div>
          ) : null}
          {selectedGif ? (
            <div className="mt-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-100/70">Selected GIF</p>
                <button
                  type="button"
                  onClick={() => setSelectedGif(null)}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold text-white/50"
                >
                  Remove
                </button>
              </div>
              <WorldCupGifPreview gif={selectedGif} />
            </div>
          ) : null}
          {selectedImage ? (
            <div className="mt-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-100/70">Selected Image</p>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold text-white/50"
                >
                  Remove
                </button>
              </div>
              <WorldCupImagePreview image={selectedImage} />
            </div>
          ) : null}
          {composerPanel === "gif" ? (
            <WorldCupGifSearchPanel
              query={gifQuery}
              onQueryChange={setGifQuery}
              onSearch={() => void searchWorldCupGifs()}
              isSearching={isGifSearching}
              error={gifError}
              results={gifResults}
              selectedGif={selectedGif}
              onSelect={(gif) => {
                setSelectedGif(gif)
                if (!chatBody.trim()) setChatBody("GIF")
              }}
            />
          ) : composerPanel === "image" ? (
            <WorldCupImageUploadPanel
              isUploading={isImageUploading}
              error={imageError}
              onFileSelected={(file) => void uploadWorldCupImage(file)}
            />
          ) : composerPanel === "poll" ? (
            <WorldCupPollComposer
              question={pollQuestion}
              options={pollOptions}
              isCreating={isPollCreating}
              error={pollError}
              onQuestionChange={setPollQuestion}
              onOptionChange={(index, value) => {
                setPollOptions((current) => current.map((option, optionIndex) => optionIndex === index ? value : option))
              }}
              onAddOption={() => setPollOptions((current) => current.length >= 6 ? current : [...current, ""])}
              onRemoveOption={(index) => setPollOptions((current) => current.length <= 2 ? current : current.filter((_, optionIndex) => optionIndex !== index))}
              onSubmit={() => void createWorldCupPoll()}
            />
          ) : composerPanel ? <WorldCupComposerFoundationPanel panel={composerPanel} /> : null}
          <p className="mt-2 text-[11px] leading-5 text-white/35">
            Mentions: @username notifies a pool member, @all is commissioner-only, and @chimmy replies are private between you and Chimmy{aiUnlocked ? "." : " with AI/Pro access."}
          </p>
          {chatError ? (
            <p className="mt-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
              {chatError}
            </p>
          ) : null}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-white/35">
            Latest Pool Updates
          </p>
          <WorldCupLeagueEventFeed challengeId={challengeId} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-white">
              <Megaphone className="h-4 w-4 text-amber-200" aria-hidden />
              Commissioner Announcements
            </p>
            <p className="mt-2 text-xs leading-5 text-white/50">
              Post a pinned message for your pool.
            </p>
          </div>
          <span
            className={[
              "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              commissionerUnlocked
                ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                : "border-amber-300/30 bg-amber-400/10 text-amber-100",
            ].join(" ")}
          >
            {commissionerUnlocked ? "Unlocked" : "AF Commissioner feature"}
          </span>
        </div>

        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3">
          <p className="flex items-center gap-2 text-xs font-black text-amber-100">
            <Pin className="h-3.5 w-3.5" aria-hidden />
            Pinned Announcement
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-50/70">
            {commissionerUnlocked
              ? "Announcement composer coming soon. Commissioner reminders can already post system-style updates to the activity feed."
              : "AF Commissioner feature. Pool owners and all-access users will be able to pin one announcement here."}
          </p>
        </div>

        {commissionerUnlocked ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-black text-white">System Reminders</p>
              <p className="mt-1 text-[11px] leading-5 text-white/45">
                Deadline and incomplete-bracket reminders are wired through the existing World Cup event feed.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-black text-white">Moderation</p>
              <p className="mt-1 text-[11px] leading-5 text-white/45">
                Delete/pin controls stay locked until the chat composer backend is added.
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/45">
            Free users can follow pool updates here, but commissioner announcements, pinned posts, and moderation controls require AF Commissioner access.
          </p>
        )}
      </div>
    </section>
  )
}

function ComposerUtilityButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Smile
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2 text-[11px] font-bold text-white/55 hover:border-cyan-300/30 hover:text-cyan-100"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  )
}

function ComposerFormatButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bold
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2 text-[11px] font-black text-white/65 hover:border-cyan-300/30 hover:text-cyan-100"
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  )
}

function getWorldCupRichTextClassName(segment: WorldCupChatRichTextSegment) {
  const colorClass: Record<WorldCupChatColor, string> = {
    default: "",
    "af-blue": "text-cyan-200",
    red: "text-rose-200",
    amber: "text-amber-200",
    green: "text-emerald-200",
    purple: "text-purple-200",
  }
  const fontClass: Record<WorldCupChatFont, string> = {
    default: "",
    clean: "font-sans tracking-normal",
    sport: "font-black uppercase tracking-wide",
    mono: "font-mono",
  }

  return [
    segment.marks.bold ? "font-black" : "",
    segment.marks.italic ? "italic" : "",
    segment.marks.underline ? "underline underline-offset-2" : "",
    segment.marks.strike ? "line-through" : "",
    colorClass[segment.marks.color ?? "default"],
    fontClass[segment.marks.font ?? "default"],
  ].filter(Boolean).join(" ")
}

function WorldCupChatRichTextSegments({
  segments,
  className,
}: {
  segments: WorldCupChatRichTextSegment[]
  className?: string
}) {
  return (
    <p className={className}>
      {segments.map((segment, index) => (
        <span key={`${segment.text}-${index}`} className={getWorldCupRichTextClassName(segment)}>
          {segment.text}
        </span>
      ))}
    </p>
  )
}

function WorldCupChatRichTextRenderer({ text, className }: { text: string; className?: string }) {
  return <WorldCupChatRichTextSegments segments={parseWorldCupChatRichText(text)} className={className} />
}

function WorldCupGifPreview({
  gif,
  compact = false,
}: {
  gif: WorldCupChatGifAttachment
  compact?: boolean
}) {
  return (
    <div className={compact ? "mt-2 max-w-56 overflow-hidden rounded-lg border border-white/10 bg-black/25" : "overflow-hidden rounded-lg border border-white/10 bg-black/25"}>
      <img
        src={gif.previewUrl}
        alt={gif.title || "Selected GIF"}
        className="max-h-40 w-full object-cover"
      />
      <p className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] text-white/35">
        <span className="truncate">{gif.title || "GIF"}</span>
        <span className="uppercase">{gif.provider}</span>
      </p>
    </div>
  )
}

function WorldCupImagePreview({
  image,
  compact = false,
}: {
  image: WorldCupChatImageAttachment
  compact?: boolean
}) {
  return (
    <div className={compact ? "mt-2 max-w-64 overflow-hidden rounded-lg border border-white/10 bg-black/25" : "overflow-hidden rounded-lg border border-white/10 bg-black/25"}>
      <img
        src={image.secureUrl}
        alt="Uploaded World Cup chat image"
        className="max-h-48 w-full object-cover"
      />
      <p className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] text-white/35">
        <span className="truncate">Cloudinary image</span>
        <span>{image.format.toUpperCase()} · {Math.round(image.bytes / 1024)}KB</span>
      </p>
    </div>
  )
}

function WorldCupImageUploadPanel({
  isUploading,
  error,
  onFileSelected,
}: {
  isUploading: boolean
  error: string | null
  onFileSelected: (file: File) => void
}) {
  return (
    <div className="mt-2 rounded-xl border border-dashed border-white/15 bg-black/25 p-3 text-xs leading-5 text-white/50">
      <p className="font-black text-white/75">Image Upload</p>
      <p className="mt-1">
        Upload a pool chat image through the World Cup Cloudinary route. PNG, JPEG, WebP, and GIF are allowed up to 5MB.
      </p>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-[11px] font-black text-cyan-100">
        {isUploading ? "Uploading..." : "Choose Image"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFileSelected(file)
            event.target.value = ""
          }}
        />
      </label>
      {error ? (
        <p className="mt-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function WorldCupPollMessage({
  poll,
  messageId,
  isVoting,
  onVote,
}: {
  poll: WorldCupChatPollAttachment
  messageId: string
  isVoting: boolean
  onVote: (optionId: string) => void
}) {
  return (
    <div className="mt-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
      <p className="text-xs font-black text-white">{poll.question}</p>
      <div className="mt-3 space-y-2">
        {poll.options.map((option) => {
          const selected = poll.currentUserVote === option.id
          return (
            <button
              key={`${messageId}-${option.id}`}
              type="button"
              onClick={() => onVote(option.id)}
              disabled={isVoting || poll.closed}
              className={[
                "w-full overflow-hidden rounded-lg border bg-black/25 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-65",
                selected ? "border-cyan-300/70" : "border-white/10 hover:border-cyan-300/35",
              ].join(" ")}
            >
              <span className="relative block">
                <span
                  className="absolute inset-y-0 left-0 bg-cyan-300/15"
                  style={{ width: `${option.percentage}%` }}
                  aria-hidden
                />
                <span className="relative flex items-center justify-between gap-2 px-3 py-2">
                  <span className="font-bold text-white/75">{option.label}</span>
                  <span className="text-[10px] font-black text-cyan-100/75">
                    {option.votes} vote{option.votes === 1 ? "" : "s"} · {option.percentage}%
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
        {poll.totalVotes} total vote{poll.totalVotes === 1 ? "" : "s"}
        {poll.currentUserVote ? " · Your vote is counted" : ""}
        {poll.closed ? " · Closed" : ""}
      </p>
    </div>
  )
}

function WorldCupPollComposer({
  question,
  options,
  isCreating,
  error,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onSubmit,
}: {
  question: string
  options: string[]
  isCreating: boolean
  error: string | null
  onQuestionChange: (value: string) => void
  onOptionChange: (index: number, value: string) => void
  onAddOption: () => void
  onRemoveOption: (index: number) => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-2 rounded-xl border border-dashed border-white/15 bg-black/25 p-3 text-xs leading-5 text-white/50">
      <p className="font-black text-white/75">Create Poll</p>
      <p className="mt-1">Create a single-choice poll for your World Cup pool. Each member gets one vote and can change it while open.</p>
      <input
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        maxLength={180}
        placeholder="Poll question..."
        className="mt-3 min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/50 focus:outline-none"
      />
      <div className="mt-2 space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={option}
              onChange={(event) => onOptionChange(index, event.target.value)}
              maxLength={80}
              placeholder={`Option ${index + 1}`}
              className="min-h-10 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onRemoveOption(index)}
              disabled={options.length <= 2}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-3 text-[11px] font-black text-white/55 disabled:opacity-35"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddOption}
          disabled={options.length >= 6}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-black text-white/55 disabled:opacity-35"
        >
          Add Option
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isCreating}
          className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-[11px] font-black text-cyan-100 disabled:opacity-45"
        >
          {isCreating ? "Creating..." : "Create Poll"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function WorldCupGifSearchPanel({
  query,
  onQueryChange,
  onSearch,
  isSearching,
  error,
  results,
  selectedGif,
  onSelect,
}: {
  query: string
  onQueryChange: (value: string) => void
  onSearch: () => void
  isSearching: boolean
  error: string | null
  results: WorldCupChatGifAttachment[]
  selectedGif: WorldCupChatGifAttachment | null
  onSelect: (gif: WorldCupChatGifAttachment) => void
}) {
  return (
    <div className="mt-2 rounded-xl border border-dashed border-white/15 bg-black/25 p-3 text-xs leading-5 text-white/50">
      <p className="font-black text-white/75">GIF Search</p>
      <p className="mt-1">Search is routed through the World Cup pool API. Provider keys stay server-side.</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              onSearch()
            }
          }}
          maxLength={64}
          placeholder="Search Klipy GIFs..."
          className="min-h-10 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={isSearching || !query.trim()}
          className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-[11px] font-black text-cyan-100 disabled:opacity-45"
        >
          {isSearching ? "Searching..." : "Search GIFs"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
      {results.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {results.map((gif) => (
            <button
              key={`${gif.provider}-${gif.id}`}
              type="button"
              onClick={() => onSelect(gif)}
              className={[
                "overflow-hidden rounded-lg border bg-black/30 text-left transition",
                selectedGif?.id === gif.id && selectedGif.provider === gif.provider
                  ? "border-cyan-300/70"
                  : "border-white/10 hover:border-cyan-300/35",
              ].join(" ")}
            >
              <img src={gif.previewUrl} alt={gif.title || "GIF result"} className="h-24 w-full object-cover" />
              <span className="block truncate px-2 py-1 text-[10px] text-white/45">
                {gif.title || gif.provider}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-white/35">
          Select a GIF to attach it to your next pool message. Arbitrary GIF URLs are not accepted.
        </p>
      )}
    </div>
  )
}

function WorldCupComposerFoundationPanel({ panel }: { panel: Exclude<WorldCupComposerPanel, null> }) {
  const copy = {
    gif: {
      title: "GIF Search",
      body: "Klipy-ready GIF search is planned for this composer. GIFs stay disabled until the World Cup pool-scoped search route and moderation checks are enabled.",
    },
    poll: {
      title: "Polls Coming Soon",
      body: "Poll creation will support question text, options, close time, and one vote per pool member. No poll is created yet.",
    },
    image: {
      title: "Image Uploads",
      body: "Image uploads are coming soon with Cloudinary planning. Uploads stay disabled until pool membership checks, type limits, and metadata storage are wired.",
    },
    voice: {
      title: "Voice Notes",
      body: "Voice notes are coming soon. Recording and upload are disabled until audio limits, consent UX, and storage rules are implemented.",
    },
  }[panel]

  return (
    <div className="mt-2 rounded-xl border border-dashed border-white/15 bg-black/25 p-3 text-xs leading-5 text-white/50">
      <p className="font-black text-white/75">{copy.title}</p>
      <p className="mt-1">{copy.body}</p>
    </div>
  )
}

function WorldCupNotificationSettingsCard({ challengeId }: { challengeId: string }) {
  const defaultPrefs: WorldCupNotificationPreferenceState = {
    poolMuted: false,
    inAppEnabled: true,
    smsEnabled: false,
    usernameMentionsEnabled: true,
    allMentionsEnabled: true,
    commissionerAnnouncementsEnabled: true,
    deadlineRemindersEnabled: true,
    bracketFinalizedEnabled: true,
    resultsUpdatedEnabled: true,
    leaderboardUpdatedEnabled: true,
    generalChatEnabled: false,
    chimmyRepliesEnabled: true,
  }
  const [preferences, setPreferences] = useState(defaultPrefs)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadPreferences() {
      try {
        const params = new URLSearchParams({ action: "notification_preferences" })
        const res = await fetch(`/api/brackets/world-cup/${challengeId}/chat?${params.toString()}`, { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Could not load notification preferences")
        if (!cancelled && data.preferences) {
          setPreferences((current) => ({ ...current, ...data.preferences }))
        }
      } catch (err) {
        if (!cancelled) setSettingsError(err instanceof Error ? err.message : "Could not load notification preferences")
      }
    }
    void loadPreferences()
    return () => {
      cancelled = true
    }
  }, [challengeId])

  async function togglePreference(key: keyof WorldCupNotificationPreferenceState) {
    const nextValue = !preferences[key]
    setPreferences((current) => ({ ...current, [key]: nextValue }))
    setIsSaving(key)
    setSettingsError(null)
    try {
      const res = await fetch(`/api/brackets/world-cup/${challengeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_notification_preferences", [key]: nextValue }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save notification preferences")
      if (data.preferences) setPreferences((current) => ({ ...current, ...data.preferences }))
    } catch (err) {
      setPreferences((current) => ({ ...current, [key]: !nextValue }))
      setSettingsError(err instanceof Error ? err.message : "Could not save notification preferences")
    } finally {
      setIsSaving(null)
    }
  }

  const rows: Array<{ key: keyof WorldCupNotificationPreferenceState; label: string; helper?: string }> = [
    { key: "poolMuted", label: "Pool muted" },
    { key: "inAppEnabled", label: "In-app notifications" },
    { key: "smsEnabled", label: "SMS notifications", helper: "Requires verified phone." },
    { key: "usernameMentionsEnabled", label: "@username mentions" },
    { key: "allMentionsEnabled", label: "@all mentions" },
    { key: "commissionerAnnouncementsEnabled", label: "Commissioner announcements" },
    { key: "deadlineRemindersEnabled", label: "Deadline reminders" },
    { key: "bracketFinalizedEnabled", label: "Bracket finalized" },
    { key: "resultsUpdatedEnabled", label: "Results updated" },
    { key: "leaderboardUpdatedEnabled", label: "Leaderboard updated" },
    { key: "generalChatEnabled", label: "General chat messages" },
    { key: "chimmyRepliesEnabled", label: "Chimmy private replies" },
  ]

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="flex items-center gap-2 text-xs font-black text-white">
        <Bell className="h-3.5 w-3.5 text-cyan-200" aria-hidden />
        Notification Settings
      </p>
      <p className="mt-2 text-xs leading-5 text-white/50">
        In-app notifications are on by default. SMS alerts require a verified phone number and opt-in.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
            <span>
              <span className="block text-[11px] text-white/60">{row.label}</span>
              {row.helper ? <span className="block text-[10px] text-white/30">{row.helper}</span> : null}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={preferences[row.key]}
              aria-label={row.label}
              disabled={Boolean(isSaving)}
              onClick={() => void togglePreference(row.key)}
              className={[
                "relative h-5 w-9 rounded-full border transition disabled:opacity-50",
                preferences[row.key] ? "border-cyan-300/60 bg-cyan-300/40" : "border-white/15 bg-white/[0.06]",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
                  preferences[row.key] ? "left-4" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>
        ))}
      </div>
      {settingsError ? (
        <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {settingsError}
        </p>
      ) : null}
      <p className="mt-3 text-[11px] leading-5 text-white/35">
        Pool owners and commissioners cannot override a user's mute, SMS opt-in, or phone verification state.
      </p>
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
