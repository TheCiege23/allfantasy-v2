export type LegacyProviderId = "sleeper" | "yahoo" | "espn" | "mfl" | "fleaflicker" | "fantrax"

export interface LegacyProviderStatus {
  linked: boolean
  importStatus: string | null
  lastJobAt?: string
  error?: string
  available: boolean
}

export interface LegacyImportStatusResponse {
  sleeperUsername: string | null
  providers: Record<string, LegacyProviderStatus>
}
