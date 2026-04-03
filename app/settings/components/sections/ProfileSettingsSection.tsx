"use client"

import { useState, useEffect, useRef } from "react"
import { Upload, Trash2 } from "lucide-react"
import { ProfileImagePreviewController } from "@/components/identity/ProfileImagePreviewController"
import { setProfileAvatarUrl, AVATAR_PRESET_EMOJI } from "@/lib/avatar"
import { AVATAR_PRESETS, AVATAR_PRESET_LABELS, type AvatarPresetId } from "@/lib/signup/avatar-presets"
import type { SettingsOnSave, SettingsProfile } from "./settings-types"

export function ProfileSettingsSection({
  profile,
  saving,
  onSave,
  onRefetch,
  uploadLeagueId,
}: {
  profile: SettingsProfile
  saving: boolean
  onSave: SettingsOnSave
  onRefetch: () => void
  uploadLeagueId: string | null
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "")
  const [avatarPreset, setAvatarPreset] = useState<string | null>(profile?.avatarPreset ?? null)
  const [avatarSelectionTouched, setAvatarSelectionTouched] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "")
    setAvatarPreset(profile?.avatarPreset ?? null)
    setAvatarSelectionTouched(false)
  }, [profile?.displayName, profile?.avatarPreset])

  const resetDraft = () => {
    setDisplayName(profile?.displayName ?? "")
    setAvatarPreset(profile?.avatarPreset ?? null)
    setAvatarSelectionTouched(false)
    setUploadError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    await onSave({
      displayName: displayName.trim() || null,
      avatarPreset: (avatarPreset as AvatarPresetId) || null,
      avatarUrl: avatarSelectionTouched ? null : undefined,
    })
  }

  const persistAvatarFromUpload = async (
    file: File
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", "image")
    if (uploadLeagueId) {
      fd.append("leagueId", uploadLeagueId)
    } else {
      fd.append("purpose", "profile")
    }
    const res = await fetch("/api/chat/upload", { method: "POST", body: fd })
    const data = (await res.json()) as { url?: string; error?: string }
    if (!res.ok) return { ok: false, error: data.error ?? "Upload failed" }
    if (!data.url) return { ok: false, error: "No file URL returned" }
    const patch = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: data.url, avatarPreset: null }),
    })
    if (!patch.ok) {
      const err = (await patch.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: err.error ?? "Could not save avatar" }
    }
    return { ok: true }
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
    const result = await persistAvatarFromUpload(file)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Profile</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          How you appear across AllFantasy.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ProfileImagePreviewController
          previewObjectUrl={previewObjectUrl}
          profileImageUrl={profile?.profileImageUrl}
          avatarPreset={avatarPreset}
          displayName={profile?.displayName}
          username={profile?.username}
          size="md"
        />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{profile?.username ?? "—"}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Username (read-only)</p>
          <div className="mt-2 flex flex-wrap gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            {profile?.profileImageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: "var(--accent-red)", color: "var(--accent-red-strong)" }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          {uploadError && (
            <p className="mt-1 text-xs" style={{ color: "var(--accent-red-strong)" }}>{uploadError}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Avatar (20 options)</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAvatarPreset(null)
              setAvatarSelectionTouched(true)
            }}
            className="flex h-9 min-w-14 items-center justify-center rounded-lg border px-2 text-[11px] font-semibold"
            style={{
              borderColor: avatarPreset == null ? "var(--accent-cyan)" : "var(--border)",
              background: avatarPreset == null ? "color-mix(in srgb, var(--accent-cyan) 18%, transparent)" : "var(--panel2)",
              color: "var(--text)",
            }}
            title="Use initial"
          >
            Initial
          </button>
          {AVATAR_PRESETS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setAvatarPreset(id)
                setAvatarSelectionTouched(true)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border text-base"
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

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            color: "var(--on-accent-bg)",
          }}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        <button
          type="button"
          onClick={resetDraft}
          className="rounded-xl border px-4 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Cancel changes
        </button>
      </div>
    </form>
  )
}
