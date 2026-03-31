import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import AdminLayout from '@/app/admin/components/AdminLayout'
import { verifyAdminSessionCookie } from '@/lib/adminSession'
import { getLoginRedirectUrl, getUnauthorizedFallback } from '@/lib/routing'

import SystemHealthDashboard from './SystemHealthDashboard'

type MeResponse = {
  user?: {
    id?: string
    email?: string
    name?: string
    role?: string
  } | null
}

async function getMe(): Promise<MeResponse | null> {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')
  if (!adminSession?.value) return null
  const payload = verifyAdminSessionCookie(adminSession.value)
  if (!payload) return null
  return {
    user: {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    },
  }
}

function isAdmin(me: MeResponse | null) {
  const email = me?.user?.email?.toLowerCase()
  const role = me?.user?.role?.toLowerCase()
  if (role === 'admin') return true
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return Boolean(email && allow.includes(email))
}

export default async function AdminSystemHealthPage() {
  const me = await getMe()
  if (!me?.user) redirect(getLoginRedirectUrl('/admin/system-health'))
  if (!isAdmin(me)) redirect(getUnauthorizedFallback(true, false, '/admin/system-health'))

  return (
    <AdminLayout
      user={{
        email: me.user?.email || '',
        name: me.user?.name || 'Admin',
      }}
      activeTab="system"
    >
      <SystemHealthDashboard />
    </AdminLayout>
  )
}
