'use client'

import { Layers3, DraftingCompass, BarChart3, Users, Trophy, Brain } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

const FEATURES = [
  {
    titleKey: 'landing.features.1.title',
    bodyKey: 'landing.features.1.body',
    icon: Trophy,
    gradient: 'from-amber-500/20 to-yellow-500/10',
    border: 'border-amber-500/25',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
  },
  {
    titleKey: 'landing.features.2.title',
    bodyKey: 'landing.features.2.body',
    icon: DraftingCompass,
    gradient: 'from-cyan-500/20 to-blue-500/10',
    border: 'border-cyan-500/25',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15',
  },
  {
    titleKey: 'landing.features.3.title',
    bodyKey: 'landing.features.3.body',
    icon: BarChart3,
    gradient: 'from-purple-500/20 to-violet-500/10',
    border: 'border-purple-500/25',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/15',
  },
  {
    titleKey: 'landing.features.4.title',
    bodyKey: 'landing.features.4.body',
    icon: Layers3,
    gradient: 'from-emerald-500/20 to-green-500/10',
    border: 'border-emerald-500/25',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
  },
  {
    titleKey: 'landing.features.5.title',
    bodyKey: 'landing.features.5.body',
    icon: Users,
    gradient: 'from-rose-500/20 to-pink-500/10',
    border: 'border-rose-500/25',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/15',
  },
  {
    titleKey: 'landing.features.6.title',
    bodyKey: 'landing.features.6.body',
    icon: Brain,
    gradient: 'from-indigo-500/20 to-blue-500/10',
    border: 'border-indigo-500/25',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/15',
  },
] as const

export default function LandingFeaturesMinimal() {
  const { t } = useLanguage()

  return (
    <section className="border-t px-4 py-14 sm:px-6 sm:py-20" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold sm:text-3xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            {t('landing.features.heading')}
          </h2>
          <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
            {t('landing.features.subheading')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ titleKey, bodyKey, icon: Icon, gradient, border, iconColor, iconBg }) => (
            <div
              key={titleKey}
              className={`rounded-2xl border bg-gradient-to-br ${gradient} ${border} p-5 flex flex-col gap-3`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t(titleKey)}</div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{t(bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
