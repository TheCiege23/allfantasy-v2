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
