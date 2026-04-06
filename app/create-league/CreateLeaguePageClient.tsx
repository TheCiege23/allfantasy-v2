'use client'

import Link from 'next/link'
import { CreateLeagueView } from '@/components/league-creation'

export interface CreateLeaguePageClientProps {
  userId: string
  initialTemplateId?: string
}

/**
 * Client UI for create league — auth is handled by the server `page.tsx` so we never
 * block on `useSession()` staying in the `loading` state.
 */
export function CreateLeaguePageClient({ userId, initialTemplateId }: CreateLeaguePageClientProps) {
  return (
    <div className="min-h-screen bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))] text-white">
      <header className="px-4 pb-2 pt-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Back"
          >
            ←
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Create league</h1>
          <span className="h-9 w-9" />
        </div>
      </header>
      <CreateLeagueView userId={userId} initialTemplateId={initialTemplateId} />
    </div>
  )
}
