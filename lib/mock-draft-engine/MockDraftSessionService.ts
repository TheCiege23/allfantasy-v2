/**
 * Mock draft session: create, get, start, reset, complete. Invite token flow.
 */

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import type { MockDraftStatus, MockSlotConfigEntry, MockDraftSettings } from './types'

const DEFAULT_SETTINGS: MockDraftSettings = {
  sport: 'NFL',
  leagueType: 'redraft',
  draftType: 'snake',
  numTeams: 12,
  rounds: 15,
  timerSeconds: 60,
  aiEnabled: true,
  scoringFormat: 'default',
  poolType: 'all',
}

function parseMetadata(metadata: unknown): MockDraftSettings {
  const m = (metadata || {}) as Record<string, unknown>
  return {
    sport: String(m.sport ?? DEFAULT_SETTINGS.sport),
    leagueType: String(m.leagueType ?? DEFAULT_SETTINGS.leagueType),
    draftType: String(m.draftType ?? DEFAULT_SETTINGS.draftType),
    numTeams: Math.min(16, Math.max(8, Number(m.numTeams) ?? DEFAULT_SETTINGS.numTeams)),
    rounds: Math.min(22, Math.max(1, Number(m.rounds) ?? DEFAULT_SETTINGS.rounds)),
    timerSeconds: Number(m.timerSeconds) ?? DEFAULT_SETTINGS.timerSeconds,
    aiEnabled: Boolean(m.aiEnabled ?? DEFAULT_SETTINGS.aiEnabled),
    scoringFormat: String(m.scoringFormat ?? DEFAULT_SETTINGS.scoringFormat),
    leagueId: (m.leagueId as string) ?? undefined,
    rosterSize: m.rosterSize != null ? Number(m.rosterSize) : undefined,
    poolType: String(m.poolType ?? DEFAULT_SETTINGS.poolType),
  }
}

export async function createMockDraftSession(userId: string, options?: {
  leagueId?: string | null
  settings?: Partial<MockDraftSettings>
  slotConfig?: MockSlotConfigEntry[]
}) {
  const settings: MockDraftSettings = { ...DEFAULT_SETTINGS, ...options?.settings }
  const slotConfig = options?.slotConfig ?? defaultSlotConfig(settings.numTeams)
  const inviteToken = crypto.randomBytes(12).toString('base64url')
  const metadata = {
    ...settings,
    source: 'mock-draft-engine',
  }
  const draft = await prisma.mockDraft.create({
    data: {
      userId,
      leagueId: options?.leagueId ?? undefined,
      rounds: settings.rounds,
      results: [],
      proposals: [],
      status: 'pre_draft',
      inviteToken,
      slotConfig: slotConfig as any,
      metadata: metadata as any,
    },
  })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return {
    id: draft.id,
    status: draft.status,
    inviteToken: draft.inviteToken,
    inviteLink: draft.inviteToken ? `${baseUrl}/mock-draft/join?token=${draft.inviteToken}` : null,
    settings: parseMetadata(draft.metadata),
    slotConfig: (draft.slotConfig as unknown as MockSlotConfigEntry[]) ?? [],
    results: (draft.results as unknown[]) ?? [],
    rounds: draft.rounds,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  }
}

function defaultSlotConfig(numTeams: number): MockSlotConfigEntry[] {
  return Array.from({ length: numTeams }, (_, i) => ({
    slot: i + 1,
    type: i === 0 ? 'human' as const : 'cpu' as const,
    displayName: i === 0 ? 'You' : `CPU ${i + 1}`,
  }))
}

export async function getMockDraftById(draftId: string, userId?: string) {
  const draft = await prisma.mockDraft.findFirst({
    where: userId ? { id: draftId, userId } : { id: draftId },
  })
  if (!draft) return null
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return {
    id: draft.id,
    status: draft.status as MockDraftStatus,
    inviteToken: draft.inviteToken,
    inviteLink: draft.inviteToken ? `${baseUrl}/mock-draft/join?token=${draft.inviteToken}` : null,
    shareId: draft.shareId,
    settings: parseMetadata(draft.metadata),
    slotConfig: (draft.slotConfig as unknown as MockSlotConfigEntry[]) ?? [],
    results: (draft.results as unknown[]) ?? [],
    rounds: draft.rounds,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  }
}

export async function getMockDraftByInviteToken(token: string) {
  const draft = await prisma.mockDraft.findUnique({
    where: { inviteToken: token },
  })
  if (!draft) return null
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return {
    id: draft.id,
    status: draft.status as MockDraftStatus,
    inviteToken: draft.inviteToken,
    inviteLink: draft.inviteToken ? `${baseUrl}/mock-draft/join?token=${draft.inviteToken}` : null,
    shareId: draft.shareId,
    settings: parseMetadata(draft.metadata),
    slotConfig: (draft.slotConfig as unknown as MockSlotConfigEntry[]) ?? [],
    results: (draft.results as unknown[]) ?? [],
    rounds: draft.rounds,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  }
}

export async function startMockDraft(draftId: string, userId: string): Promise<boolean> {
  const draft = await prisma.mockDraft.findFirst({
    where: { id: draftId, userId },
  })
  if (!draft || draft.status !== 'pre_draft') return false
  await prisma.mockDraft.update({
    where: { id: draftId },
    data: { status: 'in_progress', updatedAt: new Date() },
  })
  return true
}

export async function resetMockDraft(draftId: string, userId: string): Promise<boolean> {
  const draft = await prisma.mockDraft.findFirst({
    where: { id: draftId, userId },
  })
  if (!draft) return false
  await prisma.mockDraft.update({
    where: { id: draftId },
    data: {
      status: 'pre_draft',
      results: [],
      proposals: [],
      updatedAt: new Date(),
    },
  })
  return true
}

export async function completeMockDraft(draftId: string, userId: string, results: unknown[]): Promise<boolean> {
  const draft = await prisma.mockDraft.findFirst({
    where: { id: draftId, userId },
  })
  if (!draft) return false
  await prisma.mockDraft.update({
    where: { id: draftId },
    data: {
      status: 'completed',
      results: results as any,
      updatedAt: new Date(),
    },
  })
  return true
}

export async function joinMockDraftByToken(token: string, userId: string, displayName?: string): Promise<{ draftId: string; joined: boolean } | null> {
  const draft = await prisma.mockDraft.findUnique({
    where: { inviteToken: token },
  })
  if (!draft || draft.status !== 'pre_draft') return null
  const slotConfig = (draft.slotConfig as unknown as MockSlotConfigEntry[]) ?? []
  const firstEmptyHuman = slotConfig.findIndex((s) => s.type === 'human' && !s.userId)
  if (firstEmptyHuman === -1) {
    return { draftId: draft.id, joined: false }
  }
  const updated = [...slotConfig]
  updated[firstEmptyHuman] = {
    ...updated[firstEmptyHuman],
    userId,
    displayName: displayName ?? `User ${firstEmptyHuman + 1}`,
  }
  await prisma.mockDraft.update({
    where: { id: draft.id },
    data: { slotConfig: updated as any, updatedAt: new Date() },
  })
  return { draftId: draft.id, joined: true }
}
