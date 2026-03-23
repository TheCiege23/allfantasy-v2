import {
  DEFAULT_LANG,
  resolveLanguage,
  type LanguageCode,
} from "@/lib/i18n/constants"

export interface LanguagePreferenceSyncInput {
  profilePreferredLanguage: string | null
  storedLanguagePreference: string | null
}

export interface LanguagePreferenceSyncResult {
  language: LanguageCode
  shouldPersistToProfile: boolean
}

export function resolveLanguagePreferenceSync(
  input: LanguagePreferenceSyncInput
): LanguagePreferenceSyncResult {
  if (
    input.profilePreferredLanguage === "en" ||
    input.profilePreferredLanguage === "es"
  ) {
    return {
      language: input.profilePreferredLanguage,
      shouldPersistToProfile: false,
    }
  }

  if (
    input.storedLanguagePreference === "en" ||
    input.storedLanguagePreference === "es"
  ) {
    return {
      language: input.storedLanguagePreference,
      shouldPersistToProfile: true,
    }
  }

  return {
    language: resolveLanguage(DEFAULT_LANG),
    shouldPersistToProfile: false,
  }
}
