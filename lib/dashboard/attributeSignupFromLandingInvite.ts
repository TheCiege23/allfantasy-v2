import { prisma } from '@/lib/prisma'
import { attributeSignupToReferrer } from '@/lib/referral'
import { findLandingHomeInviteLinkByToken } from '@/lib/dashboard/LandingInviteLinkService'

/**
 * Links a new user to the referrer who shared a `/?invite=` landing link (InviteLink referral + landingHome).
 */
export async function attributeSignupFromLandingInviteToken(
  referredUserId: string,
  rawToken: string | null | undefined
): Promise<{ referrerId: string } | null> {
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''
  if (!token) return null

  const link = await findLandingHomeInviteLinkByToken(token)
  if (!link) return null

  const attributed = await attributeSignupToReferrer(referredUserId, link.createdByUserId)
  if (!attributed) return null

  await prisma.inviteLinkEvent
    .create({
      data: {
        inviteLinkId: link.id,
        eventType: 'accepted',
        metadata: { referredUserId } as object,
      },
    })
    .catch(() => {})

  await prisma.inviteLink
    .update({
      where: { id: link.id },
      data: {
        useCount: { increment: 1 },
      },
    })
    .catch(() => {})

  return { referrerId: attributed.referrerId }
}
