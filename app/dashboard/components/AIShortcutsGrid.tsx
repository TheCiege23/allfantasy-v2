'use client'

import { useCallback, useMemo, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { interpolateTemplate } from '@/lib/i18n/interpolate'

type AIShortcutsGridProps = {
  leagueName?: string
  onShortcut: (prompt: string) => void
}

type ShortcutSlug = 'startSit' | 'trade' | 'waiver' | 'trending' | 'power' | 'injury'

type ShortcutDef = {
  key: string
  icon: string
  label: string
  description: string
  buildPrompt: (leagueLabel: string) => string
  faq: string
}

/** Chimmy prompts stay in English for model quality. */
const SHORTCUT_SPECS: {
  key: string
  slug: ShortcutSlug
  icon: string
  buildPrompt: (leagueLabel: string) => string
}[] = [
  {
    key: 'start-sit',
    slug: 'startSit',
    icon: '📊',
    buildPrompt: (L) => `Help me with my start/sit decisions for ${L}`,
  },
  {
    key: 'trade',
    slug: 'trade',
    icon: '🔄',
    buildPrompt: (L) => `Analyze a trade for ${L}`,
  },
  {
    key: 'waiver',
    slug: 'waiver',
    icon: '⚠️',
    buildPrompt: (L) => `Who should I add off waivers in ${L}?`,
  },
  {
    key: 'trending',
    slug: 'trending',
    icon: '📈',
    buildPrompt: () => 'Which players are trending up or down?',
  },
  {
    key: 'power',
    slug: 'power',
    icon: '🏆',
    buildPrompt: (L) => `Give me power rankings for ${L}`,
  },
  {
    key: 'injury',
    slug: 'injury',
    icon: '🩺',
    buildPrompt: (L) => `Analyze injury impacts on my roster in ${L}`,
  },
]

export function AIShortcutsGrid({ leagueName, onShortcut }: AIShortcutsGridProps) {
  const { t } = useLanguage()
  const leagueLabel = leagueName?.trim() || 'my league'
  const [openFaqKey, setOpenFaqKey] = useState<string | null>(null)

  const shortcuts = useMemo<ShortcutDef[]>(
    () =>
      SHORTCUT_SPECS.map((s) => ({
        key: s.key,
        icon: s.icon,
        label: t(`dashboard.shortcut.${s.slug}.label`),
        description: t(`dashboard.shortcut.${s.slug}.desc`),
        buildPrompt: s.buildPrompt,
        faq: t(`dashboard.shortcut.${s.slug}.faq`),
      })),
    [t]
  )

  const toggleFaq = useCallback((key: string) => {
    setOpenFaqKey((k) => (k === key ? null : key))
  }, [])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30">
          {t('dashboard.aiShortcuts.title')}
        </p>
        <button
          type="button"
          onClick={() => {
            const prompt = interpolateTemplate(t('dashboard.aiShortcuts.chimmyOverviewPrompt'), {
              league: leagueLabel,
            })
            onShortcut(prompt)
            window.dispatchEvent(new CustomEvent('af-chimmy-shortcut', { detail: { prompt } }))
          }}
          className="text-[12px] font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          {t('dashboard.aiShortcuts.askChimmy')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {shortcuts.map((s) => (
          <div key={s.key} className="relative">
            <button
              type="button"
              onClick={() => {
                const prompt = s.buildPrompt(leagueLabel)
                onShortcut(prompt)
                window.dispatchEvent(new CustomEvent('af-chimmy-shortcut', { detail: { prompt } }))
              }}
              className="relative w-full cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 pb-2 pr-9 text-left transition-all hover:border-cyan-500/30 hover:bg-white/[0.07]"
            >
              <div className="text-[18px] leading-none">{s.icon}</div>
              <p className="mt-2 text-[13px] font-semibold text-white/80">{s.label}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-white/40">{s.description}</p>
            </button>
            <button
              type="button"
              aria-label={interpolateTemplate(t('dashboard.shortcut.faqAria'), { label: s.label })}
              onClick={(e) => {
                e.stopPropagation()
                toggleFaq(s.key)
              }}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.05] text-[9px] text-white/30 transition-colors hover:bg-white/[0.10] hover:text-white/60"
            >
              ?
            </button>
            {openFaqKey === s.key ? (
              <div className="mt-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px] leading-snug text-white/55">
                {s.faq}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
