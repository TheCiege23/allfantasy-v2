import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DashboardUnavailableState from '@/components/dashboard/DashboardUnavailableState'
import {
  createDashboardRuntimeIssue,
  getDashboardMissingEnvVars,
  getDashboardRuntimeIssue,
} from '@/lib/dashboard/runtime-issues'
import { DashboardShell } from './DashboardShell'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const missingEnvVars = getDashboardMissingEnvVars()
  if (missingEnvVars.length > 0) {
    const issue = createDashboardRuntimeIssue(missingEnvVars)
    return (
      <DashboardUnavailableState
        title={issue.title}
        message={issue.message}
        missing={issue.missing}
      />
    )
  }

  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: {
        id?: string
        name?: string | null
        email?: string | null
      }
    } | null

    if (!session?.user?.id) {
      redirect('/login?callbackUrl=/dashboard')
    }

    return (
      <DashboardShell
        userId={session.user.id}
        userName={session.user.name ?? session.user.email ?? 'Manager'}
      />
    )
  } catch (error) {
    const issue = getDashboardRuntimeIssue(error)
    if (issue) {
      return (
        <DashboardUnavailableState
          title={issue.title}
          message={issue.message}
          missing={issue.missing}
        />
      )
    }

    throw error
  }
}
