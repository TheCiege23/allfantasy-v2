import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getLevelFromXp } from '@/lib/rank/levels'

export async function sendImportCompleteNotification(userId: string, jobId: string): Promise<void> {
  try {
    const job = await prisma.legacyImportJob.findUnique({
      where: { id: jobId },
    })
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        rankTier: true,
        xpLevel: true,
        careerWins: true,
        careerChampionships: true,
        careerSeasonsPlayed: true,
        xpTotal: true,
      },
    })
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    })

    const xpForName = Number(job?.lastXpTotal ?? profile?.xpTotal ?? 0)
    const levelName = getLevelFromXp(Number.isFinite(xpForName) ? xpForName : 0).name

    try {
      await prisma.platformNotification.create({
        data: {
          userId,
          sourceKey: `import-complete-${jobId}`,
          type: 'import_complete',
          productType: 'app',
          severity: 'medium',
          title: 'Your legacy profile is ready!',
          body: `Imported ${job?.totalLeaguesSaved ?? 0} leagues across ${job?.seasonsCompleted ?? 0} seasons. You ranked in at Level ${profile?.xpLevel ?? 1} — ${levelName}.`,
          meta: {
            jobId,
            totalLeagues: job?.totalLeaguesSaved,
            totalSeasons: job?.seasonsCompleted,
            rankTier: profile?.rankTier,
            xpLevel: profile?.xpLevel,
            levelName,
          } as Prisma.InputJsonValue,
        },
      })
    } catch (createErr: unknown) {
      const msg = createErr instanceof Error ? createErr.message : String(createErr)
      if (!msg.includes('Unique constraint') && !msg.includes('unique constraint')) {
        console.error('[notification] platform notification create failed:', createErr)
      }
    }

    if (user?.email) {
      try {
        const { Resend } = await import('resend')
        const apiKey = process.env.RESEND_API_KEY
        if (apiKey) {
          const resend = new Resend(apiKey)
          await resend.emails.send({
            from: 'AllFantasy <noreply@allfantasy.ai>',
            to: user.email,
            subject: `Your rank is in — Level ${profile?.xpLevel ?? 1} ${levelName}`,
            html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2>Your legacy profile is ready, ${user.displayName ?? 'Manager'}!</h2>
              <p>We finished scanning your full fantasy history:</p>
              <ul>
                <li><strong>${job?.totalLeaguesSaved ?? 0}</strong> leagues imported</li>
                <li><strong>${job?.seasonsCompleted ?? 0}</strong> seasons covered</li>
                <li><strong>${profile?.careerWins ?? 0}</strong> career wins</li>
                <li><strong>${profile?.careerChampionships ?? 0}</strong> championships</li>
              </ul>
              <div style="background:#f5f5f5;padding:20px;border-radius:12px;text-align:center;margin:24px 0">
                <div style="font-size:36px;font-weight:700">Level ${profile?.xpLevel ?? 1}</div>
                <div style="font-size:20px;margin-top:4px">${levelName}</div>
                <div style="color:#666;margin-top:4px">${profile?.rankTier ?? 'Rookie'} Tier</div>
              </div>
              <a href="https://www.allfantasy.ai/dashboard/rankings"
                 style="display:inline-block;background:#533AB7;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
                View My Rank
              </a>
            </div>
          `,
          })
        }
      } catch (emailErr: unknown) {
        console.error('[notification] email failed (non-fatal):', emailErr)
      }
    }

    await prisma.legacyImportJob.update({
      where: { id: jobId },
      data: { notificationSent: true },
    })
  } catch (err: unknown) {
    console.error('[sendImportCompleteNotification] error:', err)
  }
}
