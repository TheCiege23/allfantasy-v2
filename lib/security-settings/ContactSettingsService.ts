import type { UserProfileForSettings } from "@/lib/user-settings/types"
import type { ContactSummary } from "./types"

/**
 * Builds a contact summary from settings profile for display in Security tab.
 */
export function getContactSummary(profile: UserProfileForSettings | null): ContactSummary {
  if (!profile) {
    return {
      email: null,
      emailVerified: false,
      phone: null,
      phoneVerified: false,
    }
  }
  return {
    email: profile.email ?? null,
    emailVerified: !!profile.emailVerifiedAt,
    phone: profile.phone ?? null,
    phoneVerified: !!profile.phoneVerifiedAt,
  }
}
