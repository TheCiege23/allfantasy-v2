'use client'

import { useRouter } from 'next/navigation'
import { CreateLeagueV2Client } from '@/app/create-league/v2/CreateLeagueV2Client'

/**
 * Primary "Create league" route — universal 4-step flow supporting all 13 league types.
 * Delegates to the v2 client which routes to the correct API endpoint per league type.
 */
export function CreateLeaguePageClient({ userId }: { userId: string }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))] text-white">
      <header className="px-4 pb-2 pt-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Back to app"
          >
            ←
          </button>
          <h1 className="text-base font-semibold tracking-tight text-white/90 sm:text-lg">New league</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/import?returnTo=%2Fcreate-league')}
              className="inline-flex h-9 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
              aria-label="Open import page"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-black/20 px-3 text-xs font-semibold text-white/90 hover:bg-white/10"
              aria-label="Go to dashboard home"
            >
              Home
            </button>
          </div>
        </div>
      </header>
      <CreateLeagueV2Client userId={userId} />
    </div>
  )
}
