'use client'

import Link from 'next/link'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import { AppWindow, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { AIToolSeoConfig } from '@/lib/seo-landing/ai-tool-pages'

interface AIToolSeoLandingProps {
  config: AIToolSeoConfig
}

export default function AIToolSeoLanding({ config }: AIToolSeoLandingProps) {
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
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-lg hover:bg-emerald-400 transition-colors"
            >
              <AppWindow className="h-5 w-5 shrink-0" />
              Open AllFantasy App
            </Link>
            <Link
              href={config.openToolHref}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-semibold transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--panel)' }}
            >
              {config.openToolLabel}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4">Benefits</h2>
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
            <h2 className="text-lg font-semibold mb-4">Example</h2>
            <div
              className="rounded-2xl border-2 border-dashed p-8 text-center"
              style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 50%, transparent)' }}
            >
              <p className="text-sm" style={{ color: 'var(--muted2)' }}>
                Example screenshot — use the app to see {config.headline} in action.
              </p>
              <Link
                href={config.openToolHref}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:underline"
              >
                Open tool
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="mt-10 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
            <h2 className="text-lg font-semibold mb-2">Ready to use AllFantasy?</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Open the AllFantasy Sports App to access this tool plus leagues, drafts, waivers, and more.
            </p>
            <Link
              href="/app"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
            >
              <AppWindow className="h-4 w-4 shrink-0" />
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
