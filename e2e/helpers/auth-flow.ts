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

async function registerWithRetry(
  page: Page,
  credentials: TestCredentials
): Promise<void> {
  const maxAttempts = 2
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
        timeout: 20_000,
      })
    } catch (error) {
      lastError = String((error as Error)?.message ?? error)
      if (attempt < maxAttempts) {
        await delay(300 * attempt)
        continue
      }
      break
    }

    lastStatus = response.status()
    lastBody = await response.text()

    if (response.ok()) {
      return
    }

    const isDbUnavailable =
      lastStatus === 503 &&
      (lastBody.includes('"code":"DB_UNAVAILABLE"') ||
        lastBody.toLowerCase().includes("database temporarily unavailable"))

    if (!isDbUnavailable || attempt === maxAttempts) {
      break
    }

    await delay(300 * attempt)
  }

  if (lastError) {
    throw new Error(`Registration failed after retries: ${lastError}`)
  }

  throw new Error(`Registration failed with status ${lastStatus}: ${lastBody}`)
}

async function loginWithRetry(page: Page, credentials: TestCredentials): Promise<void> {
  const maxAttempts = 3
  let lastError = ""

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const csrfResponse = await page.request.get("/api/auth/csrf", { timeout: 10_000 })
      const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string }
      const csrfToken = csrfPayload?.csrfToken

      if (!csrfToken) {
        lastError = `Missing csrfToken (status ${csrfResponse.status()})`
        if (attempt < maxAttempts) {
          await delay(250 * attempt)
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
          await delay(250 * attempt)
          continue
        }
        break
      }
    } catch (error) {
      lastError = String((error as Error)?.message ?? error)
      if (attempt < maxAttempts) {
        await delay(250 * attempt)
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
        await delay(250 * attempt)
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
