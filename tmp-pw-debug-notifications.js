const { chromium } = require('playwright');

async function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function computeBackoffMs(attempt) { return Math.min(1000 * 2 ** (attempt - 1), 20000) + Math.floor(Math.random() * 300); }
function parseRetryAfterMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.floor(seconds * 1000);
  const targetMs = Date.parse(value);
  if (Number.isNaN(targetMs)) return null;
  const delta = targetMs - Date.now();
  return delta > 0 ? delta : null;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:3004' });
  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log('[console]', msg.type(), msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('[pageerror]', err && err.stack ? err.stack : String(err));
  });
  page.on('response', async (res) => {
    if (!res.url().includes('/api/')) return;
    if (res.status() < 400) return;
    let body = '';
    try {
      body = await res.text();
    } catch {}
    console.log('[api]', res.status(), res.url(), body.slice(0, 400));
  });

  const now = Date.now();
  const credentials = {
    email: `e2e.${now}@example.com`,
    username: `e2e${now}`,
    password: 'Password123!',
  };

  for (let attempt = 1; attempt <= 12; attempt++) {
    const response = await page.request.post('/api/auth/register', {
      headers: { 'x-allfantasy-e2e': '1' },
      data: {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        displayName: credentials.username,
        ageConfirmed: true,
        verificationMethod: 'EMAIL',
        timezone: 'America/New_York',
        preferredLanguage: 'en',
        avatarPreset: 'crest',
        disclaimerAgreed: true,
        termsAgreed: true,
      },
      timeout: 45000,
    });

    const text = await response.text();
    if (response.ok()) break;
    let errorCode;
    try { errorCode = JSON.parse(text).code; } catch {}
    const isDbUnavailable = response.status() === 503 && (errorCode === 'DB_UNAVAILABLE' || text.includes('DB_UNAVAILABLE'));
    if (!isDbUnavailable || attempt === 12) throw new Error(`register failed status=${response.status()} body=${text}`);
    const retryAfterMs = parseRetryAfterMs(response.headers()['retry-after']);
    await delay(retryAfterMs != null ? Math.min(retryAfterMs, 20000) : computeBackoffMs(attempt));
  }

  const csrfResponse = await page.request.get('/api/auth/csrf', { timeout: 15000 });
  const csrf = await csrfResponse.json();
  const signInResponse = await page.request.post('/api/auth/callback/credentials?json=true', {
    form: {
      csrfToken: csrf.csrfToken,
      login: credentials.username,
      password: credentials.password,
      callbackUrl: '/dashboard',
      json: 'true',
    },
    timeout: 15000,
  });
  console.log('[signin]', signInResponse.status(), await signInResponse.text());

  await page.route('**/api/user/settings', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          userId: 'notif-audit-user', username: 'notifaudit', email: 'notif.audit@example.com',
          displayName: 'Notif Audit', profileImageUrl: null, avatarPreset: 'crest', preferredLanguage: 'en',
          timezone: 'America/New_York', themePreference: 'dark', phone: '+15555550199',
          phoneVerifiedAt: new Date().toISOString(), emailVerifiedAt: null, ageConfirmedAt: null,
          verificationMethod: 'EMAIL', hasPassword: true, profileComplete: true, sleeperUsername: null,
          sleeperLinkedAt: null, bio: null, preferredSports: ['NFL'],
          notificationPreferences: { globalEnabled: true, categories: {} },
          onboardingStep: null, onboardingCompletedAt: null, settings: null, updatedAt: new Date().toISOString(),
        },
        settings: { legalAcceptanceState: { ageVerified: true, disclaimerAccepted: true, termsAccepted: true, acceptedAt: new Date().toISOString() } },
      }),
    });
  });
  await page.route('**/api/user/profile', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ userId: 'notif-audit-user', email: 'notif.audit@example.com' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.route('**/api/ai/alerts/preferences', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prefs: { frequency: 'normal', sensitivity: 'normal', mutedClasses: [], mutedTypes: [], channelPreferences: { disablePush: false, disableEmail: false, disableSms: false }, commissionerPrefs: { enabled: true, receiveSuspiciousTradeAlerts: true, receiveOrphanTeamAlerts: true, receiveIntegrityAlerts: true } } }) });
  });
  await page.route('**/api/user/notifications/test', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, sent: { inApp: true, email: true, sms: false }, blockedReasons: [] }) });
  });
  await page.route('**/api/alerts/preferences', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ injuryAlerts: true, performanceAlerts: true, lineupAlerts: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await page.goto('/settings?tab=notifications', { waitUntil: 'domcontentloaded' });
  await delay(5000);
  console.log('[final-url]', page.url());
  console.log('[body]', (await page.locator('body').innerText()).slice(0, 1200));

  await browser.close();
})();
