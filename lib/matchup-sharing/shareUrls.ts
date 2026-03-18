/**
 * Matchup share URLs and copy text (PROMPT 295).
 */

export type MatchupShareChannel = 'x' | 'twitter' | 'reddit' | 'instagram' | 'discord' | 'copy_link'

const HASHTAGS = ['AllFantasy', 'FantasyFootball', 'Matchup']

export function buildMatchupShareUrl(
  channel: MatchupShareChannel,
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

export function getMatchupShareCopyText(
  channel: MatchupShareChannel,
  options: { title: string; shareUrl: string }
): string {
  const { title, shareUrl } = options
  const tagStr = HASHTAGS.map((h) => `#${h}`).join(' ')
  switch (channel) {
    case 'x':
    case 'twitter':
      return [title, shareUrl, tagStr].join('\n\n')
    case 'instagram':
      return [title, shareUrl, tagStr].join('\n\n')
    case 'discord':
      return [title, shareUrl].join('\n\n')
    case 'reddit':
      return `${title}\n\n${shareUrl}`
    case 'copy_link':
      return shareUrl
    default:
      return shareUrl
  }
}
