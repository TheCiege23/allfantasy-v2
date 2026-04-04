import { prisma } from '@/lib/prisma'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import type { NextResponse } from 'next/server'

export type Issue = { code: string; detail: string }

export type AuditReport = {
  passed: boolean
  issues: Issue[]
  recommendations: string[]
}

export async function auditTribalCouncil(councilId: string): Promise<AuditReport | NextResponse> {
  const gate = await requireAfSub()
  if (typeof gate !== 'string') return gate

  const council = await prisma.survivorTribalCouncil.findUnique({
    where: { id: councilId },
    include: { votes: true },
  })
  const issues: Issue[] = []
  if (!council) {
    return { passed: false, issues: [{ code: 'not_found', detail: 'Council missing' }], recommendations: [] }
  }

  const counting = council.votes.filter((v) => !v.doesNotCount)
  if (counting.length === 0) {
    issues.push({ code: 'no_votes', detail: 'No counting votes' })
  }

  return {
    passed: issues.length === 0,
    issues,
    recommendations: issues.length ? ['Review commissioner override and idol ledger for this council.'] : [],
  }
}
