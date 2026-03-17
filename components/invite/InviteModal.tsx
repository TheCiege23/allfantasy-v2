'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { InviteShareSheet } from './InviteShareSheet'

export interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  inviteType: 'league' | 'bracket' | 'creator_league' | 'referral' | 'reactivation' | 'waitlist'
  targetId?: string | null
  targetLabel?: string
  onGenerated?: (inviteUrl: string, token: string, inviteLinkId: string) => void
}

export function InviteModal({
  isOpen,
  onClose,
  inviteType,
  targetId,
  targetLabel,
  onGenerated,
}: InviteModalProps) {
  const [step, setStep] = useState<'form' | 'share'>('form')
  const [inviteUrl, setInviteUrl] = useState('')
  const [token, setToken] = useState('')
  const [inviteLinkId, setInviteLinkId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = () => {
    setLoading(true)
    setError(null)
    fetch('/api/invite/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: inviteType, targetId: targetId ?? null }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.inviteLink) {
          setInviteUrl(data.inviteLink.inviteUrl)
          setToken(data.inviteLink.token)
          setInviteLinkId(data.inviteLink.id)
          setStep('share')
          onGenerated?.(data.inviteLink.inviteUrl, data.inviteLink.token, data.inviteLink.id)
        } else {
          setError(data.error ?? 'Failed to generate invite')
        }
      })
      .catch(() => setError('Something went wrong'))
      .finally(() => setLoading(false))
  }

  const handleClose = () => {
    setStep('form')
    setInviteUrl('')
    setToken('')
    setInviteLinkId('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-xl"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:opacity-80"
          style={{ color: 'var(--muted)' }}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold mb-2">
          {step === 'form' ? 'Create invite link' : 'Share invite'}
        </h2>
        {targetLabel && (
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            {targetLabel}
          </p>
        )}

        {step === 'form' && (
          <>
            {error && (
              <p className="text-sm mb-3 rounded-lg py-2" style={{ color: 'var(--destructive)' }}>
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="w-full rounded-xl py-3 px-4 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              {loading ? 'Generating…' : 'Generate invite link'}
            </button>
          </>
        )}

        {step === 'share' && inviteUrl && (
          <>
            <InviteShareSheet
              inviteUrl={inviteUrl}
              inviteLinkId={inviteLinkId}
              token={token}
              onShare={() => {}}
            />
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 w-full rounded-lg border py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border)' }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}
