import { resolveAuthSessionDestination } from '@/lib/auth/AuthSessionRouter'
import { resolveSignupRedirectPath } from '@/lib/auth/SignupFlowController'

export function resolveUnifiedLoginDestination(input: {
  callbackUrl?: string | null
  next?: string | null
}): string {
  return resolveAuthSessionDestination(input)
}

export function resolveUnifiedSignupDestination(input: {
  next?: string | null
  callbackUrl?: string | null
}): string {
  return resolveSignupRedirectPath(input)
}
