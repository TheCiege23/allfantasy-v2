"use client"

import { useEffect, useCallback, useState } from "react"
import { apiGet } from "@/lib/api"

export interface HallOfFameEntryRow {
  id: string
  entityType: string
  entityId: string
  sport: string
  leagueId: string | null
  season: string | null
  category: string
  title: string
  summary: string | null
  inductedAt: string
  score: number
  metadata?: unknown
}

export interface HallOfFameMomentRow {
  id: string
  leagueId: string
  sport: string
  season: string
  headline: string
  summary: string | null
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  relatedMatchupId: string | null
  significanceScore: number
  createdAt: string
}

type EntriesResponse = { leagueId: string; entries: HallOfFameEntryRow[]; total: number }
type MomentsResponse = { leagueId: string; moments: HallOfFameMomentRow[]; total: number }

export function useHallOfFameEntriesAndMoments(args: {
  leagueId: string
  sport?: string | null
  season?: string | null
  category?: string | null
}) {
  const { leagueId, sport, season, category } = args
  const [entries, setEntries] = useState<HallOfFameEntryRow[]>([])
  const [moments, setMoments] = useState<HallOfFameMomentRow[]>([])
  const [entriesTotal, setEntriesTotal] = useState(0)
  const [momentsTotal, setMomentsTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const ep = new URLSearchParams()
      if (sport) ep.set("sport", sport)
      if (season) ep.set("season", season)
      if (category) ep.set("category", category)
      const [er, mr] = await Promise.all([
        apiGet<EntriesResponse>(
          `/api/leagues/${encodeURIComponent(leagueId)}/hall-of-fame/entries?${ep}&limit=30`
        ),
        apiGet<MomentsResponse>(
          `/api/leagues/${encodeURIComponent(leagueId)}/hall-of-fame/moments?${ep}&limit=30`
        ),
      ])
      setEntries(er?.entries ?? [])
      setEntriesTotal(er?.total ?? 0)
      setMoments(mr?.moments ?? [])
      setMomentsTotal(mr?.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load Hall of Fame")
      setEntries([])
      setMoments([])
      setEntriesTotal(0)
      setMomentsTotal(0)
    } finally {
      setLoading(false)
    }
  }, [leagueId, sport, season, category])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    entries,
    moments,
    entriesTotal,
    momentsTotal,
    loading,
    error,
    refresh,
  }
}
