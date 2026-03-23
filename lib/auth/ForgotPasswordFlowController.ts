export function normalizePhoneE164(raw: string): string {
  const digits = raw.trim().replace(/[^\d+]/g, '')
  if (!digits) return ''
  if (digits.startsWith('+')) return digits
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

export function isValidPhoneE164(raw: string): boolean {
  return /^\+\d{10,15}$/.test(raw)
}
