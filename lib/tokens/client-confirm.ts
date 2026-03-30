'use client'

export type TokenSpendClientPreview = {
  ruleCode: string
  featureLabel: string
  tokenCost: number
  currentBalance: number
  canSpend: boolean
  requiresConfirmation: boolean
}

export async function previewTokenSpend(ruleCode: string): Promise<TokenSpendClientPreview> {
  const res = await fetch(`/api/tokens/spend/preview?ruleCode=${encodeURIComponent(ruleCode)}`, {
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.preview) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Unable to preview token spend right now.'
    )
  }
  return data.preview as TokenSpendClientPreview
}

export async function confirmTokenSpend(ruleCode: string): Promise<{
  confirmed: boolean
  preview: TokenSpendClientPreview
}> {
  const preview = await previewTokenSpend(ruleCode)
  if (!preview.canSpend) {
    return {
      confirmed: false,
      preview,
    }
  }

  const confirmed = window.confirm(
    `Use ${preview.tokenCost} token${preview.tokenCost === 1 ? '' : 's'} for ${preview.featureLabel}?` +
      `\n\nCurrent balance: ${preview.currentBalance}`
  )
  return { confirmed, preview }
}
