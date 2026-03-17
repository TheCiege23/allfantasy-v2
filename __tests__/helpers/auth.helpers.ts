import type { Page } from "@playwright/test"
import { SIGNIN, SIGNUP } from "./selectors"

export interface SignUpData {
  username: string
  email: string
  password: string
  displayName?: string
  phone?: string
  ageConfirm?: boolean
}

export interface SignInData {
  login: string
  password: string
}

/**
 * Completes the full signup flow via the UI.
 * Fills in all required fields and submits the form.
 */
export async function signUp(page: Page, data: SignUpData): Promise<void> {
  await page.goto("/signup")
  await page.waitForSelector(SIGNUP.username)

  await page.fill(SIGNUP.username, data.username)
  await page.fill(SIGNUP.email, data.email)
  await page.fill(SIGNUP.password, data.password)

  if (data.displayName) {
    await page.fill(SIGNUP.displayName, data.displayName)
  }

  if (data.phone) {
    await page.fill(SIGNUP.phone, data.phone)
  }

  if (data.ageConfirm !== false) {
    const checkbox = page.locator(SIGNUP.ageConfirm)
    const checked = await checkbox.isChecked()
    if (!checked) {
      await checkbox.check()
    }
  }

  await page.click(SIGNUP.submit)
}

/**
 * Completes the full signin flow via the UI.
 * Navigates to /login, fills credentials, and submits.
 */
export async function signIn(page: Page, data: SignInData): Promise<void> {
  await page.goto("/login")
  await page.waitForSelector(SIGNIN.login)

  await page.fill(SIGNIN.login, data.login)
  await page.fill(SIGNIN.password, data.password)
  await page.click(SIGNIN.submit)
}

/**
 * Signs in via the login page and waits for redirect to dashboard.
 * Use when you need a fully authenticated session for subsequent tests.
 */
export async function signInAndWait(page: Page, data: SignInData, redirectTo = "/dashboard"): Promise<void> {
  await signIn(page, data)
  await page.waitForURL(new RegExp(redirectTo.replace("/", "\\/")), { timeout: 10000 }).catch(() => {})
}

/**
 * Signs out via the NextAuth signout endpoint.
 */
export async function signOut(page: Page): Promise<void> {
  await page.goto("/api/auth/signout")
  const submitBtn = page.locator('button[type="submit"]')
  if (await submitBtn.isVisible()) {
    await submitBtn.click()
  }
  await page.waitForURL(/\/(login|$)/, { timeout: 10000 }).catch(() => {})
}

/**
 * Retrieves the current session by calling /api/auth/session.
 * Returns null if not authenticated.
 */
export async function getSession(page: Page): Promise<Record<string, unknown> | null> {
  const response = await page.evaluate(async () => {
    const res = await fetch("/api/auth/session")
    if (!res.ok) return null
    const data = await res.json()
    return Object.keys(data).length === 0 ? null : data
  })
  return response as Record<string, unknown> | null
}

/**
 * Waits for an error message to appear in the signin form.
 */
export async function waitForSignInError(page: Page): Promise<string> {
  await page.waitForSelector(SIGNIN.error, { timeout: 8000 })
  return (await page.locator(SIGNIN.error).textContent()) ?? ""
}

/**
 * Waits for an error message to appear in the signup form.
 */
export async function waitForSignUpError(page: Page): Promise<string> {
  await page.waitForSelector(SIGNUP.error, { timeout: 8000 })
  return (await page.locator(SIGNUP.error).textContent()) ?? ""
}
