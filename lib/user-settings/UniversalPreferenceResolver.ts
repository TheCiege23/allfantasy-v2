import { resolveLanguage, type LanguageCode } from "@/lib/i18n/constants"
import { resolveTheme, type ThemeId } from "@/lib/theme/constants"
import { isAllowedSignupTimezone, resolveSignupTimezone } from "@/lib/signup/TimezoneSelectorService"
import type { ProfileUpdatePayload, PreferredLanguage, ThemePreference } from "./types"

interface UniversalPreferenceResolverInput {
  preferredLanguage?: unknown
  themePreference?: unknown
  timezone?: unknown
  fallback?: {
    preferredLanguage?: string | null
    themePreference?: string | null
    timezone?: string | null
  }
}

export interface UniversalPreferenceResolution {
  preferredLanguage: PreferredLanguage | null
  themePreference: ThemePreference | null
  timezone: string | null
}

function resolveTimezoneWithFallback(
  timezone: unknown,
  fallback: string | null | undefined
): string | null {
  if (typeof timezone === "string") {
    if (!timezone.trim()) return null
    return isAllowedSignupTimezone(timezone)
      ? timezone
      : resolveSignupTimezone(timezone)
  }
  if (timezone === null) return null
  if (typeof fallback === "string" && fallback.trim()) {
    return isAllowedSignupTimezone(fallback)
      ? fallback
      : resolveSignupTimezone(fallback)
  }
  return resolveSignupTimezone(null)
}

function resolveLanguageWithFallback(
  language: unknown,
  fallback: string | null | undefined
): PreferredLanguage | null {
  if (typeof language === "string") {
    return resolveLanguage(language) as LanguageCode
  }
  if (language === null) return null
  if (typeof fallback === "string") {
    return resolveLanguage(fallback) as LanguageCode
  }
  return resolveLanguage(null) as LanguageCode
}

function resolveThemeWithFallback(
  theme: unknown,
  fallback: string | null | undefined
): ThemePreference | null {
  if (typeof theme === "string") {
    return resolveTheme(theme) as ThemeId
  }
  if (theme === null) return null
  if (typeof fallback === "string") {
    return resolveTheme(fallback) as ThemeId
  }
  return resolveTheme(null) as ThemeId
}

export function resolveUniversalPreferences(
  input: UniversalPreferenceResolverInput
): UniversalPreferenceResolution {
  return {
    preferredLanguage: resolveLanguageWithFallback(
      input.preferredLanguage,
      input.fallback?.preferredLanguage
    ),
    themePreference: resolveThemeWithFallback(
      input.themePreference,
      input.fallback?.themePreference
    ),
    timezone: resolveTimezoneWithFallback(
      input.timezone,
      input.fallback?.timezone
    ),
  }
}

export function applyResolvedUniversalPreferences(
  payload: ProfileUpdatePayload,
  fallback?: UniversalPreferenceResolverInput["fallback"]
): ProfileUpdatePayload {
  const shouldResolveAny =
    payload.preferredLanguage !== undefined ||
    payload.themePreference !== undefined ||
    payload.timezone !== undefined

  if (!shouldResolveAny) return payload

  const resolved = resolveUniversalPreferences({
    preferredLanguage: payload.preferredLanguage,
    themePreference: payload.themePreference,
    timezone: payload.timezone,
    fallback,
  })

  return {
    ...payload,
    preferredLanguage: resolved.preferredLanguage,
    themePreference: resolved.themePreference,
    timezone: resolved.timezone,
  }
}
