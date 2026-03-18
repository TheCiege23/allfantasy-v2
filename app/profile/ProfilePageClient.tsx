"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Settings,
  Pencil,
  X,
  Check,
  Zap,
  Award,
  ChevronRight,
  Upload,
  Trash2,
  MessageCircle,
  Trophy,
  BarChart3,
} from "lucide-react"
import { useSettingsProfile } from "@/hooks/useSettingsProfile"
import { useXPProfile } from "@/hooks/useXPProfile"
import { XPTierBadge } from "@/components/XPTierBadge"
import { AVATAR_PRESETS, AVATAR_PRESET_LABELS, type AvatarPresetId } from "@/lib/signup/avatar-presets"
import { getPreferredSportsOptions } from "@/lib/user-settings"
import { IdentityImageRenderer } from "@/components/identity/IdentityImageRenderer"
import { ProfileImagePreviewController } from "@/components/identity/ProfileImagePreviewController"
import { uploadProfileImage, setProfileAvatarUrl, AVATAR_PRESET_EMOJI } from "@/lib/avatar"
import type { UserProfileForSettings } from "@/lib/user-settings"
import type { PublicProfileDto } from "@/lib/user-settings"

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL", NHL: "NHL", NBA: "NBA", MLB: "MLB",
  NCAAF: "NCAA Football", NCAAB: "NCAA Basketball", SOCCER: "Soccer",
}

export default function ProfilePageClient({
  isOwnProfile: isOwnProfileProp,
  publicUsername,
}: {
  isOwnProfile: boolean
  publicUsername?: string | null
}) {
  const { data: session } = useSession()
  const userId = (session?.user as { id?: string })?.id ?? null

  const { profile, loading, saving, error, updateProfile, fetchProfile } = useSettingsProfile()
  const isOwnProfile =
    isOwnProfileProp ||
    (Boolean(publicUsername) && Boolean(profile?.username === publicUsername))
  const { profile: xpProfile, loading: xpLoading } = useXPProfile(isOwnProfile ? userId : null)

  const [publicProfile, setPublicProfile] = useState<PublicProfileDto | null>(null)
  const [publicLoading, setPublicLoading] = useState(!!publicUsername)

  const loadPublic = useCallback(async () => {
    if (!publicUsername?.trim()) return
    setPublicLoading(true)
    try {
      const res = await fetch(`/api/profile/public?username=${encodeURIComponent(publicUsername)}`, { cache: "no-store" })
      const data = await res.json()
      if (res.ok) setPublicProfile(data)
      else setPublicProfile(null)
    } catch {
      setPublicProfile(null)
    } finally {
      setPublicLoading(false)
    }
  }, [publicUsername])

  useEffect(() => {
    loadPublic()
  }, [loadPublic])

  const displayProfile: UserProfileForSettings | PublicProfileDto | null = isOwnProfile ? profile : publicProfile
  const displayName = displayProfile?.displayName ?? (displayProfile as PublicProfileDto)?.username ?? publicUsername ?? "—"
  const username = (displayProfile as UserProfileForSettings)?.username ?? (displayProfile as PublicProfileDto)?.username ?? publicUsername ?? "—"
  const profileImageUrl = (displayProfile as { profileImageUrl?: string | null })?.profileImageUrl ?? null
  const bio = displayProfile?.bio ?? null
  const preferredSports = displayProfile?.preferredSports ?? null
  const avatarPreset = displayProfile?.avatarPreset ?? null
  const initial = (displayName || username || "?").charAt(0).toUpperCase()

  if (!isOwnProfile && publicUsername) {
    if (publicLoading) {
      return (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border p-8" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading profile…</p>
        </div>
      )
    }
    if (!publicProfile) {
      return (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="font-medium" style={{ color: "var(--text)" }}>Profile not found</p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>@{publicUsername}</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium" style={{ color: "var(--accent-cyan)" }}>Go home</Link>
        </div>
      )
    }
  }

  if (isOwnProfile && loading && !profile) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border p-8" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Identity card */}
      <div
        className="rounded-2xl border p-6 sm:p-8"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <IdentityImageRenderer
              avatarUrl={profileImageUrl}
              avatarPreset={avatarPreset}
              displayName={displayName}
              username={username}
              size="lg"
            />
            <div>
              <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--text)" }}>
                {displayName}
              </h1>
              <p className="text-sm" style={{ color: "var(--muted)" }}>@{username}</p>
              {isOwnProfile && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {xpProfile && (
                    <XPTierBadge
                      tier={xpProfile.currentTier}
                      tierBadgeColor={xpProfile.tierBadgeColor}
                    />
                  )}
                  {xpLoading && (
                    <span className="inline-block h-5 w-10 animate-pulse rounded bg-white/10" />
                  )}
                </div>
              )}
            </div>
          </div>
          {isOwnProfile && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          )}
          {!isOwnProfile && username && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/messages?start=${encodeURIComponent(username)}`}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                style={{ borderColor: "var(--accent-cyan)", color: "var(--accent-cyan-strong)", background: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)" }}
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </Link>
            </div>
          )}
        </div>

        {bio && (
          <div className="mt-6 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{bio}</p>
          </div>
        )}

        {preferredSports && preferredSports.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium" style={{ color: "var(--muted2)" }}>Preferred sports</p>
            <div className="flex flex-wrap gap-2">
              {preferredSports.map((s) => (
                <span
                  key={s}
                  className="rounded-lg border px-3 py-1 text-xs font-medium"
                  style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                >
                  {SPORT_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Your stats: record, rankings, achievements (own profile only) */}
      {isOwnProfile && (
        <ProfileStatsSection />
      )}

      {/* Editable form (own profile only) */}
      {isOwnProfile && profile && (
        <EditableProfileFormController
          profile={profile}
          saving={saving}
          error={error}
          onSave={updateProfile}
          onCancel={() => {}}
          onRefetch={fetchProfile}
        />
      )}

      {/* Achievements / quick links (own profile) */}
      {isOwnProfile && (
        <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
            <Award className="h-4 w-4" />
            Quick links
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/app/home"
              className="flex items-center justify-between rounded-xl border p-4 transition"
              style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
            >
              <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text)" }}>
                <Zap className="h-4 w-4" style={{ color: "var(--accent-cyan)" }} />
                Sports App
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--muted)" }} />
            </Link>
            <Link
              href="/settings"
              className="flex items-center justify-between rounded-xl border p-4 transition"
              style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
            >
              <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text)" }}>
                <Settings className="h-4 w-4" style={{ color: "var(--muted)" }} />
                Profile & settings
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--muted)" }} />
            </Link>
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
            Reputation and Legacy score are shown per league in the Sports App. Open a league to see your standing.
          </p>
        </div>
      )}

      {!isOwnProfile && publicProfile && (
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Viewing public profile. Only shared info is shown.</p>
          <Link
            href={`/messages?start=${encodeURIComponent(username)}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition"
            style={{ borderColor: "var(--accent-cyan)", color: "var(--accent-cyan-strong)", background: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)" }}
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Link>
        </div>
      )}
    </div>
  )
}

