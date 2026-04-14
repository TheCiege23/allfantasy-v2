import type { SystemRole } from './permissions'
import type {
  AuditEntry,
  DomainEventEntry,
  IdentityRecord,
  LeagueRecord,
  MembershipRecord,
  SettingsRecord,
} from '../repositories/memory-store'

export interface IdentityRepository {
  getById(userId: string): Promise<IdentityRecord | null>
  upsert(record: IdentityRecord): Promise<void>
}

export interface LeagueRepository {
  getById(leagueId: string): Promise<LeagueRecord | null>
  upsert(record: LeagueRecord): Promise<void>
}

export interface MembershipRepository {
  getByLeagueAndUser(leagueId: string, userId: string): Promise<MembershipRecord | null>
  listByLeague(leagueId: string): Promise<MembershipRecord[]>
  upsert(row: MembershipRecord): Promise<void>
}

export interface SettingsRepository {
  getByLeagueId(leagueId: string): Promise<SettingsRecord | null>
  upsert(record: SettingsRecord): Promise<void>
}

export interface AuditRepository {
  append(entry: AuditEntry): Promise<void>
}

export interface DomainEventRepository {
  append(entry: DomainEventEntry): Promise<void>
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

export interface RosterRepository {
  listRoster(leagueId: string, teamId: string): Promise<RosterEntryRecord[]>
  upsertRosterEntries(entries: RosterEntryRecord[]): Promise<void>
}

export interface LineupRepository {
  saveSubmission(record: LineupSubmissionRecord): Promise<void>
  getByIdempotency(leagueId: string, teamId: string, weekOrPeriod: number, idempotencyKey: string): Promise<LineupSubmissionRecord | null>
  getLatest(leagueId: string, teamId: string, weekOrPeriod: number): Promise<LineupSubmissionRecord | null>
}

export interface RepositoryBundle {
  identities: IdentityRepository
  leagues: LeagueRepository
  memberships: MembershipRepository
  settings: SettingsRepository
  audits: AuditRepository
  domainEvents: DomainEventRepository
  rosters: RosterRepository
  lineups: LineupRepository
}

export function roleFromText(input: string): SystemRole {
  const normalized = input as SystemRole
  if (['admin', 'commissioner', 'co_owner', 'member', 'viewer'].includes(normalized)) {
    return normalized
  }
  return 'viewer'
}
