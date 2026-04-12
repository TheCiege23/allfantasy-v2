'use client'

import { useCallback, useEffect, useState } from 'react'
import IntroVideoModal from '@/components/league/IntroVideoModal'
import type { LeagueIntroVideoData } from '@/components/league/types'
import { getFormatIntroMetadata } from '@/lib/league/format-engine'
import type { LeagueSport } from '@prisma/client'

const STORAGE_PREFIX = 'af-tournament-intro-seen-'

export function TournamentEntryIntroModal({
  tournamentId,
  sport,
}: {
  tournamentId: string
  sport: LeagueSport | string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!tournamentId) return
    try {
      const seen = localStorage.getItem(`${STORAGE_PREFIX}${tournamentId}`) === '1'
      if (!seen) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [tournamentId])

  const onClose = useCallback(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${tournamentId}`, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }, [tournamentId])

  const meta = getFormatIntroMetadata({ sport, leagueType: 'tournament' })
  const data: LeagueIntroVideoData = {
    title: meta.title,
    subtitle: meta.subtitle,
    introVideo: meta.introVideo,
    thumbnail: meta.thumbnail,
    fallbackCopy: meta.fallbackCopy,
    shouldAutoOpen: true,
  }

  return (
    <IntroVideoModal
      data={data}
      open={open}
      onClose={onClose}
    />
  )
}
