/**
 * ShareableUrlBuilder — build shareable URLs with UTM and ref for viral loops (PROMPT 291).
 * Use for: league invite, draft result share, AI insight share, competition compare.
 */

import type { ShareableUrlOptions, ViralShareParams } from './types'

function getBaseUrl(): string {
  return (typeof process !== 'undefined' && process.env?.NEXTAUTH_URL) || 'https://allfantasy.ai'
}

function appendParams(url: string, params: ViralShareParams): string {
  const u = new URL(url)
  if (params.utm_source) u.searchParams.set('utm_source', params.utm_source)
  if (params.utm_medium) u.searchParams.set('utm_medium', params.utm_medium)
  if (params.utm_campaign) u.searchParams.set('utm_campaign', params.utm_campaign)
  if (params.ref) u.searchParams.set('ref', params.ref)
  return u.toString()
}

/**
 * League invite URL: /join?code=XXX with UTM for league_invite attribution.
 */
export function buildLeagueInviteUrl(
  inviteCode: string,
  options?: ShareableUrlOptions
): string {
  const base = (options?.baseUrl ?? getBaseUrl()).replace(/\/$/, '')
  let url = `${base}/join?code=${encodeURIComponent(inviteCode)}`
  const params: ViralShareParams = { utm_source: 'league_invite', utm_medium: 'invite', ...options?.params }
  return appendParams(url, params)
}

/**
 * Referral URL: /?ref=CODE with optional UTM (existing pattern; use for consistency).
 */
export function buildReferralShareUrl(
  referralCode: string,
  options?: ShareableUrlOptions
): string {
  const base = (options?.baseUrl ?? getBaseUrl()).replace(/\/$/, '')
  let url = `${base}/?ref=${encodeURIComponent(referralCode)}`
  const params = options?.params ?? {}
  if (!params.utm_source) params.utm_source = 'referral'
  url = appendParams(url, params)
  return url
}

/**
 * Draft share URL: /share/draft/[shareId] with UTM for attribution.
 */
export function buildDraftShareUrl(
  shareId: string,
  options?: ShareableUrlOptions
): string {
  const base = (options?.baseUrl ?? getBaseUrl()).replace(/\/$/, '')
  const path = options?.path ?? `/share/draft/${shareId}`
  let url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const params: ViralShareParams = { utm_source: 'draft_share', utm_medium: 'share', ...options?.params }
  return appendParams(url, params)
}

/**
 * AI insight share URL: /share/[momentId] with UTM for attribution.
 */
export function buildAIShareUrl(
  shareIdOrMomentId: string,
  options?: ShareableUrlOptions
): string {
  const base = (options?.baseUrl ?? getBaseUrl()).replace(/\/$/, '')
  const path = options?.path ?? `/share/${shareIdOrMomentId}`
  let url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const params: ViralShareParams = { utm_source: 'ai_share', utm_medium: 'share', ...options?.params }
  return appendParams(url, params)
}

/**
 * Generic share URL with full control over path and params.
 */
export function buildShareUrl(path: string, params?: ViralShareParams, baseUrl?: string): string {
  const base = (baseUrl ?? getBaseUrl()).replace(/\/$/, '')
  let url = path.startsWith('/') ? `${base}${path}` : path
  if (params) url = appendParams(url, params)
  return url
}
