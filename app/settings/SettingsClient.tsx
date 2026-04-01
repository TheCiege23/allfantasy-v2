"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  User,
  Sliders,
  Shield,
  Bell,
  Link2,
  Archive,
  FileText,
  AlertTriangle,
  Upload,
  Trash2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Gift,
} from "lucide-react"
import { ReferralSection } from "@/components/settings/ReferralSection"
import { useSettingsProfile } from "@/hooks/useSettingsProfile"
import { AVATAR_PRESETS, AVATAR_PRESET_LABELS, type AvatarPresetId } from "@/lib/signup/avatar-presets"
import { IdentityImageRenderer } from "@/components/identity/IdentityImageRenderer"
import { ProfileImagePreviewController } from "@/components/identity/ProfileImagePreviewController"
import { uploadProfileImage, setProfileAvatarUrl, AVATAR_PRESET_EMOJI } from "@/lib/avatar"
import { SIGNUP_TIMEZONES } from "@/lib/signup/timezones"
import { useThemeMode } from "@/components/theme/ThemeProvider"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import { signIn, signOut } from "next-auth/react"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import { formatInTimezone } from "@/lib/preferences/TimezoneFormattingResolver"
import {
  getSecurityStatus,
  getContactSummary,
  updateContactEmail,
  startPhoneVerification,
  checkPhoneCode,
  sendVerificationEmail,
  changePassword,
} from "@/lib/security-settings"
import {
  getConnectedAccounts,
  disconnectConnectedAccount,
  getProviderConnectAction,
  getFallbackViewMessage,
  canDisconnectProvider,
  getDisconnectBlockedMessage,
  type SignInProviderId,
  type ProviderStatus,
} from "@/lib/connected-accounts"
import {
  refreshLegacyImportStatus,
  LEGACY_PROVIDER_IDS,
  getLegacyProviderName,
  getImportStatusLabel,
  getProviderStatus,
  getLegacyProviderPrimaryAction,
  getLegacyProviderHelpHref,
  isImportStatusActive,
  type LegacyImportStatusResponse,
} from "@/lib/legacy-import-settings"
import { ConnectedIdentityRenderer } from "@/components/connected-accounts/ConnectedIdentityRenderer"
import {
  resolveNotificationPreferences,
  getNotificationPreferencesFingerprint,
  getDefaultNotificationPreferences,
  getDeliveryMethodAvailability,
  updateNotificationPreferences,
  sendTestNotification,
  NOTIFICATION_CATEGORY_IDS,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationPreferences,
  type NotificationCategoryId,
} from "@/lib/notification-settings"
import { NotificationCategoryRenderer } from "@/components/notification-settings/NotificationCategoryRenderer"
import { EmptyStateRenderer, ErrorStateRenderer, LoadingStateRenderer } from "@/components/ui-states"
import { resolveNoResultsState, resolveRecoveryActions } from "@/lib/ui-state"

type TabId =
  | "profile"
  | "preferences"
  | "security"
  | "notifications"
  | "connected"
  | "referral"
  | "legacy"
  | "legal"
  | "account"

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: Sliders },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "connected", label: "Connected Accounts", icon: Link2 },
  { id: "referral", label: "Referrals", icon: Gift },
  { id: "legacy", label: "Legacy Import", icon: Archive },
  { id: "legal", label: "Legal & Agreements", icon: FileText },
  { id: "account", label: "Account", icon: AlertTriangle },
]

function isTabId(value: string | null | undefined): value is TabId {
  return TABS.some((tab) => tab.id === value)
}

