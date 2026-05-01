import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

type ResetFixture = {
  userId: string;
  email: string;
  username: string;
  phone: string;
  resetCode: string;
  oldPassword: string;
  newPassword: string;
};

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function buildFixture(): ResetFixture {
  const now = Date.now();
  const suffix = String(now).slice(-8);
  const codeNumber = (Number(suffix.slice(-6)) % 900000) + 100000;
  return {
    userId: randomUUID(),
    email: `pwreset.e2e.${suffix}@example.com`,
    username: `pwreset${suffix}`,
    phone: `+1555${suffix.slice(-7)}`,
    resetCode: String(codeNumber),
    oldPassword: 'OldPassword123!',
    newPassword: 'NewPassword123!',
  };
}

function resolvePgConnectionString(): string {
  const candidates = [
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (!candidate.startsWith('prisma://')) return candidate;
  }

  throw new Error('No direct Postgres connection string found for E2E setup.');
}

async function withPgClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: resolvePgConnectionString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function seedResetFixture(fixture: ResetFixture): Promise<void> {
  const passwordHash = await bcrypt.hash(fixture.oldPassword, 12);
  const tokenHash = sha256Hex(fixture.resetCode);

  await withPgClient(async (client) => {
    await client.query(
      `insert into app_users (id, email, username, "passwordHash", "displayName", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, now(), now())`,
      [fixture.userId, fixture.email, fixture.username, passwordHash, fixture.username]
    );

    await client.query(
      `insert into user_profiles ("userId", phone, "phoneVerifiedAt", "profileComplete", "createdAt", "updatedAt")
       values ($1, $2, now(), true, now(), now())`,
      [fixture.userId, fixture.phone]
    );

    await client.query(
      `insert into password_reset_tokens (id, "userId", "tokenHash", "expiresAt")
       values ($1, $2, $3, now() + interval '15 minutes')`,
      [randomUUID(), fixture.userId, tokenHash]
    );
  });
}

async function cleanupResetFixture(userId: string): Promise<void> {
  await withPgClient(async (client) => {
    await client.query(`delete from password_reset_tokens where "userId" = $1`, [userId]);
    await client.query(`delete from user_profiles where "userId" = $1`, [userId]);
    await client.query(`delete from app_users where id = $1`, [userId]);
  });
}

async function resetTokenExists(userId: string, code: string): Promise<boolean> {
  const tokenHash = sha256Hex(code);
  return withPgClient(async (client) => {
    const result = await client.query(
      `select 1 from password_reset_tokens where "userId" = $1 and "tokenHash" = $2 limit 1`,
      [userId, tokenHash]
    );
    return result.rowCount > 0;
  });
}

async function canLoginWithCredentials(
  request: import('@playwright/test').APIRequestContext,
  login: string,
  password: string
): Promise<boolean> {
  const csrfResponse = await request.get('/api/auth/csrf');
  if (!csrfResponse.ok()) return false;

  const csrfJson = (await csrfResponse.json().catch(() => ({}))) as { csrfToken?: string };
  if (!csrfJson.csrfToken) return false;

  const signInResponse = await request.post('/api/auth/callback/credentials?json=true', {
    form: {
      csrfToken: csrfJson.csrfToken,
      login,
      password,
      callbackUrl: '/dashboard',
      json: 'true',
    },
  });

  const body = await signInResponse.text();
  return signInResponse.ok() && !/CredentialsSignin|error=CredentialsSignin|\/login\?/.test(body);
}

test.describe('@db Auth password reset API E2E', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test('verifies code, confirms reset, invalidates token, and rotates password', async ({ request }) => {
    const fixture = buildFixture();
    await seedResetFixture(fixture);

    try {
      const verifyResponse = await request.post('/api/auth/password/reset/verify-code', {
        data: { phone: fixture.phone, code: fixture.resetCode },
      });
      expect(verifyResponse.status()).toBe(200);

      const confirmResponse = await request.post('/api/auth/password/reset/confirm', {
        data: {
          phone: fixture.phone,
          code: fixture.resetCode,
          newPassword: fixture.newPassword,
        },
      });
      expect(confirmResponse.status()).toBe(200);

      const oldPasswordLoginOk = await canLoginWithCredentials(request, fixture.username, fixture.oldPassword);
      const newPasswordLoginOk = await canLoginWithCredentials(request, fixture.username, fixture.newPassword);

      expect(oldPasswordLoginOk).toBe(false);
      expect(newPasswordLoginOk).toBe(true);
      expect(await resetTokenExists(fixture.userId, fixture.resetCode)).toBe(false);
    } finally {
      await cleanupResetFixture(fixture.userId);
    }
  });

  test('returns missing-fields error when confirm payload has no newPassword', async ({ request }) => {
    const fixture = buildFixture();
    await seedResetFixture(fixture);

    try {
      const confirmResponse = await request.post('/api/auth/password/reset/confirm', {
        data: {
          phone: fixture.phone,
          code: fixture.resetCode,
        },
      });

      expect(confirmResponse.status()).toBe(400);
      const body = (await confirmResponse.json()) as { error?: string };
      expect(body.error).toBe('MISSING_FIELDS');
    } finally {
      await cleanupResetFixture(fixture.userId);
    }
  });
});
