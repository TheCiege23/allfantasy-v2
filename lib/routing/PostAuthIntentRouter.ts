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
import {
  buildLoginHrefWithIntent,
  buildSignupHrefWithIntent,
  resolvePostAuthIntentDestination,
} from "@/lib/auth/PostAuthIntentRouter"

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
  intent?: string | null
  rememberedIntent?: string | null
  isAdmin?: boolean
}): string {
  return resolvePostAuthIntentDestination({
    callbackUrl: params.callbackUrl,
    next: params.next,
    returnTo: params.returnTo,
    intent: params.intent,
    rememberedIntent: params.rememberedIntent,
    isAdmin: params.isAdmin,
    fallback: DEFAULT_AFTER_LOGIN,
  })
}

/** Build login URL preserving intent to return to the given path after auth. */
export function buildLoginUrlWithIntent(redirectPath: string): string {
  return buildLoginHrefWithIntent(redirectPath)
}

/** Build signup URL preserving intent. */
export function buildSignupUrlWithIntent(redirectPath: string): string {
  return buildSignupHrefWithIntent(redirectPath)
}
