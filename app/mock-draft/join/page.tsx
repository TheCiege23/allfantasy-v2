'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, Users } from 'lucide-react'

export default function MockDraftJoinPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [draft, setDraft] = useState<{
    id: string
    status: string
    settings: { sport: string; numTeams: number; draftType: string }
    inviteLink: string | null
  } | null>(null)
  const [loading, setLoading] = useState(!!token)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDraft = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mock-draft/join?token=${encodeURIComponent(token)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Invalid invite')
        setDraft(null)
        return
      }
      setDraft(data.draft)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchDraft()
  }, [fetchDraft])

  const handleJoin = async () => {
    if (!token) return
    setJoining(true)
    setError(null)
    try {
      const res = await fetch('/api/mock-draft/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not join')
        return
      }
      setJoined(data.joined)
      if (data.draft) setDraft(data.draft)
      if (data.draft?.id) {
        router.replace(`/mock-draft?draftId=${data.draft.id}`)
      }
    } finally {
      setJoining(false)
    }
  }

  if (!token) {
    return (
      <div className="container mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-white/70">No invite token. Use a link shared by the mock draft host.</p>
        <Link href="/mock-draft" className="mt-4 inline-block text-cyan-400 hover:underline">
          Go to Mock Drafts
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (error && !draft) {
    return (
      <div className="container mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-red-400">{error}</p>
        <Link href="/mock-draft" className="mt-4 inline-block text-cyan-400 hover:underline">
          Go to Mock Drafts
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-white/12 bg-black/25 p-6 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-cyan-400" />
        <h1 className="mb-2 text-xl font-semibold text-white">
          {draft?.settings?.sport ?? 'Mock'} Mock Draft
        </h1>
        <p className="mb-4 text-sm text-white/60">
          {draft?.settings?.numTeams ?? 12}-team · {draft?.settings?.draftType ?? 'snake'}
        </p>
        {draft?.status !== 'pre_draft' && (
          <p className="mb-4 text-amber-400">This draft has already started.</p>
        )}
        {joined && (
          <p className="mb-4 text-green-400">You joined. Redirecting...</p>
        )}
        {draft?.status === 'pre_draft' && !joined && (
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="bg-cyan-600 text-white hover:bg-cyan-500"
          >
            {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Join mock draft
          </Button>
        )}
        {draft?.id && (
          <Link
            href={`/mock-draft?draftId=${draft.id}`}
            className="mt-4 inline-block text-sm text-cyan-400 hover:underline"
          >
            Open draft room
          </Link>
        )}
      </div>
    </div>
  )
}
