'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ZombieUniverseForumClient } from '@/components/zombie/ZombieUniverseForumClient'

export default function ZombieUniverseForumPage() {
  const params = useParams<{ universeId: string }>()
  const universeId = params?.universeId ?? ''

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={universeId ? `/app/zombie-universe/${encodeURIComponent(universeId)}` : '/app/zombie-universe'}
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Universe
        </Link>
      </div>
      <h1 className="mb-6 text-xl font-bold text-white">Universe Forum</h1>
      {universeId && <ZombieUniverseForumClient universeId={universeId} />}
    </main>
  )
}