/**
 * Unique invite token generation; collision-resistant and URL-safe.
 */

import crypto from 'crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const DEFAULT_LENGTH = 10

export function generateInviteToken(length: number = DEFAULT_LENGTH): string {
  const bytes = crypto.randomBytes(length)
  let token = ''
  for (let i = 0; i < length; i++) {
    token += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return token
}

export function normalizeToken(raw: string | null | undefined): string {
  return String(raw ?? '').trim().toUpperCase()
}
