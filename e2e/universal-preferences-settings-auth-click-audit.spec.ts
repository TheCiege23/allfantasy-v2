import { expect, test, type Page } from "@playwright/test"

type Credentials = {
  email: string
  username: string
  password: string
}

function makeCredentials(): Credentials {
  const now = Date.now()
  return {
    email: `prefs.audit.${now}@example.com`,
    username: `prefsaudit${now}`,
    password: "Password123!",
  }
}

async function registerWithRetry(page: Page, credentials: Credentials) {
  const payload = {
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
  }

  let lastStatus = 0
  let lastBody = ""
  for (let attempt = 1; attempt <= 8; attempt++) {
    const response = await page.request.post("/api/auth/register", {
      headers: { "x-allfantasy-e2e": "1" },
      data: payload,
      timeout: 45_000,
    })

    lastStatus = response.status()
    lastBody = await response.text()
    if (response.ok()) return

    const dbUnavailable =
      response.status() === 503 &&
      (lastBody.includes("DB_UNAVAILABLE") ||
        lastBody.toLowerCase().includes("database temporarily unavailable"))

    if (!dbUnavailable) break
    await page.waitForTimeout(Math.min(1000 * attempt, 5000))
  }

  throw new Error(`register failed status=${lastStatus} body=${lastBody}`)
}

async function loginWithCredentials(page: Page, credentials: Credentials) {
  const csrfResponse = await page.request.get("/api/auth/csrf", { timeout: 20_000 })
  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string }
  if (!csrfPayload.csrfToken) {
    throw new Error("Missing csrf token for login")
  }

  const signInResponse = await page.request.post("/api/auth/callback/credentials?json=true", {
    form: {
      csrfToken: csrfPayload.csrfToken,
      login: credentials.username,
      password: credentials.password,
      callbackUrl: "/dashboard",
      json: "true",
    },
    timeout: 20_000,
  })
  const signInBody = await signInResponse.text()
  if (
    !signInResponse.ok() ||
    signInBody.includes("CredentialsSignin") ||
    signInBody.includes("error=CredentialsSignin")
  ) {
    throw new Error(`login failed status=${signInResponse.status()} body=${signInBody}`)
  }

  await page.goto("/dashboard")
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 25_000 })

  const sessionResponse = await page.request.get("/api/auth/session", { timeout: 10_000 })
  const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as {
    user?: { id?: string }
  }
  if (!sessionPayload?.user) {
    throw new Error("session user missing after login")
  }
}

async function signOutSession(page: Page) {
  const csrfResponse = await page.request.get("/api/auth/csrf")
  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string }
  const csrfToken = csrfPayload?.csrfToken
  if (!csrfToken) throw new Error("Missing csrf token for signout")

  await page.request.post("/api/auth/signout?callbackUrl=%2F&json=true", {
    form: {
      csrfToken,
      callbackUrl: "/",
      json: "true",
    },
  })
}

test.describe("@db @preferences universal preferences auth click audit", () => {
  test.describe.configure({ timeout: 180_000, mode: "serial" })

  test("audits header + settings + mobile toggles with persistence", async ({ page }) => {
    const credentials = makeCredentials()
    const profilePatchPayloads: Array<Record<string, unknown>> = []

    page.on("request", (request) => {
      if (request.method() !== "PATCH") return
      if (!request.url().includes("/api/user/profile")) return
      profilePatchPayloads.push((request.postDataJSON() ?? {}) as Record<string, unknown>)
    })

    await registerWithRetry(page, credentials)
    await loginWithCredentials(page, credentials)

    // Desktop header toggles
    await page.goto("/")
    const desktopSpanishToggle = page.getByRole("button", { name: "Spanish" }).first()
    await expect(desktopSpanishToggle).toBeVisible({ timeout: 15_000 })
    await desktopSpanishToggle.click()
    await expect.poll(async () => page.getAttribute("html", "data-lang")).toBe("es")

    const modeToggle = page.locator('button[aria-label$="Mode"]').first()
    const modeBefore = await page.getAttribute("html", "data-mode")
    await modeToggle.click()
    await expect
      .poll(async () => page.getAttribute("html", "data-mode"))
      .not.toBe(modeBefore)

    // Settings page selectors + save + cancel
    await page.goto("/settings?tab=preferences")
    await expect(page.getByText("Loading settings…")).not.toBeVisible({ timeout: 45_000 })
    const preferencesTabButton = page.getByRole("button", { name: "Preferences" }).first()
    await expect(preferencesTabButton).toBeVisible()
    await preferencesTabButton.click()

    const preferencesHeading = page.getByRole("heading", { name: /^preferences$/i })
    await expect(preferencesHeading).toBeVisible()

    const preferencesForm = page.locator("form").filter({ has: preferencesHeading }).first()
    await preferencesForm.locator("select").first().selectOption("America/Chicago")
    await preferencesForm.getByRole("button", { name: /español/i }).first().click()
    await preferencesForm.getByRole("button", { name: "Dark" }).click()
    await preferencesForm.getByRole("button", { name: /save preferences/i }).click()

    await expect.poll(async () => page.getAttribute("html", "data-lang")).toBe("es")
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem("af_lang"))).toBe("es")

    // Cross-route persistence
    for (const route of ["/app", "/brackets", "/af-legacy"]) {
      await page.goto(route)
      await expect.poll(async () => page.getAttribute("html", "data-lang")).toBe("es")
      await expect.poll(async () => page.getAttribute("html", "data-mode")).toMatch(/^(light|dark|legacy)$/)
    }

    // Auth redirect + persistence after re-login
    await signOutSession(page)
    await page.goto("/settings")
    await expect(page).toHaveURL(/\/login\?callbackUrl=\/settings/)

    await loginWithCredentials(page, credentials)
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
    await expect.poll(async () => page.getAttribute("html", "data-lang")).toBe("es")

    // Mobile toggle audit (route with mobile language row)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    await page.getByRole("button", { name: "Spanish" }).first().click()
    await expect.poll(async () => page.getAttribute("html", "data-lang")).toBe("es")

    expect(profilePatchPayloads.length).toBeGreaterThan(0)
    expect(
      profilePatchPayloads.some((payload) => typeof payload.preferredLanguage === "string")
    ).toBe(true)
    expect(profilePatchPayloads.some((payload) => typeof payload.themePreference === "string")).toBe(true)
    expect(profilePatchPayloads.some((payload) => payload.timezone === "America/Chicago")).toBe(true)
  })
})
