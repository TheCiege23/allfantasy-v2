'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { DraftRoomShell, type MobileDraftTab } from '@/components/app/draft-room/DraftRoomShell'
import { DraftTopBar } from '@/components/app/draft-room/DraftTopBar'
import { DraftRoomSettingsModal } from '@/components/app/draft-room/DraftRoomSettingsModal'
import { DraftBoard } from '@/components/app/draft-room/DraftBoard'
import { DraftTeamStrip, type DraftTeamStripTeamMeta } from '@/components/app/draft-room/DraftTeamStrip'
import { PickTradeHistoryModal } from '@/components/app/draft-room/PickTradeHistoryModal'
import { useEntitlements } from '@/hooks/useEntitlements'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { SportAwareDraftRoom } from '@/components/app/draft-room/SportAwareDraftRoom'
import { QueuePanel } from '@/components/app/draft-room/QueuePanel'
import { DraftIntelQueuePanel } from '@/components/app/draft-room/DraftIntelQueuePanel'
import { DraftChatPanel, type DraftChatMessage } from '@/components/app/draft-room/DraftChatPanel'
import { DraftHelperPanel } from '@/components/app/draft-room/DraftHelperPanel'
import { DraftTeamPanel } from '@/components/app/draft-room/DraftTeamPanel'
import { DraftRosterStrip } from '@/components/app/draft-room/DraftRosterStrip'
import { DraftPickActivityStrip } from '@/components/app/draft-room/DraftPickActivityStrip'
import { DraftRoundOneAnnouncementOverlay } from '@/components/app/draft-room/DraftRoundOneAnnouncementOverlay'
import type { PlayerEntry } from '@/components/app/draft-room/PlayerPanel'
import type { RoundOneAnnouncementQueueItem } from '@/lib/draft-room/resolvePickAnnouncementAssets'
import { resolvePickAnnouncementAssets } from '@/lib/draft-room/resolvePickAnnouncementAssets'
import type { DraftWarRoomSnapshot } from '@/components/draft/ai/DraftWarRoom'
import { LiveDraftStatusColumn } from '@/components/draft/live/LiveDraftStatusColumn'

const DraftPickTradePanel = dynamic(
  () => import('@/components/app/draft-room/DraftPickTradePanel').then((m) => ({ default: m.DraftPickTradePanel })),
  { ssr: false }
)
const CommissionerControlCenterModal = dynamic(
  () => import('@/components/app/draft-room/CommissionerControlCenterModal').then((m) => ({ default: m.CommissionerControlCenterModal })),
  { ssr: false }
)
const PostDraftView = dynamic(
  () => import('@/components/app/draft-room/PostDraftView').then((m) => ({ default: m.PostDraftView })),
  { ssr: false }
)
const AuctionSpotlightPanel = dynamic(
  () => import('@/components/app/draft-room/AuctionSpotlightPanel').then((m) => ({ default: m.AuctionSpotlightPanel })),
  { ssr: false }
)
const KeeperPanel = dynamic(
  () => import('@/components/app/draft-room/KeeperPanel').then((m) => ({ default: m.KeeperPanel })),
  { ssr: false }
)
import type { DraftSessionSnapshot, QueueEntry } from '@/lib/live-draft-engine/types'
import {
  buildDraftRoomCoreState,
  resolveEffectiveCurrentPick,
  isPickCommitAllowed,
  isPickCommitAllowedByName,
} from '@/lib/live-draft-engine'
import { getUpcomingPickOwners } from '@/lib/live-draft-engine/DraftOrderService'
import type { DraftIntelState, DraftIntelQueueEntry } from '@/lib/draft-intelligence'
import type { DraftUISettings } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { normalizeDraftQueueSizeLimit, trimDraftQueue } from '@/lib/draft-defaults/DraftQueueLimitResolver'
import type { NormalizedDraftEntry } from '@/lib/draft-sports-models/types'
import {
  buildAiAdpLookupMaps,
  expandAiAdpKeysForLookup,
  lookupAiAdpMatch,
} from '@/lib/draft-room/ai-adp-lookup'
import { buildDraftSummaryForAI, buildLiveDraftBrainPayload, canAddToQueue, getDefaultRosterSlotsForSport } from '@/lib/draft-room'
import type { LiveDraftBrainEnvelope } from '@/lib/live-draft-brain/schemas'
import { IdpDraftExplainerCard } from '@/components/idp/IdpDraftExplainerCard'
import { confirmTokenSpend } from '@/lib/tokens/client-confirm'
import { DRAFT_ROOM } from '@/lib/analytics/eventNames'
import { sendProductAnalyticsBeacon } from '@/lib/analytics/client'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { computePicksUntilViewerTurn } from '@/lib/draft-room/computePicksUntilViewer'
import { mergeDraftSessionSnapshot } from '@/lib/draft-room/mergeDraftSessionSnapshot'
import { draftRoomPickTrace, draftRoomWarn } from '@/lib/draft-room/draftRoomDevLog'
import { filterPlayersAvailableForDraftAi } from '@/lib/draft-room/availableForDraftAi'
import type { DraftCopilotInsight } from '@/lib/draft-room/draft-copilot-types'
import { detectSnakeBackToBackSoon, computeRedraftStarterHints } from '@/lib/draft-room/redraftPlanningHints'
import { RedraftPlanningRibbon } from '@/components/app/draft-room/RedraftPlanningRibbon'
import {
  buildAssistantFeedByPlayerName,
  getAssistantFeedForPlayer,
} from '@/lib/draft-room/assistantFeedLookup'
import {
  buildDraftChatPlayerContextFromDisplay,
  type DraftChatPlayerContext,
} from '@/lib/draft-room/draft-chat-player-context'
import type { DraftAssistantRoomContext } from '@/components/app/draft-room/PlayerDetailModal'

/** User-visible copy after a successful commissioner POST to `/draft/controls`. */
function commissionerActionSuccessCopy(action: string): string {
  switch (String(action).toLowerCase()) {
    case 'pause':
      return 'Draft paused — pick clock frozen for everyone.'
    case 'resume':
      return 'Draft resumed — pick clock restored.'
    case 'reset_timer':
      return 'Pick timer reset to full time for the current pick.'
    case 'undo_pick':
      return 'Last pick was removed from the board.'
    case 'set_timer_seconds':
      return 'Pick clock length updated.'
    case 'force_autopick':
      return 'Auto-pick executed for the on-clock team.'
    case 'skip_pick':
      return 'Current pick was skipped.'
    case 'complete':
      return 'Draft marked complete.'
    default:
      return 'Commissioner action completed.'
  }
}

type CommissionerControlApiResult =
  | ({ ok: true } & Record<string, unknown>)
  | { ok: false; error: string; cancelled?: boolean }

export type DraftRoomPageClientProps = {
  /** Draft session id from URL (`/draft/[draftId]/snake`) — used for telemetry / deep links only. */
  draftId?: string
  leagueId: string
  leagueName: string
  /** League avatar/logo. Surfaced in draft-room chrome (top bar). */
  leagueLogoUrl?: string | null
  sport: string
  isDynasty?: boolean
  isCommissioner: boolean
  /** When IDP league, pass 'IDP' for position filters and roster template. */
  formatType?: string
  /** Premium chrome for live snake redraft route. */
  presentationVariant?: 'default' | 'redraft_snake'
}

type DraftRoomChromeTeam = {
  id: string
  externalId?: string | null
  teamName: string
  ownerName: string
  avatarUrl?: string | null
  role?: string | null
  claimedByUserId?: string | null
  isCommissioner?: boolean
  isCoCommissioner?: boolean
}

function normalizeManagerKey(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

/** Match `pickCommitFlow` / pool filters — session pick names are compared case-insensitively. */
function normalizeDraftedPlayerName(name: string | null | undefined): string {
  return String(name ?? '').trim().toLowerCase()
}

function resolveInviteLink(payload: { inviteLink?: string | null; inviteCode?: string | null } | null | undefined): string | null {
  const direct = typeof payload?.inviteLink === 'string' ? payload.inviteLink.trim() : ''
  if (direct) return direct
  const inviteCode = typeof payload?.inviteCode === 'string' ? payload.inviteCode.trim() : ''
  if (!inviteCode || typeof window === 'undefined') return null
  return `${window.location.origin}/join?code=${encodeURIComponent(inviteCode)}`
}

function resolveManagerChromeTeam(
  manager: { rosterId: string; displayName: string },
  teams: DraftRoomChromeTeam[],
): DraftRoomChromeTeam | null {
  const rosterId = manager.rosterId.trim()
  const displayName = normalizeManagerKey(manager.displayName)
  return (
    teams.find((team) => team.id === rosterId) ??
    teams.find((team) => String(team.externalId ?? '').trim() === rosterId) ??
    teams.find((team) => normalizeManagerKey(team.teamName) === displayName) ??
    teams.find((team) => normalizeManagerKey(team.ownerName) === displayName) ??
    null
  )
}

const POLL_MS = 8000
const POLL_MS_BACKGROUND = 30000
/** Require several consecutive lightweight poll failures before treating the room as degraded (avoids top-bar flicker). */
const SESSION_POLL_FAILS_FOR_DEGRADED = 5
/** Brief delay before showing the badge so transient blips do not flash "Sync issue". */
const CONNECTION_DEGRADED_SHOW_DELAY_MS = 1600
const AI_ADP_POLL_SKIP_MS = 30 * 60 * 1000
const QUEUE_POLL_EVERY_N_TICKS = 2
const SETTINGS_POLL_EVERY_N_TICKS = 3
const CHAT_POLL_EVERY_N_TICKS = 2
const POOL_POLL_EVERY_N_TICKS = 3
const DRAFT_ROOM_LOCAL_PREFS_KEY_PREFIX = 'af:draft-room-prefs:'

function mergeDraftChatWire(
  prev: DraftChatMessage[],
  incoming: DraftChatMessage[],
): DraftChatMessage[] {
  const map = new Map<string, DraftChatMessage>()
  for (const m of prev) map.set(m.id, m)
  for (const m of incoming) map.set(m.id, m)
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  )
}

