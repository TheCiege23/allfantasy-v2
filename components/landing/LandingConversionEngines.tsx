'use client'

import Link from 'next/link'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

const OPEN_APP_HREF = '/app'
const CREATE_ACCOUNT_HREF = '/signup'

/**
 * Conversion engine system:
 * - Mid-page CTA strip (desktop + mobile)
 * - Sticky mobile action bar for persistent conversion actions
 */
export default function LandingConversionEngines() {
  const { t } = useLanguage()
  const openAppLabel = t('landing.cta.openApp')
  const createAccountLabel = t('landing.cta.createAccount')

  return (
    <>
      <section
        className="border-t px-4 py-10 sm:px-6 sm:py-12"
        style={{ borderColor: 'var(--border)', contentVisibility: 'auto', containIntrinsicSize: '300px' }}
        data-testid="landing-conversion-strip"
      >
        <div
          className="mx-auto max-w-4xl rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
        >
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold sm:text-xl" style={{ color: 'var(--text)' }}>
              {t('landing.conversion.heading')}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {t('landing.conversion.subheading')}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={OPEN_APP_HREF}
              prefetch={false}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-black shadow-lg hover:from-cyan-400 hover:to-blue-400 transition-colors"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: openAppLabel,
                  cta_destination: OPEN_APP_HREF,
                  cta_type: 'primary',
                  source: 'conversion_strip',
                })
              }
              data-testid="landing-conversion-open-app-button"
            >
              {openAppLabel}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
            <Link
              href={CREATE_ACCOUNT_HREF}
              prefetch={false}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: createAccountLabel,
                  cta_destination: CREATE_ACCOUNT_HREF,
                  cta_type: 'secondary',
                  source: 'conversion_strip',
                })
              }
              data-testid="landing-conversion-create-account-button"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              {createAccountLabel}
            </Link>
          </div>
        </div>
      </section>

      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-[#040915]/95 px-3 py-2 backdrop-blur sm:hidden"
        style={{ borderColor: 'var(--border)' }}
        data-testid="landing-mobile-sticky-cta"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Link
            href={OPEN_APP_HREF}
            prefetch={false}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-black"
            onClick={() =>
              trackLandingCtaClick({
                cta_label: openAppLabel,
                cta_destination: OPEN_APP_HREF,
                cta_type: 'primary',
                source: 'mobile_sticky',
              })
            }
            data-testid="landing-mobile-open-app-button"
          >
            {openAppLabel}
          </Link>
          <Link
            href={CREATE_ACCOUNT_HREF}
            prefetch={false}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85"
            onClick={() =>
              trackLandingCtaClick({
                cta_label: createAccountLabel,
                cta_destination: CREATE_ACCOUNT_HREF,
                cta_type: 'secondary',
                source: 'mobile_sticky',
              })
            }
            data-testid="landing-mobile-create-account-button"
          >
            {createAccountLabel}
          </Link>
        </div>
      </div>
    </>
  )
}
