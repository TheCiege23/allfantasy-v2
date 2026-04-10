/**
 * Reddit Social Publish Provider
 *
 * Posts content to Reddit on behalf of the user via OAuth.
 * Supports text posts and link posts to configured subreddits.
 */

import type { SocialPlatform } from '../types'
import type { SocialPublishProvider, SocialPublishProviderRequest, SocialPublishProviderResponse } from './types'

const REDDIT_API_BASE = 'https://oauth.reddit.com'

export class RedditSocialPublishProvider implements SocialPublishProvider {
  id = 'reddit'

  supports(platform: SocialPlatform): boolean {
    return platform === 'reddit'
  }

  isConfigured(): boolean {
    return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)
  }

  async publish(input: SocialPublishProviderRequest): Promise<SocialPublishProviderResponse> {
    const accessToken = input.target?.accountIdentifier
    if (!accessToken) {
      return { status: 'failed', message: 'No Reddit access token. Connect Reddit in settings.' }
    }

    if (!this.isConfigured()) {
      return { status: 'provider_unavailable', message: 'Reddit API not configured.' }
    }

    const metadata = input.assetMetadata ?? {}
    const subreddit = typeof metadata.subreddit === 'string' ? metadata.subreddit : 'fantasyfootball'
    const imageUrl = typeof metadata.imageUrl === 'string' ? metadata.imageUrl : null

    try {
      const body = new URLSearchParams({
        api_type: 'json',
        kind: imageUrl ? 'link' : 'self',
        sr: subreddit,
        title: input.assetTitle || input.publishText.slice(0, 300),
        ...(imageUrl ? { url: imageUrl } : { text: input.publishText }),
      })

      const res = await fetch(`${REDDIT_API_BASE}/api/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AllFantasyAI/1.0',
        },
        body,
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => 'unknown')
        return { status: 'failed', message: `Reddit API ${res.status}: ${errBody}` }
      }

      const data = await res.json()
      const postUrl = data?.json?.data?.url
      return {
        status: 'success',
        message: postUrl ? `Posted to r/${subreddit}` : 'Post submitted',
        responseMetadata: { postUrl, subreddit },
      }
    } catch (e) {
      return { status: 'failed', message: e instanceof Error ? e.message : 'Reddit post failed' }
    }
  }
}
