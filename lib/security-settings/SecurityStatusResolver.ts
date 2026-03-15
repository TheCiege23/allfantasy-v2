import type { UserProfileForSettings } from "@/lib/user-settings/types"
import type { SecurityStatus } from "./types"
import { getRecoveryOptions } from "./RecoveryOptionResolver"

/**
 * Derives security status from settings profile for display in Security tab.
 */
export function getSecurityStatus(profile: UserProfileForSettings | null): SecurityStatus {
  if (!profile) {
    return {
      emailVerified: false,
      phoneSet: false,
      phoneVerified: false,
      hasPassword: false,
      recoveryOptions: [],
    }
  }
  const emailVerified = !!profile.emailVerifiedAt
  const phoneSet = !!profile.phone
  const phoneVerified = !!profile.phoneVerifiedAt
  const hasPassword = !!profile.hasPassword
  const recoveryOptions = getRecoveryOptions(profile)
  return {
    emailVerified,
    phoneSet,
    phoneVerified,
    hasPassword,
    recoveryOptions,
  }
}
