export const CFBD_ENV_VARS = ["CFBD_API_KEY", "CFBD_KEY"] as const

export function getCfbdApiKey(): string {
  return process.env.CFBD_API_KEY?.trim() || process.env.CFBD_KEY?.trim() || ""
}

export function hasCfbdApiKey(): boolean {
  return Boolean(getCfbdApiKey())
}
