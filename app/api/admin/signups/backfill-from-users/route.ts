import { withApiUsage } from '@/lib/telemetry/usage'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * Admin backfill: mirror every existing `AppUser` into `EarlyAccessSignup`
 * so the admin "Signups" tab surfaces accounts created before the register-route
 * mirror was wired. Idempotent (upsert by email). Safe to run repeatedly.
 *
 * - Sets `source: 'account_signup'` for new rows
 * - Sets `confirmedAt` = `AppUser.emailVerified` when the user is already verified
 * - Never overwrites an existing `confirmedAt` on rows that already exist
 * - Never mutates rows whose source is NOT `account_signup` (preserves waitlist)
 */
export const POST = withApiUsage({
  endpoint: '/api/admin/signups/backfill-from-users',
  tool: 'AdminSignupsBackfillFromUsers',
})(async () => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const users = await prisma.appUser.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        username: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    let scanned = 0
    let created = 0
    let promoted = 0 // existing row that got `confirmedAt` set from emailVerified
    let alreadyPresent = 0
    let skipped = 0 // rows owned by a different `source` (waitlist etc.) — left untouched

    for (const u of users) {
      scanned += 1
      const email = u.email?.trim().toLowerCase()
      if (!email) {
        skipped += 1
        continue
      }
      const mirrorName =
        typeof u.displayName === 'string' && u.displayName.trim() ? u.displayName.trim() : u.username

      const existing = await prisma.earlyAccessSignup.findUnique({
        where: { email },
        select: { id: true, source: true, confirmedAt: true },
      })

      if (!existing) {
        await prisma.earlyAccessSignup.create({
          data: {
            email,
            name: mirrorName,
            source: 'account_signup',
            confirmedAt: u.emailVerified ?? null,
            createdAt: u.createdAt,
          },
        })
        created += 1
        continue
      }

      // Row exists — if it was a waitlist / external entry, leave it alone so we don't
      // trample the audit trail. Only update if it's already tagged account_signup.
      if (existing.source !== 'account_signup') {
        alreadyPresent += 1
        continue
      }

      if (existing.confirmedAt == null && u.emailVerified != null) {
        await prisma.earlyAccessSignup.update({
          where: { email },
          data: { confirmedAt: u.emailVerified },
        })
        promoted += 1
      } else {
        alreadyPresent += 1
      }
    }

    await prisma.analyticsEvent
      .create({
        data: {
          event: 'tool_use',
          toolKey: 'admin_signups_backfill_from_users',
          path: '/api/admin/signups/backfill-from-users',
          userId: gate.user.id,
          meta: {
            adminEmail: gate.user.email,
            scanned,
            created,
            promoted,
            alreadyPresent,
            skipped,
          },
        },
      })
      .catch(() => {})

    return NextResponse.json({
      ok: true,
      scanned,
      created,
      promoted,
      alreadyPresent,
      skipped,
    })
  } catch (e) {
    console.error('[admin/signups/backfill-from-users]', e)
    return NextResponse.json({ ok: false, error: 'Backfill failed' }, { status: 500 })
  }
})
