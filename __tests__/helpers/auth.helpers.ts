import { Page, APIRequestContext } from "@playwright/test"
import { SELECTORS, ROUTES } from "./selectors"

/**
 * Fill and submit the signup form
 */
export async function signup(
  page: Page,
  {
    username,
    email,
    password,
    confirmPassword,
    displayName,
    ageConfirm = true,
    phone,
  }: {
    username: string
    email: string
    password: string
    confirmPassword?: string
    displayName?: string
    ageConfirm?: boolean
    phone?: string
  }
) {
  await page.goto(ROUTES.signup)
  await page.fill(SELECTORS.signup.username, username)
  await page.fill(SELECTORS.signup.email, email)
  await page.fill(SELECTORS.signup.password, password)
  await page.fill(SELECTORS.signup.confirmPassword, confirmPassword ?? password)
  if (displayName) {
    await page.fill(SELECTORS.signup.displayName, displayName)
  }
  if (phone) {
    await page.fill(SELECTORS.signup.phone, phone)
  }
  if (ageConfirm) {
    const checkbox = page.locator(SELECTORS.signup.ageConfirm)
    const checked = await checkbox.isChecked()
    if (!checked) {
      await checkbox.check()
    }
  }
  await page.click(SELECTORS.signup.submit)
}

/**
 * Fill and submit the signin form
 */
export async function signin(
  page: Page,
  { login, password }: { login: string; password: string }
) {
  await page.goto(ROUTES.login)
  await page.fill(SELECTORS.signin.login, login)
  await page.fill(SELECTORS.signin.password, password)
  await page.click(SELECTORS.signin.submit)
}

/**
 * Sign out via the dashboard navbar button
 */
export async function signout(page: Page) {
  await page.click(SELECTORS.navbar.logout)
  await page.waitForURL(`**${ROUTES.login}**`)
}

/**
 * Create a user via the API and return its credentials
 */
export async function createUserViaApi(
  request: APIRequestContext,
  {
    username,
    email,
    password,
  }: { username: string; email: string; password: string }
) {
  const res = await request.post(ROUTES.api.register, {
    data: {
      username,
      email,
      password,
      ageConfirmed: true,
      verificationMethod: "EMAIL",
    },
  })
  return { status: res.status(), body: await res.json() }
}

/**
 * Returns headers that spoof a custom client IP for rate-limit tests
 */
export function spoofIpHeaders(ip: string) {
  return { "x-forwarded-for": ip }
}
