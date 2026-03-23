'use client'

import { useState, useEffect, useCallback } from 'react'

export interface MediaArticleRow {
  id: string
  leagueId: string
  sport: string
  headline: string
  body: string
  tags: string[]
  createdAt: string
}

export interface UseMediaArticlesOptions {
  leagueId: string
  sport?: string | null
  tags?: string[]
}

export function useMediaArticles(options: UseMediaArticlesOptions) {
  const { leagueId, sport, tags } = options
  const [articles, setArticles] = useState<MediaArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)

  const fetchList = useCallback(async (cursor?: string, append?: boolean, backgroundRefresh?: boolean) => {
    if (!leagueId) return
    if (append) setLoadingMore(true)
    else if (backgroundRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (sport) params.set('sport', sport)
      if (tags?.length) params.set('tags', tags.join(','))
      params.set('limit', '20')
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/media?${params.toString()}`,
        { cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load articles')
      const incoming = (data.articles ?? []) as MediaArticleRow[]
      setArticles((prev) => (append ? [...prev, ...incoming] : incoming))
      setNextCursor(data.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      if (!append && !backgroundRefresh) setArticles([])
    } finally {
      if (append) setLoadingMore(false)
      else if (backgroundRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [leagueId, sport, tags?.join(',')])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return {
    articles,
    loading,
    refreshing,
    loadingMore,
    error,
    nextCursor,
    refresh: () => fetchList(undefined, false, articles.length > 0),
    loadMore: () => (nextCursor ? fetchList(nextCursor, true) : Promise.resolve()),
  }
}
