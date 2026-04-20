import 'server-only'
import crypto from 'crypto'
import { decryptBrandCredentialFields } from '@/lib/brand-social/credentialsCrypto'
import type { BrandPublishInput, BrandPublishResult, BrandPublisher } from './types'

const TWEETS_URL = 'https://api.twitter.com/2/tweets'

/**
 * X (Twitter) publisher. Supports two auth modes on a per-account basis:
 *
 *   1. OAuth 2.0 user-context bearer — credentials.authType === 'oauth2'
 *      requires: { accessToken } (short-lived, 2h; admin must refresh or use OAuth 1.0a for long-lived)
 *
 *   2. OAuth 1.0a user-context — credentials.authType === 'oauth1' (or omitted + all 4 keys present)
 *      requires: { consumerKey, consumerSecret, accessToken, accessTokenSecret }
 *      long-lived; signed per-request with HMAC-SHA1
 *
 * Credentials are decrypted at dispatch time from BrandSocialAccount.credentialsJson.
 */

function rfc3986Encode(s: string): string {
  return encodeURIComponent(s).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  )
}

function buildOAuth1AuthHeader(args: {
  method: string
  url: string
  consumerKey: string
  consumerSecret: string
  accessToken: string
  accessTokenSecret: string
}): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: args.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: args.accessToken,
    oauth_version: '1.0',
  }

  const paramPairs = Object.entries(oauthParams)
    .map(([k, v]) => [rfc3986Encode(k), rfc3986Encode(v)] as [string, string])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  const paramString = paramPairs.map(([k, v]) => `${k}=${v}`).join('&')

  const signatureBase = [
    args.method.toUpperCase(),
    rfc3986Encode(args.url),
    rfc3986Encode(paramString),
  ].join('&')

  const signingKey = `${rfc3986Encode(args.consumerSecret)}&${rfc3986Encode(args.accessTokenSecret)}`
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64')

  const allParams = { ...oauthParams, oauth_signature: signature }
  const headerValue = Object.entries(allParams)
    .map(([k, v]) => `${rfc3986Encode(k)}="${rfc3986Encode(v)}"`)
    .join(', ')

  return `OAuth ${headerValue}`
}

type ResolvedCredentials =
  | { mode: 'oauth2'; accessToken: string }
  | {
      mode: 'oauth1'
      consumerKey: string
      consumerSecret: string
      accessToken: string
      accessTokenSecret: string
    }
  | { mode: 'none'; reason: string }

function resolveCredentials(rawCredentials: Record<string, unknown> | null): ResolvedCredentials {
  if (!rawCredentials) return { mode: 'none', reason: 'no credentials stored' }

  const decrypted = decryptBrandCredentialFields(rawCredentials)
  const authType =
    typeof decrypted.authType === 'string' ? decrypted.authType.toLowerCase() : null

  const accessToken =
    typeof decrypted.accessToken === 'string' ? decrypted.accessToken.trim() : ''
  const accessTokenSecret =
    typeof decrypted.accessTokenSecret === 'string'
      ? decrypted.accessTokenSecret.trim()
      : ''
  const consumerKey =
    typeof decrypted.consumerKey === 'string' ? decrypted.consumerKey.trim() : ''
  const consumerSecret =
    typeof decrypted.consumerSecret === 'string' ? decrypted.consumerSecret.trim() : ''

  const hasOAuth1 =
    consumerKey && consumerSecret && accessToken && accessTokenSecret

  if (authType === 'oauth2' || (!authType && !hasOAuth1 && accessToken && !accessTokenSecret)) {
    if (!accessToken) return { mode: 'none', reason: 'OAuth 2.0 mode requires accessToken' }
    return { mode: 'oauth2', accessToken }
  }

  if (authType === 'oauth1' || (!authType && hasOAuth1)) {
    if (!hasOAuth1) {
      return {
        mode: 'none',
        reason: 'OAuth 1.0a mode requires consumerKey, consumerSecret, accessToken, accessTokenSecret',
      }
    }
    return { mode: 'oauth1', consumerKey, consumerSecret, accessToken, accessTokenSecret }
  }

  return {
    mode: 'none',
    reason: 'Could not determine auth mode — set authType to "oauth2" or "oauth1" in credentials',
  }
}

export class XPublisher implements BrandPublisher {
  readonly platform = 'x' as const

  isConfigured(input: BrandPublishInput): boolean {
    const resolved = resolveCredentials(input.credentials ?? null)
    return resolved.mode !== 'none'
  }

  async publish(input: BrandPublishInput): Promise<BrandPublishResult> {
    const resolved = resolveCredentials(input.credentials ?? null)

    if (resolved.mode === 'none') {
      return {
        ok: false,
        code: 'missing_credentials',
        message: `X account @${input.accountHandle}: ${resolved.reason}`,
      }
    }

    let authHeader: string
    if (resolved.mode === 'oauth2') {
      authHeader = `Bearer ${resolved.accessToken}`
    } else {
      authHeader = buildOAuth1AuthHeader({
        method: 'POST',
        url: TWEETS_URL,
        consumerKey: resolved.consumerKey,
        consumerSecret: resolved.consumerSecret,
        accessToken: resolved.accessToken,
        accessTokenSecret: resolved.accessTokenSecret,
      })
    }

    let response: Response
    try {
      response = await fetch(TWEETS_URL, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input.body }),
      })
    } catch (err) {
      return {
        ok: false,
        code: 'provider_error',
        message: `X network error: ${err instanceof Error ? err.message : String(err)}`,
      }
    }

    const rawText = await response.text()
    let payload: any
    try {
      payload = rawText ? JSON.parse(rawText) : null
    } catch {
      payload = { raw: rawText.slice(0, 500) }
    }

    if (!response.ok) {
      const apiMsg =
        payload?.detail ||
        payload?.title ||
        (Array.isArray(payload?.errors) && payload.errors[0]?.message) ||
        `HTTP ${response.status}`
      return {
        ok: false,
        code: 'provider_error',
        message: `X API ${response.status}: ${apiMsg}`,
        responseMetadata: {
          httpStatus: response.status,
          body: payload,
          authMode: resolved.mode,
        },
      }
    }

    const tweetId =
      typeof payload?.data?.id === 'string'
        ? payload.data.id
        : typeof payload?.id === 'string'
          ? payload.id
          : null

    if (!tweetId) {
      return {
        ok: false,
        code: 'provider_error',
        message: 'X returned 2xx but no tweet id',
        responseMetadata: { body: payload, authMode: resolved.mode },
      }
    }

    return {
      ok: true,
      providerPostId: tweetId,
      responseMetadata: {
        authMode: resolved.mode,
        tweetId,
        text: payload?.data?.text ?? input.body,
      },
    }
  }
}
