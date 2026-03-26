import type { FantasyMediaDestinationType } from "./destinations"

export interface FantasyMediaProviderCredentialRefreshPayload {
  providerId: string
  destinationType: FantasyMediaDestinationType
  userId: string
  accessToken: string
  expiresInSeconds: number | null
}

export interface FantasyMediaPublishProviderRequest {
  destinationType: FantasyMediaDestinationType
  episodeId: string
  title: string
  playbackUrl: string
  userId: string
  onCredentialRefresh?: (
    payload: FantasyMediaProviderCredentialRefreshPayload
  ) => void | Promise<void>
}

export interface FantasyMediaPublishProviderResponse {
  status: "pending" | "success" | "failed"
  message?: string
  responseMetadata?: Record<string, unknown>
}

export interface FantasyMediaPublishProvider {
  id: string
  supports(destinationType: FantasyMediaDestinationType): boolean
  isConfigured(): boolean
  publish(input: FantasyMediaPublishProviderRequest): Promise<FantasyMediaPublishProviderResponse>
}