function EditableProfileFormController({
  profile,
  saving,
  error,
  onSave,
  onCancel,
  onRefetch,
}: {
  profile: UserProfileForSettings
  saving: boolean
  error: string | null
  onSave: (p: import("@/lib/user-settings").ProfileUpdatePayload) => Promise<boolean>
  onCancel: () => void
  onRefetch: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile.displayName ?? "")
  const [avatarPreset, setAvatarPreset] = useState<string | null>(profile.avatarPreset ?? null)
  const [bio, setBio] = useState(profile.bio ?? "")
  const [preferredSports, setPreferredSports] = useState<string[]>(profile.preferredSports ?? [])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDisplayName(profile.displayName ?? "")
    setAvatarPreset(profile.avatarPreset ?? null)
    setBio(profile.bio ?? "")
    setPreferredSports(profile.preferredSports ?? [])
  }, [profile.displayName, profile.avatarPreset, profile.bio, profile.preferredSports])

  const toggleSport = (code: string) => {
    setPreferredSports((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    const ok = await onSave({
      displayName: displayName.trim() || null,
      avatarPreset: (avatarPreset as AvatarPresetId) || null,
      avatarUrl: avatarPreset ? null : undefined,
      bio: bio.trim() || null,
      preferredSports: preferredSports.length > 0 ? preferredSports : null,
    })
    if (ok) {
      setEditing(false)
      onRefetch()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setPreviewObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setUploadError(null)
    setUploading(true)
    const result = await uploadProfileImage(file)
    setUploading(false)
    setPreviewObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (result.ok) onRefetch()
    else setUploadError(result.error ?? "Upload failed")
  }

  const handleRemoveImage = async () => {
    setUploadError(null)
    const result = await setProfileAvatarUrl(null)
    if (result.ok) onRefetch()
    else setUploadError(result.error ?? "Failed to remove image")
  }

  const handleCancel = () => {
    setPreviewObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setDisplayName(profile.displayName ?? "")
    setAvatarPreset(profile.avatarPreset ?? null)
    setBio(profile.bio ?? "")
    setPreferredSports(profile.preferredSports ?? [])
    setEditing(false)
    onCancel()
  }

  const options = getPreferredSportsOptions()

  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Edit profile</h2>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              form="profile-edit-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                color: "var(--on-accent-bg)",
              }}
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--accent-red)", color: "var(--accent-red-strong)" }}>
          {error}
        </div>
      )}

      {editing && (
        <form id="profile-edit-form" onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Profile image</label>
            <div className="flex flex-wrap items-center gap-4">
              <ProfileImagePreviewController
                previewObjectUrl={previewObjectUrl}
                profileImageUrl={profile.profileImageUrl}
                avatarPreset={avatarPreset}
                displayName={profile.displayName}
                username={profile.username}
                size="lg"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload image"}
                </button>
                {profile.profileImageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--accent-red)", color: "var(--accent-red-strong)" }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove image
                  </button>
                )}
              </div>
            </div>
            {uploadError && (
              <p className="mt-1.5 text-sm" style={{ color: "var(--accent-red-strong)" }}>{uploadError}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Avatar (20 options)</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatarPreset(id)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border text-lg"
                  style={{
                    borderColor: avatarPreset === id ? "var(--accent-cyan)" : "var(--border)",
                    background: avatarPreset === id ? "color-mix(in srgb, var(--accent-cyan) 18%, transparent)" : "var(--panel2)",
                  }}
                  title={AVATAR_PRESET_LABELS[id]}
                >
                  {AVATAR_PRESET_EMOJI[id]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Choose one or upload your own image above.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full max-w-md rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Short bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
              placeholder="A few words about you…"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Preferred sports</label>
            <div className="flex flex-wrap gap-2">
              {options.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleSport(value)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: preferredSports.includes(value) ? "var(--accent-cyan)" : "var(--border)",
                    background: preferredSports.includes(value) ? "color-mix(in srgb, var(--accent-cyan) 18%, transparent)" : "var(--panel2)",
                    color: "var(--text)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

/** Profile stats: record, rankings, achievements (PROMPT 308). */
function ProfileStatsSection() {
  const [stats, setStats] = useState<{
    record: { wins: number; losses: number; ties: number; byLeague: Array<{ leagueName: string; wins: number; losses: number; ties: number; rank?: number }> }
    rankings: Array<{ leagueName: string; season: string; grade: string; rank: number }>
    achievements: Array<{ id: string; name: string; description: string; icon: string; earned: boolean; earnedAt?: string }>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/profile/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.record != null) setStats(data)
        else setStats(null)
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <BarChart3 className="h-4 w-4" />
          Your stats
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    )
  }

  if (!stats) return null

  const { record, rankings, achievements } = stats
  const totalGames = record.wins + record.losses + record.ties
  const earnedCount = achievements.filter((a) => a.earned).length

  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
        <BarChart3 className="h-4 w-4" />
        Your stats
      </h2>

      <div className="grid gap-6 sm:grid-cols-3">
        {/* Record */}
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--muted2)" }}>
            <Trophy className="h-3.5 w-3.5" />
            Record
          </div>
          {totalGames > 0 ? (
            <>
              <p className="mt-2 text-2xl font-bold" style={{ color: "var(--text)" }}>
                {record.wins}-{record.losses}
                {record.ties > 0 ? `-${record.ties}` : ""}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                across {record.byLeague.length} league{record.byLeague.length !== 1 ? "s" : ""}
              </p>
              {record.byLeague.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--muted)" }}>
                  {record.byLeague.slice(0, 3).map((l) => (
                    <li key={l.leagueName}>
                      {l.leagueName}: {l.wins}-{l.losses}
                      {l.ties > 0 ? `-${l.ties}` : ""}
                      {l.rank != null ? ` · #${l.rank}` : ""}
                    </li>
                  ))}
                  {record.byLeague.length > 3 && (
                    <li>+{record.byLeague.length - 3} more</li>
                  )}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Link leagues to see your W-L record.
            </p>
          )}
        </div>

        {/* Rankings (draft grades) */}
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--muted2)" }}>
            <BarChart3 className="h-3.5 w-3.5" />
            Rankings
          </div>
          {rankings.length > 0 ? (
            <>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--text)" }}>
                Draft grades
              </p>
              <ul className="mt-2 space-y-1.5 text-xs" style={{ color: "var(--muted)" }}>
                {rankings.slice(0, 4).map((r, i) => (
                  <li key={`${r.leagueName}-${r.season}-${i}`}>
                    {r.leagueName} ({r.season}): <strong style={{ color: "var(--text)" }}>{r.grade}</strong>
                    {r.rank > 0 ? ` · #${r.rank}` : ""}
                  </li>
                ))}
                {rankings.length > 4 && <li>+{rankings.length - 4} more</li>}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Complete a draft to see grades here.
            </p>
          )}
        </div>

        {/* Achievements */}
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--muted2)" }}>
            <Award className="h-3.5 w-3.5" />
            Achievements
          </div>
          <p className="mt-2 text-2xl font-bold" style={{ color: "var(--text)" }}>
            {earnedCount} / {achievements.length}
          </p>
          <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--muted)" }}>
            {achievements.slice(0, 4).map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <span>{a.icon}</span>
                <span style={{ color: a.earned ? "var(--text)" : "var(--muted)" }}>
                  {a.name}
                  {a.earned ? " ✓" : ""}
                </span>
              </li>
            ))}
            {achievements.length > 4 && <li>+{achievements.length - 4} more</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
