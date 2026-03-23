import { DEFAULT_LANG, type LanguageCode } from "@/lib/i18n/constants"

export const SUPPORTED_ONBOARDING_LANGUAGES: LanguageCode[] = ["en", "es"]

export function resolvePreferredLanguage(input: unknown): LanguageCode {
  if (input === "en" || input === "es") return input
  return DEFAULT_LANG
}
