'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

/**
 * Commissioner-only: after the tournament season, renew advances the hub season and
 * restores participants to qualification (feeder) leagues.
 */
export function TournamentRenewBanner({
  tournamentId,
  isCommissioner,
}: {
  tournamentId: string
  isCommissioner: boolean
}) {
  const { t } = useLanguage()
  const [eligible, setEligible] = useState(false)
  const [nextSeason, setNextSeason] = useState(() => new Date().getFullYear() + 1)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!isCommissioner || !tournamentId) return
    fetch(`/api/commissioner/tournaments/${encodeURIComponent(tournamentId)}/renew`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.nextSeason === 'number' && Number.isFinite(d.nextSeason)) {
          setNextSeason(d.nextSeason)
        }
        if (d.seasonComplete) setEligible(true)
      })
      .catch(() => {})
  }, [tournamentId, isCommissioner])

  const onRenew = useCallback(async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/commissioner/tournaments/${encodeURIComponent(tournamentId)}/renew`, {
        method: 'POST',
      })
      if (res.ok) setDone(true)
    } finally {
      setSubmitting(false)
    }
  }, [tournamentId])

  if (!isCommissioner || !eligible || done) return null

  return (
    <div className="shrink-0 border-b border-emerald-500/25 bg-emerald-950/20 px-4 py-3">
      <p className="mb-2 text-center text-[11px] text-white/45">{t('renew.tournamentHubHint')}</p>
      <button
        type="button"
        onClick={onRenew}
        disabled={submitting}
        className="mx-auto flex w-full max-w-md items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-3 text-[13px] font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-900/30 disabled:opacity-50"
      >
        {submitting ? t('renew.renewing') : t('renew.tournamentHubCta').replace('{{year}}', String(nextSeason))}
      </button>
    </div>
  )
}
