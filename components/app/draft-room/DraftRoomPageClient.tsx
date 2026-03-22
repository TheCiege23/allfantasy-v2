'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  DraftRoomShell,
  DraftTopBar,
  DraftManagerStrip,
  DraftBoard,
  SportAwareDraftRoom,
  QueuePanel,
  DraftChatPanel,
  DraftHelperPanel,
  type MobileDraftTab,
  type PlayerEntry,
} from '@/components/app/draft-room'

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
import type { DraftUISettings } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { normalizeDraftQueueSizeLimit, trimDraftQueue } from '@/lib/draft-defaults/DraftQueueLimitResolver'
import type { NormalizedDraftEntry } from '@/lib/draft-sports-models/types'
import { getDefaultRosterSlotsForSport } from '@/lib/draft-room'
import { IdpDraftExplainerCard } from '@/components/idp/IdpDraftExplainerCard'

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
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; from: string; text: string; at: string; isBroadcast?: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [reconnecting, setReconnecting] = useState(false)
  const [commissionerLoading, setCommissionerLoading] = useState(false)
  const [pickSubmitting, setPickSubmitting] = useState(false)
  const [draftUISettings, setDraftUISettings] = useState<DraftUISettings | null>(null)
  const [draftQueueSizeLimit, setDraftQueueSizeLimit] = useState<number>(normalizeDraftQueueSizeLimit(null))
  const [leagueAiAdp, setLeagueAiAdp] = useState<{
    enabled: boolean
    entries: Array<{ playerName: string; position: string; team: string | null; adp: number; sampleSize: number; lowSample?: boolean }>
    totalDrafts: number
    computedAt: string | null
    message?: string | null
  } | null>(null)
  const [autoPickFromQueue, setAutoPickFromQueue] = useState(false)
  const [awayMode, setAwayMode] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileDraftTab>('board')
  const [aiReorderLoading, setAiReorderLoading] = useState(false)
  const [aiReorderExplanation, setAiReorderExplanation] = useState<string | null>(null)
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
    byeNote: string | null
    explanation: string
    caveats: string[]
  } | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [runAiPickLoading, setRunAiPickLoading] = useState(false)
  const [showCommissionerModal, setShowCommissionerModal] = useState(false)
  const [showTradePanel, setShowTradePanel] = useState(false)
  const [pendingTradesCount, setPendingTradesCount] = useState(0)
  const [pickError, setPickError] = useState<string | null>(null)
  const [draftPool, setDraftPool] = useState<{ entries: NormalizedDraftEntry[]; sport: string; devyConfig?: { enabled: boolean; devyRounds: number[] }; c2cConfig?: { enabled: boolean; collegeRounds: number[] }; isIdp?: boolean } | null>(null)
  const [auctionNominateLoading, setAuctionNominateLoading] = useState(false)
  const [auctionBidLoading, setAuctionBidLoading] = useState(false)
  const [auctionResolveLoading, setAuctionResolveLoading] = useState(false)
  const [autopickExpiredLoading, setAutopickExpiredLoading] = useState(false)

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
        setDraftQueueSizeLimit(normalizeDraftQueueSizeLimit(data?.config?.queue_size_limit))
        setIdpRosterSummary(data.idpRosterSummary ?? null)
      }
    } catch {
      setDraftUISettings(null)
      setDraftQueueSizeLimit(normalizeDraftQueueSizeLimit(null))
      setIdpRosterSummary(null)
    }
  }, [leagueId])

  useEffect(() => {
    if (typeof window === 'undefined' || !leagueId) return
    try {
      const raw = window.localStorage.getItem(localPrefsKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { autoPickFromQueue?: boolean; awayMode?: boolean }
      if (typeof parsed.autoPickFromQueue === 'boolean') setAutoPickFromQueue(parsed.autoPickFromQueue)
      if (typeof parsed.awayMode === 'boolean') setAwayMode(parsed.awayMode)
    } catch {
      // Ignore malformed local preferences.
    }
  }, [leagueId, localPrefsKey])

  useEffect(() => {
    if (typeof window === 'undefined' || !leagueId) return
    try {
      window.localStorage.setItem(
        localPrefsKey,
        JSON.stringify({ autoPickFromQueue, awayMode })
      )
    } catch {
      // Ignore storage failures.
    }
  }, [leagueId, localPrefsKey, autoPickFromQueue, awayMode])

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
          message: data.message ?? null,
        })
      } else {
        setLeagueAiAdp({ enabled: true, entries: [], totalDrafts: 0, computedAt: null, message: 'AI ADP unavailable' })
      }
    } catch {
      setLeagueAiAdp(draftUISettings?.aiAdpEnabled ? { enabled: true, entries: [], totalDrafts: 0, computedAt: null, message: 'AI ADP unavailable' } : null)
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
      if (res.ok && Array.isArray(data.messages)) setChatMessages(data.messages)
    } catch {
      setChatMessages([])
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
    const myRoster = session.picks?.filter((p) => p.rosterId === currentUserRosterId).map((p) => ({ position: p.position })) ?? []
    const available = players.filter((p) => !draftedNames.has(p.name)).map((p) => ({
      name: p.name,
      position: p.position,
      team: p.team ?? null,
      adp: draftUISettings?.aiAdpEnabled && p.aiAdp != null ? p.aiAdp : p.adp,
      byeWeek: p.byeWeek ?? null,
    }))
    if (available.length === 0) {
      setRecommendationResult({ recommendation: null, alternatives: [], reachWarning: null, valueWarning: null, scarcityInsight: null, byeNote: null, explanation: '', caveats: ['No available players.'] })
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
      const res = await fetch('/api/draft/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available,
          teamRoster: myRoster,
          rosterSlots: effectiveRosterSlots,
          round: session.currentPick.round,
          pick: session.currentPick.slot,
          totalTeams: session.teamCount,
          sport: effectiveDraftSport,
          isDynasty,
          isSF: isSuperflexFormat,
          mode: 'needs',
          aiAdpByKey: Object.keys(aiAdpByKey).length ? aiAdpByKey : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setRecommendationResult({
          recommendation: data.recommendation ?? null,
          alternatives: data.alternatives ?? [],
          reachWarning: data.reachWarning ?? null,
          valueWarning: data.valueWarning ?? null,
          scarcityInsight: data.scarcityInsight ?? null,
          byeNote: data.byeNote ?? null,
          explanation: data.explanation ?? '',
          caveats: Array.isArray(data.caveats) ? data.caveats : [],
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
    currentUserRosterId,
  ])

  useEffect(() => {
    if (!session?.currentPick || !session.teamCount || players.length === 0) return
    const myRosterId = (session as any)?.currentUserRosterId
    if (!myRosterId || session.currentPick.rosterId !== myRosterId) return
    fetchRecommendation()
  }, [session?.currentPick?.overall, session?.currentPick?.rosterId, session?.picks?.length, session?.teamCount, players.length, fetchRecommendation])

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

  const [pollInterval, setPollInterval] = useState(POLL_MS)
  const refetchOnceRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!leagueId) return
    const run = () => {
      setReconnecting(true)
      const since = (session as { updatedAt?: string } | null)?.updatedAt
      const promises: Promise<void>[] = [
        fetchDraftEvents(since),
        fetchQueue(),
        fetchDraftSettings(),
        fetchChat(),
      ]
      const aiAdpComputedAt = leagueAiAdp?.computedAt ? new Date(leagueAiAdp.computedAt).getTime() : 0
      const skipAiAdp = draftUISettings?.aiAdpEnabled && aiAdpComputedAt && Date.now() - aiAdpComputedAt < AI_ADP_POLL_SKIP_MS
      if (draftUISettings?.aiAdpEnabled && !skipAiAdp) promises.push(fetchLeagueAiAdp())
      Promise.all(promises).finally(() => setReconnecting(false))
    }
    refetchOnceRef.current = run
  }, [leagueId, session?.updatedAt, fetchDraftEvents, fetchQueue, fetchDraftSettings, fetchChat, fetchLeagueAiAdp, draftUISettings?.aiAdpEnabled, leagueAiAdp?.computedAt])

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

  const handleResync = useCallback(() => {
    fetchSession()
    fetchDraftSettings()
    fetchQueue()
    fetchChat()
    fetchDraftPool()
    fetchPendingTradesCount()
  }, [fetchSession, fetchDraftSettings, fetchQueue, fetchChat, fetchDraftPool, fetchPendingTradesCount])

  const handleRunAiPick = useCallback(async () => {
    setRunAiPickLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/ai-pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.session) setSession(data.session)
    } finally {
      setRunAiPickLoading(false)
    }
  }, [leagueId])

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
    const drafted = new Set(session?.picks?.map((p) => p.playerName) ?? [])
    const filtered = queue.filter((e) => !drafted.has(e.playerName))
    if (filtered.length < 2) return
    setAiReorderLoading(true)
    setAiReorderExplanation(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/queue/ai-reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: filtered }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.reordered)) {
        setQueue(data.reordered)
        await handleQueueSave(data.reordered)
        setAiReorderExplanation(data.explanation ?? null)
      }
    } finally {
      setAiReorderLoading(false)
    }
  }, [leagueId, queue, session?.picks, handleQueueSave])

  const handleAddToQueue = useCallback(
    (player: PlayerEntry) => {
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
  const slotOrder = session?.slotOrder ?? []
  const aiAdpUnavailable = Boolean(draftUISettings?.aiAdpEnabled && !poolLoading && (!leagueAiAdp?.entries?.length && leagueAiAdp?.message))
  const aiAdpLowSampleWarning = Boolean(leagueAiAdp?.entries?.some((e) => e.lowSample))
  const currentPick = session?.currentPick ?? null
  const orphanRosterIds = (session as any)?.orphanRosterIds as string[] | undefined
  const aiManagerEnabled = (session as any)?.aiManagerEnabled as boolean | undefined
  const isOrphanOnClock = Boolean(
    currentPick?.rosterId && Array.isArray(orphanRosterIds) && orphanRosterIds.includes(currentPick.rosterId) && aiManagerEnabled
  )
  const isCurrentUserOnClock = Boolean(currentPick && currentUserRosterId && currentPick.rosterId === currentUserRosterId)
  const currentRoster: Array<{ playerName: string; position: string; team: string | null }> = []
  const canDraft = currentPick != null && pickSubmitting === false
  const nextQueuedAvailable = queueFiltered.length > 0 && canDraft ? queueFiltered[0] : null

  const lastPrunedQueueRef = useRef<string>('')
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
    if (!autoPickFromQueue && !awayMode) return
    const next = nextQueuedAvailable
      ?? (() => {
          const available = players
            .filter((p) => !draftedNames.has(p.name))
            .sort((a, b) => (draftUISettings?.aiAdpEnabled ? (a.aiAdp ?? a.adp ?? 999) : (a.adp ?? 999)) - (draftUISettings?.aiAdpEnabled ? (b.aiAdp ?? b.adp ?? 999) : (b.adp ?? 999)))
          const first = available[0]
          return first ? { playerName: first.name, position: first.position, team: first.team ?? null } : null
        })()
    if (!next) return
    const key = `${currentPick?.overall ?? 0}-${next.playerName}`
    if (autoPickFiredRef.current === key) return
    autoPickFiredRef.current = key
    const t = setTimeout(() => {
      handleMakePick({ name: next.playerName, position: next.position, team: next.team ?? null })
    }, 600)
    return () => clearTimeout(t)
  }, [canDraft, isCurrentUserOnClock, pickSubmitting, autoPickFromQueue, awayMode, nextQueuedAvailable, currentPick?.overall, handleMakePick, players, draftedNames, draftUISettings?.aiAdpEnabled])
  const tradedPickColorMode = draftUISettings?.tradedPickColorModeEnabled ?? false
  const showNewOwnerInRed = draftUISettings?.tradedPickOwnerNameRedEnabled ?? false

  if (loading && !session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-white/70">Loading draft room…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-white/80">No draft session for this league.</p>
        <p className="mt-2 text-sm text-white/50">
          Commissioner can create and start a draft from league settings or the draft tab.
        </p>
        <Link href={`/app/league/${leagueId}`} className="mt-4 inline-block text-cyan-400 hover:underline">
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
  const mobileStickyBar =
    currentPick != null ? (
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="font-medium text-cyan-200">
          {currentPick.pickLabel}
          {currentPick.overall != null && (
            <span className="ml-1 text-white/50">#{currentPick.overall}</span>
          )}
        </span>
        <span className="text-white/80 truncate max-w-[50%]">On clock: {currentPick.displayName}</span>
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
      {myDraftedPicks.length === 0 ? (
        <p className="text-white/50 text-sm">No picks yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {myDraftedPicks.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <span className="font-medium text-white/90 truncate">{p.playerName}</span>
              <span className="text-white/50 shrink-0 ml-2">{p.position}</span>
              <span className="text-[10px] text-white/40">#{p.overall}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const hasKeeperConfig =
    (session as DraftSessionSnapshot).keeper?.config != null &&
    ((session as DraftSessionSnapshot).keeper?.config?.maxKeepers ?? 0) > 0
  const showKeeperPanel = hasKeeperConfig || isCommissioner
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
            <div className="flex items-center justify-between gap-2 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              <span>{pickError}</span>
              <button type="button" onClick={() => setPickError(null)} className="rounded px-2 py-1 text-red-300 hover:bg-red-500/20" aria-label="Dismiss">×</button>
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
            isCommissioner={isCommissioner}
            draftStatus={session.status}
            onPause={() => handleCommissionerAction('pause')}
            onResume={() => handleCommissionerAction('resume')}
            onResetTimer={() => handleCommissionerAction('reset_timer')}
            onUndoPick={() => handleCommissionerAction('undo_pick')}
            commissionerLoading={commissionerLoading}
            isReconnecting={reconnecting}
            isOrphanOnClock={isOrphanOnClock}
            orphanDrafterMode={(session as { orphanDrafterMode?: 'cpu' | 'ai' }).orphanDrafterMode ?? 'cpu'}
            onRunAiPick={isCommissioner && isOrphanOnClock ? handleRunAiPick : undefined}
            runAiPickLoading={runAiPickLoading}
            onCommissionerOpen={isCommissioner ? () => setShowCommissionerModal(true) : undefined}
            onTradesClick={() => setShowTradePanel(true)}
            pendingTradesCount={pendingTradesCount}
            showUseQueue={
              !isAuction &&
              session.timer?.status === 'expired' &&
              isCurrentUserOnClock &&
              queueFiltered.length > 0
            }
            onUseQueue={handleAutopickExpired}
            useQueueLoading={autopickExpiredLoading}
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
        />
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
          aiAdpLowSampleWarning={aiAdpLowSampleWarning}
          canNominate={isAuction ? isMyTurnToNominate : false}
          onNominate={isAuction ? handleAuctionNominate : undefined}
          devyConfig={draftPool?.devyConfig ?? (session as DraftSessionSnapshot).devy ? { enabled: true, devyRounds: (session as DraftSessionSnapshot).devy!.devyRounds } : undefined}
          c2cConfig={draftPool?.c2cConfig ?? (session as DraftSessionSnapshot).c2c ? { enabled: true, collegeRounds: (session as DraftSessionSnapshot).c2c!.collegeRounds } : undefined}
          currentRound={session?.currentPick?.round}
          formatType={formatType ?? (draftPool as { isIdp?: boolean })?.isIdp ? 'IDP' : undefined}
        />
      }
      queuePanel={
        <QueuePanel
          queue={queueFiltered}
          canDraft={canDraft}
          onRemove={handleRemoveFromQueue}
          onReorder={handleReorderQueue}
          onDraftFromQueue={canDraft && queueFiltered.length > 0 ? handleDraftFromQueue : undefined}
          onAiReorder={draftUISettings?.aiQueueReorderEnabled ? handleAiReorderQueue : undefined}
          aiReorderLoading={aiReorderLoading}
          autoPickFromQueue={autoPickFromQueue}
          onAutoPickFromQueueChange={setAutoPickFromQueue}
          awayMode={awayMode}
          onAwayModeChange={setAwayMode}
          nextQueuedAvailable={nextQueuedAvailable}
          aiReorderExplanation={aiReorderExplanation}
        />
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
          byeNote={recommendationResult?.byeNote ?? null}
          explanation={recommendationResult?.explanation ?? ''}
          caveats={recommendationResult?.caveats ?? []}
          sport={effectiveDraftSport}
          round={session?.currentPick?.round ?? 1}
          pick={session?.currentPick?.slot ?? 1}
          leagueId={leagueId}
          leagueName={leagueName}
          rosterSlots={effectiveRosterSlots}
          queueLength={queueFiltered.length}
          onRefresh={fetchRecommendation}
        />
      }
      chatPanel={
        <DraftChatPanel
          messages={chatMessages}
          onSend={handleSendChat}
          sending={chatSending}
          leagueChatSync={draftUISettings?.liveDraftChatSyncEnabled ?? false}
          isCommissioner={isCommissioner}
          onBroadcast={isCommissioner ? handleBroadcastOpen : undefined}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-label="Commissioner control center">
        <div className="w-full max-w-md max-h-[90vh] overflow-auto">
          <CommissionerControlCenterModal
            leagueId={leagueId}
            draftStatus={session?.status ?? 'pre_draft'}
            draftUISettings={draftUISettings}
            timerSeconds={session?.timerSeconds ?? null}
            onClose={() => setShowCommissionerModal(false)}
            onAction={handleCommissionerAction}
            onSettingsPatch={handleSettingsPatch}
            onStartDraft={handleStartDraft}
            onBroadcast={() => { setShowCommissionerModal(false); setShowBroadcastModal(true) }}
            onResync={handleResync}
            loading={commissionerLoading}
          />
        </div>
      </div>
    )}
    {showTradePanel && session && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-label="Draft pick trades">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-label="Broadcast to leagues">
        <div className="w-full max-w-md rounded-xl border border-white/15 bg-gray-900 p-4 shadow-xl">
          <h3 className="mb-3 text-sm font-semibold text-white">@everyone Broadcast</h3>
          <p className="mb-2 text-[10px] text-white/60">Select leagues to send the message to.</p>
          <div className="mb-3 max-h-40 overflow-y-auto rounded border border-white/10 p-2">
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
                />
                {l.name || l.id}
              </label>
            ))}
          </div>
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Message to send as @everyone"
            className="mb-3 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/40"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBroadcastModal(false)}
              className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBroadcastSubmit}
              disabled={broadcastSending || broadcastSelectedIds.size === 0 || !broadcastMessage.trim()}
              className="rounded bg-amber-500/20 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
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
