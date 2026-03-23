export async function requestPasswordResetByEmail(input: {
  email: string
  returnTo?: string
}): Promise<Response> {
  return fetch('/api/auth/password/reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email',
      email: input.email,
      returnTo: input.returnTo,
    }),
  })
}

export async function requestPasswordResetBySms(input: {
  phone: string
  returnTo?: string
}): Promise<Response> {
  return fetch('/api/auth/password/reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'sms',
      phone: input.phone,
      returnTo: input.returnTo,
    }),
  })
}
