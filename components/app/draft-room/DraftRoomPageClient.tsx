'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { DraftRoomShell, type MobileDraftTab } from '@/components/app/draft-room/DraftRoomShell'
import { DraftTopBar } from '@/components/app/draft-room/DraftTopBar'
import { DraftManagerStrip } from '@/components/app/draft-room/DraftManagerStrip'
import { DraftBoard } from '@/components/app/draft-room/DraftBoard'
import { SportAwareDraftRoom } from '@/components/app/draft-room/SportAwareDraftRoom'
import { QueuePanel } from '@/components/app/draft-room/QueuePanel'
import { DraftIntelQueuePanel } from '@/components/app/draft-room/DraftIntelQueuePanel'
import { DraftChatPanel } from '@/components/app/draft-room/DraftChatPanel'
import { DraftHelperPanel } from '@/components/app/draft-room/DraftHelperPanel'
import type { PlayerEntry } from '@/components/app/draft-room/PlayerPanel'

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
import type { DraftIntelState } from '@/lib/draft-intelligence'
import type { DraftUISettings } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { normalizeDraftQueueSizeLimit, trimDraftQueue } from '@/lib/draft-defaults/DraftQueueLimitResolver'
import type { NormalizedDraftEntry } from '@/lib/draft-sports-models/types'
import { canAddToQueue, getDefaultRosterSlotsForSport } from '@/lib/draft-room'
import { IdpDraftExplainerCard } from '@/components/idp/IdpDraftExplainerCard'
import { confirmTokenSpend } from '@/lib/tokens/client-confirm'

export type DraftRoomPageClientProps = {
  leagueId: string
  leagueName: string
  sport: string
  isDynasty?: boolean
  isCommissioner: boolean
  /** When IDP league, pass 'IDP' for position filters and roster template. */
  formatType?: string
}

const POLL_MS = 8000
const POLL_MS_BACKGROUND = 30000
const AI_ADP_POLL_SKIP_MS = 30 * 60 * 1000
const QUEUE_POLL_EVERY_N_TICKS = 2
const SETTINGS_POLL_EVERY_N_TICKS = 3
const CHAT_POLL_EVERY_N_TICKS = 2
const DRAFT_ROOM_LOCAL_PREFS_KEY_PREFIX = 'af:draft-room-prefs:'

