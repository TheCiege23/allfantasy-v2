'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DraftIntroVideoOverlay } from '@/components/draft/DraftIntroVideoOverlay'
import { resolveDraftIntroPosterUrl } from '@/lib/draft/draft-intro-video'

type DraftIntroGateProps = {
  leagueId: string
  draftSessionId: string
  shouldPlayIntro: boolean
}

function draftTypeLabelFromKey(raw: string | null | undefined): string {
  const key = String(raw ?? '').trim().toLowerCase()
  if (!key) return 'Draft'
  return key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

export function DraftIntroGate({
  leagueId,
  draftSessionId,
  shouldPlayIntro,
}: DraftIntroGateProps) {
  const [open, setOpen] = useState(false)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [draftTypeKey, setDraftTypeKey] = useState<string | null>(null)
  const checkedSessionRef = useRef<string | null>(null)
  const seenMarkedRef = useRef(false)

  const shouldCheck = shouldPlayIntro && Boolean(leagueId) && Boolean(draftSessionId)

  useEffect(() => {
    seenMarkedRef.current = false
    checkedSessionRef.current = null
    setOpen(false)
    setVideoSrc(null)
    setDraftTypeKey(null)
  }, [draftSessionId])

  useEffect(() => {
    if (!shouldCheck) {
      setOpen(false)
      return
    }
    if (checkedSessionRef.current === draftSessionId) return
    checkedSessionRef.current = draftSessionId

    let cancelled = false
    fetch(
      `/api/leagues/${encodeURIComponent(leagueId)}/draft/${encodeURIComponent(draftSessionId)}/intro-status`,
      {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      },
    )
      .then((response) => {
        if (!response.ok) return null
        return response.json().catch(() => null)
      })
      .then((payload: { seen?: boolean; videoUrl?: string | null; draftTypeKey?: string | null } | null) => {
        if (cancelled) return
        const videoUrl = typeof payload?.videoUrl === 'string' && payload.videoUrl.trim().length > 0
          ? payload.videoUrl
          : null
        setDraftTypeKey(payload?.draftTypeKey ?? null)
        setVideoSrc(videoUrl)
        setOpen(payload?.seen === false && Boolean(videoUrl))
      })
      .catch(() => {
        // Fail closed: no video fetch success means no blocking overlay.
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, draftSessionId, shouldCheck])

  const markSeen = useCallback(() => {
    if (seenMarkedRef.current) return
    seenMarkedRef.current = true

    void fetch(
      `/api/leagues/${encodeURIComponent(leagueId)}/draft/${encodeURIComponent(draftSessionId)}/intro-seen`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    ).catch(() => {
      // Best-effort write; UI dismiss remains immediate.
    })
  }, [leagueId, draftSessionId])

  const dismiss = useCallback(() => {
    setOpen(false)
    markSeen()
  }, [markSeen])

  const draftTypeLabel = useMemo(() => draftTypeLabelFromKey(draftTypeKey), [draftTypeKey])
  const posterSrc = useMemo(() => resolveDraftIntroPosterUrl(draftTypeKey), [draftTypeKey])

  if (!videoSrc) return null

  return (
    <DraftIntroVideoOverlay
      open={open}
      draftTypeLabel={draftTypeLabel}
      videoSrc={videoSrc}
      posterSrc={posterSrc}
      onDismiss={dismiss}
    />
  )
}
