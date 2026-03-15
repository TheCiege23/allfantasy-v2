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
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/af-crest.png"
              alt="AllFantasy"
              className="h-5 w-5 rounded-lg border object-contain"
              style={{ borderColor: 'var(--border)' }}
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
        </div>
      </div>
    </footer>
  )
}
