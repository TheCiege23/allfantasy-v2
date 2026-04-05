export interface GeoDetectionResult {
  stateCode: string | null
  country: string | null
  isVpnOrProxy: boolean
  detectionSource: "vercel_headers" | "ip_api" | "unknown"
  rawIp: string | null
}
