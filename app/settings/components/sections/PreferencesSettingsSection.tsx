"use client"

import { useState, useEffect } from "react"
import ChimmyVoiceSettingsCard from "@/components/settings/ChimmyVoiceSettingsCard"
import { useThemeMode } from "@/components/theme/ThemeProvider"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import {
  DEFAULT_THEME,
  getThemeDisplayName,
  normalizeStoredTheme,
  type ThemeId,
} from "@/lib/theme"
import { setStoredTheme } from "@/lib/preferences/ThemePreferenceService"
import { SIGNUP_TIMEZONES } from "@/lib/signup/timezones"
import {
  SUPPORTED_SPORTS,
  DEFAULT_SPORT,
  isSupportedSport,
  normalizeToSupportedSport,
  type SupportedSport,
} from "@/lib/sport-scope"
import { formatInTimezone } from "@/lib/preferences/TimezoneFormattingResolver"
import type { SettingsOnSave, SettingsProfile } from "./settings-types"

export function PreferencesSettingsSection({
  profile,
  saving,
  onSave,
}: {
  profile: SettingsProfile
  saving: boolean
  onSave: SettingsOnSave
}) {
  const { setMode } = useThemeMode()
  const { language, setLanguage } = useLanguage()
  const [timezone, setTimezone] = useState(profile?.timezone ?? "")
  const [lang, setLang] = useState<"en" | "es">(profile?.preferredLanguage ?? language)
  const [theme, setTheme] = useState<ThemeId>(() =>
    normalizeStoredTheme(profile?.themePreference ?? DEFAULT_THEME)
  )
  const [defaultSport, setDefaultSport] = useState<SupportedSport>(() => {
    const first = profile?.preferredSports?.[0]
    return isSupportedSport(first) ? first : DEFAULT_SPORT
  })

  useEffect(() => {
    setTimezone(profile?.timezone ?? "")
    setLang(profile?.preferredLanguage ?? language)
    setTheme(normalizeStoredTheme(profile?.themePreference ?? DEFAULT_THEME))
    const first = profile?.preferredSports?.[0]
    setDefaultSport(isSupportedSport(first) ? first : DEFAULT_SPORT)
  }, [
    profile?.timezone,
    profile?.preferredLanguage,
    profile?.themePreference,
    profile?.preferredSports,
    language,
  ])

  const resetDraft = () => {
    setTimezone(profile?.timezone ?? "")
    setLang(profile?.preferredLanguage ?? language)
    setTheme(normalizeStoredTheme(profile?.themePreference ?? DEFAULT_THEME))
    const first = profile?.preferredSports?.[0]
    setDefaultSport(isSupportedSport(first) ? first : DEFAULT_SPORT)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await onSave({
      preferredLanguage: lang,
      timezone: timezone || null,
      themePreference: theme,
      preferredSports: [defaultSport],
    })
    if (ok) {
      setMode(theme)
      setStoredTheme(theme)
      setLanguage(lang)
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("af_lang", lang)
        } catch {
          /* ignore */
        }
      }
    }
  }

  const themeOptions: ThemeId[] = ["light", "dark", "legacy", "system"]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Preferences</h2>
        <p className="mt-1 text-sm text-white/55">
          Language, timezone, theme, and default sport. Synced across devices when signed in.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white/60">Language</label>
        <div className="flex gap-2" data-testid="settings-language-toggle" role="radiogroup" aria-label="Language toggle">
          {(["en", "es"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                lang === l
                  ? "border-cyan-400/80 bg-cyan-500/15 text-white"
                  : "border-white/[0.12] bg-[#1a1f3a] text-white/80 hover:bg-white/[0.06]"
              }`}
              role="radio"
              aria-checked={lang === l}
            >
              {l === "en" ? "English" : "Español"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white/60">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">Select timezone</option>
          {SIGNUP_TIMEZONES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {timezone && (
          <p className="mt-1.5 text-xs text-white/45">
            Your local time: {formatInTimezone(new Date(), timezone, undefined, lang)}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white/60">Default sport</label>
        <select
          value={defaultSport}
          onChange={(e) => setDefaultSport(normalizeToSupportedSport(e.target.value))}
          className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none"
        >
          {SUPPORTED_SPORTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white/60">Theme</label>
        <div className="flex flex-wrap gap-2">
          {themeOptions.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                theme === t
                  ? "border-cyan-400/80 bg-cyan-500/15 text-white"
                  : "border-white/[0.12] bg-[#1a1f3a] text-white/80 hover:bg-white/[0.06]"
              }`}
            >
              {getThemeDisplayName(t)}
            </button>
          ))}
        </div>
        {theme === "system" && (
          <p className="mt-1.5 text-xs text-white/45">
            Uses your system light or dark appearance.
          </p>
        )}
      </div>

      <ChimmyVoiceSettingsCard />

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-cyan-500/90 to-violet-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        <button
          type="button"
          onClick={resetDraft}
          className="rounded-xl border border-white/[0.12] px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/[0.06]"
        >
          Cancel changes
        </button>
      </div>
    </form>
  )
}
