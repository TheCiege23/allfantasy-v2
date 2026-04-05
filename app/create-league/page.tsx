'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CreateLeagueView } from '@/components/league-creation'

function CreateLeagueContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const initialTemplateId = searchParams.get('template') ?? undefined
  const e2eAuth = searchParams.get('e2eAuth')
  const allowE2EBypass =
    process.env.NODE_ENV !== 'production' && e2eAuth === '1'

  const userId = session?.user?.id ?? (allowE2EBypass ? 'e2e-user' : undefined)

  useEffect(() => {
    if (status === 'loading') return
    if (!userId) {
      router.replace('/login?callbackUrl=/create-league')
    }
  }, [status, userId, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))] text-white">
        <div className="flex min-h-screen items-center justify-center px-4 text-sm text-white/60">Loading…</div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))] text-white">
        <div className="flex min-h-screen items-center justify-center px-4 text-sm text-white/60">Redirecting…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))] text-white">
      <header className="px-4 pb-2 pt-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            href="/app"
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

export default function CreateLeaguePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))] text-white">
          <div className="flex min-h-screen items-center justify-center px-4 text-sm text-white/60">Loading…</div>
        </div>
      }
    >
      <CreateLeagueContent />
    </Suspense>
  )
}
