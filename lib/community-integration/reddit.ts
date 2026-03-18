/**
 * Reddit integration — Reddit-ready posts and submit URLs (PROMPT 298).
 */

import type { RedditReadyPost, CommunityShareInput } from './types'

const TITLE_MAX = 300
const BODY_MAX = 40000

const FANTASY_SUBREDDITS = ['fantasyfootball', 'DynastyFF', 'FFCommish', 'sleeperapp']

export function buildRedditReadyPost(input: CommunityShareInput): RedditReadyPost {
  const title = input.title.slice(0, TITLE_MAX)

  const bodyParts: string[] = []
  if (input.description) bodyParts.push(input.description)
  if (input.extraLines?.length) bodyParts.push(input.extraLines.map((l) => `- ${l}`).join('\n'))
  if (input.url) bodyParts.push(`\n\n**Link:** ${input.url}`)
  bodyParts.push('\n\n---\n*Shared from [AllFantasy](https://allfantasy.ai)*')
  const body = bodyParts.join('\n\n').slice(0, BODY_MAX)

  const submitUrl =
    input.url &&
    `https://www.reddit.com/submit?url=${encodeURIComponent(input.url)}&title=${encodeURIComponent(title)}`

  return {
    title,
    body,
    suggestedSubreddits: FANTASY_SUBREDDITS,
    submitUrl,
  }
}

/**
 * Build Reddit submit URL (user picks subreddit; we pre-fill url + title).
 */
export function buildRedditSubmitUrl(
  url: string,
  title: string,
  subreddit?: string
): string {
  const base = 'https://www.reddit.com/submit'
  const params = new URLSearchParams({
    url,
    title: title.slice(0, TITLE_MAX),
  })
  if (subreddit) {
    return `https://www.reddit.com/r/${subreddit.replace(/^r\//, '')}/submit?${params.toString()}`
  }
  return `${base}?${params.toString()}`
}
