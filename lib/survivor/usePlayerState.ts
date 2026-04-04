'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  LeagueSettingsBrief,
  SurvivorSeasonPayload,
  SurvivorUiPlayerState,
} from './survivorUiTypes'

export type UseSurvivorPlayerStateResult = {
  loading: boolean
  error: string | null
  season: SurvivorSeasonPayload | null
  leagueName: string
  /** True when `/api/survivor/season` reports survivor mode for this league. */
  survivorModeEnabled: boolean
  isCommissioner: boolean
  canEditLeagueSettings: boolean
  hasAfCommissionerSub: boolean
  playerState: SurvivorUiPlayerState
  canVote: boolean
  canSubmitChallenge: boolean
  canAccessTribeChat: boolean
  canAccessExileChat: boolean
  canAccessJuryChat: boolean
  canAccessMergeChat: boolean
  canAccessFinaleChat: boolean
  tribeId: string | null
  hasActiveIdol: boolean
  tokenBalance: number | null
  currentWeek: number
  leaguePhase: string
  refetch: () => void
}

function mapPlayerState(row: SurvivorSeasonPayload['userState']): SurvivorUiPlayerState {
  if (!row) return 'active'
  if (row.isFinalist) return 'finalist'
  if (row.isJuryMember || row.playerState === 'jury') return 'jury'
  if (row.playerState === 'exile') return 'exile'
  if (row.playerState === 'eliminated' || (row.eliminatedWeek != null && row.eliminatedWeek > 0)) {
    return 'eliminated'
  }
  if (row.hasImmunityThisWeek) return 'immune'
  return 'active'
}

export function useSurvivorPlayerState(leagueId: string): UseSurvivorPlayerStateResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [season, setSeason] = useState<SurvivorSeasonPayload | null>(null)
  const [settings, setSettings] = useState<LeagueSettingsBrief | null>(null)

  const load = useCallback(() => {
    if (!leagueId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`/api/survivor/season?leagueId=${encodeURIComponent(leagueId)}`, {
        credentials: 'include',
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('season')))),
      fetch(`/api/league/settings?leagueId=${encodeURIComponent(leagueId)}`, {
        credentials: 'include',
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('settings')))),
    ])
      .then(([s, g]) => {
        setSeason(s as SurvivorSeasonPayload)
        setSettings(g as LeagueSettingsBrief)
      })
      .catch(() => setError('Could not load Survivor session.'))
      .finally(() => setLoading(false))
  }, [leagueId])

  useEffect(() => {
    load()
  }, [load])

  return useMemo(() => {
    const us = season?.userState
    const ps = mapPlayerState(us ?? null)
    const councilOpen = season?.activeCouncil?.status === 'voting_open'
    const challengeOpen = season?.currentChallenge?.status === 'open'
    const canVote = Boolean(
      us &&
        councilOpen &&
        us.playerState === 'active' &&
        !us.hasImmunityThisWeek,
    )

    const role = settings?.userRole ?? ''
    const isCommissioner = role === 'commissioner' || role === 'co_commissioner'

    return {
      loading,
      error,
      season,
      leagueName: settings?.league?.name ?? 'Survivor League',
      survivorModeEnabled: Boolean(season?.mode),
      isCommissioner,
      canEditLeagueSettings: Boolean(settings?.canEdit),
      hasAfCommissionerSub: Boolean(settings?.hasAfCommissionerSub),
      playerState: ps,
      canVote: Boolean(us && canVote),
      canSubmitChallenge: Boolean(
        us &&
          challengeOpen &&
          (us.playerState === 'active' || us.playerState === 'exile'),
      ),
      canAccessTribeChat: us?.canAccessTribeChat !== false,
      canAccessExileChat: Boolean(us?.canAccessExileChat),
      canAccessJuryChat: Boolean(us?.canAccessJuryChat),
      canAccessMergeChat: Boolean(us?.canAccessMergeChat),
      canAccessFinaleChat: Boolean(us?.canAccessFinaleChat),
      tribeId: us?.tribeId ?? null,
      hasActiveIdol: Array.isArray(us?.idolIds) && us.idolIds.length > 0,
      tokenBalance: typeof us?.tokenBalance === 'number' ? us.tokenBalance : null,
      currentWeek: season?.activeCouncil?.week ?? season?.currentChallenge?.week ?? 1,
      leaguePhase: season?.phase ?? 'pre_draft',
      refetch: load,
    }
  }, [error, load, loading, season, settings])
}
