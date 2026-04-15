import { newId } from '../../core/id'
import type { IdentityRepository } from '../../contracts/repositories'
import type { IdentityRecord } from '../../repositories/memory-store'

export interface CreateIdentityInput {
  email: string
  displayName: string
  timezone?: string
}

export class IdentityService {
  constructor(private readonly identities: IdentityRepository) {}

  async createIdentity(input: CreateIdentityInput): Promise<IdentityRecord> {
    const now = new Date().toISOString()
    const userId = newId('usr')
    const record: IdentityRecord = {
      userId,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      timezone: input.timezone ?? 'UTC',
      createdAt: now,
      updatedAt: now,
    }
    await this.identities.upsert(record)
    return record
  }

  async getIdentity(userId: string): Promise<IdentityRecord | null> {
    return this.identities.getById(userId)
  }
}
