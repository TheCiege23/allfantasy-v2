"use client"

import { useState, useEffect } from "react"
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
import type { SettingsProfile } from "./settings-types"

export function NotificationsSettingsSection({
  profile,
  onRefetch,
}: {
  profile: SettingsProfile
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

  const defaultCh = { enabled: true, inApp: true, email: true, sms: false } as const

  const setAllEmailChannels = (email: boolean) => {
    setDirty(true)
    setSaveError(null)
    setTestResultMessage(null)
    setTestResultTone(null)
    setPrefs((prev) => {
      const categories = { ...prev.categories }
      for (const id of NOTIFICATION_CATEGORY_IDS) {
        categories[id] = { ...(categories[id] ?? { ...defaultCh }), email }
      }
      return { ...prev, categories }
    })
  }

  const setAllPushChannels = (inApp: boolean) => {
    setDirty(true)
    setSaveError(null)
    setTestResultMessage(null)
    setTestResultTone(null)
    setPrefs((prev) => {
      const categories = { ...prev.categories }
      for (const id of NOTIFICATION_CATEGORY_IDS) {
        categories[id] = { ...(categories[id] ?? { ...defaultCh }), inApp }
      }
      return { ...prev, categories }
    })
  }

  const allEmailOn = NOTIFICATION_CATEGORY_IDS.every((id) => prefs.categories?.[id]?.email === true)
  const allPushOn = NOTIFICATION_CATEGORY_IDS.every((id) => prefs.categories?.[id]?.inApp === true)

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

      <div className="rounded-xl border border-white/[0.08] bg-[#1a1f3a]/90 p-4 space-y-3">
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Delivery masters</p>
        <label className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span style={{ color: "var(--muted)" }}>Email notifications (all categories)</span>
          <input
            type="checkbox"
            checked={allEmailOn}
            onChange={(e) => setAllEmailChannels(e.target.checked)}
            className="h-4 w-4 rounded"
            style={{ accentColor: "var(--accent-cyan)" }}
          />
        </label>
        <label className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span style={{ color: "var(--muted)" }}>Push / in-app (all categories)</span>
          <input
            type="checkbox"
            checked={allPushOn}
            onChange={(e) => setAllPushChannels(e.target.checked)}
            className="h-4 w-4 rounded"
            style={{ accentColor: "var(--accent-cyan)" }}
          />
        </label>
        <p className="text-xs" style={{ color: "var(--muted2)" }}>
          When a mix of categories differs, the checkbox is off until all match; toggling applies to every category.
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
