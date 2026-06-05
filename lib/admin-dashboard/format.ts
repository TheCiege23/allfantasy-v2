export function maskAdminEmail(email: string | null | undefined): string {
  const value = String(email ?? "").trim()
  if (!value.includes("@")) return "No email"
  const [name, domain] = value.split("@")
  const visible = name.length <= 2 ? `${name.slice(0, 1)}*` : `${name.slice(0, 2)}***`
  return `${visible}@${domain}`
}
