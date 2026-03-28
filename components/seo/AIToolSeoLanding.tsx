'use client'

import Link from 'next/link'
import Image from 'next/image'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { AppWindow, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { AIToolSeoConfig } from '@/lib/seo-landing/ai-tool-pages'

interface AIToolSeoLandingProps {
  config: AIToolSeoConfig
}

export default function AIToolSeoLanding({ config }: AIToolSeoLandingProps) {
  const { t } = useLanguage()

  return (
    <main
      className="min-h-screen flex flex-col mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <HomeTopNav />

      <article className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {config.headline}
          </h1>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            {config.body}
          </p>

          <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/app"
              className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black shadow-lg hover:bg-emerald-400 transition-colors touch-manipulation"
              data-testid="ai-tool-seo-open-app-hero-cta"
            >
              <AppWindow className="h-5 w-5 shrink-0" />
              {t('aiToolLanding.openApp')}
            </Link>
            <Link
              href={config.openToolHref}
              className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 px-8 py-4 text-base font-semibold transition-colors touch-manipulation"
              style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--panel)' }}
            >
              {config.openToolLabel}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4">{t('aiToolLanding.benefits')}</h2>
            <ul className="space-y-3">
              {config.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" aria-hidden />
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{benefit}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4">{t('aiToolLanding.example')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {config.screenshots.map((shot) => (
                <div
                  key={shot.src + shot.caption}
                  className="overflow-hidden rounded-2xl border"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
                >
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={1280}
                    height={720}
                    className="mode-logo-safe h-40 w-full object-cover"
                  />
                  <div className="px-3 py-2 text-xs" style={{ color: 'var(--muted)' }}>
                    {shot.caption}
                  </div>
                </div>
              ))}
            </div>
            <Link
              href={config.openToolHref}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:underline"
            >
              {t('aiToolLanding.openTool')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="mt-10 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
            <h2 className="text-lg font-semibold mb-2">{t('aiToolLanding.readyTitle')}</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              {t('aiToolLanding.readyBody')}
            </p>
            <Link
              href="/app"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors touch-manipulation"
              data-testid="ai-tool-seo-open-app-final-cta"
            >
              <AppWindow className="h-4 w-4 shrink-0" />
              {t('aiToolLanding.openApp')}
            </Link>
          </section>
        </div>
      </article>

      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-3 px-4">
          <Link href="/" className="hover:underline">{t('aiToolLanding.footer.home')}</Link>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <Link href="/app" className="hover:underline">{t('aiToolLanding.footer.app')}</Link>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <Link href="/tools-hub" className="hover:underline">{t('aiToolLanding.footer.toolsHub')}</Link>
        </div>
      </footer>
    </main>
  )
}
