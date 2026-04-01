export function resolveLoginErrorMessage(error: string | null | undefined): string {
  if (!error) return 'Unable to sign in. Please try again.'
  if (error.includes('SLEEPER_LOOKUP_UNAVAILABLE')) {
    return 'Sleeper sign-in is temporarily unavailable. Please try again in a moment.'
  }
  if (error.includes('SLEEPER_ONLY_ACCOUNT')) {
    return 'This account is Sleeper-linked only. Sign in with Sleeper or set a password first.'
  }
  if (error.includes('PASSWORD_NOT_SET')) {
    return 'No password has been set for this account yet.'
  }
  return 'Invalid email, username, mobile number, or password.'
}

export function resolveSocialOAuthErrorMessage(
  error: string | null | undefined
): string {
  if (!error) return 'Unable to complete social sign-in. Please try again.'
  const normalized = error.trim().toLowerCase()

  if (
    normalized.includes('access_denied') ||
    normalized.includes('user denied') ||
    normalized.includes('cancelled')
  ) {
    return 'Social sign-in was cancelled. Please try again when you are ready.'
  }

  if (normalized.includes('provider_not_enabled')) {
    return 'This social sign-in provider is not configured right now.'
  }

  if (normalized.includes('missing oauth callback code')) {
    return 'We could not complete social sign-in from the callback. Please try again.'
  }

  if (normalized.includes('supabase_not_configured')) {
    return 'Social sign-in is not configured right now.'
  }

  return error
}

export function resolveSleeperLoginErrorMessage(error: string | null | undefined): string {
  if (!error) return 'Unable to sign in with Sleeper. Please try again.'
  if (error.includes('SLEEPER_LOOKUP_UNAVAILABLE')) {
    return 'Sleeper sign-in is temporarily unavailable. Please try again in a moment.'
  }
  return 'We could not find that Sleeper account. Please check the username and try again.'
}

export function resolvePasswordResetErrorMessage(
  errorCode: string | null | undefined
): string {
  const map: Record<string, string> = {
    INVALID_OR_USED_TOKEN: 'Invalid or expired code. Request a new one.',
    EXPIRED_TOKEN: 'Code expired. Request a new one.',
    WEAK_PASSWORD: 'Password must be at least 8 characters with a letter and number.',
    RESET_FAILED: 'Something went wrong. Please try again.',
    MISSING_FIELDS: 'Please complete all required fields.',
  }
  if (!errorCode) return 'Something went wrong.'
  return map[errorCode] ?? errorCode
}
