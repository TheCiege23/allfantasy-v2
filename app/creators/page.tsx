import Link from 'next/link'
import { Trophy } from 'lucide-react'
import CreatorsDiscoveryClient from './CreatorsDiscoveryClient'
import CreatorsLeaderboardClient from './CreatorsLeaderboardClient'

export const dynamic = 'force-dynamic'

export default function CreatorsPage() {
  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Creator leagues
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Join leagues hosted by creators, influencers, and analysts. Follow your favorites and get invite links.
          </p>
        </div>
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Discover creators
          </h2>
          <CreatorsDiscoveryClient />
        </section>
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Creator leaderboard
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Ranked by community growth and public league participation.
          </p>
          <CreatorsLeaderboardClient />
        </section>
      </div>
    </div>
  )
}
