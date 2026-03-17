import { redirect } from "next/navigation"
import { getSessionAndProfile, isUserVerified, isAgeConfirmed, VerifiedUserProfile } from "@/lib/auth-guard"
import { validateCallbackUrl } from "@/lib/url-validation"

function withCallbackUrl(base: string, safeCallbackUrl: string | undefined): string {
  return safeCallbackUrl ? `${base}&callbackUrl=${encodeURIComponent(safeCallbackUrl)}` : base
}

export async function requireVerifiedSession(callbackUrl?: string): Promise<{
  userId: string
  email: string | null
  emailVerified: Date | null
  profile: VerifiedUserProfile | null
}> {
  const { userId, email, emailVerified, profile } = await getSessionAndProfile()
  const safeCallbackUrl = callbackUrl ? validateCallbackUrl(callbackUrl) : undefined

  if (!userId) {
    const loginUrl = safeCallbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl)}`
      : "/login"
    redirect(loginUrl)
  }

  if (!isAgeConfirmed(profile)) {
    redirect(withCallbackUrl("/verify?error=AGE_REQUIRED", safeCallbackUrl))
  }

  if (!isUserVerified(emailVerified, profile?.phoneVerifiedAt)) {
    redirect(withCallbackUrl("/verify?error=VERIFICATION_REQUIRED", safeCallbackUrl))
  }

  return { userId, email, emailVerified, profile }
}
