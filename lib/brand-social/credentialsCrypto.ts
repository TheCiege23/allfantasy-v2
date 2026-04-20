import 'server-only'
import crypto from 'crypto'

/**
 * Dedicated AES-256-GCM envelope for brand-social credentials (X bearer tokens,
 * OAuth 1.0a keys, etc.). Uses its own env key so a compromise of league-auth
 * doesn't leak brand tokens and vice versa.
 *
 * Format: base64(iv || tag || ciphertext) — same shape as lib/league-auth-crypto.
 */
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const CIPHER_FIELD_PREFIX = 'enc:'

function getKey(): Buffer {
  const key = process.env.BRAND_SOCIAL_ENCRYPTION_KEY
  if (!key) throw new Error('BRAND_SOCIAL_ENCRYPTION_KEY is not set')
  return crypto.scryptSync(key, 'brand-social-salt', 32)
}

export function brandCredentialsCryptoConfigured(): boolean {
  return Boolean(process.env.BRAND_SOCIAL_ENCRYPTION_KEY?.trim())
}

export function encryptBrandCredential(plaintext: string): string {
  if (!plaintext) return plaintext
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return CIPHER_FIELD_PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptBrandCredential(ciphertext: string): string {
  if (!ciphertext) return ciphertext
  if (!ciphertext.startsWith(CIPHER_FIELD_PREFIX)) return ciphertext
  const payload = ciphertext.slice(CIPHER_FIELD_PREFIX.length)
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

/**
 * Encrypt every string value inside a credentials object. Non-string values
 * are passed through unchanged. Fields already encrypted (prefixed) are left as-is.
 */
export function encryptBrandCredentialFields(
  creds: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(creds)) {
    if (typeof v === 'string' && v.length > 0) {
      out[k] = v.startsWith(CIPHER_FIELD_PREFIX) ? v : encryptBrandCredential(v)
    } else {
      out[k] = v
    }
  }
  return out
}

export function decryptBrandCredentialFields(
  creds: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(creds)) {
    if (typeof v === 'string' && v.startsWith(CIPHER_FIELD_PREFIX)) {
      try {
        out[k] = decryptBrandCredential(v)
      } catch {
        out[k] = null
      }
    } else {
      out[k] = v
    }
  }
  return out
}
