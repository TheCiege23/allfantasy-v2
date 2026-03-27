import { describe, expect, it } from 'vitest';
import { buildDeterministicCoachEvaluation } from '@/lib/fantasy-coach';

describe('deterministic coach mode engine', () => {
  it('returns the same evaluation for the same team context', async () => {
    const input = {
      sport: 'SOCCER',
      teamName: 'Metro XI',
      leagueName: 'City League',
      week: 4,
    };

    const first = await buildDeterministicCoachEvaluation(input);
    const second = await buildDeterministicCoachEvaluation(input);

    expect(first.deterministicSeed).toBe(second.deterministicSeed);
    expect(first.teamSummary).toBe(second.teamSummary);
    expect(first.rosterStrengths).toEqual(second.rosterStrengths);
    expect(first.rosterWeaknesses).toEqual(second.rosterWeaknesses);
    expect(first.waiverOpportunities).toEqual(second.waiverOpportunities);
    expect(first.tradeSuggestions).toEqual(second.tradeSuggestions);
    expect(first.actionRecommendations).toEqual(second.actionRecommendations);
    expect(first.teamSnapshot).toEqual(second.teamSnapshot);
  });

  it('changes the evaluation when team context changes', async () => {
    const baseline = await buildDeterministicCoachEvaluation({
      sport: 'NBA',
      teamName: 'Starter Squad',
      week: 9,
    });

    const changed = await buildDeterministicCoachEvaluation({
      sport: 'NBA',
      teamName: 'Starter Squad',
      week: 10,
    });

    expect(changed.deterministicSeed).not.toBe(baseline.deterministicSeed);
    expect(changed.teamSummary).not.toBe(baseline.teamSummary);
    expect(changed.teamSnapshot.week).toBe(10);
  });
});
