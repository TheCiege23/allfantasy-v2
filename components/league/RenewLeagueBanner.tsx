'use client'

/**
 * components/league/RenewLeagueBanner.tsx
 * "RENEW LEAGUE FOR 202X" button shown to commissioners when season ends.
 * Sits in the league page between the tab bar and content area.
 * Opens the RenewLeagueModal on click.
 */

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { RenewLeagueModal } from '@/components/league-settings/RenewLeagueModal'

interface Props {
  leagueId: string
  currentSeason: number
  isCommissioner: boolean
  /** League status — show banner when complete/offseason/post_season */
  leagueStatus?: string
  /** Dynasty season phase */
  seasonPhase?: string
}

export function RenewLeagueBanner({
  leagueId,
  currentSeason,
  isCommissioner,
  leagueStatus,
  seasonPhase,
}: Props) {
  const { t } = useLanguage()
  const [showModal, setShowModal] = useState(false)
  const [renewed, setRenewed] = useState(false)

  const nextSeason = currentSeason + 1

  // Determine if season is over
  const status = (leagueStatus ?? '').toLowerCase()
  const phase = (seasonPhase ?? '').toLowerCase()
  const isSeasonOver =
    status === 'complete' ||
    status === 'post_season' ||
    status === 'offseason' ||
    phase === 'offseason' ||
    phase === 'complete'

  // Check if already renewed
  useEffect(() => {
    if (!isSeasonOver || !isCommissioner) return
    fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/renew`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (data.renewalCompleted) setRenewed(true) })
      .catch(() => {})
  }, [leagueId, isSeasonOver, isCommissioner])

  const handleRenewed = useCallback(() => {
    setRenewed(true)
    setShowModal(false)
  }, [])

  // Don't show if not season over, not commissioner, or already renewed
  if (!isSeasonOver || !isCommissioner || renewed) return null

  return (
    <>
      <div className="shrink-0 px-4 py-3">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mx-auto flex w-full max-w-md items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-3.5 text-[14px] font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-emerald-400 hover:shadow-cyan-500/35 active:scale-[0.98]"
        >
          {t('renew.buttonLabel').replace('{{year}}', String(nextSeason))}
        </button>
      </div>

      <RenewLeagueModal
        leagueId={leagueId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onRenewed={handleRenewed}
      />
    </>
  )
}