export function DraftRoomPageClient({
  draftId: _draftId,
  leagueId,
  leagueName,
  leagueLogoUrl,
  sport,
  isDynasty = false,
  isCommissioner,
  formatType,
  presentationVariant = 'default',
}: DraftRoomPageClientProps) {
  type BottomDockTab = 'queue' | 'results' | 'chat' | 'ai'
  const { data: authSession } = useSession()
  const viewerAppUserId = (authSession?.user as { id?: string } | undefined)?.id ?? null
  const [session, setSession] = useState<DraftSessionSnapshot | null>(null)
  const sessionRef = useRef<DraftSessionSnapshot | null>(null)
  useEffect(() => {
    sessionRef.current = session
  }, [session])
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [draftIntel, setDraftIntel] = useState<DraftIntelState | null>(null)
  const [draftIntelLoading, setDraftIntelLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<DraftChatMessage[]>([])
  const [chatSyncActive, setChatSyncActive] = useState(false)
  const [loading, setLoading] = useState(true)
  /** Set when GET draft/session returns 401/403 so we don't show the misleading "no draft session" copy. */
  const [draftSessionAccess, setDraftSessionAccess] = useState<"ok" | "unauthorized" | "forbidden" | null>(null)
  /** True only after repeated failed draft session polls — not routine background sync (avoids top-bar flicker). */
  const [connectionDegraded, setConnectionDegraded] = useState(false)
  const pollSessionFailStreakRef = useRef(0)
  /** Browser timers are numeric IDs; avoids NodeJS.Timeout vs DOM mismatch in `tsc`. */
  const connectionDegradedTimerRef = useRef<number | null>(null)
  const [commissionerLoading, setCommissionerLoading] = useState(false)
  const [governanceBanner, setGovernanceBanner] = useState<{
    variant: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const governanceSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pickSubmitting, setPickSubmitting] = useState(false)
  const [draftUISettings, setDraftUISettings] = useState<DraftUISettings | null>(null)
  const [skipPickAllowed, setSkipPickAllowed] = useState(false)
  const [orphanAiStatus, setOrphanAiStatus] = useState<{
    orphanRosterIds: string[]
    recentActions: Array<{ action: string; createdAt: string; reason: string | null; rosterId?: string }>
  } | null>(null)
  const [commissionerAiDraft, setCommissionerAiDraft] = useState<{
    assignedAiTeams: Array<{ teamId: string; teamName: string; aiStyle: string; tradeAggression: string; active: boolean }>
    tradeRules: {
      allowOutbound: boolean
      allowInbound: boolean
      blockAiToAi: boolean
      proposalCooldownSeconds: number
      maxProposalsPerRound: number
      acceptConfidenceMin: number
    }
  } | null>(null)
  /** Prisma AI opponent assignments — draft roster ids (see `/api/league/ai-opponents/summary`). */
  const [aiOpponentRosterIds, setAiOpponentRosterIds] = useState<string[]>([])
  /** Draft roster id → AI archetype label for manager strip badges. */
  const [aiArchetypeByRoster, setAiArchetypeByRoster] = useState<Record<string, string>>({})
  const [orphanAiProviderAvailableState, setOrphanAiProviderAvailableState] = useState<boolean>(true)
  const [draftQueueSizeLimit, setDraftQueueSizeLimit] = useState<number>(normalizeDraftQueueSizeLimit(null))
  const [leagueAiAdp, setLeagueAiAdp] = useState<{
    enabled: boolean
    entries: Array<{ playerName: string; position: string; team: string | null; adp: number; sampleSize: number; lowSample?: boolean }>
    totalDrafts: number
    computedAt: string | null
    stale?: boolean
    ageHours?: number | null
    message?: string | null
  } | null>(null)
  const aiAdpLookupMaps = useMemo(
    () => buildAiAdpLookupMaps(leagueAiAdp?.entries ?? null),
    [leagueAiAdp?.entries],
  )
  const [autoPickFromQueue, setAutoPickFromQueue] = useState(false)
  const [awayMode, setAwayMode] = useState(false)
  const [aiQueueReorderEnabled, setAiQueueReorderEnabled] = useState(true)
  const [draftAiExplanationEnabled, setDraftAiExplanationEnabled] = useState(false)
  const [mobileTab, setMobileTabState] = useState<MobileDraftTab>('board')
  const [bottomDockTab, setBottomDockTab] = useState<BottomDockTab>('results')
  const setMobileTab = useCallback((tab: MobileDraftTab) => {
    sendProductAnalyticsBeacon(DRAFT_ROOM.MOBILE_TAB, { tab, leagueId })
    setMobileTabState(tab)
  }, [leagueId])
  const [aiReorderLoading, setAiReorderLoading] = useState(false)
  const [aiReorderExplanation, setAiReorderExplanation] = useState<string | null>(null)
  const [aiReorderExecutionMode, setAiReorderExecutionMode] = useState<string | null>(null)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [commissionerLeagues, setCommissionerLeagues] = useState<Array<{ id: string; name: string | null }>>([])
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSelectedIds, setBroadcastSelectedIds] = useState<Set<string>>(new Set())
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [recommendationResult, setRecommendationResult] = useState<{
    recommendation: { player: { name: string; position: string; team?: string | null; adp?: number | null }; reason: string; confidence: number } | null
    alternatives: Array<{ player: { name: string; position: string; team?: string | null }; reason: string; confidence: number }>
    reachWarning: string | null
    valueWarning: string | null
    scarcityInsight: string | null
    stackInsight: string | null
    correlationInsight: string | null
    formatInsight: string | null
    byeNote: string | null
    explanation: string
    evidence: string[]
    caveats: string[]
    uncertainty: string | null
    execution?: { mode?: string; lane?: string } | null
  } | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const recommendationRequestKeyRef = useRef('')
  const warRoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warRoomCacheRef = useRef<Map<string, DraftWarRoomSnapshot>>(new Map())
  const [warRoomData, setWarRoomData] = useState<DraftWarRoomSnapshot | null>(null)
  const [warRoomLoading, setWarRoomLoading] = useState(false)
  const [warRoomError, setWarRoomError] = useState<string | null>(null)
  const [liveBrainEnvelope, setLiveBrainEnvelope] = useState<LiveDraftBrainEnvelope | null>(null)
  const [runAiPickLoading, setRunAiPickLoading] = useState(false)
  const [resyncLoading, setResyncLoading] = useState(false)
  const [showCommissionerModal, setShowCommissionerModal] = useState(false)
  const [draftRoomSettingsOpen, setDraftRoomSettingsOpen] = useState(false)
  const [showTradePanel, setShowTradePanel] = useState(false)
  const [tradePanelGeneration, setTradePanelGeneration] = useState(0)
  const [tradeInitialDraft, setTradeInitialDraft] = useState<{
    giveRound?: number
    receiveRound?: number
    receiverRosterId?: string
  } | null>(null)
  const [pendingTradesCount, setPendingTradesCount] = useState(0)
  const [roundOneAnnouncementQueue, setRoundOneAnnouncementQueue] = useState<RoundOneAnnouncementQueueItem[]>([])
  const roundOneSeenPickIdsRef = useRef(new Set<string>())
  const roundOneBootstrapRef = useRef(false)
  const roundOneHeygenRequestedRef = useRef(new Set<string>())
  const [pickError, setPickError] = useState<string | null>(null)
  const [draftPool, setDraftPool] = useState<{ entries: NormalizedDraftEntry[]; sport: string; devyConfig?: { enabled: boolean; devyRounds: number[] }; c2cConfig?: { enabled: boolean; collegeRounds: number[] }; isIdp?: boolean } | null>(null)
  const [draftAssistantContext, setDraftAssistantContext] = useState<{
    sport: string
    headlines: Array<{
      id: string
      title: string
      playerName?: string | null
      team?: string | null
      publishedAt?: string | null
      source?: string | null
    }>
    injuries: Array<{
      playerName: string
      team?: string | null
      status?: string | null
      note?: string | null
      reportedAt?: string | null
      source?: string | null
    }>
    sportsFeed: {
      available: boolean
      updatedAt?: string | null
      sourceKeys?: string[]
      digest?: string | null
    }
  } | null>(null)
  const [leagueTeams, setLeagueTeams] = useState<DraftRoomChromeTeam[]>([])
  const [rosterConfig, setRosterConfig] = useState<{
    starterSlots: Record<string, number>
    benchSlots: number
    taxiSlots: number
    devySlots: number
  } | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [claimableRosterIds, setClaimableRosterIds] = useState<string[]>([])
  const [tradeHistoryOpen, setTradeHistoryOpen] = useState(false)
  const [tradeHistoryFocus, setTradeHistoryFocus] = useState<{
    round: number
    originalRosterId: string
  } | null>(null)
  const entitlements = useEntitlements()
  const tokenBalance = useTokenBalance()
  const hasAiSubscription =
    entitlements.hasPro || entitlements.hasSupreme || entitlements.hasCommissioner || entitlements.hasAllAccess
  /**
   * Token-balance fallback: free-tier users who've bought AF token packs still
   * get to use AI features, spending one token per request. Gate is true when
   * EITHER a qualifying subscription is active OR balance > 0.
   */
  const hasAiAccess = hasAiSubscription || tokenBalance.balance > 0
  const [claimSlotLoadingRosterId, setClaimSlotLoadingRosterId] = useState<string | null>(null)
  const [auctionNominateLoading, setAuctionNominateLoading] = useState(false)
  const [auctionBidLoading, setAuctionBidLoading] = useState(false)
  const [auctionResolveLoading, setAuctionResolveLoading] = useState(false)
  const [autopickExpiredLoading, setAutopickExpiredLoading] = useState(false)
  const [helperSelectedPlayer, setHelperSelectedPlayer] = useState<{ name: string; position: string; team?: string | null } | null>(null)

  const localPrefsKey = `${DRAFT_ROOM_LOCAL_PREFS_KEY_PREFIX}${leagueId}`

  /** Draft room uses normalized pool from fetchDraftPool only; skip useLeagueSectionData to avoid duplicate /api/mock-draft/adp. */
  const draftData = null as { entries?: PlayerEntry[] } | null
  const poolLoading = loading && draftPool === null
  const effectiveDraftSport = draftPool?.sport ?? sport

  const draftedNames = useMemo(
    () =>
      new Set(
        (session?.picks ?? [])
          .map((p) => normalizeDraftedPlayerName(p.playerName))
          .filter(Boolean),
      ),
    [session?.picks],
  )
  const draftedPlayerIds = useMemo(() => {
    const s = new Set<string>()
    for (const p of session?.picks ?? []) {
      if (p.playerId) s.add(String(p.playerId).trim())
    }
    return s
  }, [session?.picks])
  /** Single source for on-clock team, overall, and timer anchor — derived only from `session`. */
  const draftCore = useMemo(
    () => (session ? buildDraftRoomCoreState(session) : null),
    [session],
  )
  /** On-clock pick — uses resolver when session.currentPick is briefly null (poll/reconnect races). */
  const currentPick = useMemo(
    () => (session ? resolveEffectiveCurrentPick(session) : null),
    [session],
  )
  const tradeDraftStateFingerprint = useMemo(() => {
    if (!session) return ''
    const traded =
      Array.isArray(session.tradedPicks) && session.tradedPicks.length > 0 ? session.tradedPicks.length : 0
    const onClock =
      currentPick?.overall != null && Number.isFinite(currentPick.overall)
        ? `-o${currentPick.overall}`
        : ''
    return `${session.version}-${session.picks.length}-${traded}-${session.updatedAt}${onClock}`
  }, [session, currentPick])
  /** Fallback when Chimmy SSE has not emitted (no roster yet) or intel is idle — drives RedraftPlanningRibbon. */
  const ribbonPicksUntilUser = useMemo(() => {
    if (draftIntel?.picksUntilUser != null) return draftIntel.picksUntilUser
    if (!session || (session.status !== 'in_progress' && session.status !== 'paused')) return null
    const rid = (session as DraftSessionSnapshot & { currentUserRosterId?: string }).currentUserRosterId
    return computePicksUntilViewerTurn(session as DraftSessionSnapshot, rid ?? null)
  }, [draftIntel?.picksUntilUser, session])
  const players: PlayerEntry[] = useMemo(() => {
    const rawEntries = Array.isArray(draftPool?.entries)
      ? draftPool.entries
      : Array.isArray((draftData as any)?.entries)
        ? (draftData as any).entries
        : []
    const useNormalizedPool = Array.isArray(draftPool?.entries) && draftPool.entries.length > 0
    return useNormalizedPool
      ? (rawEntries as NormalizedDraftEntry[]).map((e) => {
          const name = e.name ?? e.display?.displayName ?? ''
          const position = e.position ?? e.display?.metadata?.position ?? ''
          const team = e.team ?? e.display?.metadata?.teamAbbreviation ?? null
          const ai = draftUISettings?.aiAdpEnabled
            ? lookupAiAdpMatch(aiAdpLookupMaps, name, position, team)
            : null
          return {
            id: e.playerId ?? e.display?.playerId ?? name,
            name,
            position,
            team,
            adp: e.adp ?? e.display?.stats?.adp ?? null,
            byeWeek: e.byeWeek ?? e.display?.metadata?.byeWeek ?? null,
            aiAdp: draftUISettings?.aiAdpEnabled && ai ? ai.adp : (e.aiAdp ?? null),
            aiAdpSampleSize: ai?.sampleSize,
            aiAdpLowSample: ai?.lowSample,
            display: e.display ?? null,
            isDevy: e.isDevy,
            school: e.school ?? null,
            classYearLabel: e.classYearLabel ?? e.display?.metadata?.classYearLabel ?? null,
            draftGrade: e.draftGrade ?? e.display?.metadata?.draftGrade ?? null,
            projectedLandingSpot: e.projectedLandingSpot ?? e.display?.metadata?.projectedLandingSpot ?? null,
            graduatedToNFL: e.graduatedToNFL,
            poolType: e.poolType,
          }
        })
      : rawEntries.map((e: any) => {
          const name = e.name ?? e.playerName ?? ''
          const position = e.position ?? ''
          const team = e.team ?? null
          const ai = draftUISettings?.aiAdpEnabled
            ? lookupAiAdpMatch(aiAdpLookupMaps, name, position, team)
            : null
          return {
            id: e.id ?? e.playerId ?? name,
            name,
            position,
            team,
            adp: e.adp ?? e.rank ?? null,
            byeWeek: e.byeWeek ?? null,
            aiAdp: draftUISettings?.aiAdpEnabled && ai ? ai.adp : (e.aiAdp ?? null),
            aiAdpSampleSize: ai?.sampleSize,
            aiAdpLowSample: ai?.lowSample,
          }
        })
  }, [draftPool, draftData, aiAdpLookupMaps, draftUISettings?.aiAdpEnabled])

  useEffect(() => {
    roundOneSeenPickIdsRef.current.clear()
    roundOneBootstrapRef.current = false
    roundOneHeygenRequestedRef.current.clear()
    setRoundOneAnnouncementQueue([])
  }, [leagueId])

  const dismissRoundOneAnnouncement = useCallback(() => {
    setRoundOneAnnouncementQueue((q) => q.slice(1))
  }, [])

  const queueRoundOneHeyGenHighlight = useCallback(
    (pickId: string) => {
      if (!draftUISettings?.roundOneHeyGenHighlightEnabled) return
      if (roundOneHeygenRequestedRef.current.has(pickId)) return
      roundOneHeygenRequestedRef.current.add(pickId)
      void fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/round-one-highlight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickId }),
      }).catch(() => {})
    },
    [leagueId, draftUISettings?.roundOneHeyGenHighlightEnabled],
  )

  useEffect(() => {
    if (!session?.picks || session.status !== 'in_progress') return

    const picks = session.picks ?? []
    if (!roundOneBootstrapRef.current) {
      for (const p of picks) roundOneSeenPickIdsRef.current.add(p.id)
      roundOneBootstrapRef.current = true
      return
    }

    const rsRoom = presentationVariant === 'redraft_snake' && !isDynasty
    const visualsOn = draftUISettings?.roundOnePickAnnouncementEnabled !== false

    for (const p of picks) {
      if (roundOneSeenPickIdsRef.current.has(p.id)) continue
      roundOneSeenPickIdsRef.current.add(p.id)
      if (!rsRoom || !visualsOn || p.round !== 1) continue

      const assets = resolvePickAnnouncementAssets(p, players)
      setRoundOneAnnouncementQueue((prev) =>
        [...prev, { id: p.id, pick: p, ...assets }].slice(-4),
      )
      queueRoundOneHeyGenHighlight(p.id)
    }
  }, [
    session?.picks,
    session?.status,
    session?.version,
    players,
    presentationVariant,
    isDynasty,
    draftUISettings?.roundOnePickAnnouncementEnabled,
    draftUISettings?.roundOneHeyGenHighlightEnabled,
    queueRoundOneHeyGenHighlight,
  ])

  const assistantFeedByName = useMemo(
    () =>
      buildAssistantFeedByPlayerName(draftAssistantContext?.headlines ?? [], draftAssistantContext?.injuries ?? []),
    [draftAssistantContext],
  )

  const assistantFeedBriefForRecommend = useMemo(() => {
    const ctx = draftAssistantContext
    if (!ctx) return ''
    const chunks: string[] = []
    for (const h of ctx.headlines.slice(0, 5)) {
      const t = typeof h.title === 'string' ? h.title.trim() : ''
      if (!t) continue
      chunks.push(h.playerName ? `${h.playerName}: ${t}` : t)
    }
    for (const inj of ctx.injuries.slice(0, 5)) {
      const bits = [inj.playerName, inj.team, inj.status, inj.note].filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      )
      if (bits.length) chunks.push(bits.join(' '))
    }
    const digest = ctx.sportsFeed?.digest?.trim()
    if (digest) chunks.push(digest)
    return chunks.join(' | ').slice(0, 600)
  }, [draftAssistantContext])

  const resolvePlayerFromPool = useCallback(
    (name: string, position: string) =>
      players.find(
        (p) =>
          p.name.trim().toLowerCase() === name.trim().toLowerCase() &&
          p.position.trim().toLowerCase() === position.trim().toLowerCase(),
      ) ?? null,
    [players],
  )

  /** AI layers must never surface players who are already drafted or missing from the live pool. */
  const isAiRecommendationPlayerAvailable = useCallback(
    (name: string, position: string): boolean => {
      const resolved = resolvePlayerFromPool(name, position)
      if (!resolved) return false
      if (
        !isPickCommitAllowedByName({
          canDraft: true,
          playerName: resolved.name,
          draftedNames,
        })
      ) {
        return false
      }
      const pidRaw = resolved.display?.playerId ?? resolved.id ?? null
      const pid =
        pidRaw != null &&
        String(pidRaw).trim() !== '' &&
        !String(pidRaw).startsWith('name:')
          ? String(pidRaw).trim()
          : null
      if (
        pid &&
        !isPickCommitAllowed({
          canDraft: true,
          playerId: pid,
          draftedPlayerIds,
        })
      ) {
        return false
      }
      return true
    },
    [resolvePlayerFromPool, draftedNames, draftedPlayerIds],
  )

  const getAssistantRoomContext = useCallback(
    (player: PlayerEntry): DraftAssistantRoomContext | null => {
      const snap = getAssistantFeedForPlayer(assistantFeedByName, player.name)
      const digestRaw = draftAssistantContext?.sportsFeed?.digest?.trim()
      const digestPreview =
        digestRaw && digestRaw.length > 280 ? `${digestRaw.slice(0, 277)}…` : digestRaw ?? null
      const headline = snap?.headlineTitle?.trim() || null
      const injuryLine =
        snap?.injuryStatus || snap?.injuryNote
          ? [snap.injuryStatus, snap.injuryNote].filter(Boolean).join(' · ')
          : null
      if (!headline && !injuryLine && !digestPreview) return null
      return { headline, injuryLine, digestPreview }
    },
    [assistantFeedByName, draftAssistantContext?.sportsFeed?.digest],
  )

  const currentUserRosterId = (session as any)?.currentUserRosterId as string | undefined

  const commissionerOfflinePick = Boolean(draftUISettings?.executionMode === 'offline' && isCommissioner)
  const isCurrentUserOnClock = Boolean(
    currentUserRosterId &&
      draftCore?.draftStarted &&
      draftCore.currentOverall > 0 &&
      draftCore.currentTeamId === currentUserRosterId,
  )
  const canDraft = useMemo(
    () =>
      session != null &&
      session.status === 'in_progress' &&
      draftCore?.draftStarted === true &&
      draftCore.currentOverall > 0 &&
      pickSubmitting === false &&
      (commissionerOfflinePick || isCurrentUserOnClock),
    [session, draftCore, pickSubmitting, commissionerOfflinePick, isCurrentUserOnClock],
  )

  useEffect(() => {
    if (!session) return
    draftRoomPickTrace({
      event: 'draft-gate',
      sessionStatus: session.status,
      sessionCurrentPickOverall: session.currentPick?.overall ?? null,
      effectivePickOverall: currentPick?.overall ?? null,
      draftStarted: draftCore?.draftStarted,
      currentOverall: draftCore?.currentOverall,
      currentUserRosterId,
      currentTeamId: draftCore?.currentTeamId,
      slotOrderLen: session.slotOrder?.length ?? 0,
      rounds: session.rounds,
      teamCount: session.teamCount,
      isCurrentUserOnClock,
      canDraft,
      pickSubmitting,
      timerStatus: session.timer?.status,
      timerEndAt: session.timer?.timerEndAt ?? session.timerEndAt ?? null,
      sessionVersion: session.version,
      updatedAt: session.updatedAt,
    })
  }, [
    session,
    currentPick?.overall,
    draftCore?.draftStarted,
    draftCore?.currentOverall,
    draftCore?.currentTeamId,
    currentUserRosterId,
    isCurrentUserOnClock,
    canDraft,
    pickSubmitting,
  ])

  const fetchDraftPool = useCallback(async () => {
    if (!leagueId) return
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/pool`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.entries)) {
        setDraftPool({
          entries: data.entries,
          sport: data.sport ?? sport,
          devyConfig: data.devyConfig,
          c2cConfig: data.c2cConfig,
          isIdp: data.isIdp,
        })
      } else {
        setDraftPool(null)
      }
    } catch {
      setDraftPool(null)
    }
  }, [leagueId, sport])

  const [idpRosterSummary, setIdpRosterSummary] = useState<{ starterSlots: Record<string, number>; benchSlots: number } | null>(null)
  const [idpScoringPreset, setIdpScoringPreset] = useState<string>('balanced')
  const [idpPositionMode, setIdpPositionMode] = useState<string>('standard')
  const effectiveRosterSlots = useMemo(() => {
    if (formatType === 'IDP' && idpRosterSummary) {
      const slots: string[] = []
      for (const [slotName, count] of Object.entries(idpRosterSummary.starterSlots)) {
        for (let i = 0; i < count; i += 1) slots.push(slotName)
      }
      for (let i = 0; i < (idpRosterSummary.benchSlots ?? 0); i += 1) {
        slots.push('BENCH')
      }
      return slots
    }

    return getDefaultRosterSlotsForSport(effectiveDraftSport)
  }, [effectiveDraftSport, formatType, idpRosterSummary])
  const isSuperflexFormat = useMemo(() => {
    const normalizedSlots = effectiveRosterSlots.map((slot) => String(slot || '').toUpperCase())
    return (
      normalizedSlots.includes('SUPER_FLEX') ||
      normalizedSlots.includes('SUPERFLEX') ||
      normalizedSlots.includes('OP') ||
      normalizedSlots.filter((slot) => slot === 'QB').length >= 2
    )
  }, [effectiveRosterSlots])

  const warRoomBrainInput = useMemo(() => {
    if (!session) return null
    const aiAdpByKey =
      draftUISettings?.aiAdpEnabled && leagueAiAdp?.entries?.length
        ? expandAiAdpKeysForLookup(leagueAiAdp.entries)
        : {}
    return buildLiveDraftBrainPayload({
      session,
      effectiveDraftSport,
      isDynasty,
      formatType,
      isIdpLeague: Boolean(draftPool?.isIdp),
      isSuperflexFormat,
      isTePremium: effectiveRosterSlots.some((s) => /TE\+|PREM|PREMIUM|TE\s*PREM/i.test(String(s))),
      leagueSiteDraftCount: leagueAiAdp?.totalDrafts,
      currentUserRosterId,
      players,
      draftedNames,
      effectiveRosterSlots,
      aiAdpByKey: Object.keys(aiAdpByKey).length ? aiAdpByKey : undefined,
    })
  }, [
    session,
    effectiveDraftSport,
    isDynasty,
    formatType,
    draftPool?.isIdp,
    isSuperflexFormat,
    effectiveRosterSlots,
    leagueAiAdp?.entries,
    leagueAiAdp?.totalDrafts,
    draftUISettings?.aiAdpEnabled,
    currentUserRosterId,
    players,
    draftedNames,
  ])

  const fetchDraftSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/settings`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.draftUISettings) setDraftUISettings(data.draftUISettings)
        if (typeof data.orphanAiProviderAvailable === 'boolean') {
          setOrphanAiProviderAvailableState(data.orphanAiProviderAvailable)
        }
        setSkipPickAllowed(String(data?.config?.autopick_behavior ?? '').toLowerCase() === 'skip')
        if (data.orphanStatus && typeof data.orphanStatus === 'object') {
          setOrphanAiStatus(data.orphanStatus)
        } else {
          setOrphanAiStatus(null)
        }
        if (data.commissionerAiDraft && typeof data.commissionerAiDraft === 'object') {
          setCommissionerAiDraft(data.commissionerAiDraft)
        } else {
          setCommissionerAiDraft(null)
        }
        try {
          const aiSum = await fetch(`/api/league/ai-opponents/summary?leagueId=${encodeURIComponent(leagueId)}`, {
            cache: 'no-store',
            credentials: 'include',
          })
          const sumJson = await aiSum.json().catch(() => ({}))
          if (aiSum.ok && Array.isArray(sumJson.aiManagedDraftRosterIds)) {
            setAiOpponentRosterIds(sumJson.aiManagedDraftRosterIds.filter((x: unknown) => typeof x === 'string'))
          } else {
            setAiOpponentRosterIds([])
          }
          const arch: Record<string, string> = {}
          if (aiSum.ok && Array.isArray(sumJson.assignments)) {
            for (const a of sumJson.assignments as { draftRosterId?: string | null; archetypeLabel?: string | null }[]) {
              if (a.draftRosterId && typeof a.archetypeLabel === 'string' && a.archetypeLabel.trim()) {
                arch[a.draftRosterId] = a.archetypeLabel.trim()
              }
            }
          }
          setAiArchetypeByRoster(arch)
        } catch {
          setAiOpponentRosterIds([])
          setAiArchetypeByRoster({})
        }
        setDraftQueueSizeLimit(normalizeDraftQueueSizeLimit(data?.config?.queue_size_limit))
        setIdpRosterSummary(data.idpRosterSummary ?? null)
      }
    } catch {
      setDraftUISettings(null)
      setSkipPickAllowed(false)
      setOrphanAiStatus(null)
      setCommissionerAiDraft(null)
      setAiOpponentRosterIds([])
      setAiArchetypeByRoster({})
      setDraftQueueSizeLimit(normalizeDraftQueueSizeLimit(null))
      setIdpRosterSummary(null)
    }
  }, [leagueId])

  const fetchDraftAssistantContext = useCallback(async () => {
    if (!leagueId) return
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/assistant-context`, {
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDraftAssistantContext({
          sport: typeof data.sport === 'string' ? data.sport : sport,
          headlines: Array.isArray(data.headlines) ? data.headlines : [],
          injuries: Array.isArray(data.injuries) ? data.injuries : [],
          sportsFeed: data.sportsFeed && typeof data.sportsFeed === 'object'
            ? {
                available: Boolean(data.sportsFeed.available),
                updatedAt: typeof data.sportsFeed.updatedAt === 'string' ? data.sportsFeed.updatedAt : null,
                sourceKeys: Array.isArray(data.sportsFeed.sourceKeys)
                  ? data.sportsFeed.sourceKeys.filter((value: unknown): value is string => typeof value === 'string')
                  : [],
                digest: typeof data.sportsFeed.digest === 'string' ? data.sportsFeed.digest : null,
              }
            : {
                available: false,
                updatedAt: null,
                sourceKeys: [],
                digest: null,
              },
        })
      }
    } catch {
      setDraftAssistantContext(null)
    }
  }, [leagueId, sport])

  const fetchDraftChromeData = useCallback(async () => {
    try {
      const [settingsRes, privacyRes] = await Promise.all([
        fetch(`/api/league/settings?leagueId=${encodeURIComponent(leagueId)}`, { cache: 'no-store' }),
        fetch(`/api/leagues/${encodeURIComponent(leagueId)}/privacy`, { cache: 'no-store' }),
      ])

      const settingsJson = await settingsRes.json().catch(() => ({}))
      const privacyJson = await privacyRes.json().catch(() => ({}))

      if (settingsRes.ok && Array.isArray(settingsJson?.league?.teams)) {
        setLeagueTeams(settingsJson.league.teams as DraftRoomChromeTeam[])
      } else {
        setLeagueTeams([])
      }

      if (privacyRes.ok) {
        setInviteLink(resolveInviteLink(privacyJson))
      } else {
        setInviteLink(null)
      }
    } catch {
      setLeagueTeams([])
      setInviteLink(null)
    }
  }, [leagueId])

  const fetchClaimableRosters = useCallback(async () => {
    if (!leagueId) return
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/claim-roster`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.alreadyClaimed) {
        setClaimableRosterIds([])
        return
      }
      const rows = Array.isArray(data.rosters) ? data.rosters : []
      setClaimableRosterIds(
        rows
          .map((r: { rosterId?: string }) => (typeof r?.rosterId === 'string' ? r.rosterId : ''))
          .filter(Boolean),
      )
    } catch {
      setClaimableRosterIds([])
    }
  }, [leagueId])

  useEffect(() => {
    if (!session?.id) return
    if (currentUserRosterId) {
      setClaimableRosterIds([])
      return
    }
    void fetchClaimableRosters()
  }, [session?.id, currentUserRosterId, fetchClaimableRosters])

  /**
   * Fetch the resolved roster template once per league so DraftRosterStrip can
   * display real slot counts (sport-aware) instead of falling back to the NFL
   * default (QB/RB/WR/TE/FLEX/K/DEF + bench=6). Failure falls through null →
   * strip uses the built-in defaults.
   */
  useEffect(() => {
    if (!leagueId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/roster-config`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (cancelled || !data || typeof data !== 'object') return
        const starterSlots =
          data.starterSlots && typeof data.starterSlots === 'object'
            ? (data.starterSlots as Record<string, number>)
            : {}
        setRosterConfig({
          starterSlots,
          benchSlots: typeof data.benchSlots === 'number' ? data.benchSlots : 0,
          taxiSlots: typeof data.taxiSlots === 'number' ? data.taxiSlots : 0,
          devySlots: typeof data.devySlots === 'number' ? data.devySlots : 0,
        })
      } catch {
        /* keep null → strip falls back to NFL defaults */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [leagueId])

  useEffect(() => {
    if (typeof window === 'undefined' || !leagueId) return
    try {
      const raw = window.localStorage.getItem(localPrefsKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        autoPickFromQueue?: boolean
        awayMode?: boolean
        aiQueueReorderEnabled?: boolean
        draftAiExplanationEnabled?: boolean
      }
      if (typeof parsed.autoPickFromQueue === 'boolean') setAutoPickFromQueue(parsed.autoPickFromQueue)
      if (typeof parsed.awayMode === 'boolean') setAwayMode(parsed.awayMode)
      if (typeof parsed.aiQueueReorderEnabled === 'boolean') {
        setAiQueueReorderEnabled(parsed.aiQueueReorderEnabled)
      }
      if (typeof parsed.draftAiExplanationEnabled === 'boolean') {
        setDraftAiExplanationEnabled(parsed.draftAiExplanationEnabled)
      }
    } catch {
      // Ignore malformed local preferences.
    }
  }, [leagueId, localPrefsKey])

  useEffect(() => {
    if (typeof window === 'undefined' || !leagueId) return
    try {
      window.localStorage.setItem(
        localPrefsKey,
        JSON.stringify({ autoPickFromQueue, awayMode, aiQueueReorderEnabled, draftAiExplanationEnabled })
      )
    } catch {
      // Ignore storage failures.
    }
  }, [leagueId, localPrefsKey, autoPickFromQueue, awayMode, aiQueueReorderEnabled, draftAiExplanationEnabled])

  const fetchLeagueAiAdp = useCallback(async () => {
    if (!draftUISettings?.aiAdpEnabled) {
      setLeagueAiAdp(null)
      return
    }
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/ai-adp`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setLeagueAiAdp({
          enabled: data.enabled ?? false,
          entries: Array.isArray(data.entries) ? data.entries : [],
          totalDrafts: data.totalDrafts ?? 0,
          computedAt: data.computedAt ?? null,
          stale: data.stale ?? false,
          ageHours: data.ageHours ?? null,
          message: data.message ?? null,
        })
      } else {
        setLeagueAiAdp({ enabled: true, entries: [], totalDrafts: 0, computedAt: null, stale: true, ageHours: null, message: 'AI ADP unavailable' })
      }
    } catch {
      setLeagueAiAdp(draftUISettings?.aiAdpEnabled ? { enabled: true, entries: [], totalDrafts: 0, computedAt: null, stale: true, ageHours: null, message: 'AI ADP unavailable' } : null)
    }
  }, [leagueId, draftUISettings?.aiAdpEnabled])

  const fetchSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/session`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setDraftSessionAccess("unauthorized")
        setSession(null)
        return false
      }
      if (res.status === 403) {
        setDraftSessionAccess("forbidden")
        setSession(null)
        return false
      }
      if (res.ok && data.session) {
        setDraftSessionAccess("ok")
        setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        return true
      }
      if (res.ok) {
        setDraftSessionAccess("ok")
        setSession(null)
        return true
      }
      setDraftSessionAccess(null)
      setSession(null)
      return false
    } catch {
      setDraftSessionAccess(null)
      setSession(null)
      return false
    }
  }, [leagueId])

  /**
   * Combined poll: authoritative session when changed (`since` vs row `updatedAt`) + optional queue + chat.
   * Does not bump `updatedAt` when unchanged (avoids merge churn). Returns whether the HTTP round-trip succeeded.
   */
  const fetchLiveSync = useCallback(
    async (opts: { since?: string; includeQueue: boolean; includeChat: boolean }): Promise<boolean> => {
      try {
        const sp = new URLSearchParams()
        if (opts.since) sp.set('since', opts.since)
        if (!opts.includeQueue) sp.set('queue', '0')
        if (!opts.includeChat) sp.set('chat', '0')
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(leagueId)}/draft/live-sync?${sp.toString()}`,
          { cache: 'no-store' },
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return false

        if (data.session) {
          setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        }

        if (opts.includeQueue && Array.isArray(data.queue)) {
          const next = data.queue as QueueEntry[]
          setQueue((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
        }

        if (opts.includeChat && Array.isArray(data.messages)) {
          const incoming = data.messages as DraftChatMessage[]
          setChatMessages((prev) => {
            const merged = mergeDraftChatWire(prev, incoming)
            return JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged
          })
          if (typeof data.syncActive === 'boolean') setChatSyncActive(data.syncActive)
        }

        return true
      } catch {
        return false
      }
    },
    [leagueId],
  )

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/queue`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.queue)) {
        const next = data.queue as QueueEntry[]
        setQueue((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
      }
    } catch {
      setQueue([])
    }
  }, [leagueId])

  const fetchChat = useCallback(async () => {
    if (!leagueId) return
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/chat`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.messages)) {
        const incoming = data.messages as DraftChatMessage[]
        setChatMessages((prev) => {
          const merged = mergeDraftChatWire(prev, incoming)
          return JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged
        })
        setChatSyncActive(Boolean(data.syncActive))
      }
    } catch {
      /* Keep last good messages — blanking chat on a flaky network reads like data loss */
      setChatSyncActive(false)
    }
  }, [leagueId])

  const handleChatReconnect = useCallback(() => {
    setChatSendError(null)
    fetchSession()
    fetchQueue()
    fetchDraftSettings()
    fetchDraftAssistantContext()
    fetchChat()
  }, [fetchSession, fetchQueue, fetchDraftSettings, fetchDraftAssistantContext, fetchChat])

  /**
   * Toggle a chat reaction via the shared reactions route. Optimistic update
   * mutates local state immediately (add or remove by emoji+userId) so the UI
   * feels snappy; the next `fetchChat()` reconciles the authoritative counts
   * from the server. Falls through silently on failure — the reconcile fetch
   * restores the correct state.
   */
  const handleReactChat = useCallback(
    async (messageId: string, emoji: string) => {
      if (!viewerAppUserId) return
      let didAdd = true
      setChatMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m
          const reactions = Array.isArray((m as { reactions?: unknown }).reactions)
            ? ([...((m as { reactions: Array<{ emoji: string; count: number; userIds: string[] }> }).reactions)])
            : []
          const idx = reactions.findIndex((r) => r.emoji === emoji)
          if (idx >= 0) {
            const entry = reactions[idx]!
            if (entry.userIds.includes(viewerAppUserId)) {
              const userIds = entry.userIds.filter((id) => id !== viewerAppUserId)
              didAdd = false
              if (userIds.length === 0) reactions.splice(idx, 1)
              else reactions[idx] = { ...entry, userIds, count: userIds.length }
            } else {
              const userIds = [...entry.userIds, viewerAppUserId]
              reactions[idx] = { ...entry, userIds, count: userIds.length }
            }
          } else {
            reactions.push({ emoji, count: 1, userIds: [viewerAppUserId] })
          }
          return { ...m, reactions }
        }),
      )
      try {
        const roomId = `league:${leagueId}`
        await fetch(
          `/api/shared/chat/threads/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/reactions`,
          {
            method: didAdd ? 'POST' : 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji }),
          },
        )
      } catch {
        /* reconcile on next fetch */
      } finally {
        fetchChat()
      }
    },
    [viewerAppUserId, leagueId, fetchChat],
  )

  const [chatSending, setChatSending] = useState(false)
  const [chatSendError, setChatSendError] = useState<string | null>(null)
  const [pickSuccessFlash, setPickSuccessFlash] = useState<string | null>(null)

  const handleSendChat = useCallback(
    async (text: string) => {
      if (!text.trim() || chatSending) return
      setChatSending(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim() }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.message) {
          setChatSendError(null)
          sendProductAnalyticsBeacon(DRAFT_ROOM.CHAT_SEND, {
            leagueId,
            len: text.trim().length,
            leagueSync: typeof data.syncActive === 'boolean' ? data.syncActive : undefined,
          })
          setChatMessages((prev) => {
            const msg = data.message as (typeof prev)[0]
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
          })
          if (typeof data.syncActive === 'boolean') {
            setChatSyncActive(data.syncActive)
          }
        } else {
          setChatSendError(typeof data?.error === 'string' ? data.error : 'Message could not be sent. Try again.')
        }
      } catch (err) {
        draftRoomWarn('chat-send', err)
        setChatSendError('Could not send message. Check your connection and try again.')
      } finally {
        setChatSending(false)
      }
    },
    [leagueId, chatSending],
  )

  const fetchCommissionerLeagues = useCallback(async () => {
    try {
      const res = await fetch('/api/commissioner/leagues', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.leagues)) setCommissionerLeagues(data.leagues)
    } catch {
      setCommissionerLeagues([])
    }
  }, [])

  const handleBroadcastOpen = useCallback(() => {
    setShowBroadcastModal(true)
    setBroadcastSelectedIds(new Set([leagueId]))
    setBroadcastMessage('')
    fetchCommissionerLeagues()
  }, [leagueId, fetchCommissionerLeagues])

  const handleBroadcastSubmit = useCallback(async () => {
    if (broadcastSelectedIds.size === 0 || !broadcastMessage.trim() || broadcastSending) return
    setBroadcastSending(true)
    try {
      const res = await fetch('/api/commissioner/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueIds: Array.from(broadcastSelectedIds),
          message: broadcastMessage.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setShowBroadcastModal(false)
        setBroadcastMessage('')
        if (broadcastSelectedIds.has(leagueId)) fetchChat()
      }
    } finally {
      setBroadcastSending(false)
    }
  }, [broadcastSelectedIds, broadcastMessage, broadcastSending, leagueId, fetchChat])

  const fetchRecommendation = useCallback(async () => {
    if (!session || !currentPick || !session.teamCount) return
    const myRoster = session.picks?.filter((p) => p.rosterId === currentUserRosterId).map((p) => ({
      position: p.position,
      team: p.team ?? null,
      byeWeek: p.byeWeek ?? null,
    })) ?? []
    const availablePool = filterPlayersAvailableForDraftAi(players, draftedNames, draftedPlayerIds)
    const available = availablePool.map((p) => ({
      name: p.name,
      position: p.position,
      team: p.team ?? null,
      adp: draftUISettings?.aiAdpEnabled && p.aiAdp != null ? p.aiAdp : p.adp,
      byeWeek: p.byeWeek ?? null,
    }))
    if (available.length === 0) {
      setLiveBrainEnvelope(null)
      setRecommendationResult({
        recommendation: null,
        alternatives: [],
        reachWarning: null,
        valueWarning: null,
        scarcityInsight: null,
        stackInsight: null,
        correlationInsight: null,
        formatInsight: null,
        byeNote: null,
        explanation: '',
        evidence: [],
        caveats: ['No available players.'],
        uncertainty: 'High uncertainty: no available players in pool.',
      })
      return
    }
    setRecommendationLoading(true)
    setRecommendationError(null)
    let brainPromise: Promise<LiveDraftBrainEnvelope | null> = Promise.resolve(null)
    try {
      const aiAdpByKey =
        draftUISettings?.aiAdpEnabled && leagueAiAdp?.entries?.length
          ? expandAiAdpKeysForLookup(leagueAiAdp.entries)
          : {}
      brainPromise = (async (): Promise<LiveDraftBrainEnvelope | null> => {
        try {
          if (!session) return null
          const payload = buildLiveDraftBrainPayload({
            session,
            effectiveDraftSport,
            isDynasty,
            formatType,
            isIdpLeague: Boolean(draftPool?.isIdp),
            isSuperflexFormat,
            isTePremium: effectiveRosterSlots.some((s) => /TE\+|PREM|PREMIUM|TE\s*PREM/i.test(String(s))),
            leagueSiteDraftCount: leagueAiAdp?.totalDrafts,
            currentUserRosterId,
            players,
            draftedNames,
            effectiveRosterSlots,
            aiAdpByKey: Object.keys(aiAdpByKey).length ? aiAdpByKey : undefined,
          })
          if (!payload) return null
          const res = await fetch('/api/draft/live-brain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leagueId, ...payload }),
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok && data.ok && data.envelope) return data.envelope as LiveDraftBrainEnvelope
        } catch {
          /* non-fatal */
        }
        return null
      })()
      const requestRecommendation = async (confirmTokenSpendForFallback: boolean) => {
        const res = await fetch('/api/draft/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            available,
            teamRoster: myRoster,
            rosterSlots: effectiveRosterSlots,
            round: currentPick.round,
            pick: currentPick.slot,
            totalTeams: session.teamCount,
            sport: effectiveDraftSport,
            isDynasty,
            isSF: isSuperflexFormat,
            mode: 'needs',
            includeAIExplanation: draftAiExplanationEnabled,
            leagueId,
            leagueName,
            confirmTokenSpend: confirmTokenSpendForFallback,
            aiAdpByKey: Object.keys(aiAdpByKey).length ? aiAdpByKey : undefined,
            ...(assistantFeedBriefForRecommend.trim()
              ? { assistantFeedBrief: assistantFeedBriefForRecommend }
              : {}),
          }),
        })
        const data = await res.json().catch(() => ({}))
        return { res, data }
      }

      let { res, data } = await requestRecommendation(false)
      if (
        !res.ok &&
        data?.code === 'token_confirmation_required' &&
        typeof data?.preview?.ruleCode === 'string'
      ) {
        const confirmation = await confirmTokenSpend(data.preview.ruleCode)
        if (!confirmation.confirmed) {
          setLiveBrainEnvelope(await brainPromise)
          setRecommendationError('Token confirmation cancelled. Draft AI explanation was not unlocked.')
          return
        }
        ;({ res, data } = await requestRecommendation(true))
      }

      setLiveBrainEnvelope(await brainPromise)
      if (res.ok && data.ok) {
        let recommendation = data.recommendation ?? null
        let alternatives = Array.isArray(data.alternatives) ? data.alternatives : []
        const caveatsBase = Array.isArray(data.caveats) ? [...data.caveats] : []

        if (
          recommendation &&
          !isAiRecommendationPlayerAvailable(recommendation.player.name, recommendation.player.position)
        ) {
          caveatsBase.push('Copilot pick is no longer available on the board — opponent may have just drafted them.')
          recommendation = null
        }
        alternatives = alternatives.filter((alt: { player?: { name?: string; position?: string } }) =>
          alt?.player?.name && alt?.player?.position
            ? isAiRecommendationPlayerAvailable(alt.player.name, alt.player.position)
            : false,
        )

        setRecommendationResult({
          recommendation,
          alternatives,
          reachWarning: data.reachWarning ?? null,
          valueWarning: data.valueWarning ?? null,
          scarcityInsight: data.scarcityInsight ?? null,
          stackInsight: data.stackInsight ?? null,
          correlationInsight: data.correlationInsight ?? null,
          formatInsight: data.formatInsight ?? null,
          byeNote: data.byeNote ?? null,
          explanation: data.explanation ?? '',
          evidence: Array.isArray(data.evidence) ? data.evidence : [],
          caveats: caveatsBase,
          uncertainty: data.uncertainty ?? null,
          execution: data.execution ?? null,
        })
      } else {
        setRecommendationError(data.error || 'Failed to get recommendation')
      }
    } catch (e: any) {
      setRecommendationError(e?.message || 'Request failed')
      try {
        setLiveBrainEnvelope(await brainPromise)
      } catch {
        setLiveBrainEnvelope(null)
      }
    } finally {
      setRecommendationLoading(false)
    }
  }, [
    currentPick,
    session?.teamCount,
    session?.picks,
    session,
    draftPool,
    draftData,
    draftUISettings?.aiAdpEnabled,
    leagueAiAdp,
    effectiveDraftSport,
    effectiveRosterSlots,
    isSuperflexFormat,
    isDynasty,
    draftAiExplanationEnabled,
    currentUserRosterId,
    leagueId,
    players,
    draftedNames,
    formatType,
    draftedPlayerIds,
    assistantFeedBriefForRecommend,
    leagueName,
    resolvePlayerFromPool,
    isAiRecommendationPlayerAvailable,
  ])

  /** Off-the-clock: clear pick-specific AI so we never show another team's on-clock plan as yours. */
  useEffect(() => {
    if (!session || !currentUserRosterId || !currentPick) return
    if (currentPick.rosterId === currentUserRosterId) return
    setRecommendationResult({
      recommendation: null,
      alternatives: [],
      reachWarning: null,
      valueWarning: null,
      scarcityInsight: null,
      stackInsight: null,
      correlationInsight: null,
      formatInsight: null,
      byeNote: null,
      explanation: '',
      evidence: [],
      caveats: [],
      uncertainty: null,
      execution: null,
    })
    setRecommendationError(null)
    recommendationRequestKeyRef.current = ''
  }, [currentPick?.rosterId, currentUserRosterId, session])

  useEffect(() => {
    if (!session?.teamCount || !currentPick || players.length === 0) return
    if (!currentUserRosterId || currentPick.rosterId !== currentUserRosterId) {
      recommendationRequestKeyRef.current = ''
      return
    }
    const recommendationKey = [
      currentPick.overall ?? 0,
      currentPick.rosterId ?? '',
      session.picks?.length ?? 0,
      players.length,
      draftedPlayerIds.size,
      draftUISettings?.aiAdpEnabled ? 'ai' : 'deterministic',
      draftAiExplanationEnabled ? 'ai-explain-on' : 'ai-explain-off',
      leagueAiAdp?.computedAt ?? 'no-ai-adp',
    ].join('|')
    if (recommendationRequestKeyRef.current === recommendationKey) return
    recommendationRequestKeyRef.current = recommendationKey
    fetchRecommendation()
  }, [
    currentPick?.overall,
    currentPick?.rosterId,
    session?.picks?.length,
    session?.teamCount,
    players.length,
    draftedPlayerIds.size,
    draftUISettings?.aiAdpEnabled,
    draftAiExplanationEnabled,
    leagueAiAdp?.computedAt,
    fetchRecommendation,
    currentUserRosterId,
  ])

  /** Drop copilot picks/alts that were taken while AI was in flight or before the next refresh. */
  useEffect(() => {
    setRecommendationResult((prev) => {
      if (!prev) return prev
      let recommendation = prev.recommendation
      if (recommendation) {
        const rp = recommendation.player
        if (!isAiRecommendationPlayerAvailable(rp.name, rp.position)) {
          recommendationRequestKeyRef.current = ''
          recommendation = null
        }
      }
      const filteredAlts = (prev.alternatives ?? []).filter((a) =>
        isAiRecommendationPlayerAvailable(a.player.name, a.player.position),
      )
      const caveats =
        recommendation !== prev.recommendation && prev.recommendation
          ? [...(prev.caveats ?? []), 'Recommended player is off the board — sync refreshed.'].slice(0, 14)
          : prev.caveats ?? []
      if (
        recommendation === prev.recommendation &&
        filteredAlts.length === (prev.alternatives ?? []).length
      ) {
        return prev
      }
      return { ...prev, recommendation, alternatives: filteredAlts, caveats }
    })
  }, [isAiRecommendationPlayerAvailable])

  useEffect(() => {
    if (!leagueId) return
    setLoading(true)
      Promise.all([
        fetchSession(),
        fetchQueue(),
        fetchDraftSettings(),
        fetchDraftChromeData(),
        fetchChat(),
        fetchDraftPool(),
        fetchDraftAssistantContext(),
      ]).finally(() => setLoading(false))
  }, [leagueId, fetchSession, fetchQueue, fetchDraftSettings, fetchDraftChromeData, fetchChat, fetchDraftPool, fetchDraftAssistantContext])

  useEffect(() => {
    if (!leagueId || !draftUISettings?.aiAdpEnabled) return
    fetchLeagueAiAdp()
  }, [leagueId, draftUISettings?.aiAdpEnabled, fetchLeagueAiAdp])

  useEffect(() => {
    if (!leagueId || !currentUserRosterId) return
    setDraftIntelLoading(true)
    const stream = new EventSource(
      `/api/draft/intel/stream?leagueId=${encodeURIComponent(leagueId)}`
    )

    const handleStateEvent = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data) as DraftIntelState
        setDraftIntel(next)
      } catch {
        // Ignore malformed SSE payloads.
      } finally {
        setDraftIntelLoading(false)
      }
    }

    stream.addEventListener('snapshot', handleStateEvent as EventListener)
    stream.addEventListener('queue_update', handleStateEvent as EventListener)
    stream.addEventListener('on_clock', handleStateEvent as EventListener)
    stream.addEventListener('recap', handleStateEvent as EventListener)
    stream.onerror = () => {
      setDraftIntelLoading(false)
      draftRoomWarn('intel-sse-disconnect', { leagueId })
      void fetchSession()
    }

    return () => {
      stream.close()
    }
  }, [leagueId, currentUserRosterId, fetchSession])

  const [pollInterval, setPollInterval] = useState(POLL_MS)
  const refetchOnceRef = useRef<(() => void) | null>(null)
  const pollTickRef = useRef(0)
  const pollInFlightRef = useRef(false)
  /** Prevents double POST before React state catches up with rapid Draft clicks. */
  const pickInflightRef = useRef(false)
  useEffect(() => {
    if (!leagueId) return
    const run = async () => {
      if (pollInFlightRef.current) return
      pollInFlightRef.current = true
      const tick = pollTickRef.current + 1
      pollTickRef.current = tick
      try {
        const since = sessionRef.current?.updatedAt
        const onClockForCurrentUser = Boolean(
          sessionRef.current?.currentPick?.rosterId &&
          currentUserRosterId &&
          sessionRef.current.currentPick.rosterId === currentUserRosterId
        )
        const shouldRefreshQueue = (tick % QUEUE_POLL_EVERY_N_TICKS) === 0 || onClockForCurrentUser
        const shouldRefreshSettings = (tick % SETTINGS_POLL_EVERY_N_TICKS) === 0 || showCommissionerModal
        const shouldRefreshChat = chatSyncActive || (tick % CHAT_POLL_EVERY_N_TICKS) === 0
        const shouldRefreshPool = (tick % POOL_POLL_EVERY_N_TICKS) === 0

        const sessionPollOk = await fetchLiveSync({
          since,
          includeQueue: shouldRefreshQueue,
          includeChat: shouldRefreshChat,
        })

        const secondary: Promise<unknown>[] = []
        if (shouldRefreshSettings) secondary.push(fetchDraftSettings())
        if (shouldRefreshSettings) secondary.push(fetchDraftAssistantContext())
        if (shouldRefreshPool) secondary.push(fetchDraftPool())

        const aiAdpComputedAt = leagueAiAdp?.computedAt ? new Date(leagueAiAdp.computedAt).getTime() : 0
        const skipAiAdp = draftUISettings?.aiAdpEnabled && aiAdpComputedAt && Date.now() - aiAdpComputedAt < AI_ADP_POLL_SKIP_MS
        if (draftUISettings?.aiAdpEnabled && !skipAiAdp) secondary.push(fetchLeagueAiAdp())
        await Promise.all(secondary)

        /** Authoritative session sync failed: streak + delay before showing badge (healthy polls stay quiet). */
        if (!sessionPollOk) {
          pollSessionFailStreakRef.current += 1
          if (pollSessionFailStreakRef.current >= SESSION_POLL_FAILS_FOR_DEGRADED && connectionDegradedTimerRef.current == null) {
            connectionDegradedTimerRef.current = window.setTimeout(() => {
              connectionDegradedTimerRef.current = null
              setConnectionDegraded(true)
            }, CONNECTION_DEGRADED_SHOW_DELAY_MS)
          }
        } else {
          pollSessionFailStreakRef.current = 0
          if (connectionDegradedTimerRef.current != null) {
            clearTimeout(connectionDegradedTimerRef.current)
            connectionDegradedTimerRef.current = null
          }
          setConnectionDegraded(false)
        }
      } finally {
        pollInFlightRef.current = false
      }
    }
    refetchOnceRef.current = () => { void run() }
  }, [
    leagueId,
    fetchLiveSync,
    fetchDraftSettings,
    fetchDraftAssistantContext,
    fetchDraftPool,
    fetchLeagueAiAdp,
    draftUISettings?.aiAdpEnabled,
    leagueAiAdp?.computedAt,
    showCommissionerModal,
    chatSyncActive,
    currentUserRosterId,
  ])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const compute = () => {
      const hidden = document.hidden
      if (hidden) {
        setPollInterval(POLL_MS_BACKGROUND)
        return
      }
      refetchOnceRef.current?.()
      const active = session?.status === 'in_progress'
      const ts = session?.timer?.status
      if (active && (ts === 'running' || ts === 'expired')) {
        setPollInterval(2000)
      } else {
        setPollInterval(POLL_MS)
      }
    }
    compute()
    document.addEventListener('visibilitychange', compute)
    return () => document.removeEventListener('visibilitychange', compute)
  }, [session?.status, session?.timer?.status])

  /** Full session GET when tab becomes visible — complements `/draft/live-sync` polling. */
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibility = () => {
      if (document.hidden) return
      void fetchSession().then((ok) => {
        if (ok) {
          pollSessionFailStreakRef.current = 0
          if (connectionDegradedTimerRef.current != null) {
            clearTimeout(connectionDegradedTimerRef.current)
            connectionDegradedTimerRef.current = null
          }
          setConnectionDegraded(false)
        }
      })
      refetchOnceRef.current?.()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [fetchSession])

  useEffect(() => {
    if (!leagueId) return
    const id = setInterval(() => {
      refetchOnceRef.current?.()
    }, pollInterval)
    return () => clearInterval(id)
  }, [leagueId, pollInterval])

  // ── Supabase realtime: chat new-message trigger ──────────────────────────
  // Subscribes to INSERT on league_chat_messages for this league.
  // On new message, calls fetchChat() instead of appending raw payload to
  // avoid ordering/dedup issues. Falls back silently when Supabase is not configured.
  useEffect(() => {
    if (!isSupabaseConfigured || !leagueId) return
    const channel = supabase
      .channel(`draft-chat-rt:${leagueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'league_chat_messages', filter: `league_id=eq.${leagueId}` },
        () => { void fetchChat() },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [leagueId, fetchChat])

  // ── Supabase realtime: draft-room presence ────────────────────────────────
  // Tracks how many browsers are currently viewing this draft room.
  // Uses a stable session key so refreshes don't inflate the count.
  const [onlineCount, setOnlineCount] = useState<number>(0)
  useEffect(() => {
    if (!isSupabaseConfigured || !leagueId) return
    const sessionKey = (() => {
      const k = 'af:draft-presence-key'
      let key = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(k) : null
      if (!key) {
        key = Math.random().toString(36).slice(2)
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(k, key)
      }
      return key
    })()
    const channel = supabase.channel(`draft-presence:${leagueId}`, {
      config: { presence: { key: sessionKey } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ joined_at: new Date().toISOString() })
        }
      })
    return () => { void supabase.removeChannel(channel) }
  }, [leagueId])

  useEffect(() => {
    return () => {
      if (governanceSuccessTimeoutRef.current) clearTimeout(governanceSuccessTimeoutRef.current)
      if (connectionDegradedTimerRef.current) clearTimeout(connectionDegradedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (governanceBanner?.variant !== 'success') return
    if (governanceSuccessTimeoutRef.current) clearTimeout(governanceSuccessTimeoutRef.current)
    governanceSuccessTimeoutRef.current = setTimeout(() => {
      setGovernanceBanner(null)
      governanceSuccessTimeoutRef.current = null
    }, 7000)
    return () => {
      if (governanceSuccessTimeoutRef.current) clearTimeout(governanceSuccessTimeoutRef.current)
    }
  }, [governanceBanner])

  const handleCommissionerAction = useCallback(
    async (action: string, payload?: Record<string, unknown>): Promise<CommissionerControlApiResult> => {
      setCommissionerLoading(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/controls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...payload }),
        })
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
        const errMsg =
          typeof data.error === 'string'
            ? data.error
            : typeof (data as { message?: unknown }).message === 'string'
              ? String((data as { message: string }).message)
              : null

        if (!res.ok) {
          const msg = errMsg || `Commissioner action failed (${res.status}).`
          setGovernanceBanner({ variant: 'error', message: msg })
          return { ok: false, error: msg }
        }

        if (data.session) {
          setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        } else {
          await fetchSession()
        }

        void fetchQueue()
        if (action === 'undo_pick') {
          void fetchChat()
          void fetchDraftPool()
          void fetchDraftAssistantContext()
        }
        if (action === 'pause' || action === 'resume') {
          void fetchDraftPool()
        }
        if (action === 'set_timer_seconds') void fetchDraftSettings()

        const successMsg = commissionerActionSuccessCopy(action)
        setGovernanceBanner({ variant: 'success', message: successMsg })

        return { ok: true, ...data }
      } catch {
        const msg = 'Network error — try your commissioner action again.'
        setGovernanceBanner({ variant: 'error', message: msg })
        return { ok: false, error: msg }
      } finally {
        setCommissionerLoading(false)
      }
    },
    [
      leagueId,
      fetchSession,
      fetchQueue,
      fetchChat,
      fetchDraftPool,
      fetchDraftAssistantContext,
      fetchDraftSettings,
    ],
  )

  const handleCommissionerUndoPick = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Undo the last drafted pick for everyone in this league? Traded-pick swaps may need a manual double-check.',
      )
    ) {
      return Promise.resolve({ ok: false as const, error: 'Cancelled.', cancelled: true })
    }
    return handleCommissionerAction('undo_pick')
  }, [handleCommissionerAction])

  const handleCommissionerResetTimer = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm('Reset the pick clock to full time for the current pick?')) {
      return Promise.resolve({ ok: false as const, error: 'Cancelled.', cancelled: true })
    }
    return handleCommissionerAction('reset_timer')
  }, [handleCommissionerAction])

  const fetchPendingTradesCount = useCallback(async () => {
    if (!leagueId || !currentUserRosterId) return
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/trade-proposals`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.proposals)) {
        const pending = data.proposals.filter((p: any) => p.status === 'pending' && p.receiverRosterId === currentUserRosterId)
        setPendingTradesCount(pending.length)
      }
    } catch {
      setPendingTradesCount(0)
    }
  }, [leagueId, currentUserRosterId])

  useEffect(() => {
    if (session?.status === 'in_progress' && currentUserRosterId) fetchPendingTradesCount()
  }, [session?.status, currentUserRosterId, fetchPendingTradesCount])

  const handleStartDraft = useCallback(async () => {
    try {
      setPickError(null)
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) {
        sendProductAnalyticsBeacon(DRAFT_ROOM.START_DRAFT, { leagueId, ok: true })
        setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        await fetchDraftPool()
      } else {
        sendProductAnalyticsBeacon(DRAFT_ROOM.START_DRAFT, { leagueId, ok: false })
        setPickError(typeof data?.error === 'string' ? data.error : 'Could not start the draft. Check that the draft order is set and try again.')
      }
    } catch (_) {
      sendProductAnalyticsBeacon(DRAFT_ROOM.START_DRAFT, { leagueId, ok: false, error: true })
      setPickError('Could not start the draft. Try again.')
    }
  }, [leagueId, fetchDraftPool])

  const handleSettingsPatch = useCallback(
    async (patch: Partial<DraftUISettings>) => {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.draftUISettings) setDraftUISettings(data.draftUISettings)
    },
    [leagueId]
  )

  const handleSaveCommissionerAiDraft = useCallback(
    async (payload: {
      assignedAiTeams: Array<{ teamId: string; aiStyle: string; tradeAggression: string; active: boolean }>
      tradeRules: Record<string, unknown>
    }) => {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/commissioner-ai-managers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.assignedAiTeams && data.tradeRules) {
        setCommissionerAiDraft({
          assignedAiTeams: data.assignedAiTeams,
          tradeRules: data.tradeRules,
        })
        await fetchSession()
      }
      return data
    },
    [leagueId, fetchSession]
  )

  const handleSaveDevyConfig = useCallback(
    async (input: { enabled: boolean; devyRounds: number[] }) => {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/devy/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: Boolean(input.enabled),
          devyRounds: Array.isArray(input.devyRounds) ? input.devyRounds : [],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) {
        setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        await fetchDraftPool()
      }
      return data
    },
    [leagueId, fetchDraftPool]
  )

  const handleSaveC2CConfig = useCallback(
    async (input: { enabled: boolean; collegeRounds: number[] }) => {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/c2c/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: Boolean(input.enabled),
          collegeRounds: Array.isArray(input.collegeRounds) ? input.collegeRounds : [],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) {
        setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        await fetchDraftPool()
      }
      return data
    },
    [leagueId, fetchDraftPool]
  )

  const handleCopyInvite = useCallback(
    async (source: 'inline' | 'menu' = 'menu') => {
      if (typeof navigator === 'undefined' || !navigator.clipboard) return

      try {
        if (inviteLink) {
          await navigator.clipboard.writeText(inviteLink)
          sendProductAnalyticsBeacon(DRAFT_ROOM.INVITE_COPY, { leagueId, source })
          return
        }

        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/privacy`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const resolved = res.ok ? resolveInviteLink(data) : null
        if (!resolved) return
        setInviteLink(resolved)
        await navigator.clipboard.writeText(resolved)
        sendProductAnalyticsBeacon(DRAFT_ROOM.INVITE_COPY, { leagueId, source })
      } catch {
        // Ignore invite copy failures in the shell.
      }
    },
    [inviteLink, leagueId],
  )

  const handleClaimSlot = useCallback(
    async (rosterId: string) => {
      setClaimSlotLoadingRosterId(rosterId)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/claim-roster`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rosterId }),
        })
        const ok = res.ok
        sendProductAnalyticsBeacon(DRAFT_ROOM.CLAIM_SLOT, { leagueId, rosterId, ok })
        if (ok) {
          await fetchSession()
          await fetchDraftChromeData()
          setClaimableRosterIds([])
        }
      } catch {
        sendProductAnalyticsBeacon(DRAFT_ROOM.CLAIM_SLOT, { leagueId, rosterId, ok: false })
      } finally {
        setClaimSlotLoadingRosterId(null)
      }
    },
    [leagueId, fetchSession, fetchDraftChromeData],
  )

  const openPickTradePanel = useCallback(() => {
    setTradeInitialDraft(null)
    setTradePanelGeneration((g) => g + 1)
    setShowTradePanel(true)
  }, [])

  const openPickTradeFromBoard = useCallback(
    (ctx: { round: number; ownerSlot: number; ownerRosterId: string; overall: number }) => {
      if (!currentUserRosterId || !session) return
      const roundsMax = Math.max(1, session.rounds)
      const r = Math.min(Math.max(1, ctx.round), roundsMax)
      const isMine = ctx.ownerRosterId === currentUserRosterId
      setTradeInitialDraft(
        isMine
          ? { giveRound: r, receiveRound: r, receiverRosterId: '' }
          : { giveRound: r, receiveRound: r, receiverRosterId: ctx.ownerRosterId },
      )
      setTradePanelGeneration((g) => g + 1)
      setShowTradePanel(true)
      sendProductAnalyticsBeacon(DRAFT_ROOM.TRADE_OPEN_FROM_BOARD, {
        leagueId,
        round: ctx.round,
        ownerSlot: ctx.ownerSlot,
        overall: ctx.overall,
        targetIsMine: isMine,
      })
    },
    [currentUserRosterId, leagueId, session],
  )

  const handleResync = useCallback(() => {
    setResyncLoading(true)
    Promise.all([
      fetchSession(),
      fetchDraftSettings(),
      fetchDraftChromeData(),
      fetchQueue(),
      fetchChat(),
      fetchDraftPool(),
      fetchDraftAssistantContext(),
      draftUISettings?.aiAdpEnabled ? fetchLeagueAiAdp() : Promise.resolve(),
      fetchPendingTradesCount(),
      fetchClaimableRosters(),
    ]).finally(() => {
      setResyncLoading(false)
      pollSessionFailStreakRef.current = 0
      if (connectionDegradedTimerRef.current != null) {
        clearTimeout(connectionDegradedTimerRef.current)
        connectionDegradedTimerRef.current = null
      }
      setConnectionDegraded(false)
    })
  }, [
    fetchSession,
    fetchDraftSettings,
    fetchDraftChromeData,
    fetchQueue,
    fetchChat,
    fetchDraftPool,
    fetchDraftAssistantContext,
    fetchLeagueAiAdp,
    draftUISettings?.aiAdpEnabled,
    fetchPendingTradesCount,
    fetchClaimableRosters,
  ])

  const handleRunAiPick = useCallback(async () => {
    setRunAiPickLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/ai-pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) {
        setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        await fetchDraftPool()
        if (data.usedFallback) {
          setPickError('AI mode used deterministic CPU fallback for this pick.')
        }
      } else {
        setPickError(typeof data?.error === 'string' ? data.error : 'Automated orphan pick failed.')
      }
      await fetchDraftSettings()
    } finally {
      setRunAiPickLoading(false)
    }
  }, [leagueId, fetchDraftSettings, fetchDraftPool])

  const handleMakePick = useCallback(
    async (player: PlayerEntry) => {
      setPickError(null)
      const offlineCommissioner = draftUISettings?.executionMode === 'offline' && isCommissioner
      if (!canDraft) {
        draftRoomPickTrace({
          event: 'pick-blocked',
          reason: 'canDraft_false',
          sessionStatus: session?.status,
          draftStarted: draftCore?.draftStarted,
          currentOverall: draftCore?.currentOverall,
          currentUserRosterId,
          currentTeamId: draftCore?.currentTeamId,
          isCurrentUserOnClock,
          pickSubmitting,
        })
        setPickError('You cannot draft right now.')
        return
      }
      if (!offlineCommissioner) {
        const cp = currentPick
        if (!cp || !currentUserRosterId || cp.rosterId !== currentUserRosterId) {
          draftRoomPickTrace({
            event: 'pick-blocked',
            reason: 'not_on_clock',
            currentPickRosterId: cp?.rosterId,
            currentUserRosterId,
          })
          setPickError('You can only draft when your team is on the clock.')
          return
        }
      }
      const stablePlayerId = player.display?.playerId ?? player.id ?? null
      if (!isPickCommitAllowedByName({ canDraft: true, playerName: player.name, draftedNames })) {
        setPickError('That player is already drafted.')
        return
      }
      if (!isPickCommitAllowed({ canDraft: true, playerId: stablePlayerId, draftedPlayerIds })) {
        setPickError('That player is already drafted.')
        return
      }
      if (pickInflightRef.current) return
      pickInflightRef.current = true
      setPickSubmitting(true)
      try {
        draftRoomPickTrace({
          event: 'pick-submit',
          playerName: player.name,
          playerId: stablePlayerId,
          position: player.position,
          leagueId,
        })
        const note = player.display?.metadata?.eligibilityNote?.toLowerCase() ?? ''
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/pick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rosterId: currentUserRosterId ?? undefined,
            playerName: player.name,
            position: player.position,
            team: player.team ?? null,
            byeWeek: player.byeWeek ?? null,
            playerId: stablePlayerId,
            pickMetadata: {
              isRookie: note.includes('rookie') ? true : undefined,
            },
            source:
              draftUISettings?.executionMode === 'offline' && isCommissioner
                ? 'commissioner'
                : player.graduatedToNFL
                  ? 'promoted_devy'
                  : player.poolType === 'college'
                    ? 'college'
                    : player.isDevy
                      ? 'devy'
                      : 'user',
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.session) {
          sendProductAnalyticsBeacon(DRAFT_ROOM.PICK, {
            leagueId,
            position: player.position,
            ok: true,
          })
          setPickSuccessFlash(player.name)
          setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
          setQueue((prev) =>
            prev.filter(
              (e) => normalizeDraftedPlayerName(e.playerName) !== normalizeDraftedPlayerName(player.name),
            ),
          )
          await fetchQueue()
          await fetchDraftPool()
          void fetchDraftAssistantContext()
          pollSessionFailStreakRef.current = 0
          if (connectionDegradedTimerRef.current != null) {
            clearTimeout(connectionDegradedTimerRef.current)
            connectionDegradedTimerRef.current = null
          }
          setConnectionDegraded(false)
        } else if (res.ok) {
          sendProductAnalyticsBeacon(DRAFT_ROOM.PICK, { leagueId, position: player.position, ok: false })
          draftRoomWarn('pick-missing-session', { status: res.status })
          await fetchSession()
          await fetchQueue()
          await fetchDraftPool()
          setPickError('Pick response was incomplete — draft state was refreshed.')
        } else {
          sendProductAnalyticsBeacon(DRAFT_ROOM.PICK, { leagueId, position: player.position, ok: false })
          const errText = typeof data?.error === 'string' ? data.error : null
          const codeText = typeof (data as { code?: unknown }).code === 'string' ? String((data as { code: string }).code) : null
          const detail =
            errText && codeText ? `${errText} (${codeText})` : errText ?? codeText ?? 'Pick failed. Try again.'
          draftRoomPickTrace({ event: 'pick-error', status: res.status, error: errText, code: codeText })
          setPickError(detail)
        }
      } catch (err) {
        draftRoomWarn('pick-network', err)
        setPickError('Network error while submitting your pick. Check your connection and try again.')
        await fetchSession()
      } finally {
        pickInflightRef.current = false
        setPickSubmitting(false)
      }
    },
    [
      leagueId,
      canDraft,
      draftedNames,
      draftedPlayerIds,
      draftUISettings?.executionMode,
      isCommissioner,
      currentPick,
      session?.status,
      draftCore?.draftStarted,
      draftCore?.currentOverall,
      draftCore?.currentTeamId,
      currentUserRosterId,
      isCurrentUserOnClock,
      pickSubmitting,
      fetchQueue,
      fetchDraftPool,
      fetchSession,
      fetchDraftAssistantContext,
    ],
  )

  const handlePoolPreviewSelect = useCallback(
    (rawId: string) => {
      const player = players.find(
        (p) =>
          (p.display?.playerId && p.display.playerId === rawId) ||
          (p.id && p.id === rawId) ||
          p.name === rawId
      )
      if (player) void handleMakePick(player)
    },
    [players, handleMakePick],
  )

  const handleDraftIntelPick = useCallback(() => {
    const top = draftIntel?.queue.find(
      (entry) => !draftedNames.has(normalizeDraftedPlayerName(entry.playerName)),
    )
    if (!top) return
    const player = players.find(
      (candidate) =>
        candidate.name === top.playerName &&
        candidate.position === top.position &&
        (candidate.team ?? null) === (top.team ?? null)
    )
    if (player) {
      void handleMakePick(player)
    }
  }, [draftIntel?.queue, draftedNames, players, handleMakePick])

  const handleAuctionNominate = useCallback(
    async (player: PlayerEntry) => {
      setPickError(null)
      setAuctionNominateLoading(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/auction/nominate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: player.name,
            position: player.position,
            team: player.team ?? null,
            playerId: player.display?.playerId ?? null,
            byeWeek: player.byeWeek ?? null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.session) {
          sendProductAnalyticsBeacon(DRAFT_ROOM.NOMINATE, { leagueId, ok: true })
          setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        } else {
          sendProductAnalyticsBeacon(DRAFT_ROOM.NOMINATE, { leagueId, ok: false })
          setPickError(typeof data?.error === 'string' ? data.error : 'Nominate failed.')
        }
      } finally {
        setAuctionNominateLoading(false)
      }
    },
    [leagueId],
  )

  const handleAuctionBid = useCallback(
    async (amount: number) => {
      setPickError(null)
      setAuctionBidLoading(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/auction/bid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.session)
          setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        else setPickError(typeof data?.error === 'string' ? data.error : 'Bid failed.')
      } finally {
        setAuctionBidLoading(false)
      }
    },
    [leagueId],
  )

  const handleAuctionResolve = useCallback(async () => {
    setPickError(null)
    setAuctionResolveLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/auction/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session)
        setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
      else setPickError(typeof data?.error === 'string' ? data.error : 'Resolve failed.')
    } finally {
      setAuctionResolveLoading(false)
    }
  }, [leagueId])

  const handleAutopickExpired = useCallback(async () => {
    setPickError(null)
    setAutopickExpiredLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/autopick-expired`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) {
        setSession((prev) => mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot))
        const name = data.submittedPlayerName ?? data.pick?.playerName
        if (name)
          setQueue((prev) =>
            prev.filter(
              (e) => normalizeDraftedPlayerName(e.playerName) !== normalizeDraftedPlayerName(String(name)),
            ),
          )
        await fetchQueue()
        await fetchDraftPool()
      } else {
        setPickError(typeof data?.error === 'string' ? data.error : 'Use queue failed.')
      }
    } catch (err) {
      draftRoomWarn('autopick-expired', err)
      setPickError('Network error while using your queue. Try again.')
      await fetchSession()
      await fetchQueue()
    } finally {
      setAutopickExpiredLoading(false)
    }
  }, [leagueId, fetchQueue, fetchDraftPool, fetchSession])

  const handleQueueSave = useCallback(
    async (newOrder: QueueEntry[]) => {
      const limitedQueue = trimDraftQueue(newOrder, draftQueueSizeLimit)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/queue`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queue: limitedQueue }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && Array.isArray(data.queue)) {
          setQueue(data.queue)
          return
        }
        draftRoomWarn('queue-save', { status: res.status, body: data })
      } catch (err) {
        draftRoomWarn('queue-save-network', err)
      }
      await fetchQueue()
    },
    [leagueId, draftQueueSizeLimit, fetchQueue],
  )

  const handleRemoveFromQueue = useCallback(
    (index: number) => {
      const drafted = new Set(session?.picks?.map((p) => normalizeDraftedPlayerName(p.playerName)) ?? [])
      const filtered = queue.filter((e) => !drafted.has(normalizeDraftedPlayerName(e.playerName)))
      const entry = filtered[index]
      if (!entry) return
      const idxInQueue = queue.findIndex((e) => e.playerName === entry.playerName && e.position === entry.position)
      if (idxInQueue < 0) return
      const next = queue.filter((_, i) => i !== idxInQueue)
      setQueue(next)
      handleQueueSave(next)
    },
    [queue, session?.picks, handleQueueSave],
  )

  const handleReorderQueue = useCallback(
    (fromIndex: number, toIndex: number) => {
      const drafted = new Set(session?.picks?.map((p) => normalizeDraftedPlayerName(p.playerName)) ?? [])
      const filtered = queue.filter((e) => !drafted.has(normalizeDraftedPlayerName(e.playerName)))
      const next = [...filtered]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      setQueue(next)
      handleQueueSave(next)
    },
    [queue, session?.picks, handleQueueSave],
  )

  const handleAiReorderQueue = useCallback(async () => {
    const requestAiExplanation = Boolean(draftUISettings?.aiQueueReorderEnabled && aiQueueReorderEnabled)
    const drafted = new Set(session?.picks?.map((p) => normalizeDraftedPlayerName(p.playerName)) ?? [])
    const filtered = queue.filter((e) => !drafted.has(normalizeDraftedPlayerName(e.playerName)))
    if (filtered.length < 2) return
    setAiReorderLoading(true)
    setAiReorderExplanation(null)
    setAiReorderExecutionMode(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/queue/ai-reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: filtered, aiExplanation: requestAiExplanation }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.reordered)) {
        setQueue(data.reordered)
        await handleQueueSave(data.reordered)
        setAiReorderExplanation(data.explanation ?? null)
        setAiReorderExecutionMode(typeof data?.execution?.mode === 'string' ? data.execution.mode : 'rules_engine')
      } else {
        setAiReorderExplanation(typeof data?.error === 'string' ? data.error : 'AI reorder unavailable.')
        setAiReorderExecutionMode(null)
      }
    } finally {
      setAiReorderLoading(false)
    }
  }, [
    leagueId,
    queue,
    session?.picks,
    handleQueueSave,
    draftUISettings?.aiQueueReorderEnabled,
    aiQueueReorderEnabled,
  ])

  const handleAddToQueue = useCallback(
    (player: PlayerEntry) => {
      if (
        !canAddToQueue(
          queue.map((entry) => ({ name: entry.playerName, position: entry.position, team: entry.team ?? null })),
          { name: player.name, position: player.position, team: player.team ?? null }
        )
      ) {
        return
      }
      const entry: QueueEntry = {
        playerName: player.name,
        position: player.position,
        team: player.team ?? null,
      }
      const next = trimDraftQueue([...queue, entry], draftQueueSizeLimit)
      sendProductAnalyticsBeacon(DRAFT_ROOM.QUEUE_ADD, {
        leagueId,
        position: player.position,
      })
      setQueue(next)
      handleQueueSave(next)
    },
    [queue, handleQueueSave, draftQueueSizeLimit, leagueId],
  )

  const handleDraftFromQueue = useCallback(
    (entry: QueueEntry) => {
      handleMakePick({ name: entry.playerName, position: entry.position, team: entry.team ?? null })
    },
    [handleMakePick],
  )

  const queueFiltered = useMemo(
    () => queue.filter((e) => !draftedNames.has(normalizeDraftedPlayerName(e.playerName))),
    [queue, draftedNames],
  )
  const draftIntelQueue = useMemo(
    () =>
      (draftIntel?.queue ?? []).map((entry) => ({
        ...entry,
        isTaken: draftedNames.has(normalizeDraftedPlayerName(entry.playerName)),
      })),
    [draftIntel?.queue, draftedNames]
  )
  const slotOrder = session?.slotOrder ?? []
  const aiManagedRosterIds = useMemo(() => {
    const fromComm = commissionerAiDraft?.assignedAiTeams?.filter((t) => t.active).map((t) => t.teamId) ?? []
    return [...new Set([...fromComm, ...aiOpponentRosterIds])]
  }, [commissionerAiDraft?.assignedAiTeams, aiOpponentRosterIds])
  const draftTeamPanelProps = useMemo(() => {
    const devyRoundsSet = new Set<number>(
      ((session as DraftSessionSnapshot | null)?.c2c?.enabled
        ? []
        : (session as DraftSessionSnapshot | null)?.devy?.devyRounds) ?? [],
    )
    const c2cCollegeRoundsSet = new Set<number>(
      (session as DraftSessionSnapshot | null)?.c2c?.collegeRounds ?? [],
    )
    const showRosterStrip =
      isDynasty ||
      devyRoundsSet.size > 0 ||
      c2cCollegeRoundsSet.size > 0 ||
      presentationVariant === 'redraft_snake'
    return {
      leagueName,
      sport: effectiveDraftSport,
      slotOrder,
      currentUserRosterId: currentUserRosterId ?? null,
      draftedPicks: (session?.picks ?? []).map((p) => ({
        playerName: p.playerName,
        position: p.position,
        overall: p.overall,
        rosterId: p.rosterId,
        isDevy: devyRoundsSet.has(p.round) || c2cCollegeRoundsSet.has(p.round),
      })),
      teamCount: session?.teamCount ?? 0,
      rounds: session?.rounds ?? 0,
      leaguePicksMade: session?.picks?.length ?? 0,
      commissionerAiTeams: commissionerAiDraft?.assignedAiTeams,
      showRosterStrip,
      isDynasty,
      // Real sport-aware slot config from /api/leagues/{id}/roster-config.
      // Falls back to the DraftRosterStrip's NFL defaults when the fetch
      // hasn't completed or failed.
      starterSlots: rosterConfig?.starterSlots ?? null,
      benchSlots: rosterConfig?.benchSlots ?? null,
      taxiSlots: rosterConfig?.taxiSlots ?? null,
      devySlots: rosterConfig?.devySlots ?? null,
    }
  }, [
    leagueName,
    effectiveDraftSport,
    slotOrder,
    currentUserRosterId,
    session,
    commissionerAiDraft?.assignedAiTeams,
    isDynasty,
    rosterConfig,
    presentationVariant,
  ])
  const aiAdpUnavailable = Boolean(draftUISettings?.aiAdpEnabled && !poolLoading && (!leagueAiAdp?.entries?.length && leagueAiAdp?.message))
  const aiAdpStaleWarning = Boolean(draftUISettings?.aiAdpEnabled && leagueAiAdp?.stale)
  const aiAdpLowSampleWarning = Boolean(leagueAiAdp?.entries?.some((e) => e.lowSample))

  const viewerDraftedPicks = useMemo(
    () => (session?.picks ?? []).filter((p) => p.rosterId === currentUserRosterId),
    [session?.picks, currentUserRosterId],
  )

  const redraftRibbonOnDeck = useMemo(() => {
    if (!session || !currentPick || (session.status !== 'in_progress' && session.status !== 'paused')) return []
    const total = session.rounds * session.teamCount
    const next = currentPick.overall + 1
    if (next > total) return []
    return getUpcomingPickOwners(
      next,
      4,
      session.teamCount,
      session.draftType,
      session.thirdRoundReversal,
      session.slotOrder,
      total,
    )
  }, [session, currentPick])

  const redraftBackToBackSoon = useMemo(
    () =>
      session ? detectSnakeBackToBackSoon(session as DraftSessionSnapshot, currentUserRosterId ?? null) : false,
    [session, currentUserRosterId],
  )

  const redraftStarterHints = useMemo(
    () =>
      presentationVariant === 'redraft_snake' && !isDynasty
        ? computeRedraftStarterHints(
            effectiveDraftSport,
            viewerDraftedPicks.map((p) => ({ position: p.position })),
            formatType,
          )
        : undefined,
    [presentationVariant, isDynasty, effectiveDraftSport, viewerDraftedPicks, formatType],
  )

  useEffect(() => {
    if (!pickSuccessFlash) return
    const id = window.setTimeout(() => setPickSuccessFlash(null), 4200)
    return () => window.clearTimeout(id)
  }, [pickSuccessFlash])

  const orphanRosterIds = (session as any)?.orphanRosterIds as string[] | undefined
  const aiManagerEnabled = (session as any)?.aiManagerEnabled as boolean | undefined
  const isOrphanOnClock = Boolean(
    currentPick?.rosterId && Array.isArray(orphanRosterIds) && orphanRosterIds.includes(currentPick.rosterId) && aiManagerEnabled
  )
  const autoPickEnabled = draftUISettings?.autoPickEnabled ?? false
  const chimmyHeadlineSummary = (draftAssistantContext?.headlines ?? [])
    .slice(0, 2)
    .map((item) => item.playerName ? `${item.playerName}: ${item.title}` : item.title)
  const chimmyInjurySummary = (draftAssistantContext?.injuries ?? [])
    .slice(0, 2)
    .map((item) => `${item.playerName}${item.team ? ` (${item.team})` : ''} ${item.status ?? 'watch'}`.trim())
  const chimmyDraftPrompt = [
    buildDraftSummaryForAI({
      sport: effectiveDraftSport,
      round: currentPick?.round,
      pick: currentPick?.slot,
      queueLength: queueFiltered.length,
      queueTopPlayers: queueFiltered.slice(0, 3).map((entry) => entry.playerName),
      currentOnClockManager: currentPick?.displayName,
      rosterPositions: effectiveRosterSlots,
      leagueName,
    }),
    session?.draftType ? `Draft type: ${session.draftType}.` : '',
    presentationVariant === 'redraft_snake' && !isDynasty
      ? 'Scope: live redraft for this season only — prioritize best available, roster holes, and positional scarcity for this draft room (not dynasty stash, devy, or multi-year planning unless the current round explicitly requires it).'
      : '',
    chimmyHeadlineSummary.length ? `Recent news: ${chimmyHeadlineSummary.join(' | ')}.` : '',
    chimmyInjurySummary.length ? `Recent injuries: ${chimmyInjurySummary.join(' | ')}.` : '',
  ].filter(Boolean).join(' ')
  const chimmyToolSummary = [
    session?.draftType ? `${session.draftType} draft` : 'live draft',
    draftAssistantContext?.sportsFeed?.available
      ? `${draftAssistantContext.headlines.length} headlines`
      : 'sports feed standing by',
    draftAssistantContext?.injuries?.length
      ? `${draftAssistantContext.injuries.length} injury notes`
      : null,
    draftUISettings?.aiAdpEnabled ? 'AI ADP ready' : null,
    draftUISettings?.aiQueueReorderEnabled ? 'queue AI ready' : null,
  ].filter(Boolean).join(' • ')
  const chatMessagesWithAi = useMemo(() => {
    const base = [...chatMessages]
    const injected: typeof base = []
    const aiCopilotWire = {
      messageCategory: 'AI_MESSAGE' as const,
      sourceContext: 'draft_room' as const,
      syncToLeagueChat: false as const,
    }
    const rs = presentationVariant === 'redraft_snake'

    const onClockId = `ai-copilot-onclock-${currentPick?.overall ?? 'na'}-${recommendationResult?.recommendation?.player.name ?? 'na'}`
    if (isCurrentUserOnClock && recommendationResult?.recommendation) {
      const rec = recommendationResult.recommendation
      const extra =
        recommendationResult.scarcityInsight?.trim()
          ? ` ${recommendationResult.scarcityInsight.trim()}`
          : ''
      if (!base.some((m) => m.id === onClockId)) {
        const poolRow = players.find(
          (p) =>
            p.name.trim().toLowerCase() === rec.player.name.trim().toLowerCase() &&
            p.position.trim().toLowerCase() === rec.player.position.trim().toLowerCase(),
        )
        const feedSnap = getAssistantFeedForPlayer(assistantFeedByName, rec.player.name)
        const playerContext = poolRow
          ? buildDraftChatPlayerContextFromDisplay(poolRow, {
              headlineSnippet: feedSnap?.headlineTitle ?? null,
            })
          : undefined
        injected.push({
          ...aiCopilotWire,
          id: onClockId,
          from: 'Draft copilot',
          text: `On the clock: ${rec.player.name} (${rec.player.position}${rec.player.team ? `, ${rec.player.team}` : ''}). ${rec.reason}.${extra}`,
          at: new Date().toISOString(),
          isAiSuggestion: true,
          messageType: 'copilot_on_clock',
          ...(playerContext ? { playerContext } : {}),
        })
      }
    }

    const prepId = `ai-copilot-prep-${currentPick?.overall ?? 'x'}-${ribbonPicksUntilUser ?? 'n'}-${warRoomData?.bestPick?.name ?? 'na'}`
    if (
      rs &&
      !isCurrentUserOnClock &&
      warRoomData?.bestPick &&
      ribbonPicksUntilUser != null &&
      ribbonPicksUntilUser > 0 &&
      ribbonPicksUntilUser <= 4
    ) {
      const w = warRoomData.bestPick
      const tip =
        warRoomData.strategyTip?.trim() ||
        warRoomData.reasoning?.[0]?.trim() ||
        'Open the helper panel for full War Room context.'
      if (!base.some((m) => m.id === prepId) && !injected.some((m) => m.id === prepId)) {
        const poolRow = players.find(
          (p) =>
            p.name.trim().toLowerCase() === w.name.trim().toLowerCase() &&
            p.position.trim().toLowerCase() === w.position.trim().toLowerCase(),
        )
        const feedSnap = getAssistantFeedForPlayer(assistantFeedByName, w.name)
        const playerContext = poolRow
          ? buildDraftChatPlayerContextFromDisplay(poolRow, {
              headlineSnippet: feedSnap?.headlineTitle ?? null,
            })
          : undefined
        injected.push({
          ...aiCopilotWire,
          id: prepId,
          from: 'Draft copilot',
          text: `Your pick approaches in ~${ribbonPicksUntilUser} selection(s). Prep idea: ${w.name} (${w.position}) — ${tip}`,
          at: new Date().toISOString(),
          isAiSuggestion: true,
          messageType: 'copilot_prepare',
          ...(playerContext ? { playerContext } : {}),
        })
      }
    }

    if (rs && queueFiltered.length > 0) {
      const top = queueFiltered[0]
      if (draftedNames.has(normalizeDraftedPlayerName(top.playerName))) {
        const qid = `ai-copilot-queue-taken-${currentPick?.overall ?? 'o'}-${normalizeDraftedPlayerName(top.playerName)}`
        if (!base.some((m) => m.id === qid) && !injected.some((m) => m.id === qid)) {
          const poolRow =
            players.find(
              (p) => normalizeDraftedPlayerName(p.name) === normalizeDraftedPlayerName(top.playerName),
            ) ?? null
          const feedSnap = poolRow ? getAssistantFeedForPlayer(assistantFeedByName, poolRow.name) : null
          const playerContext = poolRow
            ? buildDraftChatPlayerContextFromDisplay(poolRow, {
                headlineSnippet: feedSnap?.headlineTitle ?? null,
              })
            : undefined
          injected.push({
            ...aiCopilotWire,
            id: qid,
            from: 'Draft copilot',
            text: `Queue alert: ${top.playerName} is already off the board. Reorder your queue or refresh the helper.`,
            at: new Date().toISOString(),
            isAiSuggestion: true,
            messageType: 'queue_conflict',
            ...(playerContext ? { playerContext } : {}),
          })
        }
      }
    }

    if (injected.length === 0) return base
    return [...base, ...injected]
  }, [
    chatMessages,
    isCurrentUserOnClock,
    recommendationResult,
    currentPick?.overall,
    presentationVariant,
    warRoomData,
    ribbonPicksUntilUser,
    queueFiltered,
    draftedNames,
    assistantFeedByName,
    players,
  ])
  const currentRoster: Array<{ playerName: string; position: string; team: string | null }> = []
  const nextQueuedAvailable = queueFiltered.length > 0 && canDraft ? queueFiltered[0] : null

  const isAuctionDraft = session?.draftType === 'auction'
  const auctionNom = (session as { auction?: { nominationOrder?: Array<{ rosterId?: string }>; auctionState?: { nominationOrderIndex?: number } } } | null)?.auction
  const auctionNominator = auctionNom?.nominationOrder?.[auctionNom?.auctionState?.nominationOrderIndex ?? 0]
  const isMyTurnToNominateDraft = Boolean(
    isAuctionDraft && currentUserRosterId != null && auctionNominator?.rosterId === currentUserRosterId
  )

  const aiRowBadges = useMemo(() => {
    if (!warRoomData?.bestPick) return undefined
    const out: Record<string, 'ai_pick' | 'value' | 'risky'> = {}
    const key = (n: string, pos: string) => `${n.trim().toLowerCase()}|${pos.trim().toLowerCase()}`
    out[key(warRoomData.bestPick.name, warRoomData.bestPick.position)] =
      warRoomData.risk === 'high' ? 'risky' : 'ai_pick'
    for (const alt of warRoomData.alternatives ?? []) {
      const k = key(alt.name, alt.position)
      if (!out[k]) out[k] = 'value'
    }
    return out
  }, [warRoomData])

  const recommendedPlayerResolved = useMemo(() => {
    const r = recommendationResult?.recommendation
    if (!r) return null
    if (!isAiRecommendationPlayerAvailable(r.player.name, r.player.position)) return null
    return resolvePlayerFromPool(r.player.name, r.player.position)
  }, [recommendationResult?.recommendation, resolvePlayerFromPool, isAiRecommendationPlayerAvailable])

  const handleAddIntelQueueSuggestion = useCallback(
    (entry: DraftIntelQueueEntry) => {
      if (entry.isTaken) return
      const pid = entry.playerId?.trim()
      let pool: PlayerEntry | null = null
      if (pid) {
        pool =
          players.find((p) => String(p.display?.playerId ?? p.id ?? '').trim() === pid) ?? null
      }
      pool =
        pool ??
        players.find(
          (p) =>
            normalizeDraftedPlayerName(p.name) === normalizeDraftedPlayerName(entry.playerName) &&
            p.position.trim().toLowerCase() === entry.position.trim().toLowerCase(),
        ) ??
        null
      if (!pool || draftedNames.has(normalizeDraftedPlayerName(pool.name))) return
      handleAddToQueue(pool)
    },
    [players, draftedNames, handleAddToQueue],
  )

  const getDraftCopilotInsight = useCallback(
    (p: PlayerEntry): DraftCopilotInsight | null => {
      if (presentationVariant !== 'redraft_snake' || isDynasty) return null

      const keyOf = (name: string, pos: string) =>
        `${name.trim().toLowerCase()}|${pos.trim().toLowerCase()}`
      const pk = keyOf(p.name, p.position)
      const bullets: string[] = []

      const rec = recommendationResult?.recommendation
      const isTopRec = Boolean(rec && keyOf(rec.player.name, rec.player.position) === pk)

      if (isTopRec && rec) {
        bullets.push(rec.reason)
        const rr = recommendationResult
        if (rr?.scarcityInsight?.trim()) bullets.push(rr.scarcityInsight.trim())
        if (rr?.reachWarning?.trim()) bullets.push(`Reach note: ${rr.reachWarning.trim()}`)
        if (rr?.valueWarning?.trim()) bullets.push(`Value note: ${rr.valueWarning.trim()}`)
      }

      const altMatch = recommendationResult?.alternatives?.find(
        (a) => keyOf(a.player.name, a.player.position) === pk,
      )
      if (altMatch) bullets.push(altMatch.reason)

      const wr = warRoomData
      if (wr?.bestPick && keyOf(wr.bestPick.name, wr.bestPick.position) === pk) {
        bullets.push(...(wr.reasoning ?? []).slice(0, 2))
        if (wr.teamNeedSummary?.trim()) bullets.push(wr.teamNeedSummary.trim())
        if (wr.riskNote?.trim()) bullets.push(`Risk: ${wr.riskNote.trim()}`)
      }

      const filtered = bullets.filter(Boolean).slice(0, 8)
      if (filtered.length === 0) return null

      let stance: DraftCopilotInsight['stance'] | undefined
      if (wr?.bestPick && keyOf(wr.bestPick.name, wr.bestPick.position) === pk) {
        const risk = wr.risk
        if (risk === 'high') stance = 'upside'
        else if (risk === 'low') stance = 'safer'
        else stance = 'balanced'
      }

      let headline = 'Draft context'
      if (isTopRec) headline = 'Copilot recommendation'
      else if (altMatch) headline = 'Copilot alternative'
      else if (wr?.bestPick && keyOf(wr.bestPick.name, wr.bestPick.position) === pk) headline = 'War Room focus'

      return { headline, bullets: filtered, stance }
    },
    [presentationVariant, isDynasty, recommendationResult, warRoomData],
  )

  const fetchWarRoom = useCallback(
    async (force?: boolean) => {
      if (!session || !currentPick || !session.teamCount || players.length === 0) return
      if (session.status !== 'in_progress') return
      if (session.draftType === 'auction' && !isMyTurnToNominateDraft) return

      const cacheKey = `${currentPick.overall}|${session.picks?.length ?? 0}|${draftedPlayerIds.size}|${currentUserRosterId ?? ''}`
      if (force) warRoomCacheRef.current.delete(cacheKey)
      if (!force && warRoomCacheRef.current.has(cacheKey)) {
        setWarRoomData(warRoomCacheRef.current.get(cacheKey)!)
        setWarRoomLoading(false)
        return
      }

      setWarRoomLoading(true)
      setWarRoomError(null)
      try {
        const myRoster =
          session.picks?.filter((p) => p.rosterId === currentUserRosterId).map((p) => ({
            position: p.position,
            team: p.team ?? null,
            byeWeek: p.byeWeek ?? null,
          })) ?? []
        const availablePool = filterPlayersAvailableForDraftAi(players, draftedNames, draftedPlayerIds)
        const available = availablePool.map((p) => ({
            name: p.name,
            position: p.position,
            team: p.team ?? null,
            adp: draftUISettings?.aiAdpEnabled && p.aiAdp != null ? p.aiAdp : p.adp,
          }))
        if (available.length === 0) {
          setWarRoomData(null)
          setWarRoomError(null)
          setWarRoomLoading(false)
          return
        }
        const recentPicks = (session.picks ?? []).slice(-14).map((p) => ({
          playerName: p.playerName,
          position: p.position,
          team: p.team ?? null,
          pickLabel: p.pickLabel,
        }))
        const totalPicks = session.rounds * session.teamCount
        const upcoming = getUpcomingPickOwners(
          currentPick.overall + 1,
          8,
          session.teamCount,
          session.draftType,
          session.thirdRoundReversal,
          session.slotOrder,
          totalPicks,
        )
        const aiAdpByKey =
          draftUISettings?.aiAdpEnabled && leagueAiAdp?.entries?.length
            ? expandAiAdpKeysForLookup(leagueAiAdp.entries)
            : {}
        const res = await fetch('/api/ai/draft/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leagueId,
            availablePlayers: available,
            userRoster: myRoster,
            recentPicks,
            nextTeams: upcoming.map((u) => u.displayName),
            round: currentPick.round,
            pick: currentPick.slot,
            pickInRound: currentPick.slot,
            totalTeams: session.teamCount,
            sport: effectiveDraftSport,
            draftType: session.draftType,
            isDynasty,
            isSuperflex: isSuperflexFormat,
            isSF: isSuperflexFormat,
            rosterSlots: effectiveRosterSlots,
            aiAdpByKey: Object.keys(aiAdpByKey).length ? aiAdpByKey : undefined,
            mode: 'needs',
            currentPick: {
              overall: currentPick.overall,
              round: currentPick.round,
              slot: currentPick.slot,
              rosterId: currentPick.rosterId,
            },
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.ok) {
          setWarRoomError(typeof data.error === 'string' ? data.error : 'War room unavailable')
          setWarRoomData(null)
          return
        }
        const riskRaw = String(data.risk ?? '').toLowerCase()
        const risk: DraftWarRoomSnapshot['risk'] =
          riskRaw === 'low' || riskRaw === 'medium' || riskRaw === 'high' ? riskRaw : 'medium'
        const snap: DraftWarRoomSnapshot = {
          bestPick: data.bestPick,
          confidence: Number(data.confidence) || 0,
          reasoning: Array.isArray(data.reasoning) ? data.reasoning : [],
          strategyTip: String(data.strategyTip ?? ''),
          risk,
          riskNote: String(data.riskNote ?? ''),
          alternatives: Array.isArray(data.alternatives) ? data.alternatives : [],
          teamNeedSummary: typeof data.teamNeedSummary === 'string' ? data.teamNeedSummary : undefined,
          fallback: Boolean(data.fallback),
        }
        warRoomCacheRef.current.set(cacheKey, snap)
        setWarRoomData(snap)
      } catch (e) {
        setWarRoomError(e instanceof Error ? e.message : 'War room failed')
        setWarRoomData(null)
      } finally {
        setWarRoomLoading(false)
      }
    },
    [
      session,
      currentPick,
      players,
      draftedNames,
      draftedPlayerIds,
      draftUISettings?.aiAdpEnabled,
      leagueAiAdp,
      effectiveDraftSport,
      effectiveRosterSlots,
      isSuperflexFormat,
      isDynasty,
      currentUserRosterId,
      leagueId,
      isMyTurnToNominateDraft,
    ],
  )

  const scheduleWarRoomFetch = useCallback(
    (force?: boolean) => {
      if (warRoomDebounceRef.current) clearTimeout(warRoomDebounceRef.current)
      warRoomDebounceRef.current = setTimeout(() => {
        warRoomDebounceRef.current = null
        void fetchWarRoom(force)
      }, 420)
    },
    [fetchWarRoom],
  )

  useEffect(() => {
    if (!session?.teamCount || !currentPick || players.length === 0) return
    if (session.status !== 'in_progress') return
    scheduleWarRoomFetch(false)
    return () => {
      if (warRoomDebounceRef.current) clearTimeout(warRoomDebounceRef.current)
    }
  }, [
    currentPick?.overall,
    session?.picks?.length,
    session?.status,
    session?.draftType,
    session?.teamCount,
    players.length,
    currentUserRosterId,
    isMyTurnToNominateDraft,
    scheduleWarRoomFetch,
  ])

  const playerPoolNode = useMemo(
    () => (
      <SportAwareDraftRoom
        players={players}
        draftedNames={draftedNames}
        draftedPlayerIds={draftedPlayerIds}
        presentationVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
        sport={effectiveDraftSport}
        canDraft={!isAuctionDraft && canDraft}
        onAddToQueue={handleAddToQueue}
        onMakePick={handleMakePick}
        currentRoster={currentRoster}
        loading={poolLoading}
        useAiAdp={draftUISettings?.aiAdpEnabled ?? false}
        aiAdpUnavailable={aiAdpUnavailable}
        aiAdpUnavailableMessage={leagueAiAdp?.message ?? null}
        aiAdpStaleWarning={aiAdpStaleWarning}
        aiAdpLowSampleWarning={aiAdpLowSampleWarning}
        canNominate={isAuctionDraft ? isMyTurnToNominateDraft : false}
        onNominate={isAuctionDraft ? handleAuctionNominate : undefined}
        devyConfig={
          draftPool?.devyConfig
            ? draftPool.devyConfig
            : (session as DraftSessionSnapshot | null)?.devy?.enabled
              ? { enabled: true, devyRounds: (session as DraftSessionSnapshot).devy?.devyRounds ?? [] }
              : undefined
        }
        c2cConfig={
          draftPool?.c2cConfig
            ? draftPool.c2cConfig
            : (session as DraftSessionSnapshot | null)?.c2c?.enabled
              ? { enabled: true, collegeRounds: (session as DraftSessionSnapshot).c2c?.collegeRounds ?? [] }
              : undefined
        }
        currentRound={currentPick?.round}
        formatType={formatType === 'IDP' || Boolean((draftPool as { isIdp?: boolean } | null)?.isIdp) ? 'IDP' : undefined}
        selectedPlayerTarget={helperSelectedPlayer}
        leagueId={leagueId}
        aiRowBadges={aiRowBadges}
        getDraftCopilotInsight={presentationVariant === 'redraft_snake' ? getDraftCopilotInsight : undefined}
        getAssistantRoomContext={
          presentationVariant === 'redraft_snake' ? getAssistantRoomContext : undefined
        }
        isPlayerQueued={(p) =>
          queue.some(
            (q) =>
              normalizeDraftedPlayerName(q.playerName) === normalizeDraftedPlayerName(p.name) &&
              String(q.position).trim().toLowerCase() === String(p.position).trim().toLowerCase(),
          )
        }
      />
    ),
    [
      players,
      draftedNames,
      draftedPlayerIds,
      queue,
      effectiveDraftSport,
      isAuctionDraft,
      isMyTurnToNominateDraft,
      canDraft,
      handleAddToQueue,
      handleMakePick,
      currentRoster,
      poolLoading,
      draftUISettings?.aiAdpEnabled,
      aiAdpUnavailable,
      leagueAiAdp?.message,
      aiAdpStaleWarning,
      aiAdpLowSampleWarning,
      handleAuctionNominate,
      draftPool?.devyConfig,
      draftPool?.c2cConfig,
      session,
      formatType,
      helperSelectedPlayer,
      leagueId,
      aiRowBadges,
      presentationVariant,
      getDraftCopilotInsight,
      getAssistantRoomContext,
    ]
  )

  const queueStackNode = useMemo(
    () => (
      <div className={`space-y-4 p-2 ${presentationVariant === 'redraft_snake' ? 'rounded-xl bg-[linear-gradient(180deg,rgba(34,211,238,0.04),transparent)] p-3' : ''}`}>
        <DraftIntelQueuePanel
          loading={draftIntelLoading}
          headline={draftIntel?.headline ?? null}
          picksUntilUser={ribbonPicksUntilUser}
          onClock={draftIntel?.status === 'on_clock' || isCurrentUserOnClock}
          queue={draftIntelQueue}
          canDraft={Boolean(canDraft && (draftIntel?.status === 'on_clock' || isCurrentUserOnClock))}
          onDraftTopChoice={
            canDraft && (draftIntel?.status === 'on_clock' || isCurrentUserOnClock) ? handleDraftIntelPick : undefined
          }
          presentationVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
          onAddIntelSuggestion={presentationVariant === 'redraft_snake' ? handleAddIntelQueueSuggestion : undefined}
        />
        <QueuePanel
          queue={queueFiltered}
          canDraft={canDraft}
          onRemove={handleRemoveFromQueue}
          onReorder={handleReorderQueue}
          onDraftFromQueue={canDraft && queueFiltered.length > 0 ? handleDraftFromQueue : undefined}
          onAiReorder={handleAiReorderQueue}
          aiReorderLoading={aiReorderLoading}
          aiReorderEnabled={aiQueueReorderEnabled}
          onAiReorderEnabledChange={draftUISettings?.aiQueueReorderEnabled ? setAiQueueReorderEnabled : undefined}
          autoPickFromQueue={autoPickFromQueue}
          onAutoPickFromQueueChange={setAutoPickFromQueue}
          awayMode={awayMode}
          onAwayModeChange={setAwayMode}
          autoPickEnabled={autoPickEnabled}
          nextQueuedAvailable={nextQueuedAvailable}
          aiReorderExplanation={aiReorderExplanation}
          aiReorderExecutionMode={aiReorderExecutionMode}
          analyticsLeagueId={leagueId}
          presentationVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
        />
      </div>
    ),
    [
      presentationVariant,
      draftIntelLoading,
      draftIntel?.headline,
      ribbonPicksUntilUser,
      draftIntel?.status,
      draftIntelQueue,
      handleAddIntelQueueSuggestion,
      canDraft,
      isCurrentUserOnClock,
      handleDraftIntelPick,
      queueFiltered,
      handleRemoveFromQueue,
      handleReorderQueue,
      handleDraftFromQueue,
      handleAiReorderQueue,
      aiReorderLoading,
      aiQueueReorderEnabled,
      draftUISettings?.aiQueueReorderEnabled,
      autoPickFromQueue,
      awayMode,
      autoPickEnabled,
      nextQueuedAvailable,
      aiReorderExplanation,
      aiReorderExecutionMode,
      leagueId,
    ]
  )

  const chatPanelNode = useMemo(
    () => (
      <DraftChatPanel
        messages={chatMessagesWithAi}
        onSend={handleSendChat}
        sending={chatSending}
        leagueChatSync={chatSyncActive}
        isCommissioner={isCommissioner}
        onBroadcast={isCommissioner ? handleBroadcastOpen : undefined}
        onAiSuggestionClick={() => setMobileTab('helper')}
        onReconnect={handleChatReconnect}
        currentUserId={viewerAppUserId}
        onReact={viewerAppUserId ? handleReactChat : undefined}
        presentationVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
        sendError={chatSendError}
        onDismissSendError={() => setChatSendError(null)}
        leagueId={leagueId}
      />
    ),
    [
      chatMessagesWithAi,
      handleSendChat,
      chatSending,
      chatSendError,
      chatSyncActive,
      isCommissioner,
      handleBroadcastOpen,
      setMobileTab,
      handleChatReconnect,
      viewerAppUserId,
      handleReactChat,
      presentationVariant,
    ]
  )

  const lastPrunedQueueRef = useRef<string>('')
  useEffect(() => {
    if (autoPickEnabled) return
    if (!autoPickFromQueue && !awayMode) return
    setAutoPickFromQueue(false)
    setAwayMode(false)
  }, [autoPickEnabled, autoPickFromQueue, awayMode])

  useEffect(() => {
    if (draftUISettings?.aiQueueReorderEnabled !== false) return
    if (!aiQueueReorderEnabled) return
    setAiQueueReorderEnabled(false)
  }, [draftUISettings?.aiQueueReorderEnabled, aiQueueReorderEnabled])

  useEffect(() => {
    if (!session?.picks?.length || queue.length === 0) return
    const drafted = new Set(session.picks.map((p) => normalizeDraftedPlayerName(p.playerName)))
    const filtered = queue.filter((e) => !drafted.has(normalizeDraftedPlayerName(e.playerName)))
    if (filtered.length >= queue.length) return
    const key = filtered.map((e) => e.playerName).join(',')
    if (lastPrunedQueueRef.current === key) return
    lastPrunedQueueRef.current = key
    setQueue(filtered)
    handleQueueSave(filtered)
  }, [session?.picks?.length, queue, handleQueueSave])

  const autoPickFiredRef = useRef<string>('')
  useEffect(() => {
    if (!canDraft || !isCurrentUserOnClock || pickSubmitting) return
    if (!autoPickEnabled) return
    if (!autoPickFromQueue && !awayMode) return
    if ((session?.timer?.status ?? 'none') !== 'expired') return
    const key = `${currentPick?.overall ?? 0}-expired`
    if (autoPickFiredRef.current === key) return
    autoPickFiredRef.current = key
    const t = setTimeout(() => {
      handleAutopickExpired()
    }, 600)
    return () => clearTimeout(t)
  }, [canDraft, isCurrentUserOnClock, pickSubmitting, autoPickEnabled, autoPickFromQueue, awayMode, currentPick?.overall, handleAutopickExpired, session?.timer?.status])
  const tradedPickColorMode = draftUISettings?.tradedPickColorModeEnabled ?? false
  const showNewOwnerInRed = draftUISettings?.tradedPickOwnerNameRedEnabled ?? false
  const teamMetaByRoster = useMemo<Record<string, DraftTeamStripTeamMeta>>(() => {
    const map: Record<string, DraftTeamStripTeamMeta> = {}
    for (const entry of slotOrder) {
      const team = resolveManagerChromeTeam(entry, leagueTeams)
      map[entry.rosterId] = {
        rosterId: entry.rosterId,
        teamName: team?.teamName ?? null,
        ownerName: team?.ownerName ?? entry.displayName ?? null,
        avatarUrl: team?.avatarUrl ?? null,
        isOrphan: Array.isArray(orphanRosterIds) && orphanRosterIds.includes(entry.rosterId),
        aiArchetypeLabel: aiArchetypeByRoster[entry.rosterId] ?? null,
      }
    }
    return map
  }, [slotOrder, leagueTeams, orphanRosterIds, aiArchetypeByRoster])

  const onClockSpotlight = useMemo(() => {
    const rid = currentPick?.rosterId
    if (!rid) return null
    const m = teamMetaByRoster[rid]
    if (!m) return null
    return {
      teamName: m.teamName ?? null,
      ownerName: m.ownerName ?? null,
      avatarUrl: m.avatarUrl ?? null,
    }
  }, [currentPick?.rosterId, teamMetaByRoster])

  if (loading && !session) {
    return (
      <div
        className={`flex min-h-[50vh] flex-col items-center justify-center px-4 ${presentationVariant === 'redraft_snake' ? 'bg-[linear-gradient(180deg,rgba(8,18,36,0.35),transparent)]' : ''}`}
        data-testid="draft-room-loading-state"
        aria-busy="true"
        aria-live="polite"
      >
        <div
          className={`mb-4 h-12 w-12 animate-pulse rounded-2xl border ${presentationVariant === 'redraft_snake' ? 'border-cyan-400/25 bg-cyan-500/10' : 'border-white/15 bg-white/5'}`}
          aria-hidden
        />
        <p className="text-center text-white/75">Loading draft room…</p>
        <p className="mt-1 max-w-sm text-center text-xs text-white/45">
          Hang tight while we sync your league session and player pool.
        </p>
      </div>
    )
  }

  if (!session) {
    if (draftSessionAccess === "forbidden") {
      return (
        <div className="container mx-auto max-w-md px-4 py-12 text-center" data-testid="draft-room-access-denied">
          <p className="text-white/80">You don&apos;t have access to this draft room.</p>
          <p className="mt-2 text-sm text-white/50">
            Only league members and commissioners can open the live draft. Ask the commissioner for an invite or join the league first.
          </p>
          <Link href={`/league/${leagueId}`} className="mt-4 inline-block text-cyan-400 hover:underline">
            Back to league
          </Link>
          <Link href="/dashboard" className="mt-2 block text-sm text-white/40 hover:text-white/60">
            Dashboard
          </Link>
        </div>
      )
    }
    if (draftSessionAccess === "unauthorized") {
      return (
        <div className="container mx-auto max-w-md px-4 py-12 text-center" data-testid="draft-room-session-expired">
          <p className="text-white/80">Sign in to load this draft.</p>
          <p className="mt-2 text-sm text-white/50">Your session may have expired.</p>
          <Link
            href={
              typeof window !== "undefined"
                ? `/login?callbackUrl=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
                : "/login"
            }
            className="mt-4 inline-block text-cyan-400 hover:underline"
          >
            Sign in
          </Link>
        </div>
      )
    }
    return (
      <div className="container mx-auto max-w-md px-4 py-12 text-center" data-testid="draft-room-empty-state">
        <p className="text-white/80">No draft session for this league.</p>
        <p className="mt-2 text-sm text-white/50">
          Commissioner can create and start a draft from league settings or the draft tab.
        </p>
        <Link href={`/league/${leagueId}`} className="mt-4 inline-block text-cyan-400 hover:underline">
          Back to league
        </Link>
      </div>
    )
  }

  const isAuction = session.draftType === 'auction'
  const auctionSnapshot = (session as any).auction
  const currentAuctionNominator = auctionSnapshot?.nominationOrder?.[auctionSnapshot?.auctionState?.nominationOrderIndex ?? 0]
  const isMyTurnToNominate = isAuction && currentUserRosterId != null && currentAuctionNominator?.rosterId === currentUserRosterId
  const isDraftCompleted = session.status === 'completed'
  /** Prevent blank board loop when corrupted API rows have rounds/teamCount = 0 */
  const safeBoardRounds = Math.max(1, session.rounds ?? 1)
  const safeBoardTeamCount = Math.max(1, session.teamCount ?? 1)
  const totalBoardPicksPlanned = safeBoardRounds * safeBoardTeamCount
  const boardHasOpenPicks = (session.picks?.length ?? 0) < totalBoardPicksPlanned
  /** DB row occasionally missing timerEndAt — TopBar shows "—"; nudge user to resync rather than implying a dead room. */
  const showPickClockAnchorWarning =
    session.status === 'in_progress' &&
    boardHasOpenPicks &&
    session.timer?.status === 'none' &&
    !(session.timer?.timerEndAt || session.timerEndAt)

  const myDraftedPicks = viewerDraftedPicks
  const myDevyAssetCount = myDraftedPicks.filter((p) => {
    const source = String((p as { source?: string | null }).source ?? '').toLowerCase()
    if (source === 'devy' || source === 'college') return true
    if ((session as DraftSessionSnapshot).devy?.enabled && (session as DraftSessionSnapshot).devy?.devyRounds?.includes(p.round)) return true
    if ((session as DraftSessionSnapshot).c2c?.enabled && (session as DraftSessionSnapshot).c2c?.collegeRounds?.includes(p.round)) return true
    return false
  }).length
  const myPromotedAssetCount = myDraftedPicks.filter((p) => {
    const source = String((p as { source?: string | null }).source ?? '').toLowerCase()
    return source === 'promoted_devy'
  }).length
  const devySlotTotal = (session as DraftSessionSnapshot).devy?.enabled
    ? ((session as DraftSessionSnapshot).devy?.devyRounds?.length ?? 0)
    : 0
  const sportAccent = {
    NFL: '34, 211, 238',
    NHL: '129, 140, 248',
    NBA: '251, 146, 60',
    MLB: '52, 211, 153',
    NCAAB: '244, 114, 182',
    NCAAF: '167, 139, 250',
    SOCCER: '56, 189, 248',
  }[(effectiveDraftSport || 'NFL').toUpperCase()] ?? '34, 211, 238'
  const draftBoardSurfaceStyle =
    presentationVariant === 'redraft_snake'
      ? ({
          backgroundImage: [
            `radial-gradient(ellipse 80% 60% at 80% 20%, rgba(${sportAccent},0.22), transparent 55%)`,
            `radial-gradient(ellipse 50% 40% at 10% 90%, rgba(167,139,250,0.08), transparent 50%)`,
            `linear-gradient(175deg, rgba(4,9,21,0.55) 0%, rgba(6,15,28,0.92) 100%)`,
          ].join(', '),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } as const)
      : ({
          backgroundImage: `linear-gradient(180deg, rgba(${sportAccent},0.1), rgba(4,9,21,0.75)), url('/branding/allfantasy-ai-for-fantasy-sports-logo.png')`,
          backgroundSize: 'cover, 340px',
          backgroundPosition: 'center, right -36px bottom -30px',
          backgroundRepeat: 'no-repeat, no-repeat',
        } as const)
  const boardOrderSourceLabel =
    (session as { draftOrderMode?: string; lotteryLastRunAt?: string } | null)?.draftOrderMode === 'weighted_lottery' &&
    (session as { lotteryLastRunAt?: string } | null)?.lotteryLastRunAt
      ? 'Weighted Lottery Order'
      : undefined
  const openMobilePlayerSearch = () => {
    setMobileTab('players')
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.dispatchEvent(new Event('af:draft-player-search-focus'))
      }, 40)
    }
  }

  const mobileStickyBar =
    currentPick != null ? (
      <div className="space-y-2 px-3 py-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-cyan-200" data-testid="draft-mobile-current-pick">
            {currentPick.pickLabel}
            {currentPick.overall != null && (
              <span className="ml-1 text-white/50">#{currentPick.overall}</span>
            )}
          </span>
          <span className="text-white/80 truncate max-w-[55%]">On clock: {currentPick.displayName}</span>
        </div>
        {presentationVariant === 'redraft_snake' &&
        ribbonPicksUntilUser != null &&
        ribbonPicksUntilUser > 0 &&
        !isCurrentUserOnClock ? (
          <p className="text-[10px] text-cyan-200/75" data-testid="draft-mobile-picks-until-you">
            ~{ribbonPicksUntilUser} pick{ribbonPicksUntilUser === 1 ? '' : 's'} until your turn
          </p>
        ) : null}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            data-testid="draft-mobile-quick-search"
            onClick={openMobilePlayerSearch}
            className="rounded border border-cyan-300/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100 whitespace-nowrap"
          >
            Search
          </button>
          <button
            type="button"
            data-testid="draft-mobile-quick-queue"
            onClick={() => setMobileTab('queue')}
            className="rounded border border-white/20 bg-black/30 px-2 py-1 text-[10px] text-white/75 whitespace-nowrap"
          >
            Queue
          </button>
          <button
            type="button"
            data-testid="draft-mobile-quick-chat"
            onClick={() => setMobileTab('chat')}
            className="rounded border border-white/20 bg-black/30 px-2 py-1 text-[10px] text-white/75 whitespace-nowrap"
          >
            Chat
          </button>
          <button
            type="button"
            data-testid="draft-mobile-quick-helper"
            onClick={() => setMobileTab('helper')}
            className="rounded border border-white/20 bg-black/30 px-2 py-1 text-[10px] text-white/75 whitespace-nowrap"
          >
            AI helper
          </button>
        </div>
      </div>
    ) : null

  const OFFENSE_POS = new Set(['QB', 'RB', 'WR', 'TE', 'K'])
  const IDP_POS = new Set(['DE', 'DT', 'LB', 'CB', 'S', 'SS', 'FS'])
  const idpNeeds = formatType === 'IDP' && idpRosterSummary && (() => {
    const slots = idpRosterSummary.starterSlots
    let offenseNeed = 0
    let idpNeed = 0
    for (const [name, count] of Object.entries(slots)) {
      if (name === 'FLEX' || OFFENSE_POS.has(name)) offenseNeed += count
      else if (name === 'DL' || name === 'DB' || name === 'IDP_FLEX' || IDP_POS.has(name)) idpNeed += count
    }
    const benchNeed = idpRosterSummary.benchSlots ?? 0
    const myOffense = myDraftedPicks.filter((p) => OFFENSE_POS.has(p.position ?? '') || p.position === 'FLEX').length
    const myIdp = myDraftedPicks.filter((p) => IDP_POS.has(p.position ?? '')).length
    const myBench = Math.max(0, myDraftedPicks.length - myOffense - myIdp)
    return { offenseNeed, idpNeed, benchNeed, myOffense, myIdp, myBench }
  })()

  const rosterPanel = (
    <div className="space-y-2 p-2">
      <div className="md:hidden">
        <DraftTeamPanel {...draftTeamPanelProps} redraftStarterHints={redraftStarterHints} />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">My roster</h3>
      {draftTeamPanelProps.showRosterStrip ? (
        <DraftRosterStrip
          picks={myDraftedPicks.map((p) => ({
            playerName: p.playerName,
            position: p.position,
            overall: p.overall,
            isDevy:
              ((session as DraftSessionSnapshot).c2c?.enabled ? [] : (session as DraftSessionSnapshot).devy?.devyRounds ?? []).includes(
                p.round,
              ) || ((session as DraftSessionSnapshot).c2c?.collegeRounds ?? []).includes(p.round),
          }))}
          starterSlots={draftTeamPanelProps.starterSlots ?? null}
          benchSlots={draftTeamPanelProps.benchSlots ?? null}
          taxiSlots={draftTeamPanelProps.taxiSlots ?? null}
          devySlots={draftTeamPanelProps.devySlots ?? null}
          isDynasty={isDynasty}
          teamLabel={slotOrder.find((s) => s.rosterId === currentUserRosterId)?.displayName ?? null}
          sport={effectiveDraftSport}
        />
      ) : null}
      {formatType === 'IDP' && (
        <IdpDraftExplainerCard
          scoringPreset={idpScoringPreset}
          positionMode={idpPositionMode}
          className="mb-2"
        />
      )}
      {formatType === 'IDP' && idpNeeds && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-2 py-1.5 text-xs text-cyan-200">
          <div className="font-medium text-cyan-100 mb-1">Starters remaining</div>
          <div>Offense: {idpNeeds.myOffense} / {idpNeeds.offenseNeed}</div>
          <div>IDP: {idpNeeds.myIdp} / {idpNeeds.idpNeed}</div>
          <div>Bench: {idpNeeds.myBench} / {idpNeeds.benchNeed}</div>
        </div>
      )}
      {devySlotTotal > 0 && (
        <div className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-2 py-1.5 text-xs text-violet-100" data-testid="draft-devy-slot-summary">
          <div className="font-medium mb-1">Devy slots</div>
          <div>Filled: {myDevyAssetCount} / {devySlotTotal}</div>
          <div>Promoted markers: {myPromotedAssetCount}</div>
        </div>
      )}
      {myDraftedPicks.length > 0 ? (
        <ul className="space-y-1.5">
          {myDraftedPicks.map((p) => {
            const source = String((p as { source?: string | null }).source ?? '').toLowerCase()
            const c2cCollegeRounds = (session as DraftSessionSnapshot).c2c?.collegeRounds ?? []
            const isCollegeAsset = Boolean((session as DraftSessionSnapshot).c2c?.enabled) && (source === 'college' || c2cCollegeRounds.includes(p.round))
            const isProAsset = Boolean((session as DraftSessionSnapshot).c2c?.enabled) && !isCollegeAsset
            return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <span className="font-medium text-white/90 truncate">
                  {p.playerName}
                  {isCollegeAsset && (
                    <span className="ml-1 rounded bg-violet-500/20 px-1 py-0.5 text-[9px] font-medium text-violet-100">College</span>
                  )}
                  {isProAsset && (
                    <span className="ml-1 rounded bg-cyan-500/20 px-1 py-0.5 text-[9px] font-medium text-cyan-100">Pro</span>
                  )}
                </span>
                <span className="text-white/50 shrink-0 ml-2">{p.position}</span>
                <span className="text-[10px] text-white/40">#{p.overall}</span>
              </li>
            )
          })}
        </ul>
      ) : draftTeamPanelProps.showRosterStrip ? (
        <p className="text-[11px] text-white/40">Starter and bench slots above fill as you draft.</p>
      ) : (
        <p className="text-white/50 text-sm">No picks yet.</p>
      )}
    </div>
  )

  const hasKeeperConfig =
    (session as DraftSessionSnapshot).keeper?.config != null &&
    ((session as DraftSessionSnapshot).keeper?.config?.maxKeepers ?? 0) > 0
  const showKeeperPanel = hasKeeperConfig || isCommissioner
  const requestedOrphanDrafterMode =
    draftUISettings?.orphanDrafterMode
    ?? (session as { orphanDrafterMode?: 'cpu' | 'ai' }).orphanDrafterMode
    ?? 'cpu'
  const resolvedOrphanAiProviderAvailable =
    (session as { orphanAiProviderAvailable?: boolean }).orphanAiProviderAvailable
    ?? orphanAiProviderAvailableState
    ?? true
  const sessionRequestedOrphanMode =
    (session as { orphanDrafterMode?: 'cpu' | 'ai' }).orphanDrafterMode ?? requestedOrphanDrafterMode
  const effectiveOrphanDrafterMode =
    sessionRequestedOrphanMode === requestedOrphanDrafterMode
      ? (
        (session as { orphanDrafterEffectiveMode?: 'cpu' | 'ai' }).orphanDrafterEffectiveMode
        ?? (requestedOrphanDrafterMode === 'ai' && !resolvedOrphanAiProviderAvailable ? 'cpu' : requestedOrphanDrafterMode)
      )
      : (requestedOrphanDrafterMode === 'ai' && !resolvedOrphanAiProviderAvailable ? 'cpu' : requestedOrphanDrafterMode)
  const orphanDrafterFallbackActive =
    requestedOrphanDrafterMode === 'ai' && effectiveOrphanDrafterMode === 'cpu'
  const keeperPanel = showKeeperPanel ? (
    <KeeperPanel
      leagueId={leagueId}
      isCommissioner={isCommissioner}
      slotOrder={slotOrder}
      currentUserRosterId={currentUserRosterId ?? null}
      rounds={session.rounds}
      onSessionUpdate={fetchSession}
    />
  ) : undefined

  return (
    <>
    {presentationVariant === 'redraft_snake' && !isDynasty ? (
      <DraftRoundOneAnnouncementOverlay
        presentationVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
        leagueName={leagueName}
        sportLabel={typeof sport === 'string' ? sport.toUpperCase() : ''}
        queue={roundOneAnnouncementQueue}
        onDismissFront={dismissRoundOneAnnouncement}
      />
    ) : null}
    <DraftRoomShell
      layout="premium"
      surfaceVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
      teamPanel={<DraftTeamPanel {...draftTeamPanelProps} redraftStarterHints={redraftStarterHints} />}
      centerColumn={
        <div
          className={
            presentationVariant === 'redraft_snake'
              ? 'flex h-full min-h-0 flex-col bg-[radial-gradient(ellipse_100%_80%_at_50%_-10%,rgba(34,211,238,0.06),transparent),linear-gradient(180deg,#071826_0%,#050c18_50%,#040a14_100%)]'
              : 'flex h-full min-h-0 flex-col bg-[#060d1e]'
          }
        >
          {!isDraftCompleted ? (
            <div className="min-h-0 flex-1 overflow-hidden">{playerPoolNode}</div>
          ) : (
            <>
              <div className="shrink-0 border-b border-emerald-500/20 bg-emerald-950/25 px-4 py-3 text-center text-sm text-emerald-100/90">
                Draft is complete — browse the recap below. The live board stays visible above.
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <PostDraftView
                  leagueId={leagueId}
                  leagueName={leagueName}
                  sport={effectiveDraftSport}
                  session={session}
                  currentUserRosterId={currentUserRosterId ?? null}
                  slotOrder={slotOrder}
                />
              </div>
            </>
          )}
        </div>
      }
      bottomBar={
        <div className="flex h-full min-h-0 w-full flex-col" data-testid="draft-bottom-dock-tabs">
          <div
            className={`grid grid-cols-4 gap-1 border-b px-2 py-1.5 ${
              presentationVariant === 'redraft_snake'
                ? 'border-cyan-500/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(5,12,24,0.98))] shadow-[inset_0_1px_0_rgba(34,211,238,0.08)]'
                : 'border-white/8 bg-[#0a1228]'
            }`}
          >
            <button
              type="button"
              onClick={() => setBottomDockTab('queue')}
              data-testid="draft-bottom-tab-queue"
              className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                bottomDockTab === 'queue'
                  ? presentationVariant === 'redraft_snake'
                    ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/15 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                    : 'bg-white/12 text-cyan-100'
                  : 'text-white/55 hover:bg-white/5'
              }`}
            >
              Queue
            </button>
            <button
              type="button"
              onClick={() => setBottomDockTab('results')}
              data-testid="draft-bottom-tab-results"
              className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                bottomDockTab === 'results'
                  ? presentationVariant === 'redraft_snake'
                    ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/15 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                    : 'bg-white/12 text-cyan-100'
                  : 'text-white/55 hover:bg-white/5'
              }`}
            >
              Results
            </button>
            <button
              type="button"
              onClick={() => setBottomDockTab('chat')}
              data-testid="draft-bottom-tab-chat"
              className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                bottomDockTab === 'chat'
                  ? presentationVariant === 'redraft_snake'
                    ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/15 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                    : 'bg-white/12 text-cyan-100'
                  : 'text-white/55 hover:bg-white/5'
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setBottomDockTab('ai')}
              data-testid="draft-bottom-tab-ai"
              className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                bottomDockTab === 'ai'
                  ? presentationVariant === 'redraft_snake'
                    ? 'bg-gradient-to-r from-violet-500/30 to-fuchsia-500/15 text-violet-50 shadow-[0_0_22px_rgba(167,139,250,0.2)]'
                    : 'bg-white/12 text-cyan-100'
                  : 'text-white/55 hover:bg-white/5'
              }`}
            >
              AI
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {bottomDockTab === 'queue' ? (
              <div className="h-full overflow-auto px-1.5 py-1">{queueStackNode}</div>
            ) : null}

            {bottomDockTab === 'results' ? (
              <div className="h-full overflow-hidden">
                <DraftPickActivityStrip
                  picks={session.picks ?? []}
                  slotOrder={slotOrder}
                  limit={32}
                  presentationVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
                />
              </div>
            ) : null}

            {bottomDockTab === 'chat' ? (
              <div className="h-full overflow-hidden">{chatPanelNode}</div>
            ) : null}

            {bottomDockTab === 'ai' ? (
              <div
                className={`h-full overflow-auto p-3 text-xs text-white/75 ${
                  presentationVariant === 'redraft_snake'
                    ? 'bg-[linear-gradient(180deg,rgba(76,29,149,0.12),transparent)]'
                    : ''
                }`}
                data-testid="draft-bottom-ai-panel"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/90">Draft AI</p>
                {entitlements.loading ? (
                  <div className="mt-2 rounded-lg border border-white/12 bg-black/25 p-3">
                    <p className="text-white/55">Checking access…</p>
                  </div>
                ) : !hasAiAccess ? (
                  <div
                    className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3"
                    data-testid="draft-bottom-ai-locked"
                  >
                    <p className="text-sm font-semibold text-amber-100">AI recommendations locked</p>
                    <p className="mt-1 text-[11px] text-white/65">
                      Subscribe (Pro, Commissioner, All-Access, or Supreme) for unlimited AI picks — or top up tokens to pay per-use.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href="/pricing"
                        className="inline-flex items-center rounded border border-amber-300/45 bg-amber-500/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100 hover:bg-amber-500/30"
                        data-testid="draft-bottom-ai-upgrade-cta"
                      >
                        Upgrade
                      </a>
                      <a
                        href="/tokens"
                        className="inline-flex items-center rounded border border-cyan-300/45 bg-cyan-500/15 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 hover:bg-cyan-500/25"
                        data-testid="draft-bottom-ai-tokens-cta"
                      >
                        Buy tokens
                      </a>
                    </div>
                  </div>
                ) : recommendationResult?.recommendation ? (
                  <div className="mt-2 space-y-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-3">
                    <p className="text-sm font-semibold text-white">
                      {recommendationResult.recommendation.player.name}
                      <span className="ml-1 text-cyan-100/80">
                        {recommendationResult.recommendation.player.position}
                        {recommendationResult.recommendation.player.team ? ` - ${recommendationResult.recommendation.player.team}` : ''}
                      </span>
                    </p>
                    <p className="text-[11px] text-white/70">{recommendationResult.recommendation.reason}</p>
                    <button
                      type="button"
                      onClick={() => setMobileTab('helper')}
                      className="rounded border border-cyan-300/35 bg-cyan-500/12 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 hover:bg-cyan-500/20"
                      data-testid="draft-bottom-ai-open-helper"
                    >
                      Open Full AI Panel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-white/12 bg-black/25 p-3">
                    <p className="text-white/65">No recommendation yet. AI updates when draft context changes.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      }
      topBar={
        <>
          {pickError && (
          <div className="flex items-center justify-between gap-2 border-b border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-100">
              <span>{pickError}</span>
              <button type="button" onClick={() => setPickError(null)} className="rounded px-2 py-1 text-red-200 hover:bg-red-500/20" aria-label="Dismiss">×</button>
            </div>
          )}
          {pickSuccessFlash ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-2 border-b border-emerald-400/35 bg-[linear-gradient(90deg,rgba(52,211,153,0.14),rgba(15,23,42,0.85))] px-4 py-2.5 text-sm text-emerald-50 shadow-[0_8px_32px_rgba(52,211,153,0.12)]"
              data-testid="draft-pick-success-banner"
            >
              <span className="font-medium">
                Pick locked in: <span className="text-white">{pickSuccessFlash}</span>
              </span>
              <button
                type="button"
                onClick={() => setPickSuccessFlash(null)}
                className="rounded px-2 py-1 text-emerald-200/90 hover:bg-emerald-500/15"
                aria-label="Dismiss confirmation"
              >
                ×
              </button>
            </div>
          ) : null}
          {governanceBanner ? (
            <div
              role={governanceBanner.variant === 'error' ? 'alert' : 'status'}
              aria-live={governanceBanner.variant === 'error' ? 'assertive' : 'polite'}
              data-testid="draft-governance-banner"
              className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 text-sm ${
                governanceBanner.variant === 'success'
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50'
                  : governanceBanner.variant === 'error'
                    ? 'border-rose-400/35 bg-rose-500/12 text-rose-50'
                    : 'border-amber-400/35 bg-amber-500/12 text-amber-50'
              }`}
            >
              <span className="font-medium">{governanceBanner.message}</span>
              <button
                type="button"
                onClick={() => setGovernanceBanner(null)}
                className="rounded px-2 py-1 opacity-90 hover:bg-white/10"
                aria-label="Dismiss notice"
              >
                ×
              </button>
            </div>
          ) : session?.status === 'paused' ? (
            <div
              role="status"
              aria-live="polite"
              data-testid="draft-paused-room-banner"
              className="flex items-center gap-2 border-b border-amber-400/35 bg-[linear-gradient(90deg,rgba(251,191,36,0.12),rgba(15,23,42,0.92))] px-4 py-2.5 text-sm text-amber-50"
            >
              <span className="font-semibold uppercase tracking-[0.12em] text-amber-200/95">Paused</span>
              <span className="text-amber-50/95">
                Pick clock is frozen until the commissioner resumes the draft.
              </span>
            </div>
          ) : showPickClockAnchorWarning ? (
            <div
              role="status"
              data-testid="draft-clock-anchor-warning"
              className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-400/30 bg-cyan-950/30 px-4 py-2.5 text-sm text-cyan-50"
            >
              <span className="text-cyan-100/95">
                Pick timer is syncing — tap <span className="font-semibold">Resync</span> if the clock stays blank.
              </span>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-50 hover:bg-cyan-500/25"
                onClick={() => void handleResync()}
              >
                Resync
              </button>
            </div>
          ) : session?.status === 'in_progress' && !currentUserRosterId ? (
            <div
              role="status"
              data-testid="draft-room-no-roster-banner"
              className="border-b border-amber-400/40 bg-amber-950/35 px-4 py-2.5 text-sm text-amber-50"
            >
              <span className="font-semibold text-amber-100">No roster linked to your account in this league.</span>{' '}
              <span className="text-amber-100/85">
                Claim your team from the league page to submit picks when you&apos;re on the clock.
              </span>
            </div>
          ) : null}
          <DraftTopBar
            leagueName={leagueName}
            leagueLogoUrl={leagueLogoUrl ?? null}
            sport={effectiveDraftSport}
            draftType={session.draftType}
            teamCount={session.teamCount}
            rounds={session.rounds}
            currentManagerOnClock={currentPick?.displayName ?? null}
            pickLabel={currentPick?.pickLabel ?? null}
            overallPickNumber={currentPick?.overall ?? null}
            timerStatus={session.timer?.status ?? 'none'}
            timerRemainingSeconds={session.timer?.remainingSeconds ?? null}
            timerEndAtIso={draftCore?.timerEndAt ? draftCore.timerEndAt : (session.timer?.timerEndAt ?? null)}
            timerSeconds={session.timerSeconds ?? null}
            timerMode={draftUISettings?.timerMode ?? 'per_pick'}
            autoPickEnabled={autoPickEnabled}
            isCommissioner={isCommissioner}
            draftStatus={session.status}
            inviteLink={inviteLink}
            onCopyInvite={(source) => {
              void handleCopyInvite(source)
            }}
            onStartDraft={isCommissioner && session.status === 'pre_draft' ? () => void handleStartDraft() : undefined}
            onPause={() => void handleCommissionerAction('pause')}
            onResume={() => void handleCommissionerAction('resume')}
            onResetTimer={() => void handleCommissionerResetTimer()}
            onUndoPick={() => void handleCommissionerUndoPick()}
            commissionerPauseControlsEnabled={draftUISettings?.commissionerPauseControlsEnabled ?? true}
            commissionerLoading={commissionerLoading}
            isReconnecting={connectionDegraded}
            isOrphanOnClock={isOrphanOnClock}
            orphanDrafterMode={effectiveOrphanDrafterMode}
            orphanDrafterRequestedMode={requestedOrphanDrafterMode}
            orphanFallbackActive={orphanDrafterFallbackActive}
            onRunAiPick={isCommissioner && isOrphanOnClock ? handleRunAiPick : undefined}
            runAiPickLoading={runAiPickLoading}
            onCommissionerOpen={isCommissioner ? () => setShowCommissionerModal(true) : undefined}
            onTradesClick={openPickTradePanel}
            pendingTradesCount={pendingTradesCount}
            showUseQueue={
              !isAuction &&
              autoPickEnabled &&
              session.timer?.status === 'expired' &&
              isCurrentUserOnClock &&
              queueFiltered.length > 0
            }
            onUseQueue={handleAutopickExpired}
            useQueueLoading={autopickExpiredLoading}
            onResync={handleResync}
            resyncLoading={resyncLoading}
            backHref={`/league/${leagueId}`}
            onOpenDraftRoomSettings={() => setDraftRoomSettingsOpen(true)}
            onlineCount={onlineCount > 0 ? onlineCount : undefined}
            draftRoomPresentation={presentationVariant}
            currentRound={
              draftCore?.draftStarted === false ? 1 : draftCore?.currentRound != null ? draftCore.currentRound : null
            }
            pickInRound={
              draftCore?.draftStarted === false ? 1 : draftCore?.currentPickInRound != null ? draftCore.currentPickInRound : null
            }
          />
        </>
      }
      managerStrip={null}
      draftBoard={
        <div
          className="flex min-h-0 flex-col gap-1.5 p-1.5 lg:gap-2.5 lg:p-2.5"
          style={draftBoardSurfaceStyle}
        >
          {/*
            Full-width chrome lives in the outer column only. Do not place these inside the same
            lg:flex-row as LiveDraftStatusColumn + board: a first child with w-full in a row flex
            consumes 100% width and collapses the board to zero — only visible once the redraft ribbon
            mounts at in_progress (paused had no ribbon and avoided the bug).
          */}
          {presentationVariant === 'redraft_snake' &&
          !isDynasty &&
          (session.status === 'in_progress' || session.status === 'paused') &&
          !isDraftCompleted ? (
            <div className="w-full shrink-0">
              <RedraftPlanningRibbon
                picksUntilUser={ribbonPicksUntilUser}
                userOnClock={isCurrentUserOnClock}
                onDeck={redraftRibbonOnDeck}
                thirdRoundReversal={session.thirdRoundReversal}
                backToBackSoon={redraftBackToBackSoon}
                viewerRosterMissing={
                  (session.status === 'in_progress' || session.status === 'paused') &&
                  !(session as DraftSessionSnapshot & { currentUserRosterId?: string }).currentUserRosterId
                }
              />
            </div>
          ) : null}
          {draftUISettings?.executionMode === 'offline' ? (
            <div
              className="w-full shrink-0 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100"
              data-testid="draft-room-offline-banner"
              role="status"
            >
              <p className="font-semibold uppercase tracking-[0.14em] text-amber-200">Offline draft</p>
              <p className="mt-0.5 text-amber-100/85">
                {isCommissioner
                  ? 'You are logging picks from an in-person draft. Selecting a player submits on behalf of the team on the clock.'
                  : 'This league is running an offline draft. Picks are being entered by the commissioner as they happen in person.'}
              </p>
            </div>
          ) : null}
          {isDraftCompleted ? (
            <div
              className="w-full shrink-0 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-50 shadow-[0_8px_32px_rgba(16,185,129,0.12)]"
              role="status"
              data-testid="draft-complete-board-banner"
            >
              <span className="font-semibold uppercase tracking-[0.12em] text-emerald-200/95">Draft complete</span>
              <span className="mt-1 block text-[13px] font-normal text-emerald-50/90">
                Final board is below — open the player column for recap & export.
              </span>
            </div>
          ) : null}
          {!isDraftCompleted &&
          (session.status === 'in_progress' || session.status === 'paused') &&
          (!Array.isArray(session.slotOrder) || session.slotOrder.length < safeBoardTeamCount) ? (
            <div
              role="status"
              data-testid="draft-board-order-incomplete-banner"
              className="w-full shrink-0 rounded-lg border border-amber-400/40 bg-amber-950/35 px-3 py-2 text-[11px] text-amber-50"
            >
              Draft order is still syncing — board cells stay open below. Use <span className="font-semibold">Resync</span>{' '}
              in the header if this message persists.
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 lg:flex-row lg:gap-2.5">
            <LiveDraftStatusColumn
              session={session as DraftSessionSnapshot}
              queueEntries={queueFiltered}
              leagueId={leagueId}
              sport={effectiveDraftSport}
              isCommissioner={isCommissioner}
              onSessionUpdated={fetchSession}
              poolPreview={draftPool?.entries ?? null}
              onPoolPreviewSelect={handlePoolPreviewSelect}
              poolSelectDisabled={pickSubmitting || !isCurrentUserOnClock}
              showTimer={!isAuction && !isDraftCompleted}
              hideFullDraftOrderList={session.draftType === 'snake'}
              viewerRosterId={currentUserRosterId ?? null}
              viewerRosterPicks={(session.picks ?? []).filter((p) => p.rosterId === currentUserRosterId)}
              onClockSpotlight={onClockSpotlight}
            />
            <div className="flex min-h-[120px] min-w-0 flex-1 flex-col overflow-auto">
              <DraftTeamStrip
                teamCount={safeBoardTeamCount}
                slotOrder={slotOrder}
                teamMetaByRoster={teamMetaByRoster}
                currentUserRosterId={currentUserRosterId ?? null}
                onClockRosterId={currentPick?.rosterId ?? null}
                canInvite={isCommissioner}
              />
              <DraftBoard
                picks={session.picks ?? []}
                slotOrder={slotOrder}
                tradedPicks={(session as any).tradedPicks ?? []}
                teamCount={safeBoardTeamCount}
                rounds={safeBoardRounds}
                draftType={session.draftType}
                thirdRoundReversal={session.thirdRoundReversal}
                tradedPickColorMode={tradedPickColorMode}
                showNewOwnerInRed={showNewOwnerInRed}
                keeperLocks={(session as DraftSessionSnapshot).keeper?.locks}
                devyRounds={(session as DraftSessionSnapshot).c2c?.enabled ? [] : ((session as DraftSessionSnapshot).devy?.devyRounds ?? [])}
                c2cCollegeRounds={(session as DraftSessionSnapshot).c2c?.collegeRounds ?? []}
                currentOverallPick={currentPick?.overall ?? null}
                sport={effectiveDraftSport}
                currentUserRosterId={currentUserRosterId ?? null}
                aiManagedRosterIds={aiManagedRosterIds}
                orderSourceLabel={boardOrderSourceLabel}
                presentationVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
                onCellTrade={currentUserRosterId ? openPickTradeFromBoard : undefined}
                onOpenTradeHistory={() => {
                  setTradeHistoryFocus(null)
                  setTradeHistoryOpen(true)
                }}
                onViewCellTradeHistory={(ctx) => {
                  setTradeHistoryFocus({
                    round: ctx.round,
                    originalRosterId: ctx.originalRosterId,
                  })
                  setTradeHistoryOpen(true)
                }}
              />
            </div>
          </div>
        </div>
      }
      auctionStrip={
        isAuction && auctionSnapshot ? (
          <AuctionSpotlightPanel
            auction={auctionSnapshot}
            currentUserRosterId={currentUserRosterId ?? null}
            isCommissioner={isCommissioner}
            onNominate={(player) => handleAuctionNominate({ name: player.playerName, position: player.position, team: player.team ?? null })}
            onBid={handleAuctionBid}
            onResolve={handleAuctionResolve}
            timerRemainingSeconds={session.timer?.remainingSeconds ?? null}
            timerStatus={session.timer?.status ?? 'none'}
            nominateLoading={auctionNominateLoading}
            bidLoading={auctionBidLoading}
            resolveLoading={auctionResolveLoading}
          />
        ) : undefined
      }
      playerPanel={playerPoolNode}
      queuePanel={queueStackNode}
      helperPanel={
        <DraftHelperPanel
          loading={recommendationLoading}
          error={recommendationError}
          recommendation={recommendationResult?.recommendation ?? null}
          alternatives={recommendationResult?.alternatives ?? []}
          reachWarning={recommendationResult?.reachWarning ?? null}
          valueWarning={recommendationResult?.valueWarning ?? null}
          scarcityInsight={recommendationResult?.scarcityInsight ?? null}
          stackInsight={recommendationResult?.stackInsight ?? null}
          correlationInsight={recommendationResult?.correlationInsight ?? null}
          formatInsight={recommendationResult?.formatInsight ?? null}
          byeNote={recommendationResult?.byeNote ?? null}
          explanation={recommendationResult?.explanation ?? ''}
          evidence={recommendationResult?.evidence ?? []}
          caveats={recommendationResult?.caveats ?? []}
          uncertainty={recommendationResult?.uncertainty ?? null}
          executionMode={recommendationResult?.execution?.mode ?? null}
          sport={effectiveDraftSport}
          round={currentPick?.round ?? 1}
          pick={currentPick?.slot ?? 1}
          leagueId={leagueId}
          leagueName={leagueName}
          rosterSlots={effectiveRosterSlots}
          queueLength={queueFiltered.length}
          aiExplanationEnabled={draftAiExplanationEnabled}
          onAiExplanationToggle={setDraftAiExplanationEnabled}
          onRefresh={fetchRecommendation}
          onPlayerClick={(player) => {
            setHelperSelectedPlayer(player)
            setMobileTab('players')
          }}
          liveBrain={liveBrainEnvelope}
          warRoomBrainInput={warRoomBrainInput}
          draftSessionId={session?.id ?? null}
          chimmyInitialPrompt={chimmyDraftPrompt}
          chimmyToolSummary={chimmyToolSummary}
          sportsFeed={
            draftAssistantContext
              ? {
                  available: Boolean(draftAssistantContext.sportsFeed?.available),
                  updatedAt: draftAssistantContext.sportsFeed?.updatedAt ?? null,
                  sourceKeys: draftAssistantContext.sportsFeed?.sourceKeys ?? [],
                  headlines: draftAssistantContext.headlines,
                  injuries: draftAssistantContext.injuries,
                }
              : null
          }
          aiFeatureStatus={{
            chimmyReady: hasAiAccess && resolvedOrphanAiProviderAvailable,
            liveBrainReady: Boolean(liveBrainEnvelope),
            aiAdpEnabled: Boolean(draftUISettings?.aiAdpEnabled),
            queueReorderEnabled: Boolean(draftUISettings?.aiQueueReorderEnabled),
            draftExplanationEnabled: draftAiExplanationEnabled,
            orphanAiEnabled: Boolean(draftUISettings?.orphanTeamAiManagerEnabled),
            commissionerAiManagersCount: (commissionerAiDraft?.assignedAiTeams ?? []).filter((team) => team.active).length,
          }}
          warRoom={{
            snapshot: warRoomData,
            loading: warRoomLoading,
            error: warRoomError,
            canDraft,
            onRefresh: scheduleWarRoomFetch,
            resolvePlayer: resolvePlayerFromPool,
            onDraftPlayer: handleMakePick,
            onQueuePlayer: handleAddToQueue,
          }}
          presentationVariant={presentationVariant === 'redraft_snake' ? 'redraft_snake' : 'default'}
          picksUntilUser={ribbonPicksUntilUser}
          userOnTheClock={isCurrentUserOnClock}
          resolvedRecommendedPlayer={recommendedPlayerResolved}
          canCommitRecommendedPick={
            Boolean(
              recommendedPlayerResolved &&
                isCurrentUserOnClock &&
                canDraft &&
                presentationVariant === 'redraft_snake',
            )
          }
          onDraftRecommendedPlayer={
            recommendedPlayerResolved && canDraft && isCurrentUserOnClock
              ? () => handleMakePick(recommendedPlayerResolved)
              : undefined
          }
          onQueueRecommendedPlayer={
            recommendedPlayerResolved ? () => handleAddToQueue(recommendedPlayerResolved) : undefined
          }
          onQueueAlternativePlayer={(player) => {
            const resolved = resolvePlayerFromPool(player.name, player.position)
            if (resolved) handleAddToQueue(resolved)
          }}
        />
      }
      chatPanel={chatPanelNode}
      rosterPanel={rosterPanel}
      keeperPanel={keeperPanel}
      mobileStickyBar={mobileStickyBar}
      mobileTab={mobileTab}
      onMobileTabChange={setMobileTab}
    />
    <DraftRoomSettingsModal
      open={draftRoomSettingsOpen}
      onClose={() => setDraftRoomSettingsOpen(false)}
      leagueId={leagueId}
      leagueName={leagueName}
      draftSessionStatus={session?.status ?? 'pre_draft'}
      isCommissioner={isCommissioner}
      presentationVariant={presentationVariant}
      draftIsAuction={session?.draftType === 'auction'}
      onSaved={() => {
        void fetchDraftSettings()
      }}
    />
    {showCommissionerModal && isCommissioner && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-label="Commissioner control center" data-testid="draft-commissioner-overlay">
        <div className="w-full max-w-md max-h-[90vh] overflow-auto">
          <CommissionerControlCenterModal
            leagueId={leagueId}
            draftStatus={session?.status ?? 'pre_draft'}
            draftType={session?.draftType}
            draftUISettings={draftUISettings}
            skipPickAllowed={skipPickAllowed}
            orphanStatus={orphanAiStatus}
            isOrphanOnClock={isOrphanOnClock}
            orphanDrafterMode={requestedOrphanDrafterMode}
            orphanDrafterEffectiveMode={effectiveOrphanDrafterMode}
            orphanAiProviderAvailable={resolvedOrphanAiProviderAvailable}
            timerSeconds={session?.timerSeconds ?? null}
            rounds={session?.rounds ?? 15}
            devyConfig={(session as DraftSessionSnapshot)?.devy ?? null}
            c2cConfig={(session as DraftSessionSnapshot)?.c2c ?? null}
            onClose={() => setShowCommissionerModal(false)}
            onAction={handleCommissionerAction}
            onSettingsPatch={handleSettingsPatch}
            onSaveDevyConfig={handleSaveDevyConfig}
            onSaveC2CConfig={handleSaveC2CConfig}
            onStartDraft={handleStartDraft}
            onRunAiPick={isCommissioner && isOrphanOnClock ? handleRunAiPick : undefined}
            runAiPickLoading={runAiPickLoading}
            onBroadcast={() => { setShowCommissionerModal(false); setShowBroadcastModal(true) }}
            onResync={handleResync}
            loading={commissionerLoading}
            commissionerAiDraft={commissionerAiDraft ?? undefined}
            onSaveCommissionerAiDraft={handleSaveCommissionerAiDraft}
          />
        </div>
      </div>
    )}
    {showTradePanel && session && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-4"
        role="dialog"
        aria-label="Draft pick trades"
        data-testid="draft-trade-panel-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowTradePanel(false)
        }}
      >
        <div
          className="max-h-[min(92vh,960px)] w-full max-w-6xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <DraftPickTradePanel
            leagueId={leagueId}
            leagueName={leagueName}
            draftSessionStatus={session.status}
            pickTradeEnabled={draftUISettings?.pickTradeEnabled ?? true}
            presentationVariant={presentationVariant}
            sessionId={session.id}
            draftStateFingerprint={tradeDraftStateFingerprint}
            slotOrder={slotOrder}
            teamCount={session.teamCount}
            rounds={session.rounds}
            currentUserRosterId={currentUserRosterId ?? null}
            tradePanelGeneration={tradePanelGeneration}
            initialTradeDraft={tradeInitialDraft}
            onClose={() => setShowTradePanel(false)}
            onTradeAccepted={(updatedSession?: unknown) => {
              if (updatedSession != null)
                setSession((prev) =>
                  mergeDraftSessionSnapshot(prev, updatedSession as DraftSessionSnapshot),
                )
              fetchPendingTradesCount()
            }}
          />
        </div>
      </div>
    )}
    {showBroadcastModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-label="Broadcast to leagues" data-testid="draft-broadcast-overlay">
        <div className="w-full max-w-md rounded-xl border border-white/12 bg-[#070f21] p-4 shadow-xl" data-testid="draft-broadcast-modal">
          <h3 className="mb-3 text-sm font-semibold text-white">@everyone Broadcast</h3>
          <p className="mb-2 text-[10px] text-white/60">Select leagues to send the message to.</p>
          <div className="mb-3 max-h-40 overflow-y-auto rounded border border-white/12 bg-black/20 p-2">
            {commissionerLeagues.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 py-1 text-xs text-white">
                <input
                  type="checkbox"
                  checked={broadcastSelectedIds.has(l.id)}
                  onChange={(e) => {
                    setBroadcastSelectedIds((prev) => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(l.id)
                      else next.delete(l.id)
                      return next
                    })
                  }}
                  className="rounded border-white/20"
                  data-testid={`draft-broadcast-league-${l.id}`}
                />
                {l.name || l.id}
              </label>
            ))}
          </div>
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Message to send as @everyone"
            className="mb-3 w-full rounded border border-white/12 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-white/40"
            rows={3}
            data-testid="draft-broadcast-message-input"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBroadcastModal(false)}
              data-testid="draft-broadcast-cancel"
              className="rounded border border-white/15 bg-black/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBroadcastSubmit}
              disabled={broadcastSending || broadcastSelectedIds.size === 0 || !broadcastMessage.trim()}
              data-testid="draft-broadcast-send"
              className="rounded border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {broadcastSending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    )}
    <PickTradeHistoryModal
      open={tradeHistoryOpen}
      onClose={() => setTradeHistoryOpen(false)}
      tradedPicks={((session as DraftSessionSnapshot | null)?.tradedPicks) ?? []}
      focusRound={tradeHistoryFocus?.round ?? null}
      focusOriginalRosterId={tradeHistoryFocus?.originalRosterId ?? null}
    />
  </>
  )
}
