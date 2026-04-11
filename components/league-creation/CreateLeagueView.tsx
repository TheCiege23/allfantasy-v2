'use client';

import Link from 'next/link';
import { LeagueCreationWizard } from '@/components/league-creation-wizard';
import type { WizardStepId } from '@/lib/league-creation-wizard/types';

export interface CreateLeagueViewProps {
  userId: string;
  /** Open the wizard on a specific step (e.g. edit from review). */
  initialStep?: WizardStepId | null;
}

export function CreateLeagueView({ userId: _userId, initialStep }: CreateLeagueViewProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-2 space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Create your league</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Five steps: sport and format (including Survivor/Zombie options when selected), league details, scoring, AI and
          privacy, then review. Import from another platform anytime from the{' '}
          <Link href="/import" className="text-cyan-300 underline-offset-2 hover:underline">
            import page
          </Link>
          .
        </p>
      </div>

      <LeagueCreationWizard initialStep={initialStep ?? undefined} />
    </div>
  );
}
