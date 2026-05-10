'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConceptIntroVideoOverlay } from '@/components/league/ConceptIntroVideoOverlay'
import { LEAGUE_CREATE_OPTIONS_CATALOG_V1 } from '@/lib/league-creation/options-catalog-seed-data'
import { getConceptIntroVideoUrl } from '@/lib/league-creation/concept-intro-videos'

type LeagueConceptIntroGateProps = {
  leagueId: string
  shouldPlayIntro: boolean
  leagueType?: string | null
  leagueVariant?: string | null
  isDynasty?: boolean | null
  settings?: unknown
}

const CONCEPT_ALIASES: Record<string, string> = {
  bestball: 'best_ball',
  devy_dynasty: 'devy',
  merged_devy_c2c: 'c2c',
  dynasty_idp: 'idp',
  tournament_mode: 'tournament',
}

const CONCEPT_SEED = new Map(
  LEAGUE_CREATE_OPTIONS_CATALOG_V1.concepts.map((concept) => [
    concept.id,
    {
      title: concept.title,
      introVideoUrl: concept.introVideoUrl,
      introPosterUrl: concept.introPosterUrl,
    },
  ]),
)

function normalizeConcept(raw: string | null | undefined): string {
  const key = String(raw ?? '').trim().toLowerCase()
  if (!key) return ''
  return CONCEPT_ALIASES[key] ?? key
}

function resolveConceptKey(
  leagueType?: string | null,
  leagueVariant?: string | null,
  isDynasty?: boolean | null,
): string {
  const variant = normalizeConcept(leagueVariant)
  if (variant) return variant

  const type = normalizeConcept(leagueType)
  if (type) return type

  return isDynasty ? 'dynasty' : 'redraft'
}

function readIntroSettingEnabled(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return true
  const root = settings as Record<string, unknown>

  const intro = root.intro_video ?? root.introVideo
  if (intro && typeof intro === 'object' && !Array.isArray(intro)) {
    const introObj = intro as Record<string, unknown>
    if (typeof introObj.enabled === 'boolean') return introObj.enabled
    if (typeof introObj.isEnabled === 'boolean') return introObj.isEnabled
    if (typeof introObj.disabled === 'boolean') return !introObj.disabled
  }

  if (typeof root.introVideoEnabled === 'boolean') return root.introVideoEnabled
  if (typeof root.disableIntroVideo === 'boolean') return !root.disableIntroVideo
  return true
}

function readStoredIntro(settings: unknown): { videoUrl: string | null; posterUrl: string | null } {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { videoUrl: null, posterUrl: null }
  }

  const root = settings as Record<string, unknown>
  const intro = root.intro_video ?? root.introVideo
  if (!intro || typeof intro !== 'object' || Array.isArray(intro)) {
    return { videoUrl: null, posterUrl: null }
  }

  const introObj = intro as Record<string, unknown>
  const url = typeof introObj.url === 'string' && introObj.url.trim().length > 0 ? introObj.url.trim() : null
  const poster =
    typeof introObj.posterUrl === 'string' && introObj.posterUrl.trim().length > 0
      ? introObj.posterUrl.trim()
      : null

  return { videoUrl: url, posterUrl: poster }
}

export function LeagueConceptIntroGate({
  leagueId,
  shouldPlayIntro,
  leagueType,
  leagueVariant,
  isDynasty,
  settings,
}: LeagueConceptIntroGateProps) {
  const conceptKey = useMemo(
    () => resolveConceptKey(leagueType, leagueVariant, isDynasty),
    [leagueType, leagueVariant, isDynasty],
  )
  const seed = useMemo(() => CONCEPT_SEED.get(conceptKey) ?? null, [conceptKey])
  const storedIntro = useMemo(() => readStoredIntro(settings), [settings])
  const introEnabled = useMemo(() => readIntroSettingEnabled(settings), [settings])

  const videoSrc = useMemo(() => {
    if (storedIntro.videoUrl) return storedIntro.videoUrl
    if (seed?.introVideoUrl) return seed.introVideoUrl
    return getConceptIntroVideoUrl(conceptKey) ?? null
  }, [conceptKey, seed, storedIntro.videoUrl])

  const posterSrc = useMemo(() => {
    if (storedIntro.posterUrl) return storedIntro.posterUrl
    return seed?.introPosterUrl ?? null
  }, [seed, storedIntro.posterUrl])

  const conceptLabel = seed?.title ?? (conceptKey.replace(/_/g, ' ') || 'League')

  const [open, setOpen] = useState(false)
  const seenMarkedRef = useRef(false)

  const shouldCheck = shouldPlayIntro && introEnabled && Boolean(videoSrc)

  useEffect(() => {
    seenMarkedRef.current = false
  }, [leagueId])

  useEffect(() => {
    if (!shouldCheck) {
      setOpen(false)
      return
    }

    let cancelled = false
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/intro-status`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) return null
        return response.json().catch(() => null)
      })
      .then((payload: { seen?: boolean } | null) => {
        if (cancelled) return
        if (payload?.seen === false) setOpen(true)
      })
      .catch(() => {
        // Fail closed: if status call fails, do not block the dashboard.
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, shouldCheck])

  const markSeen = useCallback(() => {
    if (seenMarkedRef.current) return
    seenMarkedRef.current = true
    void fetch(`/api/leagues/${encodeURIComponent(leagueId)}/intro-seen`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    }).catch(() => {
      // Best-effort write. The UI should still dismiss immediately.
    })
  }, [leagueId])

  const dismiss = useCallback(() => {
    setOpen(false)
    markSeen()
  }, [markSeen])

  if (!videoSrc) return null

  return (
    <ConceptIntroVideoOverlay
      open={open}
      conceptLabel={conceptLabel}
      videoSrc={videoSrc}
      posterSrc={posterSrc}
      onDismiss={dismiss}
    />
  )
}
