/**
 * Canonical Chimmy route alias.
 * Reuses existing dedicated Chimmy handler at /api/chat/chimmy.
 */

export { POST } from '@/app/api/chat/chimmy/route'

export const dynamic = 'force-dynamic'
