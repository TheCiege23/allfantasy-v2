/**
 * Types for security and contact settings.
 * Used by Security tab and verification flows.
 */

export interface ContactSummary {
  email: string | null
  emailVerified: boolean
  phone: string | null
  phoneVerified: boolean
}

export type SecurityStatus = {
  emailVerified: boolean
  phoneSet: boolean
  phoneVerified: boolean
  hasPassword: boolean
  recoveryOptions: ("email" | "phone")[]
}
