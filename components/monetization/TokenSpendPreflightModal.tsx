'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { AlertTriangle, Coins } from 'lucide-react'
import type { TokenSpendClientPreview } from '@/lib/tokens/client-confirm'
import {
  trackInsufficientTokenBuyClick,
  trackInsufficientTokenFlowViewed,
} from '@/lib/monetization-analytics'

export function TokenSpendPreflightModal({
  open,
  preview,
  title,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm token spend',
  testIdPrefix = 'token-preflight',
}: {
  open: boolean
  preview: TokenSpendClientPreview | null
  title: string
  onClose: () => void
  onConfirm: () => void
  confirmLabel?: string
  testIdPrefix?: string
}) {
  const trackedKeyRef = useRef<string | null>(null)
  const insufficient = Boolean(preview && !preview.canSpend)

  useEffect(() => {
    if (!open || !preview || !insufficient) return
    const nextKey = `${preview.ruleCode}:${preview.currentBalance}:${preview.tokenCost}`
    if (trackedKeyRef.current === nextKey) return
    trackedKeyRef.current = nextKey
    trackInsufficientTokenFlowViewed({
      surface: `token_preflight_modal:${testIdPrefix}`,
      ruleCode: preview.ruleCode,
      tokenCost: preview.tokenCost,
      currentBalance: preview.currentBalance,
    })
  }, [insufficient, open, preview, testIdPrefix])

  if (!open || !preview) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1228] p-4 shadow-2xl"
        data-testid={`${testIdPrefix}-modal`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-amber-400/35 bg-amber-500/15 p-1.5">
            <Coins className="h-4 w-4 text-amber-200" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="mt-1 text-xs text-white/70">
              This action costs {preview.tokenCost} token{preview.tokenCost === 1 ? '' : 's'}.
            </p>
            <p className="mt-1 text-xs text-white/60">
              Current balance: <span className="font-semibold text-white">{preview.currentBalance}</span>
            </p>
          </div>
        </div>

        {insufficient ? (
          <p
            className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-100"
            data-testid={`${testIdPrefix}-insufficient-copy`}
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Insufficient balance. Buy tokens before running this action.
          </p>
        ) : (
          <p className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-2 text-xs text-cyan-100">
            No surprise deductions: tokens are only spent after you confirm.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
            data-testid={`${testIdPrefix}-cancel`}
          >
            Cancel
          </button>
          {insufficient ? (
            <Link
              href={`/tokens?ruleCode=${encodeURIComponent(preview.ruleCode)}`}
              onClick={() =>
                trackInsufficientTokenBuyClick({
                  surface: `token_preflight_modal:${testIdPrefix}`,
                  ruleCode: preview.ruleCode,
                })
              }
              className="rounded-lg border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/25"
              data-testid={`${testIdPrefix}-buy-tokens`}
            >
              Buy tokens
            </Link>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/25"
              data-testid={`${testIdPrefix}-confirm`}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

