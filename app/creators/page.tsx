import Link from 'next/link'
import { Trophy } from 'lucide-react'
import CreatorsDiscoveryClient from './CreatorsDiscoveryClient'

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
        <CreatorsDiscoveryClient />
      </div>
    </div>
  )
}
