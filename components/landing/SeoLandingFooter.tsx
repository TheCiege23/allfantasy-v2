'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { loginUrlWithIntent, signupUrlWithIntent } from '@/lib/auth/auth-intent-resolver'

export default function SeoLandingFooter() {
  const { t } = useLanguage()

  return (
    <footer
      className="border-t py-6 text-xs"
      style={{ borderColor: 'var(--border)', color: 'var(--muted2)' }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
            style={{
              borderColor: 'color-mix(in srgb, white 10%, var(--border))',
              background: 'color-mix(in srgb, var(--panel) 68%, transparent)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <img
              src="/af-logo-text.png"
              alt="AllFantasy"
              className="h-[24px] w-auto object-contain sm:h-[28px]"
              style={{ mixBlendMode: 'screen' }}
            />
            <span>© {new Date().getFullYear()} AllFantasy</span>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/" className="hover:underline" style={{ color: 'var(--muted)' }}>
            Home
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/tools-hub" className="hover:underline" style={{ color: 'var(--muted)' }}>
            Tools Hub
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/app" className="hover:underline" style={{ color: 'var(--muted)' }}>
            {t('home.footer.nav.app')}
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/bracket" className="hover:underline" style={{ color: 'var(--muted)' }}>
            {t('home.footer.nav.bracket')}
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/af-legacy" className="hover:underline" style={{ color: 'var(--muted)' }}>
            {t('home.footer.nav.legacy')}
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/trade-analyzer" className="hover:underline" style={{ color: 'var(--muted)' }}>
            {t('home.footer.nav.trade')}
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/chimmy" className="hover:underline" style={{ color: 'var(--muted)' }}>
            Chimmy AI
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href={loginUrlWithIntent('/dashboard')} className="hover:underline" style={{ color: 'var(--muted)' }}>
            {t('common.signIn')}
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href={signupUrlWithIntent('/dashboard')} className="hover:underline" style={{ color: 'var(--muted)' }}>
            {t('common.signUp')}
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/disclaimer" className="hover:underline" style={{ color: 'var(--muted)' }}>
            Disclaimer
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/privacy" className="hover:underline" style={{ color: 'var(--muted)' }}>
            Privacy
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/terms" className="hover:underline" style={{ color: 'var(--muted)' }}>
            Terms
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/data-deletion" className="hover:underline" style={{ color: 'var(--muted)' }}>
            {t('landing.footer.dataDeletion')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
