/**
 * Resolves which delivery methods are available for the user.
 * inApp: always; email: when user has email; sms: when phone verified.
 */
export interface DeliveryMethodAvailability {
  inApp: boolean
  email: boolean
  sms: boolean
}

export function getDeliveryMethodAvailability(options: {
  hasEmail: boolean
  phoneVerified: boolean
}): DeliveryMethodAvailability {
  return {
    inApp: true,
    email: options.hasEmail,
    sms: options.phoneVerified,
  }
}

export const DELIVERY_LABELS: Record<keyof DeliveryMethodAvailability, string> = {
  inApp: "In-app",
  email: "Email",
  sms: "SMS",
}
