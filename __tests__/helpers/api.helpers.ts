import type { Page, BrowserContext } from "@playwright/test"

/**
 * Makes an authenticated API request using the page's current session cookies.
 * Returns the Response-like object with status and json() method.
 */
export async function authenticatedFetch(
  page: Page,
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ status: number; data: unknown }> {
  return page.evaluate(
    async ({ endpoint, options }) => {
      const res = await fetch(endpoint, {
        method: options.method || "GET",
        headers: options.body ? { "Content-Type": "application/json" } : {},
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "include",
      })
      let data: unknown
      try {
        data = await res.json()
      } catch {
        data = null
      }
      return { status: res.status, data }
    },
    { endpoint, options }
  )
}

/**
 * Extracts the NextAuth session token cookie from the page context.
 * Returns null if not found.
 */
export async function getSessionCookie(context: BrowserContext): Promise<string | null> {
  const cookies = await context.cookies()
  const sessionCookie =
    cookies.find((c) => c.name === "next-auth.session-token") ||
    cookies.find((c) => c.name === "__Secure-next-auth.session-token")
  return sessionCookie?.value || null
}

/**
 * Makes a raw HTTP request without a browser session.
 * Useful for testing API endpoints directly.
 */
export async function makeRequest(
  page: Page,
  method: string,
  endpoint: string,
  options: { auth?: string; body?: unknown } = {}
): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
  return page.evaluate(
    async ({ method, endpoint, options }) => {
      const headers: Record<string, string> = {}
      if (options.body) headers["Content-Type"] = "application/json"
      if (options.auth) headers["Authorization"] = `Bearer ${options.auth}`

      const res = await fetch(endpoint, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      let data: unknown
      try {
        data = await res.json()
      } catch {
        data = null
      }

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      return { status: res.status, data, headers: responseHeaders }
    },
    { method, endpoint, options }
  )
}
