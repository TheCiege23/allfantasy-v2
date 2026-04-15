import type { CommissionerAiAssignment } from './types'

/** Map commissioner AI style to deterministic drafter mode. */
export function mapAiStyleToCpuMode(style: CommissionerAiAssignment['aiStyle']): 'bpa' | 'needs' {
  switch (style) {
    case 'BPA':
    case 'STARS_AND_SCRUBS':
      return 'bpa'
    case 'NEEDS':
    case 'BALANCED':
    case 'UPSIDE':
    case 'SAFE':
    case 'YOUTH':
    default:
      return 'needs'
  }
}
