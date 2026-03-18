import { prisma } from "@/lib/prisma"

export type AdminAuditEntry = {
  id: string
  adminUserId: string
  action: string
  targetType: string | null
  targetId: string | null
  details: unknown
  createdAt: Date
}

export type LogAdminActionInput = {
  adminUserId: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
}

/**
 * Append an admin action to the audit log. Safe to call from API routes after requireAdmin().
 */
export async function logAdminAudit(input: LogAdminActionInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        details: input.details ?? undefined,
      },
    })
  } catch (e) {
    console.error("[admin-audit] logAdminAudit failed:", e)
  }
}

/**
 * Fetch recent audit entries for the admin UI. Requires admin check at API layer.
 */
export async function getAdminAuditLogs(options?: {
  limit?: number
  since?: Date
}): Promise<AdminAuditEntry[]> {
  const limit = Math.min(options?.limit ?? 100, 500)
  const where = options?.since ? { createdAt: { gte: options.since } } : {}

  const rows = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return rows.map((r) => ({
    id: r.id,
    adminUserId: r.adminUserId,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    details: r.details as unknown,
    createdAt: r.createdAt,
  }))
}
