import type { CommissionerAlert } from '@/lib/legacy-tool/contracts'

export function evaluateCommissionerAlert(args: {
  tradeFairnessScore: number
  repeatedHighImbalanceBetweenSameManagers?: boolean
  packageContainsEliteAssetNoPremiumReturn?: boolean
  inactiveManagerExtremeValueLoss?: boolean
}): CommissionerAlert {
  const reasonCodes: string[] = []

  if (args.tradeFairnessScore < 50) reasonCodes.push('high_imbalance')
  if (args.repeatedHighImbalanceBetweenSameManagers) reasonCodes.push('collusion_review')
  if (args.packageContainsEliteAssetNoPremiumReturn) reasonCodes.push('tier_break_watch')
  if (args.inactiveManagerExtremeValueLoss) reasonCodes.push('anomaly_review')

  if (reasonCodes.length === 0) {
    return { required: false, severity: 'low', reason_codes: [] }
  }

  const severity: CommissionerAlert['severity'] =
    reasonCodes.length >= 3 || reasonCodes.includes('collusion_review') ? 'high' : 'medium'

  return {
    required: true,
    severity,
    reason_codes: reasonCodes,
  }
}
