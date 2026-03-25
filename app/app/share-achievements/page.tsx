'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Share2, Copy, Loader2, Trophy, Zap, Target, ImagePlus, FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAchievementSharePayload,
  ACHIEVEMENT_SHARE_TYPES,
} from '@/lib/social-sharing';
import { getTwitterShareUrl, getFacebookShareUrl, getRedditShareUrl } from '@/lib/social-sharing/SocialShareService';
import type { AchievementShareType, AchievementShareContext } from '@/lib/social-sharing/types';
import { toast } from 'sonner';
import { SUPPORTED_SPORTS } from '@/lib/sport-scope';

const TYPE_LABELS: Record<string, string> = {
  winning_matchup: 'Winning a matchup',
  winning_league: 'Winning a league',
  high_scoring_team: 'High scoring team',
  bracket_success: 'Bracket success',
  rivalry_win: 'Rivalry win',
  playoff_qualification: 'Playoff qualification',
  championship_win: 'Championship win',
  great_waiver_pickup: 'Great waiver pickup',
  great_trade: 'Great trade',
  major_upset: 'Major upset',
  top_rank_legacy: 'Top rank / legacy',
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

function getDefaultContext(type: AchievementShareType): AchievementShareContext {
  const base = { leagueName: 'My League', teamName: 'My team' };
  switch (type) {
    case 'winning_matchup':
      return { ...base, opponentName: 'my opponent', week: 1 };
    case 'winning_league':
      return base;
    case 'high_scoring_team':
      return { ...base, score: 180, week: 1 };
    case 'bracket_success':
      return { ...base, bracketName: 'My Bracket' };
    case 'rivalry_win':
      return { ...base, rivalryName: 'my rival', opponentName: 'my rival' };
    case 'playoff_qualification':
    case 'championship_win':
      return base;
    case 'great_waiver_pickup':
      return { ...base, playerName: 'a stud' };
    case 'great_trade':
      return base;
    case 'major_upset':
      return { ...base, opponentName: 'the favorite' };
    case 'top_rank_legacy':
      return { ...base, rank: 1, tier: 'Elite' };
    default:
      return base;
  }
}

export default function ShareAchievementsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);
  const [sport, setSport] = useState<string>(SUPPORTED_SPORTS[0] ?? 'NFL');
  const [shareId, setShareId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ shareUrl: string; title: string; caption: string } | null>(null);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const openTwitter = useCallback((type: AchievementShareType, context: AchievementShareContext) => {
    const { shareUrl, text } = getAchievementSharePayload(type, context);
    window.open(getTwitterShareUrl(shareUrl, text), '_blank', 'noopener,noreferrer');
  }, []);

  const openFacebook = useCallback((type: AchievementShareType, context: AchievementShareContext) => {
    const { facebookUrl } = getAchievementSharePayload(type, context);
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const openReddit = useCallback((type: AchievementShareType, context: AchievementShareContext) => {
    const { shareUrl, title } = getAchievementSharePayload(type, context);
    window.open(getRedditShareUrl(shareUrl, title), '_blank', 'noopener,noreferrer');
  }, []);

  const handleShare = useCallback(
    (type: AchievementShareType, context: AchievementShareContext) => {
      const { shareUrl, title, twitterUrl } = getAchievementSharePayload(type, context);
      if (navigator.share && navigator.canShare?.({ title, url: shareUrl })) {
        navigator.share({
          title,
          url: shareUrl,
          text: title,
        }).then(() => toast.success('Shared')).catch(() => {
          window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        });
      } else {
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
      }
    },
    []
  );

  const handleCopyLink = useCallback(
    async (type: AchievementShareType, context: AchievementShareContext) => {
      const { shareUrl } = getAchievementSharePayload(type, context);
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedId(type);
        toast.success('Link copied');
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        toast.error('Could not copy link');
      }
    },
    []
  );

  const handleGenerateShareCard = useCallback(
    async (type: AchievementShareType, context: AchievementShareContext) => {
      setGeneratingCard(true);
      try {
        const res = await fetch('/api/share/moment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareType: type, sport, ...context }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setShareId(data.shareId);
        setPreview({ shareUrl: data.shareUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${data.shareId}`, title: data.title, caption: data.summary });
        toast.success('Share card created');
      } catch {
        toast.error('Could not create share card');
      } finally {
        setGeneratingCard(false);
      }
    },
    [sport]
  );

  const handleGenerateCopy = useCallback(
    async (type: AchievementShareType, context: AchievementShareContext) => {
      setGeneratingCopy(true);
      try {
        const res = await fetch('/api/share/generate-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareType: type, sport, ...context }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const fallbackUrl = getAchievementSharePayload(type, context).shareUrl;
        const shareUrl = shareId
          ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareId}`
          : fallbackUrl;
        setPreview({
          shareUrl,
          title: data.headline ?? '',
          caption: data.caption ?? '',
        });
        toast.success(data.fromGrok ? 'Grok copy generated' : 'Copy generated');
      } catch {
        toast.error('Could not generate copy');
      } finally {
        setGeneratingCopy(false);
      }
    },
    [sport, shareId]
  );

  const handleCopyCaption = useCallback(async (caption: string, type: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaptionId(type);
      toast.success('Caption copied');
      setTimeout(() => setCopiedCaptionId(null), 2000);
    } catch {
      toast.error('Could not copy caption');
    }
  }, []);

  const handlePublish = useCallback(async (platform: string) => {
    if (!shareId) { toast.error('Create a share card first'); return; }
    setPublishLoading(true);
    try {
      const res = await fetch('/api/share/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (data.status === 'provider_unavailable') toast.info(data.message ?? 'Posting not configured yet');
      else toast.success('Publish requested');
    } catch {
      toast.error('Publish failed');
    } finally {
      setPublishLoading(false);
    }
  }, [shareId]);

  const closePreview = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
          data-audit="back-button"
        >
          Back
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-white">Share your achievements</h1>
        <p className="mt-1 text-sm text-white/60">
          Generate share cards and Grok-powered copy. Share to X, Facebook, or copy link/caption.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-white/60">Sport</label>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-white text-sm"
          data-audit="sport-selector"
          data-testid="share-achievement-sport-selector"
        >
          {SUPPORTED_SPORTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {preview && (
        <Card className="border-cyan-500/30 bg-cyan-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base text-white">Preview</CardTitle>
            <Button variant="ghost" size="sm" onClick={closePreview} className="text-white/70" data-audit="close-preview-button">
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-white">{preview.title}</p>
            <p className="text-xs text-white/70 whitespace-pre-wrap">{preview.caption}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(preview.shareUrl); toast.success('Link copied'); }}
                className="gap-1.5 border-white/20"
                data-audit="copy-link-button-preview"
              >
                <Copy className="h-3.5 w-3.5" /> Copy link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyCaption(preview.caption, 'preview')}
                className="gap-1.5 border-white/20"
                data-audit="copy-caption-button"
              >
                {copiedCaptionId === 'preview' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCaptionId === 'preview' ? 'Copied!' : 'Copy caption'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePublish('x')}
                disabled={publishLoading}
                className="gap-1.5 border-white/20"
                data-audit="publish-now-button"
              >
                {publishLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Publish to X
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {(ACHIEVEMENT_SHARE_TYPES as unknown as AchievementShareType[]).map((type) => {
          const context = getDefaultContext(type);
          const Icon = TYPE_ICONS[type] ?? Trophy;
          const label = TYPE_LABELS[type] ?? type;
          return (
            <Card key={type} className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <Icon className="h-5 w-5 text-amber-400" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateShareCard(type, context)}
                  disabled={generatingCard}
                  className="gap-2 border-white/20"
                  data-audit="generate-share-card-button"
                  data-share-type={type}
                >
                  {generatingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Generate share card
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateCopy(type, context)}
                  disabled={generatingCopy}
                  className="gap-2 border-white/20"
                  data-audit="generate-copy-button"
                  data-share-type={type}
                >
                  {generatingCopy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Generate copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(type, context)}
                  className="gap-2 border-white/20"
                  data-audit="share-button"
                  data-share-type={type}
                  data-testid={`share-achievement-share-button-${type}`}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTwitter(type, context)}
                  className="gap-2 border-white/20"
                  data-audit="share-button-twitter"
                  data-testid={`share-achievement-share-button-x-${type}`}
                >
                  Post to X
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openFacebook(type, context)}
                  className="gap-2 border-white/20"
                  data-audit="share-button-facebook"
                  data-testid={`share-achievement-share-button-facebook-${type}`}
                >
                  Share on Facebook
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openReddit(type, context)}
                  className="gap-2 border-white/20"
                  data-audit="share-button-reddit"
                  data-testid={`share-achievement-share-button-reddit-${type}`}
                >
                  Share on Reddit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(type, context)}
                  className="gap-2 border-white/20"
                  data-audit="copy-link-button"
                  data-share-type={type}
                  data-testid={`share-achievement-copy-link-button-${type}`}
                >
                  {copiedId === type ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedId === type ? 'Copied!' : 'Copy link'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-white/50">
        Generate share card to get a shareable link and optional Grok-generated caption. Copy link or caption, or publish to connected accounts when enabled.
      </p>
    </main>
  );
}
