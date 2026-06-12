'use client'

import { FlaskConical } from 'lucide-react'
import type { BetaBannerInfo } from '@/lib/league/ncaaf-beta-guard'

export function NcaafBetaDataBanner({ info }: { info: BetaBannerInfo }) {
  return (
    <div
      className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
      role="status"
      aria-label={info.headline}
      data-testid={info.testId}
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
      <div>
        <p className="text-[12px] font-bold text-amber-300">{info.headline}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-amber-200/70">{info.detail}</p>
      </div>
    </div>
  )
}
