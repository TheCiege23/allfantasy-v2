import type { SystemRole } from '../contracts/permissions'

export interface IdentityRecord {
  userId: string
  email: string
  displayName: string
  timezone: string
  createdAt: string
  updatedAt: string
}

export interface LeagueRecord {
  leagueId: string
  name: string
  sport: string
  season: number
  status: string
  commissionerUserId: string
  createdAt: string
  updatedAt: string
}

export interface MembershipRecord {
  leagueId: string
  userId: string
  role: SystemRole
  joinedAt: string
}

export interface SettingsRecord {
  leagueId: string
  domains: Record<string, Record<string, unknown>>
  versions: Record<string, number>
}

export interface AuditEntry {
  id: string
  leagueId: string
  domain: string
  action: string
  actorUserId: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface DomainEventEntry {
  id: string
  leagueId: string
  aggregateType: string
  aggregateId: string
  eventType: string
  payload: Record<string, unknown>
  occurredAt: string
}

export interface RosterEntryRecord {
  rosterId: string
  leagueId: string
  teamId: string
  playerId: string
  slotCode: string
  section: 'active' | 'bench' | 'ir' | 'taxi'
  updatedAt: string
}

export interface LineupSubmissionRecord {
  id: string
  leagueId: string
  teamId: string
  weekOrPeriod: number
  submittedBy: string
  submittedAt: string
  entries: Array<{ slotCode: string; playerId: string }>
  idempotencyKey?: string
  correlationId?: string
  eventId?: string
  lineupVersion?: number
}

export class MemoryStore {
  readonly identities = new Map<string, IdentityRecord>()
  readonly leagues = new Map<string, LeagueRecord>()
  readonly memberships = new Map<string, MembershipRecord[]>()
  readonly settings = new Map<string, SettingsRecord>()
  readonly audits: AuditEntry[] = []
  readonly events: DomainEventEntry[] = []
  readonly rosterEntries = new Map<string, RosterEntryRecord[]>()
  readonly lineupSubmissions = new Map<string, LineupSubmissionRecord[]>()
  readonly lineupVersions = new Map<string, number>()
  readonly currentPeriodByLeague = new Map<string, number>()
  readonly submissionEventMap = new Map<string, string>()

  getMembership(leagueId: string, userId: string): MembershipRecord | undefined {
    const rows = this.memberships.get(leagueId) ?? []
    return rows.find((row) => row.userId === userId)
  }

  upsertMembership(row: MembershipRecord): void {
    const rows = this.memberships.get(row.leagueId) ?? []
    const existing = rows.findIndex((current) => current.userId === row.userId)
    if (existing >= 0) {
      rows[existing] = row
    } else {
      rows.push(row)
    }
    this.memberships.set(row.leagueId, rows)
  }

  listMemberships(leagueId: string): MembershipRecord[] {
    return [...(this.memberships.get(leagueId) ?? [])]
  }

  listRosterEntries(leagueId: string, teamId: string): RosterEntryRecord[] {
    return [...(this.rosterEntries.get(`${leagueId}:${teamId}`) ?? [])]
  }

  upsertRosterEntries(entries: RosterEntryRecord[]): void {
    for (const entry of entries) {
      const key = `${entry.leagueId}:${entry.teamId}`
      const rows = this.rosterEntries.get(key) ?? []
      const index = rows.findIndex((row) => row.playerId === entry.playerId)
      if (index >= 0) {
        rows[index] = entry
      } else {
        rows.push(entry)
      }
      this.rosterEntries.set(key, rows)
    }
  }

  saveLineupSubmission(record: LineupSubmissionRecord): void {
    const key = `${record.leagueId}:${record.teamId}:${record.weekOrPeriod}`
    const rows = this.lineupSubmissions.get(key) ?? []
    rows.unshift(record)
    this.lineupSubmissions.set(key, rows)
  }

  findLineupByIdempotency(
    leagueId: string,
    teamId: string,
    weekOrPeriod: number,
    idempotencyKey: string,
  ): LineupSubmissionRecord | null {
    const key = `${leagueId}:${teamId}:${weekOrPeriod}`
    const rows = this.lineupSubmissions.get(key) ?? []
    return rows.find((row) => row.idempotencyKey === idempotencyKey) ?? null
  }

  getLatestLineupSubmission(
    leagueId: string,
    teamId: string,
    weekOrPeriod: number,
  ): LineupSubmissionRecord | null {
    const key = `${leagueId}:${teamId}:${weekOrPeriod}`
    return (this.lineupSubmissions.get(key) ?? [])[0] ?? null
  }

  getCurrentPeriod(leagueId: string): number {
    return this.currentPeriodByLeague.get(leagueId) ?? 1
  }

  incrementLineupVersion(leagueId: string, teamId: string, weekOrPeriod: number): number {
    const key = `${leagueId}:${teamId}:${weekOrPeriod}`
    const next = (this.lineupVersions.get(key) ?? 0) + 1
    this.lineupVersions.set(key, next)
    return next
  }

  getLineupVersion(leagueId: string, teamId: string, weekOrPeriod: number): number {
    return this.lineupVersions.get(`${leagueId}:${teamId}:${weekOrPeriod}`) ?? 0
  }

  mapSubmissionToEvent(submissionId: string, eventId: string): void {
    this.submissionEventMap.set(submissionId, eventId)
  }

  findEventIdForSubmission(submissionId: string): string | null {
    return this.submissionEventMap.get(submissionId) ?? null
  }
}