export default function SettingsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tabFromQuery = searchParams?.get("tab")
  const initialTab = isTabId(tabFromQuery) ? tabFromQuery : "profile"
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const { profile, loading, saving, error, updateProfile, fetchProfile } = useSettingsProfile()

  useEffect(() => {
    if (!isTabId(tabFromQuery)) return
    if (tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery)
    }
  }, [tabFromQuery, activeTab])

  const handleTabSelect = (tabId: TabId) => {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    params.set("tab", tabId)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  if (loading && !profile) {
    return (
      <LoadingStateRenderer label="Loading settings..." testId="settings-loading-state" />
    )
  }

  if (!loading && !profile) {
    return (
      <ErrorStateRenderer
        title="Unable to load settings"
        message={error ?? "Settings are currently unavailable. Retry to recover your profile state."}
        onRetry={() => void fetchProfile()}
        actions={resolveRecoveryActions("settings").map((action) => ({
          id: action.id,
          label: action.label,
          href: action.href,
        }))}
        testId="settings-error-state"
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav
        className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b pb-2 md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-4"
        style={{ borderColor: "var(--border)" }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabSelect(tab.id)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap"
              style={{
                color: active ? "var(--text)" : "var(--muted2)",
                background: active ? "color-mix(in srgb, var(--panel2) 84%, transparent)" : "transparent",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <section className="min-w-0 flex-1 rounded-2xl border p-4 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        {error && (
          <div className="mb-4">
            <ErrorStateRenderer
              compact
              title="Some settings did not refresh"
              message={error}
              onRetry={() => void fetchProfile()}
              testId="settings-inline-error-state"
            />
          </div>
        )}
        {activeTab === "profile" && <ProfileSection profile={profile} saving={saving} onSave={updateProfile} onRefetch={fetchProfile} />}
        {activeTab === "preferences" && <PreferencesSection profile={profile} saving={saving} onSave={updateProfile} />}
        {activeTab === "security" && <SecuritySection profile={profile} onRefetch={fetchProfile} />}
        {activeTab === "notifications" && <NotificationsSection profile={profile} onRefetch={fetchProfile} />}
        {activeTab === "connected" && <ConnectedAccountsSection profile={profile} onRefetchProfile={fetchProfile} />}
        {activeTab === "referral" && <ReferralSection />}
        {activeTab === "legacy" && <LegacyImportSection />}
        {activeTab === "legal" && <LegalSection profile={profile} />}
        {activeTab === "account" && <AccountSection />}
      </section>
    </div>
  )
}

function ProfileSection({
  profile,
  saving,
  onSave,
  onRefetch,
}: {
  profile: ReturnType<typeof useSettingsProfile>["profile"]
  saving: boolean
  onSave: (p: import("@/lib/user-settings").ProfileUpdatePayload) => Promise<boolean>
  onRefetch: () => void
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Profile</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          How you appear across AllFantasy Sports App, Bracket Challenge, and Legacy.{" "}
          <a href="/profile" className="font-medium" style={{ color: "var(--accent-cyan)" }}>Edit full profile (bio, sports) →</a>
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

function PreferencesSection({
  profile,
  saving,
  onSave,
}: {
  profile: ReturnType<typeof useSettingsProfile>["profile"]
  saving: boolean
  onSave: (p: import("@/lib/user-settings").ProfileUpdatePayload) => Promise<boolean>
}) {
  const { mode, setMode } = useThemeMode()
  const { language, setLanguage } = useLanguage()
  const [timezone, setTimezone] = useState(profile?.timezone ?? "")
  const [lang, setLang] = useState<"en" | "es">(profile?.preferredLanguage ?? language)
  const [theme, setTheme] = useState<"dark" | "light" | "legacy">(profile?.themePreference ?? mode)
  useEffect(() => {
    setTimezone(profile?.timezone ?? "")
    setLang(profile?.preferredLanguage ?? language)
    setTheme(profile?.themePreference ?? mode)
  }, [profile?.timezone, profile?.preferredLanguage, profile?.themePreference, language, mode])

  const resetDraft = () => {
    setTimezone(profile?.timezone ?? "")
    setLang(profile?.preferredLanguage ?? language)
    setTheme(profile?.themePreference ?? mode)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await onSave({
      preferredLanguage: lang,
      timezone: timezone || null,
      themePreference: theme,
    })
    if (ok) {
      setMode(theme)
      setLanguage(lang)
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("af_lang", lang)
          window.localStorage.setItem("af_mode", theme)
        } catch {}
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Preferences</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Language, timezone, and theme. Synced across devices when signed in.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Language</label>
        <div className="flex gap-2" data-testid="settings-language-toggle" role="radiogroup" aria-label="Language toggle">
          {(["en", "es"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className="rounded-xl border px-4 py-2 text-sm font-medium"
              role="radio"
              aria-checked={lang === l}
              style={{
                borderColor: lang === l ? "var(--accent-cyan)" : "var(--border)",
                background: lang === l ? "color-mix(in srgb, var(--accent-cyan) 18%, transparent)" : "var(--panel2)",
                color: "var(--text)",
              }}
            >
              {l === "en" ? "English" : "Español"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full max-w-md rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
        >
          <option value="">Select timezone</option>
          {SIGNUP_TIMEZONES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {timezone && (
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
            Your local time: {formatInTimezone(new Date(), timezone, undefined, lang)}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted2)" }}>Theme</label>
        <div className="flex gap-2">
          {(["light", "dark", "legacy"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className="rounded-xl border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: theme === t ? "var(--accent-cyan)" : "var(--border)",
                background: theme === t ? "color-mix(in srgb, var(--accent-cyan) 18%, transparent)" : "var(--panel2)",
                color: "var(--text)",
              }}
            >
              {t === "legacy" ? "AF Legacy" : t === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
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
          {saving ? "Saving…" : "Save preferences"}
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

function SecuritySection({
  profile,
  onRefetch,
}: {
  profile: ReturnType<typeof useSettingsProfile>["profile"]
  onRefetch: () => void
}) {
  const status = getSecurityStatus(profile)
  const contact = getContactSummary(profile)

  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<"sent" | "already" | "error" | "rate_limited" | null>(null)
  const [emailEdit, setEmailEdit] = useState(false)
  const [emailInput, setEmailInput] = useState(profile?.email ?? "")
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("")
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaveResult, setEmailSaveResult] = useState<
    "saved" | "saved_no_email" | "invalid" | "duplicate" | "wrong_password" | "password_required" | "error" | null
  >(null)

  const [phoneEdit, setPhoneEdit] = useState(false)
  const [phoneInput, setPhoneInput] = useState(profile?.phone ?? "")
  const [phoneSending, setPhoneSending] = useState(false)
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [phoneCode, setPhoneCode] = useState("")
  const [phoneVerifying, setPhoneVerifying] = useState(false)
  const [phoneResult, setPhoneResult] = useState<"verified" | "invalid" | "error" | "rate_limited" | null>(null)

  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    if (!emailEdit) {
      setEmailInput(profile?.email ?? "")
      setEmailCurrentPassword("")
      setShowEmailCurrentPassword(false)
    }
  }, [profile?.email, emailEdit])

  useEffect(() => {
    if (!phoneEdit) {
      setPhoneInput(profile?.phone ?? "")
    }
  }, [profile?.phone, phoneEdit])

  const handleStartEmailEdit = () => {
    setEmailEdit(true)
    setEmailResult(null)
    setEmailSaveResult(null)
    setEmailInput(profile?.email ?? "")
    setEmailCurrentPassword("")
  }

  const handleCancelEmailEdit = () => {
    setEmailEdit(false)
    setEmailInput(profile?.email ?? "")
    setEmailCurrentPassword("")
    setShowEmailCurrentPassword(false)
    setEmailSaveResult(null)
  }

  const handleSaveEmail = async () => {
    setEmailSaveResult(null)
    const nextEmail = emailInput.trim().toLowerCase()
    if (!nextEmail || !nextEmail.includes("@")) {
      setEmailSaveResult("invalid")
      return
    }
    setEmailSaving(true)
    const result = await updateContactEmail({
      email: nextEmail,
      currentPassword: status.hasPassword ? emailCurrentPassword : undefined,
      returnTo: "/settings?tab=security",
    })
    setEmailSaving(false)

    if (result.ok) {
      setEmailEdit(false)
      setEmailCurrentPassword("")
      setEmailSaveResult(result.verificationEmailSent ? "saved" : "saved_no_email")
      onRefetch()
      return
    }

    if (result.invalidEmail) setEmailSaveResult("invalid")
    else if (result.duplicateEmail) setEmailSaveResult("duplicate")
    else if (result.wrongPassword) setEmailSaveResult("wrong_password")
    else if (result.requiresPassword) setEmailSaveResult("password_required")
    else setEmailSaveResult("error")
  }

  const handleSendVerificationEmail = async () => {
    setEmailSending(true)
    setEmailResult(null)
    setEmailSaveResult(null)
    const result = await sendVerificationEmail("/settings")
    setEmailSending(false)
    if (result.ok && result.alreadyVerified) setEmailResult("already")
    else if (result.ok) setEmailResult("sent")
    else if (result.rateLimited) setEmailResult("rate_limited")
    else setEmailResult("error")
  }

  const handleSendPhoneCode = async () => {
    const trimmed = phoneInput.replace(/[\s()-]/g, "").trim()
    if (!trimmed) return
    setPhoneSending(true)
    setPhoneResult(null)
    const result = await startPhoneVerification(trimmed.startsWith("+") ? trimmed : `+1${trimmed}`)
    setPhoneSending(false)
    if (result.ok) setPhoneCodeSent(true)
    else if (result.rateLimited) setPhoneResult("rate_limited")
    else setPhoneResult("error")
  }

  const handleVerifyPhoneCode = async () => {
    if (!phoneCode.trim()) return
    const trimmed = phoneInput.replace(/[\s()-]/g, "").trim()
    const phone = trimmed.startsWith("+") ? trimmed : `+1${trimmed}`
    setPhoneVerifying(true)
    setPhoneResult(null)
    const result = await checkPhoneCode(phone, phoneCode)
    setPhoneVerifying(false)
    if (result.ok) {
      setPhoneResult("verified")
      setPhoneCodeSent(false)
      setPhoneCode("")
      setPhoneEdit(false)
      onRefetch()
    } else if (result.error === "INVALID_CODE") setPhoneResult("invalid")
    else if (result.error === "RATE_LIMITED") setPhoneResult("rate_limited")
    else setPhoneResult("error")
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.")
      return
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("Password must be at least 8 characters with letters and numbers.")
      return
    }
    setPasswordChanging(true)
    const result = await changePassword(currentPassword, newPassword)
    setPasswordChanging(false)
    if (result.ok) {
      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        setPasswordFormOpen(false)
        setPasswordSuccess(false)
      }, 2000)
    } else {
      setPasswordError(result.message ?? result.error ?? "Failed to change password.")
    }
  }

  const cancelPhoneEdit = () => {
    setPhoneEdit(false)
    setPhoneInput(profile?.phone ?? "")
    setPhoneCodeSent(false)
    setPhoneCode("")
    setPhoneResult(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Security</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Verification, password, and contact methods.
        </p>
      </div>

      {/* Security status card */}
      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Account security status</p>
        <ul className="space-y-1.5 text-sm" style={{ color: "var(--muted)" }}>
          <li className="flex items-center gap-2">
            {status.emailVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
            Email: {status.emailVerified ? "Verified" : "Not verified"}
          </li>
          <li className="flex items-center gap-2">
            {!status.phoneSet ? <XCircle className="h-4 w-4 text-amber-500" /> : status.phoneVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
            Phone: {!status.phoneSet ? "Not set" : status.phoneVerified ? "Verified" : "Not verified"}
          </li>
          <li className="flex items-center gap-2">
            {status.hasPassword ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
            Password: {status.hasPassword ? "Set" : "Not set"}
          </li>
          {status.recoveryOptions.length > 0 && (
            <li className="flex items-center gap-2">
              <span style={{ color: "var(--muted)" }}>Recovery: {status.recoveryOptions.join(", ")}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Email */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Mail className="h-4 w-4" />
              Email
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{contact.email ?? "—"}</p>
          </div>
          {!emailEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStartEmailEdit}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Edit email
              </button>
              {!contact.emailVerified && contact.email && (
                <button
                  type="button"
                  disabled={emailSending}
                  onClick={handleSendVerificationEmail}
                  className="rounded-lg border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  {emailSending ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Sending…</> : "Send verification"}
                </button>
              )}
              <Link
                href="/verify?method=email"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Verify / change
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCancelEmailEdit}
              className="rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              Cancel
            </button>
          )}
        </div>
        {emailEdit && (
          <div className="pt-2 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>New email</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
              />
            </div>
            {status.hasPassword && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Current password</label>
                <div className="relative">
                  <input
                    type={showEmailCurrentPassword ? "text" : "password"}
                    value={emailCurrentPassword}
                    onChange={(e) => setEmailCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailCurrentPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    aria-label={showEmailCurrentPassword ? "Hide" : "Show"}
                    style={{ color: "var(--muted)" }}
                  >
                    {showEmailCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
                  Required to protect your account when changing email.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={emailSaving || !emailInput.trim() || (status.hasPassword && !emailCurrentPassword.trim())}
                onClick={handleSaveEmail}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--accent-cyan)", color: "var(--text)" }}
              >
                {emailSaving ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Saving…</> : "Save email"}
              </button>
              <button
                type="button"
                onClick={handleCancelEmailEdit}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {emailResult === "sent" && <p className="text-xs text-emerald-600">Check your email for the verification link.</p>}
        {emailResult === "already" && <p className="text-xs" style={{ color: "var(--muted)" }}>Email is already verified.</p>}
        {emailResult === "rate_limited" && <p className="text-xs text-amber-600">Too many attempts. Please try again later.</p>}
        {emailResult === "error" && <p className="text-xs text-red-600">Failed to send. Try again.</p>}
        {emailSaveResult === "saved" && <p className="text-xs text-emerald-600">Email updated. Check your inbox to verify the new address.</p>}
        {emailSaveResult === "saved_no_email" && <p className="text-xs text-amber-600">Email updated, but verification email could not be sent right now.</p>}
        {emailSaveResult === "invalid" && <p className="text-xs text-red-600">Enter a valid email address.</p>}
        {emailSaveResult === "duplicate" && <p className="text-xs text-red-600">That email is already in use by another account.</p>}
        {emailSaveResult === "wrong_password" && <p className="text-xs text-red-600">Current password is incorrect.</p>}
        {emailSaveResult === "password_required" && <p className="text-xs text-red-600">Current password is required to change email.</p>}
        {emailSaveResult === "error" && <p className="text-xs text-red-600">Could not update email. Please try again.</p>}
      </div>

      {/* Phone */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Phone className="h-4 w-4" />
              Phone
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {profile?.phone ? (profile.phoneVerifiedAt ? "Verified" : "Not verified") : "Not set"}
              {profile?.phone && ` · ${profile.phone}`}
            </p>
          </div>
          {!phoneEdit ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPhoneEdit(true)}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Update phone
              </button>
              <Link
                href="/verify?method=phone"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Verify / add
              </Link>
            </div>
          ) : (
            <button type="button" onClick={cancelPhoneEdit} className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              Cancel
            </button>
          )}
        </div>
        {phoneEdit && (
          <div className="pt-2 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Phone number</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
              />
            </div>
            {!phoneCodeSent ? (
              <button
                type="button"
                disabled={phoneSending || !phoneInput.trim()}
                onClick={handleSendPhoneCode}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                {phoneSending ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null} Send verification code
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
                    style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={phoneVerifying || !phoneCode.trim()}
                    onClick={handleVerifyPhoneCode}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--accent-cyan)", color: "var(--text)" }}
                  >
                    {phoneVerifying ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Verifying…</> : "Verify"}
                  </button>
                  <button
                    type="button"
                    disabled={phoneSending}
                    onClick={handleSendPhoneCode}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    {phoneSending ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null} Resend code
                  </button>
                </div>
                {phoneResult === "verified" && <p className="text-xs text-emerald-600">Phone verified. Updating…</p>}
                {phoneResult === "invalid" && <p className="text-xs text-red-600">Invalid code. Try again.</p>}
                {phoneResult === "rate_limited" && <p className="text-xs text-amber-600">Too many attempts. Wait a few minutes.</p>}
                {phoneResult === "error" && <p className="text-xs text-red-600">Verification failed. Try again.</p>}
              </>
            )}
          </div>
        )}
      </div>

      {/* Password */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Lock className="h-4 w-4" />
            Password
          </p>
          {!passwordFormOpen ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPasswordFormOpen(true)}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Change password
              </button>
              <Link
                href="/forgot-password"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Forgot password
              </Link>
            </div>
          ) : (
            <button type="button" onClick={() => { setPasswordFormOpen(false); setPasswordError(null); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              Cancel
            </button>
          )}
        </div>
        {passwordFormOpen && (
          <form onSubmit={handleChangePassword} className="pt-2 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Current password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowCurrent((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)" }} aria-label={showCurrent ? "Hide" : "Show"}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>New password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)" }} aria-label={showNew ? "Hide" : "Show"}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)" }} aria-label={showConfirm ? "Hide" : "Show"}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="text-xs text-emerald-600">Password updated successfully.</p>}
            <button
              type="submit"
              disabled={passwordChanging || !currentPassword || !newPassword || !confirmPassword}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--accent-cyan)", color: "var(--text)" }}
            >
              {passwordChanging ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Saving…</> : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function NotificationsSection({
  profile,
  onRefetch,
}: {
  profile: ReturnType<typeof useSettingsProfile>["profile"]
  onRefetch: () => void
}) {
  const resolved = resolveNotificationPreferences(profile?.notificationPreferences as NotificationPreferences | null)
  const [prefs, setPrefs] = useState<NotificationPreferences>(resolved)
  const [expandedCategory, setExpandedCategory] = useState<NotificationCategoryId | null>("lineup_reminders")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false)
  const [testCategory, setTestCategory] = useState<NotificationCategoryId>("lineup_reminders")
  const [testing, setTesting] = useState(false)
  const [testResultMessage, setTestResultMessage] = useState<string | null>(null)
  const [testResultTone, setTestResultTone] = useState<"success" | "info" | "error" | null>(null)
  const [lastLoadedFingerprint, setLastLoadedFingerprint] = useState(
    getNotificationPreferencesFingerprint(profile?.notificationPreferences as NotificationPreferences | null)
  )

  const deliveryAvailability = getDeliveryMethodAvailability({
    hasEmail: !!profile?.email,
    phoneVerified: !!profile?.phoneVerifiedAt,
  })

  useEffect(() => {
    const nextPrefs = resolveNotificationPreferences(profile?.notificationPreferences as NotificationPreferences | null)
    const nextFingerprint = getNotificationPreferencesFingerprint(
      profile?.notificationPreferences as NotificationPreferences | null
    )
    if (dirty) {
      if (nextFingerprint !== lastLoadedFingerprint) {
        setRemoteUpdatePending(true)
      }
      return
    }
    setPrefs(nextPrefs)
    setLastLoadedFingerprint(nextFingerprint)
    setRemoteUpdatePending(false)
  }, [profile?.notificationPreferences, dirty, lastLoadedFingerprint])

  const updateCategory = (categoryId: NotificationCategoryId, patch: Partial<NonNullable<NotificationPreferences["categories"]>[NotificationCategoryId]>) => {
    setDirty(true)
    setSaveError(null)
    setTestResultMessage(null)
    setTestResultTone(null)
    setPrefs((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryId]: { ...(prev.categories?.[categoryId] ?? { enabled: true, inApp: true, email: true, sms: false }), ...patch },
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    const result = await updateNotificationPreferences(prefs)
    setSaving(false)
    if (result.ok) {
      setDirty(false)
      setRemoteUpdatePending(false)
      setLastLoadedFingerprint(getNotificationPreferencesFingerprint(prefs))
      onRefetch()
    } else setSaveError(result.error ?? "Failed to save")
  }

  const handleReset = () => {
    const defaults = getDefaultNotificationPreferences()
    setPrefs(defaults)
    setDirty(true)
    setSaveError(null)
    setRemoteUpdatePending(false)
    setTestResultMessage(null)
    setTestResultTone(null)
  }

  const handleReloadSaved = () => {
    const saved = resolveNotificationPreferences(profile?.notificationPreferences as NotificationPreferences | null)
    setPrefs(saved)
    setDirty(false)
    setRemoteUpdatePending(false)
    setSaveError(null)
    setTestResultMessage(null)
    setTestResultTone(null)
  }

  const handleSendTestNotification = async () => {
    const selectedCategoryPrefs = prefs.categories?.[testCategory] ?? {
      enabled: true,
      inApp: true,
      email: true,
      sms: false,
    }

    setTesting(true)
    setTestResultMessage(null)
    setTestResultTone(null)
    const result = await sendTestNotification({
      category: testCategory,
      channels: {
        inApp: selectedCategoryPrefs.inApp,
        email: selectedCategoryPrefs.email,
        sms: selectedCategoryPrefs.sms,
      },
    })
    setTesting(false)

    if (!result.ok) {
      if (result.rateLimited) {
        setTestResultTone("error")
        setTestResultMessage("Rate limited. Please wait before sending another test.")
        return
      }
      if ((result.blockedReasons?.length ?? 0) > 0) {
        setTestResultTone("info")
        setTestResultMessage(`No test sent. Blocked by: ${(result.blockedReasons ?? []).join(", ")}.`)
        return
      }
      setTestResultTone("error")
      setTestResultMessage(result.error ?? "Failed to send test notification.")
      return
    }

    const sentChannels = Object.entries(result.sent ?? {})
      .filter(([, sent]) => sent)
      .map(([name]) => name)
    if (sentChannels.length > 0) {
      setTestResultTone("success")
      setTestResultMessage(`Test sent via ${sentChannels.join(", ")}.`)
    } else {
      setTestResultTone("info")
      setTestResultMessage("No test sent. Check your current category and delivery settings.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Notifications</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Choose how you receive alerts: lineup reminders, matchups, trades, chat, bracket, AI, and more. Critical account and verification emails are always sent.
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Notifications</p>
          <label className="flex items-center gap-2 text-sm">
            <span style={{ color: "var(--muted)" }}>{prefs.globalEnabled !== false ? "On" : "Off"}</span>
            <input
              type="checkbox"
              checked={prefs.globalEnabled !== false}
              onChange={(e) => {
                setDirty(true)
                setSaveError(null)
                setTestResultMessage(null)
                setTestResultTone(null)
                setPrefs((p) => ({ ...p, globalEnabled: e.target.checked }))
              }}
              className="h-4 w-4 rounded"
              style={{ accentColor: "var(--accent-cyan)" }}
            />
          </label>
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          When off, non-critical notifications are paused. Account and security emails still apply.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: "var(--muted2)" }}>By category</p>
        <ul className="space-y-2">
          {NOTIFICATION_CATEGORY_IDS.map((categoryId) => (
            <li key={categoryId}>
              <NotificationCategoryRenderer
                categoryId={categoryId}
                prefs={prefs.categories?.[categoryId] ?? { enabled: true, inApp: true, email: true, sms: false }}
                deliveryAvailability={deliveryAvailability}
                expanded={expandedCategory === categoryId}
                onToggleExpand={() => setExpandedCategory((c) => (c === categoryId ? null : categoryId))}
                onToggleEnabled={(enabled) => updateCategory(categoryId, { enabled })}
                onToggleChannel={(channel, value) => updateCategory(categoryId, { [channel]: value })}
              />
            </li>
          ))}
        </ul>
      </div>

      {remoteUpdatePending && (
        <div className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--accent-cyan)", background: "color-mix(in srgb, var(--accent-cyan) 12%, transparent)", color: "var(--text)" }}>
          Saved notification preferences changed in another session. Keep editing or reload the latest saved version.
          <button
            type="button"
            onClick={handleReloadSaved}
            className="ml-2 rounded-lg border px-2 py-1 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Reload saved
          </button>
        </div>
      )}

      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Send a test notification</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={testCategory}
            onChange={(e) => setTestCategory(e.target.value as NotificationCategoryId)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            {NOTIFICATION_CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>{NOTIFICATION_CATEGORY_LABELS[id]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={testing}
            className="rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            {testing ? "Sending test…" : "Send test notification"}
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Test uses your currently selected delivery channels for the chosen category.
        </p>
        {testResultMessage && (
          <p
            className="text-xs"
            style={{
              color:
                testResultTone === "success"
                  ? "#059669"
                  : testResultTone === "error"
                    ? "var(--accent-red-strong)"
                    : "var(--muted2)",
            }}
          >
            {testResultMessage}
          </p>
        )}
      </div>

      {saveError && (
        <p className="text-sm" style={{ color: "var(--accent-red-strong)" }}>{saveError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={handleSave}
          className="rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: dirty && !saving ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))" : "var(--panel2)",
            color: dirty && !saving ? "var(--on-accent-bg)" : "var(--muted)",
            border: "1px solid var(--border)",
          }}
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border px-4 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Reset to defaults
        </button>
        <a
          href="/alerts/settings"
          className="rounded-xl border px-4 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Sports alerts page
        </a>
        <a
          href="/settings?tab=profile"
          className="rounded-xl border px-4 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Back to profile
        </a>
      </div>
    </div>
  )
}

function ConnectedAccountsSection({
  profile,
  onRefetchProfile,
}: {
  profile: ReturnType<typeof useSettingsProfile>["profile"]
  onRefetchProfile: () => void
}) {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyProviderId, setBusyProviderId] = useState<SignInProviderId | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<"info" | "error" | "success" | null>(null)

  const linkedProvidersCount = providers.filter((provider) => provider.linked).length
  const hasPassword = !!profile?.hasPassword

  const loadProviders = async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      if (asRefresh) onRefetchProfile()
      const data = await getConnectedAccounts()
      setProviders(data.providers)
    } catch {
      setStatusTone("error")
      setStatusMessage("Could not load connected providers right now.")
    } finally {
      if (asRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
  }, [])

  useEffect(() => {
    const onFocus = () => {
      void loadProviders(true)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus)
      return () => window.removeEventListener("focus", onFocus)
    }
  }, [])

  const handleConnect = (providerId: SignInProviderId, configured: boolean) => {
    const action = getProviderConnectAction(providerId, configured)
    if (action === "fallback") {
      setStatusTone("info")
      setStatusMessage(getFallbackViewMessage(providerId))
      return
    }
    setStatusMessage(null)
    setStatusTone(null)
    setBusyProviderId(providerId)
    void signIn(providerId, { callbackUrl: "/settings?tab=connected" }).finally(() => {
      setBusyProviderId(null)
    })
  }

  const handleDisconnect = async (provider: ProviderStatus) => {
    if (!canDisconnectProvider(provider, linkedProvidersCount, hasPassword)) {
      setStatusTone("error")
      setStatusMessage(getDisconnectBlockedMessage(provider.id))
      return
    }
    if (typeof window !== "undefined") {
      const shouldDisconnect = window.confirm(`Disconnect ${provider.name} from your sign-in methods?`)
      if (!shouldDisconnect) return
    }
    setBusyProviderId(provider.id)
    setStatusMessage(null)
    setStatusTone(null)
    const result = await disconnectConnectedAccount(provider.id)
    setBusyProviderId(null)
    if (!result.ok) {
      setStatusTone("error")
      if (result.error === "LOCKOUT_RISK") {
        setStatusMessage("Disconnect blocked to prevent account lockout. Add another provider or password first.")
      } else {
        setStatusMessage("Could not disconnect provider right now.")
      }
      return
    }
    if (result.providers && result.providers.length > 0) {
      setProviders(result.providers)
    } else {
      await loadProviders(true)
    }
    setStatusTone("success")
    setStatusMessage(`${provider.name} disconnected.`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Connected Accounts</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Sign-in providers and fantasy platform links. Connect to sign in with Google, Apple, or link Sleeper below.
        </p>
      </div>
      {statusMessage && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: statusTone === "error" ? "var(--accent-red)" : "var(--accent-cyan)",
            background:
              statusTone === "error"
                ? "color-mix(in srgb, var(--accent-red) 10%, transparent)"
                : statusTone === "success"
                  ? "color-mix(in srgb, #10b981 16%, transparent)"
                  : "color-mix(in srgb, var(--accent-cyan) 12%, transparent)",
            color: "var(--text)",
          }}
        >
          {statusMessage}
        </div>
      )}
      <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--muted2)" }}>Sign-in providers</p>
          <button
            type="button"
            onClick={() => void loadProviders(true)}
            disabled={refreshing}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            {refreshing ? "Refreshing…" : "Refresh status"}
          </button>
        </div>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
        ) : (
          <ul className="space-y-3">
            {providers.map((provider) => (
              <li key={provider.id} className="flex flex-wrap items-center justify-between gap-2">
                <ConnectedIdentityRenderer provider={provider} size="md" />
                {!provider.linked ? (
                  <button
                    type="button"
                    onClick={() => handleConnect(provider.id, provider.configured)}
                    disabled={busyProviderId === provider.id}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    {busyProviderId === provider.id ? "Connecting…" : "Connect"}
                  </button>
                ) : canDisconnectProvider(provider, linkedProvidersCount, hasPassword) ? (
                  <button
                    type="button"
                    onClick={() => void handleDisconnect(provider)}
                    disabled={busyProviderId === provider.id}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--accent-red)", color: "var(--accent-red-strong)" }}
                  >
                    {busyProviderId === provider.id ? "Disconnecting…" : "Disconnect"}
                  </button>
                ) : (
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Connected (protected)</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          To prevent lockout, your last linked provider cannot be disconnected unless you have a password set.
        </p>
      </div>
      <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--muted2)" }}>Fantasy platform (Legacy import)</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Sleeper</span>
          {profile?.sleeperUsername ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted)" }}>Linked as @{profile.sleeperUsername}</span>
              <Link
                href="/dashboard"
                className="rounded-lg border px-3 py-2 text-xs font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Reconnect
              </Link>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              Connect Sleeper
            </Link>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Link Sleeper here or in Legacy Import to enable league import and rankings.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings?tab=legacy"
            className="rounded-lg border px-3 py-2 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Open Legacy Import tab
          </Link>
          <Link
            href="/import"
            className="rounded-lg border px-3 py-2 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Import help
          </Link>
        </div>
      </div>
    </div>
  )
}

function LegacyImportSection() {
  const [legacyStatus, setLegacyStatus] = useState<LegacyImportStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const loadLegacyStatus = async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await refreshLegacyImportStatus()
      setLegacyStatus(data)
      setLastUpdatedAt(new Date())
    } catch {
      setError("Could not load import status right now.")
    } finally {
      if (asRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    void loadLegacyStatus()
  }, [])

  useEffect(() => {
    const onFocus = () => {
      void loadLegacyStatus(true)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus)
      return () => window.removeEventListener("focus", onFocus)
    }
  }, [])

  const hasActiveImport = LEGACY_PROVIDER_IDS.some((providerId) => {
    const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
    return isImportStatusActive(status?.importStatus ?? null)
  })
  const hasLinkedProvider = LEGACY_PROVIDER_IDS.some((providerId) => {
    const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
    return Boolean(status?.linked)
  })
  const hasCompletedImport = LEGACY_PROVIDER_IDS.some((providerId) => {
    const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
    return status?.importStatus === "completed"
  })

  useEffect(() => {
    if (!hasActiveImport) return
    const timer = window.setInterval(() => {
      void loadLegacyStatus(true)
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [hasActiveImport])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Legacy Import</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Import your fantasy history for AllFantasy Legacy. Supported sports: {SUPPORTED_SPORTS.join(", ")}.
        </p>
      </div>
      <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--muted)" }}>
        <p className="font-medium" style={{ color: "var(--text)" }}>Rankings &amp; level</p>
        <p className="mt-1">
          Legacy import affects your rankings and level progression. If you don&apos;t import history, you start from scratch (level 1). Import from a connected provider to bring in your league history.
        </p>
      </div>
      {error && (
        <p className="text-sm" style={{ color: "var(--accent-red-strong)" }}>
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading import status…</p>
      ) : (
        <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium" style={{ color: "var(--muted2)" }}>Import providers</p>
            <button
              type="button"
              onClick={() => void loadLegacyStatus(true)}
              disabled={refreshing}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {refreshing ? "Refreshing…" : "Refresh status"}
            </button>
          </div>
          {lastUpdatedAt && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Last updated: {formatInTimezone(lastUpdatedAt, undefined, undefined, "en")}
            </p>
          )}
          <ul className="space-y-4">
            {LEGACY_PROVIDER_IDS.map((providerId) => {
              const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
              const isSleeper = providerId === "sleeper"
              const name = getLegacyProviderName(providerId)
              const linked = status?.linked ?? false
              const importStatusLabel = status?.importStatus ? getImportStatusLabel(status.importStatus) : "—"
              const available = status?.available ?? false
              const primaryAction = getLegacyProviderPrimaryAction({ providerId, status })
              const helpHref = getLegacyProviderHelpHref(providerId)
              const showReconnect = isSleeper && linked

              return (
                <li key={providerId} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {available ? (linked ? `Linked · Import: ${importStatusLabel}` : "Not connected") : "Coming soon"}
                    </p>
                    {status?.error && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--accent-red-strong)" }}>{status.error}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {primaryAction ? (
                      <Link
                        href={primaryAction.href}
                        className="rounded-lg border px-3 py-2 text-sm font-medium"
                        style={{ borderColor: primaryAction.label.includes("Retry") ? "var(--accent-red)" : "var(--accent-cyan)", color: "var(--text)" }}
                      >
                        {primaryAction.label}
                      </Link>
                    ) : (
                      !available && <span className="text-xs" style={{ color: "var(--muted)" }}>Coming soon</span>
                    )}
                    {showReconnect && (
                      <Link
                        href="/dashboard"
                        className="rounded-lg border px-3 py-2 text-sm font-medium"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        Reconnect
                      </Link>
                    )}
                    <Link
                      href={helpHref}
                      className="rounded-lg border px-3 py-2 text-sm font-medium"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      Help
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
          {hasActiveImport && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Active import detected. This tab refreshes automatically every 15 seconds.
            </p>
          )}
          {!hasActiveImport && !hasLinkedProvider && !hasCompletedImport ? (
            <EmptyStateRenderer
              compact
              title={resolveNoResultsState({ context: "legacy_import" }).title}
              description={resolveNoResultsState({ context: "legacy_import" }).description}
              actions={resolveNoResultsState({ context: "legacy_import" }).actions.map((action) => ({
                id: action.id,
                label: action.label,
                href: action.href,
              }))}
              testId="legacy-import-empty-state"
            />
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/af-legacy"
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Open Legacy app
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Dashboard (link Sleeper)
        </Link>
        <Link
          href="/import"
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Import instructions
        </Link>
      </div>
    </div>
  )
}

function LegalSection({
  profile,
}: {
  profile: ReturnType<typeof useSettingsProfile>["profile"]
}) {
  const legalState = profile?.settings?.legalAcceptanceState

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Legal & Agreements</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Terms and privacy policy.
        </p>
      </div>
      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Acceptance state</p>
        <ul className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
          <li>Age verified: {legalState?.ageVerified ? "Yes" : "No"}</li>
          <li>Disclaimer accepted: {legalState?.disclaimerAccepted ? "Yes" : "No"}</li>
          <li>Terms accepted: {legalState?.termsAccepted ? "Yes" : "No"}</li>
          <li>
            Accepted at:{" "}
            {legalState?.acceptedAt
              ? formatInTimezone(legalState.acceptedAt, profile?.timezone, undefined, profile?.preferredLanguage)
              : "Not recorded"}
          </li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/disclaimer" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Disclaimer
        </Link>
        <Link href="/terms" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Terms of Service
        </Link>
        <Link href="/privacy" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Privacy Policy
        </Link>
        <Link href="/data-deletion" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Data Deletion
        </Link>
      </div>
    </div>
  )
}

function AccountSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Account</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Sign out or manage account risk actions.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Sign out
        </button>
        <a
          href="mailto:support@allfantasy.ai?subject=Account%20Deletion%20Request"
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: "color-mix(in srgb, var(--accent-red) 55%, var(--border))",
            color: "var(--accent-red-strong)",
          }}
        >
          Request account deletion
        </a>
      </div>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Account deletion or deactivation is handled by support for safety verification.
      </p>
    </div>
  )
}
