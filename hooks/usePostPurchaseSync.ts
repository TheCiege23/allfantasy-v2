'use client'

/**
 * PROMPT 265 — Post-purchase sync: entitlement + token balance refresh and success/cancel handling.
 * PROMPT 267 — Monetization analytics: purchase_return_success when user returns from checkout with success.
 */

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useEntitlement } from '@/hooks/useEntitlement'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { trackPurchaseReturnSuccess } from '@/lib/monetization-analytics'

/** Query param keys that indicate success (subscription or token purchase). */
const SUCCESS_PARAMS = ['checkout', 'success', 'tokens', 'purchased'] as const
/** Values that indicate success. */
const SUCCESS_VALUES = ['success', 'sub', '1', 'true'] as const
/** Param that indicates cancelled checkout. */
const CANCEL_PARAM = 'checkout'
const CANCEL_VALUE = 'cancelled'

function isSuccess(searchParams: URLSearchParams): boolean {
  for (const key of SUCCESS_PARAMS) {
    const v = searchParams.get(key)
    if (v && SUCCESS_VALUES.includes(v as (typeof SUCCESS_VALUES)[number])) return true
  }
  return false
}

function isCancel(searchParams: URLSearchParams): boolean {
  return searchParams.get(CANCEL_PARAM) === CANCEL_VALUE
}

/** Remove success/cancel query params from URL without reload. */
function clearPurchaseParams(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  let changed = false
  SUCCESS_PARAMS.forEach((k) => {
    if (url.searchParams.has(k)) {
      url.searchParams.delete(k)
      changed = true
    }
  })
  if (url.searchParams.get(CANCEL_PARAM) === CANCEL_VALUE) {
    url.searchParams.delete(CANCEL_PARAM)
    changed = true
  }
  if (changed) {
    window.history.replaceState({}, '', url.pathname + (url.search || ''))
  }
}

export interface UsePostPurchaseSyncOptions {
  /** Show toast on success. Default true. */
  showSuccessToast?: boolean
  /** Show toast on cancel. Default true. */
  showCancelToast?: boolean
  /** Custom success message (subscription). */
  successMessage?: string
  /** Custom success message for token purchase. */
  tokenSuccessMessage?: string
  /** Called when success params are processed (for showing a banner). */
  onSuccess?: () => void
}

/**
 * Call from pricing or tokens page. On mount, if URL has success or cancel params:
 * - Success: refetch entitlement + token balance, optional toast, clear params.
 * - Cancel: optional toast, clear params.
 * Idempotent: clearing params prevents double-toast on re-render.
 */
export function usePostPurchaseSync(options: UsePostPurchaseSyncOptions = {}) {
  const searchParams = useSearchParams()
  const { refetch: refetchEntitlement } = useEntitlement()
  const { refetch: refetchTokens } = useTokenBalance()
  const {
    showSuccessToast = true,
    showCancelToast = true,
    successMessage = 'Purchase complete. Your plan and balance are updated.',
    tokenSuccessMessage = 'Tokens added. Your balance is updated.',
    onSuccess,
  } = options

  const didRun = useRef(false)

  useEffect(() => {
    const success = isSuccess(searchParams)
    const cancel = isCancel(searchParams)

    if (success) {
      if (!didRun.current) {
        const returnPath = typeof window !== 'undefined' ? window.location.pathname : ''
        trackPurchaseReturnSuccess({ returnPath })
        if (showSuccessToast) {
          const isTokenPage = typeof window !== 'undefined' && window.location.pathname.includes('/tokens')
          toast.success(isTokenPage ? tokenSuccessMessage : successMessage)
        }
        onSuccess?.()
        didRun.current = true
      }
      refetchEntitlement()
      refetchTokens()
      clearPurchaseParams()
    } else if (cancel) {
      if (showCancelToast && !didRun.current) {
        toast.info('Checkout cancelled.')
        didRun.current = true
      }
      clearPurchaseParams()
    }
  }, [
    searchParams,
    refetchEntitlement,
    refetchTokens,
    showSuccessToast,
    showCancelToast,
    successMessage,
    tokenSuccessMessage,
    onSuccess,
  ])
}

/**
 * Returns true if current URL has success params (for showing a success banner).
 */
export function useIsPurchaseSuccess(): boolean {
  const searchParams = useSearchParams()
  return isSuccess(searchParams)
}
