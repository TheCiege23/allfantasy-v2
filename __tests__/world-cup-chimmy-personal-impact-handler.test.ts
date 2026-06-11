import { describe, expect, it } from "vitest"
import { DEFAULT_WORLD_CUP_SCORING } from "@/lib/world-cup/worldCupBracketBuilder"
import type { WorldCupChimmyContext } from "@/lib/world-cup/worldCupChimmyContext"
import { tryDeterministicWorldCupChimmyReply } from "@/lib/world-cup/worldCupChimmyReplyPolicy"

// ── Helpers ───────────────────────────────────────────────────────────────────

function ctx(overrides: Partial<WorldCupChimmyContext> = {}): WorldCupChimmyContext {
  return {
    challengeId: "wc-test",
    poolName: "Test Cup",
    isLocked: false,
    lockReason: null,
    participantCount: 8,
    entryCount: 8,
    finalizedEntryCount: 8,
    inviteCount: 0,
    scoring: { ...DEFAULT_WORLD_CUP_SCORING },
    userRole: "participant",
    commissionerSettings: null,
    entry: {
      entryId: "entry-1",
      entryName: "Test Bracket",
      championPick: "Brazil",
      totalScore: 30,
      maxPossibleScore: 400,
      rank: 3,
      correctPicks: 3,
      incorrectPicks: 0,
      isComplete: true,
      isLocked: false,
      groupPicks: [],
      knockoutPicks: [
        {
          round: "semifinal",
          homeTeamName: "Brazil",
          awayTeamName: "Argentina",
          pickedTeam: "Brazil",
          isCorrect: null,
          pointsAwarded: 0,
        },
        {
          round: "quarterfinal",
          homeTeamName: "France",
          awayTeamName: "England",
          pickedTeam: "France",
          isCorrect: null,
          pointsAwarded: 0,
        },
      ],
      thirdPlacePicks: [],
    },
    liveMatches: [],
    upcomingMatches: [
      {
        matchId: "m-sf-1",
        round: "semifinal",
        homeTeamName: "Brazil",
        awayTeamName: "Argentina",
        homeScore: null,
        awayScore: null,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winnerTeamName: null,
        status: "scheduled",
        minute: null,
        injuryTime: null,
        startsAt: "2026-07-09T18:00:00.000Z",
        venueName: null,
        venueCity: null,
        apiStatusShort: "NS",
        lastSyncedAt: "2026-06-10T08:00:00.000Z",
      },
      {
        matchId: "m-qf-1",
        round: "quarterfinal",
        homeTeamName: "France",
        awayTeamName: "England",
        homeScore: null,
        awayScore: null,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winnerTeamName: null,
        status: "scheduled",
        minute: null,
        injuryTime: null,
        startsAt: "2026-07-05T14:00:00.000Z",
        venueName: null,
        venueCity: null,
        apiStatusShort: "NS",
        lastSyncedAt: "2026-06-10T08:00:00.000Z",
      },
    ],
    recentMatches: [],
    groupStandings: [],
    leaderboard: [],
    liveDataStatus: "fixture_only",
    lastSyncedAt: "2026-06-10T08:00:00.000Z",
    locale: "en",
    fetchedAt: "2026-06-10T09:00:00.000Z",
    ...overrides,
  }
}

