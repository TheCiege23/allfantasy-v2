import { resolveAuthRedirect } from "@/lib/auth/AuthRedirectResolver"

export interface LoginQueryShape {
  callbackUrl?: string | null
  next?: string | null
  returnTo?: string | null
  intent?: string | null
}

export function resolveLoginCallbackUrl(input: LoginQueryShape): string {
  return resolveAuthRedirect({
    callbackUrl: input.callbackUrl,
    next: input.next,
    returnTo: input.returnTo,
    intent: input.intent,
  })
}
