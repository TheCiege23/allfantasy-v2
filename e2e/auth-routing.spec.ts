import { test, expect } from '@playwright/test';

function makeTestCredentials() {
  const now = Date.now();
  const email = `e2e+${now}@example.com`;
  const username = `e2e${now}`;
  const password = `Password123!`;
  return { email, username, password };
}

async function registerAndLogin(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const { email, username, password } = makeTestCredentials();

  const res = await request.post('/api/auth/register', {
    data: {
      username,
      email,
      password,
      displayName: username,
      ageConfirmed: true,
      verificationMethod: 'EMAIL',
      timezone: 'America/New_York',
      preferredLanguage: 'en',
      avatarPreset: 'crest',
      disclaimerAgreed: true,
      termsAgreed: true,
    },
  });

  expect(res.ok()).toBeTruthy();

  await page.goto('/login?callbackUrl=/dashboard');
  await page.fill('#login-identifier', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Protected route enforcement', () => {
  const protectedRouteExpectations: Array<{ path: string; loginUrlPattern: RegExp }> = [
    { path: '/dashboard', loginUrlPattern: /\/login\?callbackUrl=\/dashboard/ },
    { path: '/settings', loginUrlPattern: /\/login\?callbackUrl=\/settings/ },
    { path: '/profile', loginUrlPattern: /\/login\?callbackUrl=\/profile/ },
    { path: '/app/league/e2e-league', loginUrlPattern: /\/login\?callbackUrl=\/app\/league\/e2e-league/ },
  ];

  test('redirects unauthenticated users from protected app routes to /login', async ({ page }) => {
    for (const route of protectedRouteExpectations) {
      await page.goto(route.path);
      await expect(page).toHaveURL(route.loginUrlPattern);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    }
  });

  test('redirects unauthenticated users from /admin to /login', async ({ page }) => {
    await page.goto('/admin?tab=overview');
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('allows authenticated user to access protected app routes', async ({ page, request }) => {
    await registerAndLogin(page, request);
    await expect(page.getByRole('heading', { name: /welcome,/i })).toBeVisible();

    const protectedRoutes = ['/dashboard', '/settings', '/profile', '/app/league/e2e-league'];
    for (const path of protectedRoutes) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login\?/);
    }
  });

  test('blocks protected routes again after logout', async ({ page, request }) => {
    await registerAndLogin(page, request);

    await page.goto('/logout?callbackUrl=/');
    await page.waitForURL('/');

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?callbackUrl=\/dashboard/);
  });

  test('returns auth errors for protected API routes when unauthenticated', async ({ request }) => {
    const userApi = await request.get('/api/onboarding/checklist');
    expect(userApi.status()).toBe(401);

    const adminApi = await request.get('/api/admin/summary');
    expect([401, 403]).toContain(adminApi.status());
  });
});
