export function normalizeSignupPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 15)
}

export function formatSignupPhoneDisplay(rawDigits: string, countryCode = "+1"): string {
  const digits = rawDigits.replace(/\D/g, "").slice(0, 15)
  const country = countryCode.startsWith("+") ? countryCode : `+${countryCode.replace(/\D/g, "")}`
  const local =
    country === "+1" && digits.startsWith("1") && digits.length > 10
      ? digits.slice(1)
      : country === "+1"
        ? digits.slice(0, 10)
        : digits
  if (country === "+1") {
    if (local.length <= 3) return `(${local}`
    if (local.length <= 6) return `(${local.slice(0, 3)}) ${local.slice(3)}`
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
  }
  return local.replace(/(\d{3})(?=\d)/g, "$1 ").trim()
}

export function normalizePhoneForSubmit(raw: string, countryCode = "+1"): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith("+")) {
    const digits = normalizeSignupPhoneDigits(trimmed)
    return digits ? `+${digits}` : ""
  }
  const digits = normalizeSignupPhoneDigits(raw)
  if (!digits) return ""
  const countryDigits = countryCode.replace(/\D/g, "")
  if (!countryDigits) return `+${digits}`
  if (countryDigits === "1") {
    if (digits.length === 10) return `+1${digits}`
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  }
  if (digits.startsWith(countryDigits) && digits.length > countryDigits.length + 4) {
    return `+${digits}`
  }
  return `+${countryDigits}${digits}`
}
