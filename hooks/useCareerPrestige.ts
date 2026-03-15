"use client"

import { useEffect, useCallback, useState } from "react"

export interface UnifiedCareerProfileRow {
  managerId: string
  leagueId: string | null
  sport: string | null
  gmEconomy: {
    franchiseValue: number
    gmPrestigeScore: number
    tierLabel: string | null
    championshipCount: number
    careerWinPercentage: number
    totalCareerSeasons: number
    totalLeaguesPlayed: number
  } | null
  xp: {
    totalXP: number
    currentTier: string
    progressInTier: number
    xpToNextTier: number
  } | null
  reputation: { overallScore: number; tier: string; commissionerTrustScore: number } | null
  legacy: {
    overallLegacyScore: number
    championshipScore: number
    playoffScore: number
  } | null
  hallOfFameEntryCount: number
  topHallOfFameTitle: string | null
  awardsWonCount: number
  recordsHeldCount: number
  timelineHints: string[]
}

export function useCareerPrestigeProfile(managerId: string | null, leagueId: string | null) {
  const [profile, setProfile] = useState<UnifiedCareerProfileRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!managerId) {
      setProfile(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ managerId })
      if (leagueId) params.set("leagueId", leagueId)
      const res = await fetch(`/api/career-prestige/profile?${params}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load career profile")
        setProfile(null)
        return
      }
      setProfile(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [managerId, leagueId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { profile, loading, error, refresh }
}

export interface LeaguePrestigeRow {
  leagueId: string
  sport: string
  managerCount: number
  gmEconomyCoverage: number
  xpCoverage: number
  reputationCoverage: number
  legacyCoverage: number
  hallOfFameEntryCount: number
  awardsCount: number
  recordBookCount: number
  topLegacyScore: number | null
  topXP: number | null
}

export function useLeaguePrestige(leagueId: string | null) {
  const [summary, setSummary] = useState<LeaguePrestigeRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!leagueId) {
      setSummary(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/career-prestige/league?leagueId=${encodeURIComponent(leagueId)}`,
        { cache: "no-store" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load league prestige")
        setSummary(null)
        return
      }
      setSummary(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { summary, loading, error, refresh }
}

export interface CareerLeaderboardRow {
  managerId: string
  rank: number
  franchiseValue: number
  totalXP: number
  legacyScore: number | null
  reputationTier: string | null
  championshipCount: number
  awardsCount: number
  recordsCount: number
  prestigeScore: number
}

export function useCareerLeaderboard(leagueId: string | null) {
  const [leaderboard, setLeaderboard] = useState<CareerLeaderboardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (leagueId) params.set("leagueId", leagueId)
      params.set("limit", "25")
      const res = await fetch(`/api/career-prestige/leaderboard?${params}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load leaderboard")
        setLeaderboard([])
        return
      }
      setLeaderboard(data?.leaderboard ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { leaderboard, loading, error, refresh }
}
