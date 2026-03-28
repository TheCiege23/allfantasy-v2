'use client'

import { Sparkles, Trophy, Users } from 'lucide-react'
import { StatsCard } from '@/components/landing/StatsCard'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

/** Platform usage stats. Replace values with API or env when available. PROMPT 165. */
const PLATFORM_STATS = [
  { labelKey: 'landing.socialProof.aiAnalysesRun', value: '1M+', icon: Sparkles },
  { labelKey: 'landing.socialProof.leaguesCreated', value: '120K+', icon: Trophy },
  { labelKey: 'landing.socialProof.playerComparisonsRun', value: '680K+', icon: Users },
] as const

export default function LandingSocialProof() {
  const { t } = useLanguage()
  return (
    <section
      className="border-t px-4 py-12 sm:px-6 sm:py-16"
      style={{
        borderColor: 'var(--border)',
        background: 'color-mix(in srgb, var(--panel) 30%, transparent)',
        contentVisibility: 'auto',
        containIntrinsicSize: '360px',
      }}
    >
      <div className="mx-auto max-w-4xl">
        <h2
          className="text-center text-lg font-semibold sm:text-xl"
          style={{ color: 'var(--text)' }}
          data-testid="landing-social-proof-heading"
        >
          {t('landing.socialProof.heading')}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm" style={{ color: 'var(--muted)' }}>
          {t('landing.socialProof.subheading')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {PLATFORM_STATS.map((stat) => (
            <StatsCard
              key={stat.labelKey}
              value={stat.value}
              label={t(stat.labelKey)}
              icon={stat.icon}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
