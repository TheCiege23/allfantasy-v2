'use client'

import Link from 'next/link'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import { Users, ArrowRight } from 'lucide-react'
import type { DiscoveryLeaguesPageConfig } from '@/lib/seo-landing/discovery-leagues-pages'

interface DiscoveryLeaguesSeoLandingProps {
  config: DiscoveryLeaguesPageConfig
}

export default function DiscoveryLeaguesSeoLanding({ config }: DiscoveryLeaguesSeoLandingProps) {
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

          <section className="mt-10 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
            <h2 className="text-lg font-semibold mb-2">Browse & join leagues</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              See open public and creator leagues. Filter by format and join before they fill.
            </p>
            <Link
              href={config.discoverHref}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-lg hover:bg-emerald-400 transition-colors"
            >
              <Users className="h-5 w-5 shrink-0" />
              Browse leagues
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-4">More ways to play</h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/discover/leagues"
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--panel)',
                    color: 'var(--text)',
                  }}
                >
                  All sports – discover leagues
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </li>
              <li>
                <Link
                  href="/find-league"
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--panel)',
                    color: 'var(--text)',
                  }}
                >
                  Find a league by invite
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </li>
              <li>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--panel)',
                    color: 'var(--text)',
                  }}
                >
                  Open AllFantasy App
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </article>

      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-3 px-4">
          <Link href="/" className="hover:underline">Home</Link>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <Link href="/discover/leagues" className="hover:underline">Discover Leagues</Link>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <Link href="/app" className="hover:underline">App</Link>
        </div>
      </footer>
    </main>
  )
}
