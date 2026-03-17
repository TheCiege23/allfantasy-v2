import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Trophy, Zap, Target } from 'lucide-react';
import { ACHIEVEMENT_SHARE_TYPES } from '@/lib/social-sharing/types';
import type { AchievementShareType } from '@/lib/social-sharing/types';

const TYPE_ICONS: Record<string, typeof Trophy> = {
  winning_matchup: Target,
  winning_league: Trophy,
  high_scoring_team: Zap,
  bracket_success: Trophy,
  rivalry_win: Target,
  playoff_qualification: Zap,
  championship_win: Trophy,
  great_waiver_pickup: Zap,
  great_trade: Target,
  major_upset: Zap,
  top_rank_legacy: Trophy,
};

export const dynamic = 'force-dynamic';

export default async function ShareMomentPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const moment = await prisma.shareableMoment.findUnique({
    where: { id: shareId },
  });
  if (!moment) notFound();

  const validType = ACHIEVEMENT_SHARE_TYPES.includes(moment.shareType as AchievementShareType) ? moment.shareType : 'winning_matchup';
  const Icon = TYPE_ICONS[moment.shareType] ?? Trophy;

  return (
    <main className="min-h-screen bg-[#0f0f14] px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-amber-500/20 p-4">
            <Icon className="h-12 w-12 text-amber-400" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-white">{moment.title}</h1>
        <p className="mt-2 text-white/70">{moment.summary}</p>
        <p className="mt-6 text-sm text-white/40">
          Shared with AllFantasy — fantasy tools and rankings.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          Try AllFantasy
        </Link>
      </div>
    </main>
  );
}
