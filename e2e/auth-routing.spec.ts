import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth-flow';

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

test.describe('Protected route enforcement', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  const protectedRouteExpectations: Array<{ path: string; loginUrlPattern: RegExp }> = [
    { path: '/dashboard', loginUrlPattern: /\/login\?callbackUrl=\/dashboard/ },
    { path: '/settings', loginUrlPattern: /\/login\?callbackUrl=\/settings/ },
    { path: '/profile', loginUrlPattern: /\/login\?callbackUrl=\/profile/ },
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
    await expect(page.getByText(/admin sign in/i).first()).toBeVisible();
  });

  test('allows authenticated user to access protected app routes', async ({ page }) => {
    await registerAndLogin(page);
    await expect(page.getByRole('heading', { name: /welcome back,/i })).toBeVisible();

    const protectedRoutes = ['/dashboard', '/settings', '/profile'];
    for (const path of protectedRoutes) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login\?/);
    }
  });

  test('blocks protected routes again after logout', async ({ page }) => {
    await registerAndLogin(page);
    await signOutSession(page);

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
