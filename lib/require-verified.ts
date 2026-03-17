import { redirect } from "next/navigation"
import { getSessionAndProfile, isUserVerified, isAgeConfirmed, VerifiedUserProfile } from "@/lib/auth-guard"

function withCallbackUrl(base: string, callbackUrl?: string): string {
  if (!callbackUrl) return base
  const separator = base.includes("?") ? "&" : "?"
  return `${base}${separator}callbackUrl=${encodeURIComponent(callbackUrl)}`
}

export async function requireVerifiedSession(callbackUrl?: string): Promise<{
  userId: string
  email: string | null
  emailVerified: Date | null
  profile: VerifiedUserProfile | null
}> {
  const { userId, email, emailVerified, profile } = await getSessionAndProfile()

  if (!userId) redirect(withCallbackUrl("/login", callbackUrl))

  if (!isAgeConfirmed(profile)) {
    redirect(withCallbackUrl("/verify?error=AGE_REQUIRED", callbackUrl))
  }

  if (!isUserVerified(emailVerified, profile?.phoneVerifiedAt)) {
    redirect(withCallbackUrl("/verify?error=VERIFICATION_REQUIRED", callbackUrl))
  }

  return { userId, email, emailVerified, profile }
}
