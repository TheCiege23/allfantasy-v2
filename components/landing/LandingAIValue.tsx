'use client'

import { Scale, ClipboardList, Target, MessageCircle, TrendingUp, Zap } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

const AI_VALUES = [
  {
    titleKey: 'landing.ai.1.title',
    bodyKey: 'landing.ai.1.body',
    icon: Scale,
    accent: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    titleKey: 'landing.ai.2.title',
    bodyKey: 'landing.ai.2.body',
    icon: ClipboardList,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    titleKey: 'landing.ai.3.title',
    bodyKey: 'landing.ai.3.body',
    icon: Target,
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    titleKey: 'landing.ai.4.title',
    bodyKey: 'landing.ai.4.body',
    icon: MessageCircle,
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    titleKey: 'landing.ai.5.title',
    bodyKey: 'landing.ai.5.body',
    icon: TrendingUp,
    accent: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    titleKey: 'landing.ai.6.title',
    bodyKey: 'landing.ai.6.body',
    icon: Zap,
    accent: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
] as const

export default function LandingAIValue() {
  const { t } = useLanguage()

  return (
    <section className="border-t px-4 py-14 sm:px-6 sm:py-20" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 15%, transparent)' }}>
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-400 mb-4">
            <Zap className="h-3.5 w-3.5" />
            {t('landing.ai.badge')}
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text)' }}>
            {t('landing.ai.heading')}
          </h2>
          <p className="mt-2 max-w-md mx-auto text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
            {t('landing.ai.subheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_VALUES.map(({ titleKey, bodyKey, icon: Icon, accent, bg, border }) => (
            <div
              key={titleKey}
              className={`rounded-2xl border ${border} ${bg} p-5 flex flex-col gap-3`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${accent}`} />
              </div>
              <div>
                <div className={`text-sm font-semibold ${accent}`}>{t(titleKey)}</div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{t(bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
