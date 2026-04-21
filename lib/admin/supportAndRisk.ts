import { logAdminAudit } from '@/lib/admin-audit'

export async function recordSupportNote(input: {
  adminUserId: string
  body: string
  caseRef?: string | null
  leagueId?: string | null
  userId?: string | null
}): Promise<void> {
  const targetType = input.leagueId ? 'league' : input.userId ? 'user' : 'platform'
  const targetId = input.leagueId ?? input.userId ?? null
  await logAdminAudit({
    adminUserId: input.adminUserId,
    action: 'support_note',
    targetType,
    targetId: targetId ?? undefined,
    details: {
      body: input.body.slice(0, 8000),
      caseRef: input.caseRef?.slice(0, 256) ?? null,
      leagueId: input.leagueId ?? null,
      userId: input.userId ?? null,
    },
  })
}

export async function recordRiskReview(input: {
  adminUserId: string
  userId: string
  signal: string
  severity: 'low' | 'medium' | 'high'
  context?: Record<string, unknown>
}): Promise<void> {
  await logAdminAudit({
    adminUserId: input.adminUserId,
    action: 'risk_review',
    targetType: 'user',
    targetId: input.userId,
    details: {
      signal: input.signal.slice(0, 512),
      severity: input.severity,
      context: input.context ?? {},
    },
  })
}

export async function recordDisputeRecord(input: {
  adminUserId: string
  disputeKey: string
  status: string
  leagueId?: string | null
  userId?: string | null
  notes?: string | null
}): Promise<void> {
  await logAdminAudit({
    adminUserId: input.adminUserId,
    action: 'dispute_record',
    targetType: input.leagueId ? 'league' : 'platform',
    targetId: input.leagueId ?? input.disputeKey,
    details: {
      disputeKey: input.disputeKey.slice(0, 256),
      status: input.status.slice(0, 128),
      leagueId: input.leagueId ?? null,
      userId: input.userId ?? null,
      notes: input.notes?.slice(0, 4000) ?? null,
    },
  })
}