export function DraftRoomPageClient({
  leagueId,
  leagueName,
  sport,
  isDynasty = false,
  isCommissioner,
  formatType,
}: DraftRoomPageClientProps) {
  const [session, setSession] = useState<DraftSessionSnapshot | null>(null)
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [draftIntel, setDraftIntel] = useState<DraftIntelState | null>(null)
  const [draftIntelLoading, setDraftIntelLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string
    from: string
    text: string
    at: string
    messageType?: string
    mediaUrl?: string | null
    lastActiveAt?: string | null
    isBroadcast?: boolean
    isAiSuggestion?: boolean
  }>>([])
  const [chatSyncActive, setChatSyncActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reconnecting, setReconnecting] = useState(false)
  const [commissionerLoading, setCommissionerLoading] = useState(false)
  const [pickSubmitting, setPickSubmitting] = useState(false)
  const [draftUISettings, setDraftUISettings] = useState<DraftUISettings | null>(null)
  const [skipPickAllowed, setSkipPickAllowed] = useState(false)
  const [orphanAiStatus, setOrphanAiStatus] = useState<{
    orphanRosterIds: string[]
    recentActions: Array<{ action: string; createdAt: string; reason: string | null; rosterId?: string }>
  } | null>(null)
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
  const [autoPickFromQueue, setAutoPickFromQueue] = useState(false)
  const [awayMode, setAwayMode] = useState(false)
  const [aiQueueReorderEnabled, setAiQueueReorderEnabled] = useState(true)
  const [draftAiExplanationEnabled, setDraftAiExplanationEnabled] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileDraftTab>('board')
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
  const [runAiPickLoading, setRunAiPickLoading] = useState(false)
  const [resyncLoading, setResyncLoading] = useState(false)
  const [showCommissionerModal, setShowCommissionerModal] = useState(false)
  const [showTradePanel, setShowTradePanel] = useState(false)
  const [pendingTradesCount, setPendingTradesCount] = useState(0)
  const [pickError, setPickError] = useState<string | null>(null)
  const [draftPool, setDraftPool] = useState<{ entries: NormalizedDraftEntry[]; sport: string; devyConfig?: { enabled: boolean; devyRounds: number[] }; c2cConfig?: { enabled: boolean; collegeRounds: number[] }; isIdp?: boolean } | null>(null)
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
    () => new Set(session?.picks?.map((p) => p.playerName) ?? []),
    [session?.picks]
  )
  const players: PlayerEntry[] = useMemo(() => {
    const rawEntries = Array.isArray(draftPool?.entries)
      ? draftPool.entries
      : Array.isArray((draftData as any)?.entries)
        ? (draftData as any).entries
        : []
    const useNormalizedPool = Array.isArray(draftPool?.entries) && draftPool.entries.length > 0
    const aiAdpMap = new Map<string, { adp: number; sampleSize: number; lowSample?: boolean }>()
    if (leagueAiAdp?.entries?.length) {
      for (const a of leagueAiAdp.entries) {
        const key = `${(a.playerName || '').toLowerCase()}|${(a.position || '').toLowerCase()}|${(a.team || '').toLowerCase()}`
        aiAdpMap.set(key, { adp: a.adp, sampleSize: a.sampleSize, lowSample: a.lowSample })
      }
    }
    return useNormalizedPool
      ? (rawEntries as NormalizedDraftEntry[]).map((e) => {
          const name = e.name ?? e.display?.displayName ?? ''
          const position = e.position ?? e.display?.metadata?.position ?? ''
          const team = e.team ?? e.display?.metadata?.teamAbbreviation ?? null
          const key = `${name.toLowerCase()}|${(position || '').toLowerCase()}|${(team || '').toLowerCase()}`
          const ai = aiAdpMap.get(key)
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
          const key = `${name.toLowerCase()}|${(position || '').toLowerCase()}|${(team || '').toLowerCase()}`
          const ai = aiAdpMap.get(key)
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
  }, [draftPool, draftData, leagueAiAdp, draftUISettings?.aiAdpEnabled])
  const currentUserRosterId = (session as any)?.currentUserRosterId as string | undefined

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
        setDraftQueueSizeLimit(normalizeDraftQueueSizeLimit(data?.config?.queue_size_limit))
        setIdpRosterSummary(data.idpRosterSummary ?? null)
      }
    } catch {
      setDraftUISettings(null)
      setSkipPickAllowed(false)
      setOrphanAiStatus(null)
      setDraftQueueSizeLimit(normalizeDraftQueueSizeLimit(null))
      setIdpRosterSummary(null)
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

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/session`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) setSession(data.session)
    } catch {
      setSession(null)
    }
  }, [leagueId])

  /** Lightweight poll: if since provided and server says not updated, skip heavy session build. Applies only newer session (by version/updatedAt) to avoid race conditions. */
  const fetchDraftEvents = useCallback(
    async (since: string | undefined) => {
      try {
        const url = since
          ? `/api/leagues/${encodeURIComponent(leagueId)}/draft/events?since=${encodeURIComponent(since)}`
          : `/api/leagues/${encodeURIComponent(leagueId)}/draft/session`
        const res = await fetch(url, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (data.session) {
          setSession((prev) => {
            const next = data.session as DraftSessionSnapshot
            if (!next) return prev
            if (prev) {
              if (typeof next.version === 'number' && typeof prev.version === 'number' && next.version < prev.version) return prev
              const nextAt = next.updatedAt ? new Date(next.updatedAt).getTime() : 0
              const prevAt = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0
              if (nextAt > 0 && prevAt > 0 && nextAt < prevAt) return prev
            }
            return next
          })
        } else if (data.updatedAt && data.updated === false) {
          setSession((prev) => (prev ? { ...prev, updatedAt: data.updatedAt } : null))
        }
      } catch {
        setSession(null)
      }
    },
    [leagueId]
  )

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/queue`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.queue)) setQueue(data.queue)
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
        setChatMessages(data.messages)
        setChatSyncActive(Boolean(data.syncActive))
      }
    } catch {
      setChatMessages([])
      setChatSyncActive(false)
    }
  }, [leagueId])

  const handleChatReconnect = useCallback(() => {
    fetchSession()
    fetchQueue()
    fetchDraftSettings()
    fetchChat()
  }, [fetchSession, fetchQueue, fetchDraftSettings, fetchChat])

  const [chatSending, setChatSending] = useState(false)
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
          setChatMessages((prev) => [...prev, data.message])
          if (typeof data.syncActive === 'boolean') {
            setChatSyncActive(data.syncActive)
          }
        }
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
    if (!session?.currentPick || !session.teamCount) return
    const currentPick = session.currentPick
    const myRoster = session.picks?.filter((p) => p.rosterId === currentUserRosterId).map((p) => ({
      position: p.position,
      team: p.team ?? null,
      byeWeek: p.byeWeek ?? null,
    })) ?? []
    const available = players.filter((p) => !draftedNames.has(p.name)).map((p) => ({
      name: p.name,
      position: p.position,
      team: p.team ?? null,
      adp: draftUISettings?.aiAdpEnabled && p.aiAdp != null ? p.aiAdp : p.adp,
      byeWeek: p.byeWeek ?? null,
    }))
    if (available.length === 0) {
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
    try {
      const aiAdpByKey: Record<string, number> = {}
      if (draftUISettings?.aiAdpEnabled && leagueAiAdp?.entries?.length) {
        for (const a of leagueAiAdp.entries) {
          const key = `${(a.playerName || '').toLowerCase()}|${(a.position || '').toLowerCase()}|${(a.team || '').toLowerCase()}`
          aiAdpByKey[key] = a.adp
        }
      }
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
          setRecommendationError('Token confirmation cancelled. Draft AI explanation was not unlocked.')
          return
        }
        ;({ res, data } = await requestRecommendation(true))
      }

      if (res.ok && data.ok) {
        setRecommendationResult({
          recommendation: data.recommendation ?? null,
          alternatives: data.alternatives ?? [],
          reachWarning: data.reachWarning ?? null,
          valueWarning: data.valueWarning ?? null,
          scarcityInsight: data.scarcityInsight ?? null,
          stackInsight: data.stackInsight ?? null,
          correlationInsight: data.correlationInsight ?? null,
          formatInsight: data.formatInsight ?? null,
          byeNote: data.byeNote ?? null,
          explanation: data.explanation ?? '',
          evidence: Array.isArray(data.evidence) ? data.evidence : [],
          caveats: Array.isArray(data.caveats) ? data.caveats : [],
          uncertainty: data.uncertainty ?? null,
          execution: data.execution ?? null,
        })
      } else {
        setRecommendationError(data.error || 'Failed to get recommendation')
      }
    } catch (e: any) {
      setRecommendationError(e?.message || 'Request failed')
    } finally {
      setRecommendationLoading(false)
    }
  }, [
    session?.currentPick,
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
  ])
  const recommendationRequestKeyRef = useRef('')

  useEffect(() => {
    if (!session?.currentPick || !session.teamCount || players.length === 0) return
    const myRosterId = (session as any)?.currentUserRosterId
    if (!myRosterId || session.currentPick.rosterId !== myRosterId) {
      recommendationRequestKeyRef.current = ''
      return
    }
    const recommendationKey = [
      session.currentPick.overall ?? 0,
      session.currentPick.rosterId ?? '',
      session.picks?.length ?? 0,
      players.length,
      draftUISettings?.aiAdpEnabled ? 'ai' : 'deterministic',
      draftAiExplanationEnabled ? 'ai-explain-on' : 'ai-explain-off',
      leagueAiAdp?.computedAt ?? 'no-ai-adp',
    ].join('|')
    if (recommendationRequestKeyRef.current === recommendationKey) return
    recommendationRequestKeyRef.current = recommendationKey
    fetchRecommendation()
  }, [
    session?.currentPick?.overall,
    session?.currentPick?.rosterId,
    session?.picks?.length,
    session?.teamCount,
    players.length,
    draftUISettings?.aiAdpEnabled,
    draftAiExplanationEnabled,
    leagueAiAdp?.computedAt,
    fetchRecommendation,
  ])

  useEffect(() => {
    if (!leagueId) return
    setLoading(true)
    Promise.all([
      fetchSession(),
      fetchQueue(),
      fetchDraftSettings(),
      fetchChat(),
      fetchDraftPool(),
    ]).finally(() => setLoading(false))
  }, [leagueId, fetchSession, fetchQueue, fetchDraftSettings, fetchChat, fetchDraftPool])

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
    }

    return () => {
      stream.close()
    }
  }, [leagueId, currentUserRosterId])

  const [pollInterval, setPollInterval] = useState(POLL_MS)
  const refetchOnceRef = useRef<(() => void) | null>(null)
  const pollTickRef = useRef(0)
  const pollInFlightRef = useRef(false)
  useEffect(() => {
    if (!leagueId) return
    const run = async () => {
      if (pollInFlightRef.current) return
      pollInFlightRef.current = true
      setReconnecting(true)
      const tick = pollTickRef.current + 1
      pollTickRef.current = tick
      try {
        const since = (session as { updatedAt?: string } | null)?.updatedAt
        const promises: Promise<void>[] = [fetchDraftEvents(since)]
        const onClockForCurrentUser = Boolean(
          session?.currentPick?.rosterId &&
          currentUserRosterId &&
          session.currentPick.rosterId === currentUserRosterId
        )
        const shouldRefreshQueue = (tick % QUEUE_POLL_EVERY_N_TICKS) === 0 || onClockForCurrentUser
        const shouldRefreshSettings = (tick % SETTINGS_POLL_EVERY_N_TICKS) === 0 || showCommissionerModal
        const shouldRefreshChat = chatSyncActive || (tick % CHAT_POLL_EVERY_N_TICKS) === 0

        if (shouldRefreshQueue) promises.push(fetchQueue())
        if (shouldRefreshSettings) promises.push(fetchDraftSettings())
        if (shouldRefreshChat) promises.push(fetchChat())

        const aiAdpComputedAt = leagueAiAdp?.computedAt ? new Date(leagueAiAdp.computedAt).getTime() : 0
        const skipAiAdp = draftUISettings?.aiAdpEnabled && aiAdpComputedAt && Date.now() - aiAdpComputedAt < AI_ADP_POLL_SKIP_MS
        if (draftUISettings?.aiAdpEnabled && !skipAiAdp) promises.push(fetchLeagueAiAdp())
        await Promise.all(promises)
      } finally {
        setReconnecting(false)
        pollInFlightRef.current = false
      }
    }
    refetchOnceRef.current = () => { void run() }
  }, [
    leagueId,
    session?.updatedAt,
    fetchDraftEvents,
    fetchQueue,
    fetchDraftSettings,
    fetchChat,
    fetchLeagueAiAdp,
    draftUISettings?.aiAdpEnabled,
    leagueAiAdp?.computedAt,
    showCommissionerModal,
    chatSyncActive,
    currentUserRosterId,
  ])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibility = () => {
      const hidden = document.hidden
      setPollInterval(hidden ? POLL_MS_BACKGROUND : POLL_MS)
      if (!hidden) refetchOnceRef.current?.()
    }
    document.addEventListener('visibilitychange', onVisibility)
    onVisibility()
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!leagueId) return
    const id = setInterval(() => {
      refetchOnceRef.current?.()
    }, pollInterval)
    return () => clearInterval(id)
  }, [leagueId, pollInterval])

  const handleCommissionerAction = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      setCommissionerLoading(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/controls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...payload }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.session) setSession(data.session)
        return data
      } finally {
        setCommissionerLoading(false)
      }
    },
    [leagueId],
  )

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
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) setSession(data.session)
    } catch (_) {}
  }, [leagueId])

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
        setSession(data.session as DraftSessionSnapshot)
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
        setSession(data.session as DraftSessionSnapshot)
        await fetchDraftPool()
      }
      return data
    },
    [leagueId, fetchDraftPool]
  )

  const handleResync = useCallback(() => {
    setResyncLoading(true)
    Promise.all([
      fetchSession(),
      fetchDraftSettings(),
      fetchQueue(),
      fetchChat(),
      fetchDraftPool(),
      fetchPendingTradesCount(),
    ]).finally(() => setResyncLoading(false))
  }, [fetchSession, fetchDraftSettings, fetchQueue, fetchChat, fetchDraftPool, fetchPendingTradesCount])

  const handleRunAiPick = useCallback(async () => {
    setRunAiPickLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/ai-pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) {
        setSession(data.session)
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
  }, [leagueId, fetchDraftSettings])

  const handleMakePick = useCallback(
    async (player: PlayerEntry) => {
      setPickError(null)
      setPickSubmitting(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/pick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: player.name,
            position: player.position,
            team: player.team ?? null,
            byeWeek: player.byeWeek ?? null,
            source: player.graduatedToNFL
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
          setSession(data.session)
          setQueue((prev) => prev.filter((e) => e.playerName !== player.name))
        } else {
          setPickError(typeof data?.error === 'string' ? data.error : 'Pick failed. Try again.')
        }
      } finally {
        setPickSubmitting(false)
      }
    },
    [leagueId],
  )

  const handleDraftIntelPick = useCallback(() => {
    const top = draftIntel?.queue.find((entry) => !draftedNames.has(entry.playerName))
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
        if (res.ok && data.session) setSession(data.session)
        else setPickError(typeof data?.error === 'string' ? data.error : 'Nominate failed.')
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
        if (res.ok && data.session) setSession(data.session)
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
      if (res.ok && data.session) setSession(data.session)
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
        setSession(data.session)
        const name = data.submittedPlayerName ?? data.pick?.playerName
        if (name) setQueue((prev) => prev.filter((e) => e.playerName !== name))
      } else {
        setPickError(typeof data?.error === 'string' ? data.error : 'Use queue failed.')
      }
    } finally {
      setAutopickExpiredLoading(false)
    }
  }, [leagueId])

  const handleQueueSave = useCallback(
    async (newOrder: QueueEntry[]) => {
      const limitedQueue = trimDraftQueue(newOrder, draftQueueSizeLimit)
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/queue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: limitedQueue }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (Array.isArray(data.queue)) setQueue(data.queue)
      }
    },
    [leagueId, draftQueueSizeLimit],
  )

  const handleRemoveFromQueue = useCallback(
    (index: number) => {
      const drafted = new Set(session?.picks?.map((p) => p.playerName) ?? [])
      const filtered = queue.filter((e) => !drafted.has(e.playerName))
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
      const drafted = new Set(session?.picks?.map((p) => p.playerName) ?? [])
      const filtered = queue.filter((e) => !drafted.has(e.playerName))
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
    const drafted = new Set(session?.picks?.map((p) => p.playerName) ?? [])
    const filtered = queue.filter((e) => !drafted.has(e.playerName))
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
      setQueue(next)
      handleQueueSave(next)
    },
    [queue, handleQueueSave, draftQueueSizeLimit],
  )

  const handleDraftFromQueue = useCallback(
    (entry: QueueEntry) => {
      handleMakePick({ name: entry.playerName, position: entry.position, team: entry.team ?? null })
    },
    [handleMakePick],
  )

  const queueFiltered = useMemo(
    () => queue.filter((e) => !draftedNames.has(e.playerName)),
    [queue, draftedNames]
  )
  const draftIntelQueue = useMemo(
    () =>
      (draftIntel?.queue ?? []).map((entry) => ({
        ...entry,
        isTaken: draftedNames.has(entry.playerName),
      })),
    [draftIntel?.queue, draftedNames]
  )
  const slotOrder = session?.slotOrder ?? []
  const aiAdpUnavailable = Boolean(draftUISettings?.aiAdpEnabled && !poolLoading && (!leagueAiAdp?.entries?.length && leagueAiAdp?.message))
  const aiAdpStaleWarning = Boolean(draftUISettings?.aiAdpEnabled && leagueAiAdp?.stale)
  const aiAdpLowSampleWarning = Boolean(leagueAiAdp?.entries?.some((e) => e.lowSample))
  const currentPick = session?.currentPick ?? null
  const orphanRosterIds = (session as any)?.orphanRosterIds as string[] | undefined
  const aiManagerEnabled = (session as any)?.aiManagerEnabled as boolean | undefined
  const isOrphanOnClock = Boolean(
    currentPick?.rosterId && Array.isArray(orphanRosterIds) && orphanRosterIds.includes(currentPick.rosterId) && aiManagerEnabled
  )
  const isCurrentUserOnClock = Boolean(currentPick && currentUserRosterId && currentPick.rosterId === currentUserRosterId)
  const autoPickEnabled = draftUISettings?.autoPickEnabled ?? false
  const chatMessagesWithAi = useMemo(() => {
    const base = [...chatMessages]
    if (!isCurrentUserOnClock || !recommendationResult?.recommendation) return base
    const rec = recommendationResult.recommendation
    const aiMessageId = `ai-suggestion-${currentPick?.overall ?? 'na'}-${rec.player.name}`
    if (base.some((m) => m.id === aiMessageId)) return base
    return [
      ...base,
      {
        id: aiMessageId,
        from: 'Chimmy',
        text: `On the clock: ${rec.player.name} (${rec.player.position}${rec.player.team ? `, ${rec.player.team}` : ''}). ${rec.reason}`,
        at: new Date().toISOString(),
        isAiSuggestion: true,
      },
    ]
  }, [chatMessages, isCurrentUserOnClock, recommendationResult?.recommendation, currentPick?.overall])
  const currentRoster: Array<{ playerName: string; position: string; team: string | null }> = []
  const canDraft = currentPick != null && pickSubmitting === false
  const nextQueuedAvailable = queueFiltered.length > 0 && canDraft ? queueFiltered[0] : null

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
    const drafted = new Set(session.picks.map((p) => p.playerName))
    const filtered = queue.filter((e) => !drafted.has(e.playerName))
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

  if (loading && !session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" data-testid="draft-room-loading-state">
        <p className="text-white/70">Loading draft room…</p>
      </div>
    )
  }

  if (!session) {
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

  const managerSlots = slotOrder.map((e) => ({
    slot: e.slot,
    rosterId: e.rosterId,
    displayName: e.displayName,
  }))

  const isAuction = session.draftType === 'auction'
  const auctionSnapshot = (session as any).auction
  const currentAuctionNominator = auctionSnapshot?.nominationOrder?.[auctionSnapshot?.auctionState?.nominationOrderIndex ?? 0]
  const isMyTurnToNominate = isAuction && currentUserRosterId != null && currentAuctionNominator?.rosterId === currentUserRosterId

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen">
        <PostDraftView
          leagueId={leagueId}
          leagueName={leagueName}
          sport={effectiveDraftSport}
          session={session}
          currentUserRosterId={currentUserRosterId ?? null}
          slotOrder={slotOrder}
        />
      </div>
    )
  }

  const myDraftedPicks = (session.picks ?? []).filter((p) => p.rosterId === currentUserRosterId)
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
  const draftBoardSurfaceStyle = {
    backgroundImage: `linear-gradient(180deg, rgba(${sportAccent},0.1), rgba(4,9,21,0.75)), url('/branding/allfantasy-ai-for-fantasy-sports-logo.png')`,
    backgroundSize: 'cover, 340px',
    backgroundPosition: 'center, right -36px bottom -30px',
    backgroundRepeat: 'no-repeat, no-repeat',
  } as const
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
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">My roster</h3>
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
      {myDraftedPicks.length === 0 ? (
        <p className="text-white/50 text-sm">No picks yet.</p>
      ) : (
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
    <DraftRoomShell
      topBar={
        <>
          {pickError && (
          <div className="flex items-center justify-between gap-2 border-b border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-100">
              <span>{pickError}</span>
              <button type="button" onClick={() => setPickError(null)} className="rounded px-2 py-1 text-red-200 hover:bg-red-500/20" aria-label="Dismiss">×</button>
            </div>
          )}
          <DraftTopBar
            leagueName={leagueName}
            sport={effectiveDraftSport}
            draftType={session.draftType}
            currentManagerOnClock={currentPick?.displayName ?? null}
            pickLabel={currentPick?.pickLabel ?? null}
            overallPickNumber={currentPick?.overall ?? null}
            timerStatus={session.timer?.status ?? 'none'}
            timerRemainingSeconds={session.timer?.remainingSeconds ?? null}
            timerMode={draftUISettings?.timerMode ?? 'per_pick'}
            autoPickEnabled={autoPickEnabled}
            isCommissioner={isCommissioner}
            draftStatus={session.status}
            onPause={() => handleCommissionerAction('pause')}
            onResume={() => handleCommissionerAction('resume')}
            onResetTimer={() => handleCommissionerAction('reset_timer')}
            onUndoPick={() => handleCommissionerAction('undo_pick')}
            commissionerLoading={commissionerLoading}
            isReconnecting={reconnecting}
            isOrphanOnClock={isOrphanOnClock}
            orphanDrafterMode={effectiveOrphanDrafterMode}
            orphanDrafterRequestedMode={requestedOrphanDrafterMode}
            orphanFallbackActive={orphanDrafterFallbackActive}
            onRunAiPick={isCommissioner && isOrphanOnClock ? handleRunAiPick : undefined}
            runAiPickLoading={runAiPickLoading}
            onCommissionerOpen={isCommissioner ? () => setShowCommissionerModal(true) : undefined}
            onTradesClick={() => setShowTradePanel(true)}
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
          />
        </>
      }
      managerStrip={
        <DraftManagerStrip
          managers={managerSlots}
          activeRosterId={currentPick?.rosterId ?? null}
          tradedPickColorMode={tradedPickColorMode}
          showNewOwnerInRed={showNewOwnerInRed}
          orderSourceLabel={
            (session as { draftOrderMode?: string; lotteryLastRunAt?: string } | null)?.draftOrderMode === 'weighted_lottery' &&
            (session as { lotteryLastRunAt?: string } | null)?.lotteryLastRunAt
              ? 'Weighted Lottery Order'
              : undefined
          }
        />
      }
      draftBoard={
        <div style={draftBoardSurfaceStyle}>
          <DraftBoard
            picks={session.picks ?? []}
            slotOrder={slotOrder}
            tradedPicks={(session as any).tradedPicks ?? []}
            teamCount={session.teamCount}
            rounds={session.rounds}
            draftType={session.draftType}
            thirdRoundReversal={session.thirdRoundReversal}
            tradedPickColorMode={tradedPickColorMode}
            showNewOwnerInRed={showNewOwnerInRed}
            keeperLocks={(session as DraftSessionSnapshot).keeper?.locks}
            devyRounds={(session as DraftSessionSnapshot).c2c?.enabled ? [] : ((session as DraftSessionSnapshot).devy?.devyRounds ?? [])}
            c2cCollegeRounds={(session as DraftSessionSnapshot).c2c?.collegeRounds ?? []}
            currentOverallPick={currentPick?.overall ?? null}
          />
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
      playerPanel={
        <SportAwareDraftRoom
          players={players}
          draftedNames={draftedNames}
          sport={effectiveDraftSport}
          canDraft={!isAuction && canDraft}
          onAddToQueue={handleAddToQueue}
          onMakePick={handleMakePick}
          currentRoster={currentRoster}
          loading={poolLoading}
          useAiAdp={draftUISettings?.aiAdpEnabled ?? false}
          aiAdpUnavailable={aiAdpUnavailable}
          aiAdpUnavailableMessage={leagueAiAdp?.message ?? null}
          aiAdpStaleWarning={aiAdpStaleWarning}
          aiAdpLowSampleWarning={aiAdpLowSampleWarning}
          canNominate={isAuction ? isMyTurnToNominate : false}
          onNominate={isAuction ? handleAuctionNominate : undefined}
          devyConfig={draftPool?.devyConfig ?? (session as DraftSessionSnapshot).devy ? { enabled: true, devyRounds: (session as DraftSessionSnapshot).devy!.devyRounds } : undefined}
          c2cConfig={draftPool?.c2cConfig ?? (session as DraftSessionSnapshot).c2c ? { enabled: true, collegeRounds: (session as DraftSessionSnapshot).c2c!.collegeRounds } : undefined}
          currentRound={session?.currentPick?.round}
          formatType={formatType ?? (draftPool as { isIdp?: boolean })?.isIdp ? 'IDP' : undefined}
          selectedPlayerTarget={helperSelectedPlayer}
        />
      }
      queuePanel={
        <div className="space-y-4">
          <DraftIntelQueuePanel
            loading={draftIntelLoading}
            headline={draftIntel?.headline ?? null}
            picksUntilUser={draftIntel?.picksUntilUser ?? null}
            onClock={draftIntel?.status === 'on_clock'}
            queue={draftIntelQueue}
            canDraft={Boolean(canDraft && draftIntel?.status === 'on_clock')}
            onDraftTopChoice={canDraft && draftIntel?.status === 'on_clock' ? handleDraftIntelPick : undefined}
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
          />
        </div>
      }
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
          round={session?.currentPick?.round ?? 1}
          pick={session?.currentPick?.slot ?? 1}
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
        />
      }
      chatPanel={
        <DraftChatPanel
          messages={chatMessagesWithAi}
          onSend={handleSendChat}
          sending={chatSending}
          leagueChatSync={chatSyncActive}
          isCommissioner={isCommissioner}
          onBroadcast={isCommissioner ? handleBroadcastOpen : undefined}
          onAiSuggestionClick={() => setMobileTab('helper')}
          onReconnect={handleChatReconnect}
        />
      }
      rosterPanel={rosterPanel}
      keeperPanel={keeperPanel}
      mobileStickyBar={mobileStickyBar}
      mobileTab={mobileTab}
      onMobileTabChange={setMobileTab}
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
          />
        </div>
      </div>
    )}
    {showTradePanel && session && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-label="Draft pick trades" data-testid="draft-trade-panel-overlay">
        <div className="w-full max-w-lg max-h-[85vh] overflow-hidden">
          <DraftPickTradePanel
            leagueId={leagueId}
            sessionId={session.id}
            slotOrder={slotOrder}
            teamCount={session.teamCount}
            rounds={session.rounds}
            currentUserRosterId={currentUserRosterId ?? null}
            onClose={() => setShowTradePanel(false)}
            onTradeAccepted={(updatedSession?: unknown) => {
              if (updatedSession != null) setSession(updatedSession as DraftSessionSnapshot)
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
  </>
  )
}
