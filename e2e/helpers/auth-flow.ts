import { type Page } from "@playwright/test"

type TestCredentials = {
  email: string
  username: string
  password: string
}

function makeTestCredentials(): TestCredentials {
  const now = Date.now()
  return {
    email: `e2e.${now}@example.com`,
    username: `e2e${now}`,
    password: "Password123!",
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function computeBackoffMs(attempt: number): number {
  const base = Math.min(1000 * 2 ** (attempt - 1), 20_000)
  const jitter = Math.floor(Math.random() * 300)
  return base + jitter
}

function parseRetryAfterMs(value: string | undefined): number | null {
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.floor(seconds * 1000)
  }
  const targetMs = Date.parse(value)
  if (Number.isNaN(targetMs)) return null
  const delta = targetMs - Date.now()
  return delta > 0 ? delta : null
}

async function registerWithRetry(
  page: Page,
  credentials: TestCredentials
): Promise<void> {
  const maxAttempts = 12
  let lastStatus = 0
  let lastBody = ""
  let lastError = ""

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response
    try {
      response = await page.request.post("/api/auth/register", {
        headers: {
          "x-allfantasy-e2e": "1",
        },
        data: {
          username: credentials.username,
          email: credentials.email,
          password: credentials.password,
          displayName: credentials.username,
          ageConfirmed: true,
          verificationMethod: "EMAIL",
          timezone: "America/New_York",
          preferredLanguage: "en",
          avatarPreset: "crest",
          disclaimerAgreed: true,
          termsAgreed: true,
        },
        timeout: 45_000,
      })
    } catch (error) {
      lastError = String((error as Error)?.message ?? error)
      if (attempt < maxAttempts) {
        await delay(computeBackoffMs(attempt))
        continue
      }
      break
    }

    lastStatus = response.status()
    lastBody = await response.text()

    if (response.ok()) {
      return
    }

    let errorCode: string | undefined
    try {
      const parsed = JSON.parse(lastBody) as { code?: string }
      errorCode = parsed?.code
    } catch {}

    const isDbUnavailable =
      lastStatus === 503 &&
      (errorCode === "DB_UNAVAILABLE" ||
        lastBody.includes('"code":"DB_UNAVAILABLE"') ||
        lastBody.toLowerCase().includes("database temporarily unavailable"))

    if (!isDbUnavailable || attempt === maxAttempts) {
      break
    }

    const retryAfterMs = parseRetryAfterMs(response.headers()["retry-after"])
    const retryDelayMs = retryAfterMs != null
      ? Math.min(retryAfterMs, 20_000)
      : computeBackoffMs(attempt)
    await delay(retryDelayMs)
  }

  if (lastError) {
    throw new Error(`Registration failed after retries: ${lastError}`)
  }

  throw new Error(`Registration failed with status ${lastStatus}: ${lastBody}`)
}

async function loginWithRetry(page: Page, credentials: TestCredentials): Promise<void> {
  const maxAttempts = 8
  let lastError = ""

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const csrfResponse = await page.request.get("/api/auth/csrf", { timeout: 15_000 })
      const csrfText = await csrfResponse.text()
      if (!csrfResponse.ok()) {
        lastError = `csrf status=${csrfResponse.status()} body=${csrfText}`
        if (attempt < maxAttempts) {
          await delay(computeBackoffMs(attempt))
          continue
        }
        break
      }

      let csrfPayload: { csrfToken?: string } = {}
      try {
        csrfPayload = JSON.parse(csrfText) as { csrfToken?: string }
      } catch {
        lastError = `Invalid csrf response body: ${csrfText.slice(0, 120)}`
        if (attempt < maxAttempts) {
          await delay(computeBackoffMs(attempt))
          continue
        }
        break
      }
      const csrfToken = csrfPayload?.csrfToken

      if (!csrfToken) {
        lastError = `Missing csrfToken (status ${csrfResponse.status()})`
        if (attempt < maxAttempts) {
          await delay(computeBackoffMs(attempt))
          continue
        }
        break
      }

      const signInResponse = await page.request.post("/api/auth/callback/credentials?json=true", {
        form: {
          csrfToken,
          login: credentials.username,
          password: credentials.password,
          callbackUrl: "/dashboard",
          json: "true",
        },
        timeout: 15_000,
      })

      const signInText = await signInResponse.text()
      const maybeErrorUrl =
        signInText.includes("CredentialsSignin") ||
        signInText.includes("error=CredentialsSignin") ||
        signInText.includes("/login?")

      if (!signInResponse.ok() || maybeErrorUrl) {
        lastError = `signIn status=${signInResponse.status()} body=${signInText}`
        if (attempt < maxAttempts) {
          await delay(computeBackoffMs(attempt))
          continue
        }
        break
      }
    } catch (error) {
      lastError = String((error as Error)?.message ?? error)
      if (attempt < maxAttempts) {
        await delay(computeBackoffMs(attempt))
        continue
      }
      break
    }

    try {
      await page.goto("/dashboard")
      await page.waitForURL("/dashboard")
      return
    } catch (error) {
      lastError = String((error as Error)?.message ?? error)
      if (attempt < maxAttempts) {
        await delay(computeBackoffMs(attempt))
      }
    }
  }

  throw new Error(`Login failed after retries. ${lastError || `Final URL: ${page.url()}`}`)
}

export async function registerAndLogin(page: Page): Promise<void> {
  const credentials = makeTestCredentials()

  await registerWithRetry(page, credentials)
  await loginWithRetry(page, credentials)
}
