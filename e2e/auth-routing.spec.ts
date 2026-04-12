import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth-flow';

const hasAuthSecret = Boolean(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET);

async function signOutSession(page: import('@playwright/test').Page) {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  const csrfToken = csrfPayload?.csrfToken;
  if (!csrfToken) throw new Error('Missing csrfToken for signout');

  await page.request.post('/api/auth/signout?callbackUrl=%2F&json=true', {
    form: {
      csrfToken,
      callbackUrl: '/',
      json: 'true',
    },
  });
}

test.describe('@db Protected route enforcement', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  const protectedRouteExpectations: Array<{ path: string; loginUrlPattern: RegExp }> = [
    {
      path: '/af-rankings',
      loginUrlPattern: /\/login\?callbackUrl=(?:\/af-rankings|%2Faf-rankings)/,
    },
    {
      path: '/league/test-league',
      loginUrlPattern: /\/login\?callbackUrl=(?:\/league\/test-league|%2Fleague%2Ftest-league)/,
    },
  ];

  test('redirects unauthenticated users from protected app routes to /login', async ({ page }) => {
    test.skip(!hasAuthSecret, 'Middleware session redirects require NEXTAUTH_SECRET or AUTH_SECRET.');
    for (const route of protectedRouteExpectations) {
      await page.goto(route.path);
      await expect(page).toHaveURL(route.loginUrlPattern);
      await expect(page.getByText(/welcome back/i).first()).toBeVisible();
    }
  });

  test('redirects unauthenticated users from /admin to /login', async ({ page }) => {
    await page.goto('/admin?tab=overview');
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page.getByText(/welcome back/i).first()).toBeVisible();
  });

  test('allows authenticated user to access protected app routes', async ({ page }) => {
    await registerAndLogin(page);
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);

    const protectedRoutes = ['/dashboard', '/settings', '/profile'];
    for (const path of protectedRoutes) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login\?/);
    }
  });

  test('blocks protected routes again after logout', async ({ page }) => {
    test.skip(!hasAuthSecret, 'Middleware session redirects require NEXTAUTH_SECRET or AUTH_SECRET.');
    await registerAndLogin(page);
    await signOutSession(page);

    await page.goto('/af-rankings');
    await expect(page).toHaveURL(/\/login\?callbackUrl=(?:\/af-rankings|%2Faf-rankings)/);
  });

  test('returns auth errors for protected API routes when unauthenticated', async ({ request }) => {
    const userApi = await request.get('/api/onboarding/checklist');
    expect(userApi.status()).toBe(401);

    const adminApi = await request.get('/api/admin/summary');
    expect([401, 403]).toContain(adminApi.status());
  });
});
