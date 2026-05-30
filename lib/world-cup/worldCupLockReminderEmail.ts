import "server-only"
import { prisma } from "@/lib/prisma"
import { sendNotificationEmail } from "@/lib/resend-client"

/**
 * Buckets that warrant an email send. 15m and "locked" are in-app/SMS only
 * to avoid inbox spam for tight windows.
 */
const EMAIL_BUCKETS = new Set(["24h", "6h"])

/**
 * Send bracket-lock reminder emails to every participant in a pool.
 * Called from worldCupBracketReminderService after the in-app/SMS dispatch.
 * Idempotency is handled at the caller level — this function is only invoked
 * when the parent emitLockReminderForChallenge confirms the event is new
 * (not a duplicate or skipped).
 */
export async function sendWorldCupLockReminderEmails(input: {
  challengeId: string
  poolName: string
  bucketKey: string
  pickLockAt: Date
}): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!EMAIL_BUCKETS.has(input.bucketKey)) {
    return { sent: 0, failed: 0, skipped: true }
  }

  // Fetch participant emails in a single join query
  const participants = await (prisma as any).worldCupBracketParticipant.findMany({
    where: { challengeId: input.challengeId },
    select: {
      user: {
        select: {
          email: true,
          displayName: true,
        },
      },
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""
  const bracketHref = `${baseUrl}/brackets/world-cup/${input.challengeId}`

  const lockLabel = input.pickLockAt.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })

  const bucketLabel =
    input.bucketKey === "24h" ? "24 hours" : "6 hours"

  const subject = `⏰ ${bucketLabel} left — "${input.poolName}" bracket lock`
  const bodyHtml = [
    `Your World Cup bracket pool <strong>${input.poolName}</strong>`,
    `locks in <strong>${bucketLabel}</strong> (${lockLabel}).`,
    `<br><br>Make sure all your picks are complete before the deadline.`,
    `Every unfinished matchup defaults to the away team.`,
  ].join(" ")

  let sent = 0
  let failed = 0

  for (const p of participants as any[]) {
    const email: string | undefined = p.user?.email
    if (!email) {
      failed++
      continue
    }
    const result = await sendNotificationEmail({
      to: email,
      subject,
      bodyHtml,
      actionHref: bracketHref,
      actionLabel: "Complete My Bracket",
    })
    if (result.ok) {
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed, skipped: false }
}
