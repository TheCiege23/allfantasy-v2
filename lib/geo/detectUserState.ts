import type { GeoDetectionResult } from "./geoTypes"

export type { GeoDetectionResult } from "./geoTypes"

function getHeadersSource(input: Request | Headers): Headers {
  return input instanceof Headers ? input : input.headers
}

function extractClientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim()
  if (real) return real
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (fwd) return fwd
  return null
}

/**
 * Optional VPN/proxy check via proxycheck.io when PROXYCHECK_API_KEY is set.
 * On any failure, returns false (do not block solely due to check failure).
 */
async function detectVpnOrProxy(ip: string | null): Promise<boolean> {
  if (!ip) return false
  const key = process.env.PROXYCHECK_API_KEY?.trim()
  if (!key) return false
  try {
    const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}&vpn=1&asn=1`
    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } })
    if (!res.ok) return false
    const data = (await res.json()) as Record<string, unknown>
    const node = data[ip] as Record<string, unknown> | undefined
    if (!node || typeof node !== "object") return false
    const proxy = String(node.proxy ?? "").toLowerCase()
    const typ = String(node.type ?? "").toUpperCase()
    if (proxy === "yes") return true
    if (typ.includes("VPN")) return true
    return false
  } catch (e) {
    console.warn("[detectUserState] proxycheck failed:", e)
    return false
  }
}

/**
 * Optional secondary check via ipapi.co when IPAPI_KEY is set.
 */
async function ipapiVpnHint(ip: string | null): Promise<boolean> {
  if (!ip) return false
  const key = process.env.IPAPI_KEY?.trim()
  if (!key) return false
  try {
    const url = `https://ipapi.co/${encodeURIComponent(ip)}/json/?key=${encodeURIComponent(key)}`
    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } })
    if (!res.ok) return false
    const data = (await res.json()) as { org?: string; error?: boolean }
    if (data.error) return false
    const org = (data.org ?? "").toLowerCase()
    if (org.includes("vpn") || org.includes("proxy") || org.includes("hosting")) return true
    return false
  } catch {
    return false
  }
}

/**
 * Detects a user's US state from Vercel geo headers (Edge/API).
 * Optional VPN detection when PROXYCHECK_API_KEY / IPAPI_KEY are configured.
 */
export async function detectUserState(request: Request | Headers): Promise<GeoDetectionResult> {
  const headers = getHeadersSource(request)
  const country = headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? null
  const regionRaw = headers.get("x-vercel-ip-country-region")?.trim() ?? null
  const rawIp = extractClientIp(headers)

  let stateCode: string | null = null
  if (country === "US" && regionRaw) {
    stateCode = regionRaw.toUpperCase()
  }

  let isVpnOrProxy = false
  if (rawIp) {
    isVpnOrProxy = await detectVpnOrProxy(rawIp)
    if (!isVpnOrProxy) {
      isVpnOrProxy = await ipapiVpnHint(rawIp)
    }
  }

  const detectionSource: GeoDetectionResult["detectionSource"] =
    country != null || regionRaw != null ? "vercel_headers" : "unknown"

  return {
    stateCode,
    country,
    isVpnOrProxy,
    detectionSource,
    rawIp,
  }
}
