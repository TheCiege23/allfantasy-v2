export type LegacyImportProvider =
  | "sleeper"
  | "yahoo"
  | "espn"
  | "mfl"
  | "fleaflicker"
  | "fantrax"

export const LEGACY_IMPORT_PROVIDERS: Array<{
  id: LegacyImportProvider
  label: string
  status: "available" | "planned"
}> = [
  { id: "sleeper", label: "Sleeper", status: "available" },
  { id: "yahoo", label: "Yahoo", status: "planned" },
  { id: "espn", label: "ESPN", status: "planned" },
  { id: "mfl", label: "MFL", status: "planned" },
  { id: "fleaflicker", label: "Fleaflicker", status: "planned" },
  { id: "fantrax", label: "Fantrax", status: "planned" },
]

export function getLegacyImportProviderMessage(
  provider: LegacyImportProvider
): string {
  if (provider === "sleeper") {
    return "Sleeper import is available now."
  }
  return `${provider.toUpperCase()} import onboarding is planned and will be enabled in a future release.`
}
