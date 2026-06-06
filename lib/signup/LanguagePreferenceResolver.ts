import { DEFAULT_LANG, SUPPORTED_LANGUAGES, resolveLanguage, type LanguageCode } from "@/lib/i18n/constants"

export const SUPPORTED_ONBOARDING_LANGUAGES: LanguageCode[] = [...SUPPORTED_LANGUAGES]

export function resolvePreferredLanguage(input: unknown): LanguageCode {
  if (typeof input === "string") return resolveLanguage(input)
  return DEFAULT_LANG
}
