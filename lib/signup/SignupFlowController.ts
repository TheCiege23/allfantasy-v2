export function normalizeSignupPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 11)
}

export function formatSignupPhoneDisplay(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, "").slice(0, 11)
  const local =
    digits.startsWith("1") && digits.length > 10
      ? digits.slice(1)
      : digits.slice(0, 10)
  if (local.length <= 3) return `(${local}`
  if (local.length <= 6) return `(${local.slice(0, 3)}) ${local.slice(3)}`
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
}

export function normalizePhoneForSubmit(raw: string): string {
  const digits = normalizeSignupPhoneDigits(raw)
  if (!digits) return ""
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}
