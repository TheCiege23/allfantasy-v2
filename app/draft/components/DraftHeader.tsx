'use client'

import { Settings } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

type Props = {
  /** League name (or "Mock Draft" for mocks). */
  title: string
  /** Specs line beneath title — e.g. "8 Hours Per Pick · 14 Teams · 6 Rounds". */
  subtitle?: string
  /** Optional invite-leaguemates button rendered next to the spec line. */
  inviteSlot?: React.ReactNode
  /** Center slot — typically the timer/OTC display, only shown once draft is active. */
  centerSlot?: React.ReactNode
  /** Right slot — autopick toggle, start button, etc. */
  rightSlot?: React.ReactNode
  /** Settings gear handler. Commissioner gets editable modal, others read-only. */
  onOpenSettings?: () => void
  /** Whether the viewer can edit settings (controls aria label only — modal handles permissions). */
  isCommissioner?: boolean
}

export function DraftHeader({
  title,
  subtitle,
  inviteSlot,
  centerSlot,
  rightSlot,
  onOpenSettings,
  isCommissioner,
}: Props) {
  const { t } = useLanguage()

  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0d1117] px-4 py-3"
      data-testid="draft-header"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-white" data-testid="draft-header-title">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[11px] text-white/55" data-testid="draft-header-subtitle">
              {subtitle}
              {inviteSlot ? <span className="ml-2 text-white/30">·</span> : null}
              {inviteSlot ? <span className="ml-2 align-middle">{inviteSlot}</span> : null}
            </p>
          ) : null}
        </div>
      </div>

      {centerSlot ? (
        <div
          className="order-3 w-full md:order-none md:w-auto md:flex-1 md:px-4"
          data-testid="draft-header-center"
        >
          {centerSlot}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {rightSlot}
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg border border-white/[0.08] p-2 text-white/65 hover:bg-white/[0.06] hover:text-white"
            aria-label={
              isCommissioner
                ? t('draftRoom.header.aria.settings')
                : 'View draft settings'
            }
            data-testid="draft-header-settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </header>
  )
}
