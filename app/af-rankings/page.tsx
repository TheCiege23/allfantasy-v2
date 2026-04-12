import type { Metadata } from 'next'
import AfRankingsPage from '@/components/rankings/AfRankingsClient'

export const metadata: Metadata = {
  title: 'AF Rankings – AllFantasy',
  description:
    'Your AllFantasy career rank, legacy stats import, league power rankings, and rank progression.',
}

/** Primary rankings surface (dashboard links here; `/dashboard/rankings` redirects for old URLs). */
export default AfRankingsPage