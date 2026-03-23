export async function verifyResetCode(input: {
  email?: string
  phone?: string
  code: string
}): Promise<Response> {
  return fetch('/api/auth/password/reset/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function resetPasswordWithCode(input: {
  email?: string
  phone?: string
  code: string
  newPassword: string
}): Promise<Response> {
  return fetch('/api/auth/password/reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
