import { resolveAuthRedirect } from "@/lib/auth/AuthRedirectResolver"

export interface SignupQueryShape {
  next?: string | null
  callbackUrl?: string | null
  returnTo?: string | null
  intent?: string | null
}

export function resolveSignupRedirectPath(input: SignupQueryShape): string {
  return resolveAuthRedirect({
    callbackUrl: input.callbackUrl,
    next: input.next,
    returnTo: input.returnTo,
    intent: input.intent,
  })
}

export function resolvePostSignupCallbackUrl(input: {
  redirectAfterSignup: string
  verificationMethod?: 'EMAIL' | 'PHONE' | string | null
}): string {
  if (input.verificationMethod === 'PHONE') {
    return `/verify?method=phone&error=VERIFICATION_REQUIRED&returnTo=${encodeURIComponent(input.redirectAfterSignup)}`
  }
  return input.redirectAfterSignup
}
