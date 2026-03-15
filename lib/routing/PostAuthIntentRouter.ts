/**
 * PostAuthIntentRouter — where to send the user after login/signup/verify.
 * Re-exports and extends auth-intent-resolver for cross-product routing.
 */

import {
  safeRedirectPath,
  getRedirectAfterLogin,
  getRedirectAfterSignup,
  loginUrlWithIntent,
  signupUrlWithIntent,
} from "@/lib/auth/auth-intent-resolver"

const DEFAULT_AFTER_LOGIN = "/dashboard"

/** Re-export for routing layer. */
export {
  safeRedirectPath,
  getRedirectAfterLogin,
  getRedirectAfterSignup,
  loginUrlWithIntent,
  signupUrlWithIntent,
}

/** Resolve post-auth destination from URL params (callbackUrl, next, returnTo). */
export function getPostAuthDestination(params: {
  callbackUrl?: string | null
  next?: string | null
  returnTo?: string | null
}): string {
  const url = params.callbackUrl ?? params.next ?? params.returnTo ?? null
  return safeRedirectPath(url || DEFAULT_AFTER_LOGIN)
}

/** Build login URL preserving intent to return to the given path after auth. */
export function buildLoginUrlWithIntent(redirectPath: string): string {
  return loginUrlWithIntent(redirectPath)
}

/** Build signup URL preserving intent. */
export function buildSignupUrlWithIntent(redirectPath: string): string {
  return signupUrlWithIntent(redirectPath)
}
