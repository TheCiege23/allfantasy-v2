'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { gtagEvent } from '@/lib/gtag'
import { LogIn, UserPlus } from 'lucide-react'

interface LandingCTAStripProps {
  primaryHref: string
  primaryLabel: string
  /** e.g. "Open Trade Analyzer" */
  showSignInSignUp?: boolean
  className?: string
}

export function LandingCTAStrip({
  primaryHref,
  primaryLabel,
  showSignInSignUp = true,
  className = '',
}: LandingCTAStripProps) {
  const { status } = useSession()
  const { t } = useLanguage()
  const isAuthed = status === 'authenticated'

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <Link
        href={primaryHref}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-400 min-h-[44px]"
        onClick={() => gtagEvent('landing_cta_open_tool', { cta_label: primaryLabel, cta_href: primaryHref })}
      >
        {primaryLabel}
      </Link>
      {showSignInSignUp && !isAuthed && (
        <>
          <Link
            href={`/signup?next=${encodeURIComponent(primaryHref)}`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium min-h-[44px]"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text)',
              background: 'color-mix(in srgb, var(--panel2) 84%, transparent)',
            }}
            onClick={() => gtagEvent('landing_cta_sign_up', { next: primaryHref })}
          >
            <UserPlus className="h-4 w-4" />
            {t('common.signUp')}
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(primaryHref)}`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium min-h-[44px]"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--muted)',
            }}
            onClick={() => gtagEvent('landing_cta_sign_in', { next: primaryHref })}
          >
            <LogIn className="h-4 w-4" />
            {t('common.signIn')}
          </Link>
        </>
      )}
    </div>
  )
}
