export interface SignInValidationInput {
  login: string
  password: string
}

export function validateSignInInput(input: SignInValidationInput): {
  ok: boolean
  error?: string
} {
  if (!input.login.trim()) {
    return {
      ok: false,
      error: 'Enter your email, username, or mobile number.',
    }
  }
  if (!input.password) {
    return {
      ok: false,
      error: 'Enter your password.',
    }
  }
  return { ok: true }
}
