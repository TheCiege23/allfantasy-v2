/**
 * League story share URLs and copy text (PROMPT 296).
 */

export type LeagueStoryShareChannel = 'x' | 'twitter' | 'reddit' | 'instagram' | 'discord' | 'copy_link'

const HASHTAGS = ['AllFantasy', 'FantasyFootball', 'LeagueStory']

export function buildLeagueStoryShareUrl(
  channel: LeagueStoryShareChannel,
  options: { title: string; shareUrl: string }
): string {
  const { title, shareUrl } = options
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(`${title}\n\n${shareUrl}`)

  switch (channel) {
    case 'x':
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedText}`
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(title)}`
    default:
      return ''
  }
}

export function getLeagueStoryShareCopyText(
  channel: LeagueStoryShareChannel,
  options: { title: string; shareUrl: string; narrative?: string }
): string {
  const { title, shareUrl, narrative } = options
  const tagStr = HASHTAGS.map((h) => `#${h}`).join(' ')
  switch (channel) {
    case 'x':
    case 'twitter':
      return [title, narrative, shareUrl, tagStr].filter(Boolean).join('\n\n')
    case 'instagram':
      return [title, narrative, shareUrl, tagStr].filter(Boolean).join('\n\n')
    case 'discord':
      return [title, narrative, shareUrl].filter(Boolean).join('\n\n')
    case 'reddit':
      return [title, narrative, shareUrl].filter(Boolean).join('\n\n')
    case 'copy_link':
      return shareUrl
    default:
      return shareUrl
  }
}
