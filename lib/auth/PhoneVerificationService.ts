export async function sendPhoneVerificationCode(phone: string): Promise<Response> {
  return fetch('/api/verify/phone/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
}

export async function verifyPhoneCode(input: {
  phone: string
  code: string
}): Promise<Response> {
  return fetch('/api/verify/phone/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function sendSignupPhoneVerificationCode(
  phone: string
): Promise<Response> {
  return fetch('/api/auth/phone/signup/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
}

export async function verifySignupPhoneCode(input: {
  phone: string
  code: string
}): Promise<Response> {
  return fetch('/api/auth/phone/signup/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
}
