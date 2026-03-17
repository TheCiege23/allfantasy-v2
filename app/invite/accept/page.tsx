'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Preview {
  inviteType: string
  token: string
  title: string
  description: string | null
  targetId: string | null
  targetName: string | null
  sport: string | null
  memberCount: number | null
  maxMembers: number | null
  isFull: boolean
  expired: boolean
  status: string
}

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const code = searchParams?.get('code')?.trim()

  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; targetId?: string; inviteType?: string; error?: string } | null>(null)

  const loadPreview = useCallback(() => {
    if (!code) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/invite/preview?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.preview) setPreview(data.preview)
        else setPreview(null)
      })
      .catch(() => setPreview(null))
      .finally(() => setLoading(false))
  }, [code])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const handleAccept = () => {
    if (!code) return
    setAccepting(true)
    setResult(null)
    fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setResult({ ok: true, targetId: data.targetId, inviteType: data.inviteType })
          if (data.inviteType === 'bracket' && data.targetId) {
            window.location.href = `/brackets/leagues/${data.targetId}`
            return
          }
          if (data.inviteType === 'creator_league' && data.targetId) {
            window.location.href = `/creator/leagues/${data.targetId}`
            return
          }
        } else {
          setResult({ ok: false, error: data.error ?? 'Could not accept' })
        }
      })
      .catch(() => setResult({ ok: false, error: 'Something went wrong' }))
      .finally(() => setAccepting(false))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading invite…
      </div>
    )
  }

  if (!code) {
    return (
      <div className="min-h-screen mode-surface mode-readable flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            No invite code provided. Use a link from an invite.
          </p>
          <Link href="/" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Go home
          </Link>
        </div>
      </div>
    )
  }

  if (!preview || preview.status === 'invalid') {
    return (
      <div className="min-h-screen mode-surface mode-readable flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
            Invalid or expired invite
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            This invite link is not valid or has expired.
          </p>
          <Link href="/" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Go home
          </Link>
        </div>
      </div>
    )
  }

  const isExpired = preview.expired || preview.status === 'expired'
  const isFull = preview.status === 'full' || preview.isFull
  const alreadyMember = preview.status === 'already_member'
  const canAccept = !isExpired && !isFull && !alreadyMember

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div
          className="rounded-2xl border p-6 mb-6"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 60%, transparent)' }}
        >
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
            {preview.title}
          </h1>
          {preview.targetName && (
            <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
              {preview.targetName}
              {preview.sport ? ` · ${preview.sport}` : ''}
            </p>
          )}
          {preview.memberCount != null && preview.maxMembers != null && (
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
              {preview.memberCount} / {preview.maxMembers} members
            </p>
          )}

          {isExpired && (
            <p className="text-sm py-2 rounded-lg mb-4" style={{ color: 'var(--destructive)', background: 'color-mix(in srgb, var(--destructive) 15%, transparent)' }}>
              This invite has expired.
            </p>
          )}
          {isFull && !isExpired && (
            <p className="text-sm py-2 rounded-lg mb-4" style={{ color: 'var(--destructive)', background: 'color-mix(in srgb, var(--destructive) 15%, transparent)' }}>
              This league is full.
            </p>
          )}
          {alreadyMember && (
            <p className="text-sm py-2 rounded-lg mb-4" style={{ color: 'var(--muted)' }}>
              You’re already a member.
            </p>
          )}

          {canAccept && (
            <button
              type="button"
              disabled={accepting}
              onClick={handleAccept}
              className="w-full rounded-xl py-3 px-4 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              {accepting ? 'Joining…' : 'Accept invite'}
            </button>
          )}
        </div>

        {result && (
          <div
            className="rounded-xl border p-4 mb-4"
            style={{
              borderColor: result.ok ? 'var(--accent)' : 'var(--destructive)',
              background: result.ok ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'color-mix(in srgb, var(--destructive) 15%, transparent)',
            }}
          >
            {result.ok ? (
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                You’re in! Redirecting…
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--destructive)' }}>
                {result.error}
              </p>
            )}
          </div>
        )}

        <p className="text-center">
          <Link href="/" className="text-sm" style={{ color: 'var(--muted)' }}>
            Back to AllFantasy
          </Link>
        </p>
      </div>
    </div>
  )
}
