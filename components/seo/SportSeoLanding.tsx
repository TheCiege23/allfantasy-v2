'use client'

import Link from 'next/link'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import { AppWindow, ArrowRight } from 'lucide-react'
import type { SportSeoPageConfig } from '@/lib/seo-landing/sport-pages'

interface SportSeoLandingProps {
  config: SportSeoPageConfig
}

export default function SportSeoLanding({ config }: SportSeoLandingProps) {
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
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            {config.body}
          </p>

          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Tools available</h2>
            <ul className="space-y-2">
              {config.toolHrefs.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--panel)',
                      color: 'var(--text)',
                    }}
                  >
                    {label}
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
            <h2 className="text-lg font-semibold mb-2">Open AllFantasy App</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Leagues, drafts, waivers, trade analyzer, and more—all in one place.
            </p>
            <Link
              href="/app"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-lg hover:bg-emerald-400 transition-colors"
            >
              <AppWindow className="h-5 w-5 shrink-0" />
              Open AllFantasy App
            </Link>
          </section>
        </div>
      </article>

      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-3 px-4">
          <Link href="/" className="hover:underline">Home</Link>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <Link href="/app" className="hover:underline">App</Link>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <Link href="/tools-hub" className="hover:underline">Tools Hub</Link>
        </div>
      </footer>
    </main>
  )
}
