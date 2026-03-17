/**
 * Generates share content for achievement types (Prompt 121).
 */

import type { AchievementShareType, AchievementShareContext, ShareContent } from './types';

const DEFAULT_HASHTAGS = ['AllFantasy', 'FantasyFootball'];

export function getShareContent(
  type: AchievementShareType,
  context: AchievementShareContext = {}
): ShareContent {
  const league = context.leagueName ?? 'My League';
  const team = context.teamName ?? 'My team';

  switch (type) {
    case 'winning_matchup': {
      const opponent = context.opponentName ?? 'my opponent';
      const week = context.week != null ? ` in Week ${context.week}` : '';
      const score = context.score != null ? ` ${context.score} pts` : '';
      return {
        title: `I just won my matchup${week}!`,
        text: `I just won my matchup${week} vs ${opponent}${score} on AllFantasy. ${league}.`,
        hashtags: [...DEFAULT_HASHTAGS, 'FantasyWin'],
      };
    }
    case 'winning_league': {
      return {
        title: `League champion in ${league}!`,
        text: `${team} won the league in ${league}. Champion on AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'LeagueChampion'],
      };
    }
    case 'high_scoring_team': {
      const score = context.score != null ? ` with ${context.score} points` : '';
      const week = context.week != null ? ` in Week ${context.week}` : '';
      return {
        title: `High score${week}!`,
        text: `${team} put up a huge score${score}${week} on AllFantasy. ${league}.`,
        hashtags: [...DEFAULT_HASHTAGS, 'HighScore'],
      };
    }
    case 'bracket_success': {
      const bracket = context.bracketName ?? 'my bracket';
      return {
        title: `Bracket success in ${bracket}!`,
        text: `Just crushed it in ${bracket} on AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'Bracket'],
      };
    }
    case 'rivalry_win': {
      const rival = context.rivalryName ?? context.opponentName ?? 'my rival';
      return {
        title: `Rivalry W vs ${rival}!`,
        text: `Took down ${rival} in ${league}. AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'RivalryWin'],
      };
    }
    case 'playoff_qualification': {
      return {
        title: `Playoffs locked in ${league}!`,
        text: `${team} is in the playoffs. ${league} on AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'Playoffs'],
      };
    }
    case 'championship_win': {
      return {
        title: `Champion in ${league}!`,
        text: `${team} won the championship in ${league}. AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'Champion'],
      };
    }
    case 'great_waiver_pickup': {
      const player = context.playerName ?? 'a stud';
      return {
        title: `Waiver wire win: ${player}`,
        text: `Just grabbed ${player} off waivers in ${league}. AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'WaiverWire'],
      };
    }
    case 'great_trade': {
      return {
        title: `Pulled off a great trade in ${league}!`,
        text: `Just completed a trade in ${league}. AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'FantasyTrade'],
      };
    }
    case 'major_upset': {
      const opp = context.opponentName ?? 'the favorite';
      return {
        title: `Upset alert: took down ${opp}!`,
        text: `Major upset vs ${opp} in ${league}. AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'Upset'],
      };
    }
    case 'top_rank_legacy': {
      const rank = context.rank ?? context.tier ?? 'top';
      return {
        title: `Top ${rank} in ${league}!`,
        text: `Ranked ${rank} in ${league}. AllFantasy.`,
        hashtags: [...DEFAULT_HASHTAGS, 'Rankings'],
      };
    }
    default: {
      return {
        title: 'Check out my fantasy achievement on AllFantasy',
        text: `I'm sharing my fantasy football achievement on AllFantasy. ${league}.`,
        hashtags: DEFAULT_HASHTAGS,
      };
    }
  }
}

export function formatShareText(content: ShareContent, maxLength: number = 200): string {
  const withHashtags = content.hashtags.length > 0
    ? `${content.text} ${content.hashtags.map((h) => `#${h}`).join(' ')}`
    : content.text;
  return withHashtags.length > maxLength ? withHashtags.slice(0, maxLength - 3) + '...' : withHashtags;
}
