import type { AdminUser } from '@/lib/adminAuth'

/** Stable id for admin audit rows when `user.id` is missing (bearer / secret). */
export function getAdminActorId(user: AdminUser): string {
  if (user.id?.trim()) return user.id.trim()
  if (user.email?.trim()) return `admin:${user.email.trim().toLowerCase()}`
  return 'admin:unknown'
}
