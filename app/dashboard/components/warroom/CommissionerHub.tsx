'use client'

import Link from 'next/link'
import { Crown, Settings, ShieldCheck } from 'lucide-react'
import type { UserLeague } from '../../types'
import { WarRoomCard } from './WarRoomCard'
import { useLeagueHealth } from './useLeagueHealth'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

const SETUP_STAGES = new Set(['setup', 'pre_draft', 'drafting'])

function needsSetupAttention(league: UserLeague): boolean {
  const stage = league.lifecycleState || league.status
  return Boolean(stage && SETUP_STAGES.has(stage === 'complete' ? 'completed' : stage))
}

function CommissionedLeagueRow({ league }: { league: UserLeague }) {
  const { t } = useLanguage()
  const health = useLeagueHealth(league)
  const setupPending = needsSetupAttention(league)

  return (
    <li className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 last:border-b-0">
      <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400/70" aria-hidden />
      <div className="min-w-0 flex-1">
        <Link href={`/league/${league.id}`} className="truncate text-[13px] font-semibold text-white/85 hover:text-cyan-200">
          {league.name}
        </Link>
        {setupPending ? (
          <p className="mt-0.5 text-[11px] text-amber-300/80">{t('dashboard.warroom.commissionerHub.setupPending')}</p>
        ) : health ? (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/40">
            <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
            {t(`dashboard.warroom.health.${health.status === 'at_risk' ? 'atRisk' : health.status}`)}
          </p>
        ) : null}
      </div>
      <Link
        href={`/league/${league.id}/settings`}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/60 transition hover:border-white/20 hover:text-white/90"
      >
        <Settings className="h-3 w-3" aria-hidden />
        {t('dashboard.warroom.commissionerHub.manage')}
      </Link>
    </li>
  )
}

export function CommissionerHub({ leagues }: { leagues: UserLeague[] }) {
  const { t } = useLanguage()
  const commissioned = leagues.filter((l) => l.isCommissioner)

  if (commissioned.length === 0) return null

  const setupCount = commissioned.filter(needsSetupAttention).length

  return (
    <WarRoomCard className="overflow-hidden" accentBorder="rgba(245,158,11,0.2)">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5 text-amber-400" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80">
            {t('dashboard.warroom.commissionerHub.title')}
          </p>
          {setupCount > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
              {setupCount}
            </span>
          ) : null}
        </div>
        <Link
          href="/commissioner-hub"
          className="text-[11px] font-semibold text-amber-300/60 transition hover:text-amber-200"
        >
          {t('dashboard.warroom.commissionerHub.openHub')}
        </Link>
      </div>
      <ul>
        {commissioned.map((league) => (
          <CommissionedLeagueRow key={league.id} league={league} />
        ))}
      </ul>
    </WarRoomCard>
  )
}
