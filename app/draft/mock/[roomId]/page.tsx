import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DraftShell } from '../../components/DraftShell'
import { sessionKeyMock } from '@/lib/draft/session-key'

export const dynamic = 'force-dynamic'

export default async function MockDraftRoomPage({ params }: { params: { roomId: string } }) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; name?: string | null }
  } | null
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard')
  }

  const room = await prisma.mockDraftRoom.findUnique({
    where: { id: params.roomId },
    select: { id: true, inviteCode: true, createdById: true },
  })
  if (!room) {
    redirect('/dashboard')
  }

  return (
    <DraftShell
      mode="mock"
      sessionId={sessionKeyMock(room.id)}
      roomId={room.id}
      leagueId={null}
      userId={session.user.id}
      userName={session.user.name ?? 'Manager'}
      inviteCode={room.inviteCode}
      isCommissioner={room.createdById === session.user.id}
    />
  )
}
