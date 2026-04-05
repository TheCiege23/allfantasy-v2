import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockNextRequest } from '@/__tests__/helpers/createMockNextRequest';

const runTwoPlayerComparisonEngineMock = vi.fn();
const comparePlayersMultiMock = vi.fn();
const getServerSessionMock = vi.fn();
const evaluateUserFeatureAccessMock = vi.fn();

vi.mock('@/lib/player-comparison-lab', () => ({
  runTwoPlayerComparisonEngine: runTwoPlayerComparisonEngineMock,
  comparePlayersMulti: comparePlayersMultiMock,
}));

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/subscription/FeatureGateService', () => ({
  FeatureGateService: class {
    evaluateUserFeatureAccess = evaluateUserFeatureAccessMock
  },
}));

describe('GET /api/player-comparison contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    evaluateUserFeatureAccessMock.mockResolvedValue({
      allowed: true,
      requiredPlan: 'AF Pro',
      message: 'Access granted.',
      upgradePath: '/pricing',
    });
  });

  it('returns 400 when player params are missing', async () => {
    const { GET } = await import('@/app/api/player-comparison/route');
    const req = createMockNextRequest('http://localhost/api/player-comparison');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns deterministic + explanation payload on success', async () => {
    runTwoPlayerComparisonEngineMock.mockResolvedValueOnce({
      sport: 'NFL',
      comparison: {
        playerA: { name: 'A' },
        playerB: { name: 'B' },
        chartSeries: [{ label: 'Dynasty value', playerA: 9000, playerB: 8500, unit: '' }],
        summaryLines: ['A leads in value'],
      },
      deterministic: {
        recommendedSide: 'playerA',
        recommendedPlayerName: 'A',
        confidencePct: 82,
        basedOn: ['stats_comparison'],
        summary: 'Deterministic stats comparison favors A.',
        statComparisons: [],
      },
      explanation: {
        source: 'deterministic',
        text: 'Deterministic stats comparison favors A.',
      },
    });

    const { GET } = await import('@/app/api/player-comparison/route');
    const req = createMockNextRequest(
      'http://localhost/api/player-comparison?playerA=Player%20A&playerB=Player%20B&includeAIExplanation=true'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.playerA?.name).toBe('A');
    expect(body.deterministic?.recommendedPlayerName).toBe('A');
    expect(body.explanation?.source).toBe('deterministic');
    expect(runTwoPlayerComparisonEngineMock).toHaveBeenCalledTimes(1);
    expect(runTwoPlayerComparisonEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        playerAName: 'Player A',
        playerBName: 'Player B',
        includeAIExplanation: true,
      })
    );
  });
});

describe('POST /api/player-comparison contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    evaluateUserFeatureAccessMock.mockResolvedValue({
      allowed: true,
      requiredPlan: 'AF Pro',
      message: 'Access granted.',
      upgradePath: '/pricing',
    });
  });

  it('returns comparison payload with twoPlayerEngine for two players', async () => {
    comparePlayersMultiMock.mockResolvedValueOnce({
      sport: 'NFL',
      scoringFormat: 'ppr',
      leagueScoringSettings: null,
      players: [{ name: 'Player A' }, { name: 'Player B' }],
      matrix: [],
      categoryWinners: [],
      playerScores: [],
      summaryLines: ['Player A edges Player B'],
      sourceCoverage: {
        fantasyCalc: true,
        sleeper: true,
        espnInjuryFeed: true,
        internalAdp: true,
        internalProjections: true,
        leagueScoringSettings: false,
      },
    });
    runTwoPlayerComparisonEngineMock.mockResolvedValueOnce({
      sport: 'NFL',
      comparison: {
        playerA: { name: 'Player A' },
        playerB: { name: 'Player B' },
        chartSeries: [],
        summaryLines: ['Player A edges Player B'],
      },
      deterministic: {
        recommendedSide: 'playerA',
        recommendedPlayerName: 'Player A',
        confidencePct: 80,
        basedOn: ['stats_comparison'],
        summary: 'Deterministic stats comparison favors Player A.',
        statComparisons: [],
      },
      explanation: {
        source: 'ai',
        text: 'Player A is the recommended side based on deterministic metrics.',
      },
    });

    const { POST } = await import('@/app/api/player-comparison/route');
    const req = createMockNextRequest('http://localhost/api/player-comparison', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players: ['Player A', 'Player B'],
        sport: 'NFL',
        scoringFormat: 'ppr',
        includeAIExplanation: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.players).toHaveLength(2);
    expect(body.twoPlayerEngine?.deterministic?.recommendedPlayerName).toBe('Player A');
    expect(body.twoPlayerEngine?.explanation?.source).toBe('ai');
    expect(runTwoPlayerComparisonEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        playerAName: 'Player A',
        playerBName: 'Player B',
        includeAIExplanation: true,
      })
    );
  });

  it('keeps twoPlayerEngine null for 3+ players', async () => {
    comparePlayersMultiMock.mockResolvedValueOnce({
      sport: 'NFL',
      scoringFormat: 'ppr',
      leagueScoringSettings: null,
      players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
      matrix: [],
      categoryWinners: [],
      playerScores: [],
      summaryLines: ['A leads'],
      sourceCoverage: {
        fantasyCalc: true,
        sleeper: true,
        espnInjuryFeed: true,
        internalAdp: true,
        internalProjections: true,
        leagueScoringSettings: false,
      },
    });

    const { POST } = await import('@/app/api/player-comparison/route');
    const req = createMockNextRequest('http://localhost/api/player-comparison', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players: ['A', 'B', 'C'],
        sport: 'NFL',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.players).toHaveLength(3);
    expect(body.twoPlayerEngine).toBeNull();
    expect(runTwoPlayerComparisonEngineMock).not.toHaveBeenCalled();
  });
});
