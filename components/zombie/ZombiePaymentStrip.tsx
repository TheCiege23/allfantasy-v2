'use client'

import { ExternalLink, Shield } from 'lucide-react'
import { getFanCredPublicUrl } from '@/lib/legal/fancredPublicUrl'

const LEAGUE_SAFE_URL = 'https://www.leaguesafe.com'

export function ZombiePaymentStrip({ className }: { className?: string }) {
  const fanCred = getFanCredPublicUrl()
  return (
    <div
      className={
        className ??
        'flex flex-col gap-2 sm:flex-row sm:flex-wrap'
      }
    >
      <a
        href={LEAGUE_SAFE_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="zombie-pay-leaguesafe"
        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-950/50"
      >
        <Shield className="h-4 w-4 shrink-0" aria-hidden />
        Pay on LeagueSafe
        <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </a>
      <a
        href={fanCred}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="zombie-pay-fancred"
        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-950/25 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-950/45"
      >
        Pay on FanCred
        <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </a>
    </div>
  )
}
