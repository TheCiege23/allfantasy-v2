import { APIRequestContext } from "@playwright/test"
import { ROUTES } from "./selectors"

/**
 * Call any API endpoint with an optional session cookie
 */
export async function apiGet(
  request: APIRequestContext,
  url: string,
  options: { headers?: Record<string, string> } = {}
) {
  return request.get(url, { headers: options.headers })
}

export async function apiPost(
  request: APIRequestContext,
  url: string,
  data: Record<string, unknown>,
  options: { headers?: Record<string, string> } = {}
) {
  return request.post(url, {
    data,
    headers: { "Content-Type": "application/json", ...options.headers },
  })
}

/**
 * Retrieve session data from /api/auth/session
 */
export async function getSessionViaApi(request: APIRequestContext) {
  const res = await request.get(ROUTES.api.nextauth)
  if (!res.ok()) return null
  return res.json()
}

/**
 * Call /api/user/profile and return the response
 */
export async function getUserProfileViaApi(request: APIRequestContext) {
  return request.get(ROUTES.api.userProfile)
}

/**
 * Attempt to create a league via the API
 */
export async function createLeagueViaApi(
  request: APIRequestContext,
  data: Record<string, unknown> = {}
) {
  return request.post(ROUTES.api.leagueCreate, {
    data: {
      name: "Test League",
      platform: "manual",
      leagueSize: 10,
      scoring: "PPR",
      isDynasty: false,
      userId: "placeholder",
      ...data,
    },
    headers: { "Content-Type": "application/json" },
  })
}
