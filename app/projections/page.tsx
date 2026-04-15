import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProjectionsClient } from './ProjectionsClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Player Projections – AllFantasy',
  description: 'Fantasy player projections, expected points, and weekly/rest-of-season outlook across all sports.',
}

export default async function ProjectionsPage() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/projections')
  }

  return <ProjectionsClient />
}