function det(prompt: string, context: WorldCupChimmyContext | null = ctx()) {
  return tryDeterministicWorldCupChimmyReply({ prompt, context, locale: "en" })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("isPersonalImpactQuestion detection", () => {
  const TRUE_CASES = [
    "who should I root for today?",
    "Who should I root for?",
    "why does this match matter to me?",
    "why do the matches matter to me?",
    "what match matters most for me?",
    "what match matters most to me?",
    "which match is most important for me?",
    "which match is most important to me?",
    "personal impact on my bracket",
    "how does this affect my score?",
    "how does this affect my bracket?",
    "how does this affect my picks?",
    "my picks at stake",
    "my pick at stake",
    "my picks impact",
  ]

  for (const prompt of TRUE_CASES) {
    it(`detects as personal impact: "${prompt}"`, () => {
      expect(det(prompt)).not.toBeNull()
    })
  }

  const FALSE_CASES = [
    "who won last night?",
    "what is the score of Brazil?",
    "show me the leaderboard",
    "how many points do I have?",
    "what time does France play?",
  ]

  for (const prompt of FALSE_CASES) {
    it(`does NOT detect as personal impact: "${prompt}"`, () => {
      // These may hit other deterministic handlers, but NOT the personal impact one
      // (they don't produce personal impact text)
      const reply = det(prompt)
      if (reply !== null) {
        expect(reply).not.toMatch(/most important match/i)
        expect(reply).not.toMatch(/Root for.*costs you/i)
      }
    })
  }
})

describe("buildPersonalImpactReply content", () => {
  it("H1: identifies highest-round pick as most important", () => {
    const reply = det("who should I root for today?")
    expect(reply).not.toBeNull()
    // Semifinal should be ranked higher than quarterfinal
    expect(reply).toMatch(/Brazil vs Argentina/i)
    expect(reply).toMatch(/Root for Brazil/i)
    expect(reply).toMatch(/Argentina win costs you 80 pts/i)
  })

  it("H2: lists other alive picks below the top match", () => {
    const reply = det("personal impact on my bracket")
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/France vs England/i)
  })

  it("H3: champion risk note appears when champion is in the top match", () => {
    const context = ctx({
      entry: {
        entryId: "entry-1",
        entryName: "Test Bracket",
        championPick: "Brazil",
        totalScore: 30,
        maxPossibleScore: 400,
        rank: 3,
        correctPicks: 3,
        incorrectPicks: 0,
        isComplete: true,
        isLocked: false,
        groupPicks: [],
        knockoutPicks: [
          {
            round: "final",
            homeTeamName: "Brazil",
            awayTeamName: "France",
            pickedTeam: "Brazil",
            isCorrect: null,
            pointsAwarded: 0,
          },
        ],
        thirdPlacePicks: [],
      },
      upcomingMatches: [
        {
          matchId: "m-final",
          round: "final",
          homeTeamName: "Brazil",
          awayTeamName: "France",
          homeScore: null,
          awayScore: null,
          homePenaltyScore: null,
          awayPenaltyScore: null,
          winnerTeamName: null,
          status: "scheduled",
          minute: null,
          injuryTime: null,
          startsAt: "2026-07-19T18:00:00.000Z",
          venueName: null,
          venueCity: null,
          apiStatusShort: "NS",
          lastSyncedAt: "2026-06-10T08:00:00.000Z",
        },
      ],
    })
    const reply = det("who should I root for today?", context)
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/champion bonus/i)
    expect(reply).toMatch(/Brazil/i)
  })

  it("H4: no entry → low-confidence message", () => {
    const reply = det("why does this match matter to me?", ctx({ entry: null }))
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/do not see a saved bracket/i)
  })

  it("H5: no overlapping matches → low-confidence message", () => {
    const context = ctx({
      upcomingMatches: [
        {
          matchId: "m-other",
          round: "quarterfinal",
          homeTeamName: "Spain",
          awayTeamName: "Portugal",
          homeScore: null,
          awayScore: null,
          homePenaltyScore: null,
          awayPenaltyScore: null,
          winnerTeamName: null,
          status: "scheduled",
          minute: null,
          injuryTime: null,
          startsAt: "2026-07-05T14:00:00.000Z",
          venueName: null,
          venueCity: null,
          apiStatusShort: "NS",
          lastSyncedAt: "2026-06-10T08:00:00.000Z",
        },
      ],
    })
    const reply = det("what match matters most for me?", context)
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/do not see any upcoming or live/i)
  })

  it("H6: excludes already-incorrect picks from analysis", () => {
    const context = ctx({
      entry: {
        entryId: "entry-1",
        entryName: "Test Bracket",
        championPick: "Brazil",
        totalScore: 30,
        maxPossibleScore: 320,
        rank: 4,
        correctPicks: 2,
        incorrectPicks: 1,
        isComplete: true,
        isLocked: false,
        groupPicks: [],
        knockoutPicks: [
          {
            round: "semifinal",
            homeTeamName: "Brazil",
            awayTeamName: "Argentina",
            pickedTeam: "Brazil",
            isCorrect: null,
            pointsAwarded: 0,
          },
          {
            round: "quarterfinal",
            homeTeamName: "France",
            awayTeamName: "England",
            pickedTeam: "France",
            isCorrect: false, // already eliminated
            pointsAwarded: 0,
          },
        ],
        thirdPlacePicks: [],
      },
    })
    const reply = det("who should I root for?", context)
    expect(reply).not.toBeNull()
    // Brazil match should appear but not France (eliminated)
    expect(reply).toMatch(/Brazil vs Argentina/i)
    expect(reply).not.toMatch(/France vs England/i)
  })

  it("H7: null context → reliable data unavailable message", () => {
    const reply = det("who should I root for today?", null)
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/don't have reliable data|do not have reliable data/i)
  })
})
