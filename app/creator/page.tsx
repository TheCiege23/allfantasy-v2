'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  CreatorBrandingEditor,
  CreatorCommunityPreview,
  CreatorProfileHeader,
  CreatorStatsPanel,
  CreatorToolsPanel,
} from '@/components/creator-system'
import type {
  CreatorAnalyticsSummaryDto,
  CreatorLeagueDto,
  CreatorProfileDto,
} from '@/lib/creator-system/types'

type CreatorProfileForm = {
  handle: string
  displayName: string
  creatorType: string
  bio: string
  communitySummary: string
  websiteUrl: string
  visibility: 'public' | 'unlisted' | 'private'
  communityVisibility: 'public' | 'unlisted' | 'private'
}

function emptyProfileForm(): CreatorProfileForm {
  return {
    handle: '',
    displayName: '',
    creatorType: 'analyst',
    bio: '',
    communitySummary: '',
    websiteUrl: '',
    visibility: 'public',
    communityVisibility: 'public',
  }
}

export default function CreatorDashboardPage() {
  const { data: session, status } = useSession()
  const [creator, setCreator] = useState<CreatorProfileDto | null>(null)
  const [leagues, setLeagues] = useState<CreatorLeagueDto[]>([])
  const [analytics, setAnalytics] = useState<CreatorAnalyticsSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [form, setForm] = useState<CreatorProfileForm>(emptyProfileForm())

  const fetchMe = useCallback(() => {
    if (!session?.user?.id) return
    setLoading(true)
    fetch('/api/creators/me')
      .then((response) => (response.ok ? response.json() : { creator: null, leagues: [] }))
      .then((payload: { creator: (CreatorProfileDto & { isOwner?: boolean }) | null; leagues: CreatorLeagueDto[] }) => {
        setCreator(payload.creator ?? null)
        setLeagues(payload.leagues ?? [])
      })
      .catch(() => {
        setCreator(null)
        setLeagues([])
      })
      .finally(() => setLoading(false))
  }, [session?.user?.id])

  const fetchAnalytics = useCallback((slug: string) => {
    fetch(`/api/creators/${encodeURIComponent(slug)}/analytics?period=30`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setAnalytics(payload))
      .catch(() => setAnalytics(null))
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  useEffect(() => {
    if (!creator) {
      setForm(emptyProfileForm())
      setAnalytics(null)
      return
    }

    setForm({
      handle: creator.handle,
      displayName: creator.displayName || '',
      creatorType: creator.creatorType || 'analyst',
      bio: creator.bio || '',
      communitySummary: creator.communitySummary || '',
      websiteUrl: creator.websiteUrl || '',
      visibility: creator.visibility,
      communityVisibility: creator.communityVisibility,
    })
    fetchAnalytics(creator.slug)
  }, [creator, fetchAnalytics])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setStatusMessage(null)
    try {
      const response = await fetch('/api/creators/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setStatusMessage(payload.error || 'Unable to save creator profile')
        return
      }
      setStatusMessage(creator ? 'Creator profile updated' : 'Creator profile created')
      fetchMe()
    } catch {
      setStatusMessage('Network error while saving creator profile')
    } finally {
      setSavingProfile(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading creator tools...
      </div>
    )
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen mode-surface mode-readable">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            Creator League System
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
            Sign in to launch branded creator leagues, private community rooms, and bracket challenges inside AllFantasy.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
              Creator dashboard
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Build branded communities, grow followers, launch public leagues, and publish recap-driven competition pages.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/creators"
              className="rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Creator discovery
            </Link>
            <Link
              href="/app/leagues"
              className="rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              League hub
            </Link>
          </div>
        </div>

        {creator ? (
          <div className="space-y-6">
            <CreatorProfileHeader creator={creator} isOwner />

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <section
                  className="rounded-[32px] border p-5"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'color-mix(in srgb, var(--panel) 78%, transparent)',
                  }}
                >
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                    Creator profile settings
                  </h2>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Handle</span>
                      <input
                        type="text"
                        value={form.handle}
                        onChange={(event) => setForm((current) => ({ ...current, handle: event.target.value }))}
                        className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Display name</span>
                      <input
                        type="text"
                        value={form.displayName}
                        onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                        className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Creator type</span>
                      <input
                        type="text"
                        value={form.creatorType}
                        onChange={(event) => setForm((current) => ({ ...current, creatorType: event.target.value }))}
                        className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Website</span>
                      <input
                        type="url"
                        value={form.websiteUrl}
                        onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
                        className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Bio</span>
                      <textarea
                        value={form.bio}
                        onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                        rows={3}
                        className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Community summary</span>
                      <textarea
                        value={form.communitySummary}
                        onChange={(event) => setForm((current) => ({ ...current, communitySummary: event.target.value }))}
                        rows={3}
                        className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Profile visibility</span>
                      <select
                        value={form.visibility}
                        onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as CreatorProfileForm['visibility'] }))}
                        className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="public">Public</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="private">Private</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Community visibility</span>
                      <select
                        value={form.communityVisibility}
                        onChange={(event) => setForm((current) => ({ ...current, communityVisibility: event.target.value as CreatorProfileForm['communityVisibility'] }))}
                        className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="public">Public</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="private">Private</option>
                      </select>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={handleSaveProfile}
                    className="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                    style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                  >
                    {savingProfile ? 'Saving...' : 'Save profile'}
                  </button>
                </section>

                <CreatorToolsPanel
                  creator={creator}
                  leagues={leagues}
                  baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
                  onChanged={() => {
                    fetchMe()
                    fetchAnalytics(creator.slug)
                  }}
                />
              </div>

              <div className="space-y-6">
                <CreatorStatsPanel
                  followerCount={analytics?.followCount ?? creator.followerCount ?? 0}
                  leagueCount={creator.leagueCount ?? leagues.length}
                  profileViews={analytics?.profileViews ?? 0}
                  inviteShares={analytics?.inviteShares ?? 0}
                  leagueJoins={analytics?.leagueJoins ?? 0}
                  leagueMembers={analytics?.leagueMembers ?? creator.totalLeagueMembers ?? 0}
                  conversionRate={analytics?.conversionRate ?? 0}
                  topShareChannel={analytics?.topShareChannel ?? null}
                  period={analytics?.period ?? '30d'}
                />

                <CreatorBrandingEditor
                  initialBranding={creator.branding}
                  creatorIdOrSlug={creator.slug}
                  onSaved={() => fetchMe()}
                />

                <CreatorCommunityPreview leagues={leagues.filter((league) => league.isPublic)} creatorSlug={creator.slug} />
              </div>
            </div>
          </div>
        ) : (
          <section
            className="rounded-[32px] border p-6"
            style={{
              borderColor: 'var(--border)',
              background: 'color-mix(in srgb, var(--panel) 78%, transparent)',
            }}
          >
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Launch your creator identity
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Set up a branded creator profile first, then start launching public leagues, invite links, and community rooms.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Handle</span>
                <input
                  data-testid="creator-profile-handle"
                  type="text"
                  value={form.handle}
                  onChange={(event) => setForm((current) => ({ ...current, handle: event.target.value }))}
                  className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Display name</span>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                  className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Creator type</span>
                <input
                  type="text"
                  value={form.creatorType}
                  onChange={(event) => setForm((current) => ({ ...current, creatorType: event.target.value }))}
                  className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Website</span>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
                  className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Profile visibility</span>
                <select
                  value={form.visibility}
                  onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as CreatorProfileForm['visibility'] }))}
                  className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Community visibility</span>
                <select
                  value={form.communityVisibility}
                  onChange={(event) => setForm((current) => ({ ...current, communityVisibility: event.target.value as CreatorProfileForm['communityVisibility'] }))}
                  className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label className="block lg:col-span-2">
                <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Bio</span>
                <textarea
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </label>
              <label className="block lg:col-span-2">
                <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Community summary</span>
                <textarea
                  value={form.communitySummary}
                  onChange={(event) => setForm((current) => ({ ...current, communitySummary: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border px-4 py-3 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </label>
            </div>

            <button
              type="button"
              disabled={savingProfile}
              onClick={handleSaveProfile}
              data-testid="creator-profile-create-button"
              className="mt-5 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              {savingProfile ? 'Creating...' : 'Create creator profile'}
            </button>
          </section>
        )}

        {statusMessage && (
          <p className="mt-4 text-sm" style={{ color: statusMessage.includes('error') ? 'var(--destructive)' : 'var(--text)' }}>
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  )
}
