import { resolveLoginToUser } from '@/lib/auth/login-identifier-resolver'

export async function resolveUnifiedAuthIdentity(login: string) {
  return resolveLoginToUser(login)
}
