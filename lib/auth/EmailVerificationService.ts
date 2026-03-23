export async function sendEmailVerificationLink(returnTo?: string): Promise<Response> {
  return fetch('/api/auth/verify-email/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ returnTo }),
  })
}
