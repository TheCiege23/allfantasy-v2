export type SignInProviderId = "google" | "apple" | "facebook" | "instagram" | "x" | "tiktok"

export interface ProviderStatus {
  id: SignInProviderId
  name: string
  configured: boolean
  linked: boolean
}

export interface ConnectedAccountsResponse {
  providers: ProviderStatus[]
}
