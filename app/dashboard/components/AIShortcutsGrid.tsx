'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { getChimmyChatHref } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import type { UserLeague } from '@/app/dashboard/types'
import { AIToolsModal, type DashboardAIToolId } from '@/app/dashboard/components/AIToolsModal'

type AIShortcutsGridProps = {
  leagues: UserLeague[]
}

type ShortcutSlug =
  | 'startSit'
  | 'trade'
  | 'waiver'
  | 'trending'
  | 'power'
  | 'injury'
  | 'warRoom'
  | 'matchupPrep'
  | 'longTermCoach'

type ShortcutSpec = {
  id: DashboardAIToolId
  slug: ShortcutSlug
  icon: string
}

const SHORTCUT_SPECS: ShortcutSpec[] = [
  { id: 'startSit', slug: 'startSit', icon: '📊' },
  { id: 'trade', slug: 'trade', icon: '🔄' },
  { id: 'waiver', slug: 'waiver', icon: '⚠️' },
  { id: 'trending', slug: 'trending', icon: '📈' },
  { id: 'power', slug: 'power', icon: '🏆' },
  { id: 'injury', slug: 'injury', icon: '🩺' },
  { id: 'warRoom', slug: 'warRoom', icon: '🎯' },
  { id: 'matchupPrep', slug: 'matchupPrep', icon: '⚡' },
  { id: 'longTermCoach', slug: 'longTermCoach', icon: '🧭' },
]

export function AIShortcutsGrid({ leagues }: AIShortcutsGridProps) {
  const { t, tInterpolate } = useLanguage()
  const [openFaqKey, setOpenFaqKey] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<DashboardAIToolId | null>(null)

  const shortcuts = useMemo(
    () =>
      SHORTCUT_SPECS.map((s) => ({
        ...s,
        label: t(`dashboard.shortcut.${s.slug}.label`),
        description: t(`dashboard.shortcut.${s.slug}.desc`),
        faq: t(`dashboard.shortcut.${s.slug}.faq`),
      })),
    [t],
  )

  const activeTitle = useMemo(() => {
    if (!activeTool) return ''
    const row = shortcuts.find((s) => s.id === activeTool)
    return row?.label ?? ''
  }, [activeTool, shortcuts])

  const toggleFaq = useCallback((key: string) => {
    setOpenFaqKey((k) => (k === key ? null : key))
  }, [])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30">
          {t('dashboard.aiShortcuts.title')}
        </p>
        <Link
          href={getChimmyChatHref({ source: 'dashboard' })}
          className="text-[12px] font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          {t('dashboard.aiShortcuts.askChimmy')}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shortcuts.map((s) => (
          <div key={s.id} className="relative">
            <button
              type="button"
              onClick={() => setActiveTool(s.id)}
              className="relative w-full cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 pb-2 pr-9 text-left transition-all hover:border-cyan-500/30 hover:bg-white/[0.07]"
              data-testid={`ai-tool-card-${s.id}`}
            >
              <div className="text-[18px] leading-none">{s.icon}</div>
              <p className="mt-2 text-[13px] font-semibold text-white/80">{s.label}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-white/40">{s.description}</p>
            </button>
            <button
              type="button"
              aria-label={tInterpolate('dashboard.shortcut.faqAria', { label: s.label })}
              onClick={(e) => {
                e.stopPropagation()
                toggleFaq(s.id)
              }}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.05] text-[9px] text-white/30 transition-colors hover:bg-white/[0.10] hover:text-white/60"
            >
              ?
            </button>
            {openFaqKey === s.id ? (
              <div className="mt-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px] leading-snug text-white/55">
                {s.faq}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <AIToolsModal
        toolId={activeTool}
        open={activeTool !== null}
        onClose={() => setActiveTool(null)}
        leagues={leagues}
        toolTitle={activeTitle}
      />
    </section>
  )
}
