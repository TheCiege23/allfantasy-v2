'use client'

import { useState, useCallback, useEffect } from 'react'
import type { LeagueVisibility } from '@/lib/league-privacy'

type PrivacySettings = {
  visibility: LeagueVisibility
  allowInviteLink: boolean
  allowEmailInvite: boolean
  allowUsernameInvite: boolean
  inviteCode: string | null
  inviteLink: string | null
  isCommissioner?: boolean
}

const VISIBILITY_OPTS: { value: LeagueVisibility; label: string }[] = [
  { value: 'public', label: 'Public — discoverable, anyone can request to join' },
  { value: 'private', label: 'Private — only people you invite' },
  { value: 'invite_only', label: 'Invite only — join only via invite link or invite' },
  { value: 'password_protected', label: 'Password protected — anyone with link and password can join' },
]

export default function LeaguePrivacyAndInvitesPanel({ leagueId }: { leagueId: string }) {
  const [data, setData] = useState<PrivacySettings | null>(null)
  const [loading, setLoading] = useState(!!leagueId)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [inviteRegenerating, setInviteRegenerating] = useState(false)

  const load = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/privacy`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed to load privacy settings')
        setData(null)
        return
      }
      setData(json)
    } catch {
      setError('Failed to load privacy settings')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = useCallback(async () => {
    if (!leagueId || !data?.isCommissioner) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const body: Record<string, unknown> = {
        visibility: data.visibility,
        allowInviteLink: data.allowInviteLink,
        allowEmailInvite: data.allowEmailInvite,
        allowUsernameInvite: data.allowUsernameInvite,
      }
      if (data.visibility === 'password_protected' && newPassword) body.password = newPassword
      if (data.visibility !== 'password_protected') body.password = null
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed to save')
        return
      }
      setData((prev) => (prev ? { ...prev, ...json } : null))
      setNewPassword('')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [leagueId, data, newPassword])

  const regenerateInvite = useCallback(async () => {
    if (!leagueId || !data?.isCommissioner) return
    setInviteRegenerating(true)
    try {
      const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setData((prev) => (prev ? { ...prev, inviteCode: json.inviteCode, inviteLink: json.joinUrl ?? json.inviteLink } : null))
    } finally {
      setInviteRegenerating(false)
    }
  }, [leagueId, data?.isCommissioner])

  const copyInviteLink = useCallback(() => {
    const url = data?.inviteLink || (data?.inviteCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${encodeURIComponent(data.inviteCode)}` : '')
    if (url) navigator.clipboard.writeText(url).catch(() => {})
  }, [data?.inviteLink, data?.inviteCode])

  const setField = useCallback(<K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : null))
  }, [])

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Privacy & invitations</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to manage access and invites.</p>
      </section>
    )
  }

  if (loading && !data) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Privacy & invitations</h3>
        <p className="mt-2 text-xs text-white/65">Loading…</p>
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Privacy & invitations</h3>
        <p className="mt-2 text-xs text-red-400/90">{error}</p>
      </section>
    )
  }

  const isCommissioner = data?.isCommissioner ?? false
  const joinUrl = data?.inviteLink || (data?.inviteCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${encodeURIComponent(data.inviteCode!)}` : null)

  return (
    <section className="space-y-6 rounded-xl border border-white/10 bg-black/20 p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Privacy & invitations</h3>
        <p className="mt-1 text-xs text-white/65">
          Control who can see and join your league. Invite link, email invite, and username invite are available when enabled.
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">League access</h4>
        <div className="mt-2">
          <select
            value={data?.visibility ?? 'private'}
            onChange={(e) => setField('visibility', e.target.value as LeagueVisibility)}
            disabled={!isCommissioner}
            className="w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
          >
            {VISIBILITY_OPTS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {(data?.visibility ?? 'private') === 'password_protected' && isCommissioner && (
          <div className="mt-3">
            <label className="block text-xs text-white/70">League password (leave blank to keep current)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="mt-1 w-full max-w-xs rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">Invitation methods</h4>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/90">
            <input
              type="checkbox"
              checked={data?.allowInviteLink ?? true}
              onChange={(e) => setField('allowInviteLink', e.target.checked)}
              disabled={!isCommissioner}
              className="rounded border-white/20"
            />
            Invite link — share a link to join
          </label>
          <label className="flex items-center gap-2 text-sm text-white/90">
            <input
              type="checkbox"
              checked={data?.allowEmailInvite ?? false}
              onChange={(e) => setField('allowEmailInvite', e.target.checked)}
              disabled={!isCommissioner}
              className="rounded border-white/20"
            />
            Email invite — send invites by email
          </label>
          <label className="flex items-center gap-2 text-sm text-white/90">
            <input
              type="checkbox"
              checked={data?.allowUsernameInvite ?? false}
              onChange={(e) => setField('allowUsernameInvite', e.target.checked)}
              disabled={!isCommissioner}
              className="rounded border-white/20"
            />
            Username invite — invite by platform username
          </label>
        </div>
      </div>

      {(data?.allowInviteLink || data?.inviteCode) && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">Invite link</h4>
          <p className="mt-1 text-xs text-white/50">Share this link so others can join. Regenerating invalidates the previous link.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={joinUrl ?? ''}
              className="min-w-0 flex-1 rounded border border-white/20 bg-black/40 px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={copyInviteLink}
              className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/90 hover:bg-white/10"
            >
              Copy link
            </button>
            {isCommissioner && (
              <button
                type="button"
                onClick={regenerateInvite}
                disabled={inviteRegenerating}
                className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {inviteRegenerating ? 'Regenerating…' : 'Regenerate'}
              </button>
            )}
          </div>
        </div>
      )}

      {isCommissioner && (
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save privacy & invites'}
          </button>
          {saveSuccess && <span className="text-xs text-emerald-400">Saved.</span>}
        </div>
      )}
    </section>
  )
}
