'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Zap, Target } from 'lucide-react';
import { ACHIEVEMENT_SHARE_TYPES, getShareContent } from '@/lib/social-sharing';
import type { AchievementShareType } from '@/lib/social-sharing/types';

const TYPE_LABELS: Record<string, string> = {
  winning_matchup: 'Won my matchup',
  winning_league: 'League champion',
  high_scoring_team: 'High scoring team',
  bracket_success: 'Bracket success',
  rivalry_win: 'Rivalry win',
  playoff_qualification: 'Playoff qualification',
  championship_win: 'Championship win',
  great_waiver_pickup: 'Great waiver pickup',
  great_trade: 'Great trade',
  major_upset: 'Major upset',
  top_rank_legacy: 'Top rank',
};

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

export default function ShareAchievementsLandingPage() {
  const searchParams = useSearchParams();
  const type = (searchParams?.get('type') ?? 'winning_matchup') as AchievementShareType;
  const league = searchParams?.get('league') ?? 'My League';
  const score = searchParams?.get('score');
  const opponent = searchParams?.get('opponent');
  const week = searchParams?.get('week');
  const team = searchParams?.get('team');
  const sport = searchParams?.get('sport');

  const validType = ACHIEVEMENT_SHARE_TYPES.includes(type) ? type : 'winning_matchup';
  const content = getShareContent(validType, {
    leagueName: league,
    score: score != null ? Number(score) : undefined,
    opponentName: opponent ?? undefined,
    week: week != null ? Number(week) : undefined,
    teamName: team ?? undefined,
    sport: sport ?? undefined,
  });

  const Icon = TYPE_ICONS[validType];

  return (
    <main className="min-h-screen bg-[#0f0f14] px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-amber-500/20 p-4">
            <Icon className="h-12 w-12 text-amber-400" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-white">{TYPE_LABELS[validType]}</h1>
        <p className="mt-2 text-white/70">{content.title}</p>
        {(league || score != null || opponent || week) && (
          <p className="mt-2 text-sm text-white/50">
            {league}
            {score != null && ` · ${score} pts`}
            {opponent && ` vs ${opponent}`}
            {week != null && ` · Week ${week}`}
          </p>
        )}
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
