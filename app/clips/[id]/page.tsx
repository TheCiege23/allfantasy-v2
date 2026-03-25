'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Share2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GraphicRenderer, SOCIAL_CLIP_GRAPHIC_ID } from '@/lib/social-clips';
import {
  getClipPageUrl,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getCopyLinkPayload,
} from '@/lib/social-clips/ShareLinkResolver';
import type { ClipPayload } from '@/lib/social-clips/types';
import { toast } from 'sonner';

export default function ClipDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const [clip, setClip] = useState<{
    id: string;
    clipType: string;
    title: string;
    subtitle: string | null;
    stats?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareDone, setShareDone] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/clips/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Not found' : 'Failed to load');
        return r.json();
      })
      .then(setClip)
      .catch(() => setClip(null))
      .finally(() => setLoading(false));
  }, [id]);

  const clipPageUrl = typeof window !== 'undefined' ? getClipPageUrl(id) : '';
  const payload: ClipPayload | null = clip
    ? {
        title: clip.title,
        subtitle: clip.subtitle ?? null,
        stats: clip.stats,
      }
    : null;

  const handleShare = useCallback(async () => {
    if (!clipPageUrl || !clip) return;
    try {
      if (navigator.share && navigator.canShare?.({ title: clip.title, url: clipPageUrl })) {
        await navigator.share({
          title: clip.title,
          url: clipPageUrl,
          text: getCopyLinkPayload(clipPageUrl, clip.title),
        });
      } else {
        await navigator.clipboard.writeText(clipPageUrl);
      }
      setShareDone(true);
      toast.success('Link copied to clipboard');
    } catch {
      try {
        await navigator.clipboard.writeText(clipPageUrl);
        setShareDone(true);
        toast.success('Link copied to clipboard');
      } catch {
        toast.error('Could not copy link');
      }
    }
  }, [clipPageUrl, clip]);

  const openTwitterShare = useCallback(() => {
    if (!clipPageUrl || !clip) return;
    const url = getTwitterShareUrl(clipPageUrl, clip.title);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [clipPageUrl, clip]);

  const openFacebookShare = useCallback(() => {
    if (!clipPageUrl) return;
    const url = getFacebookShareUrl(clipPageUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [clipPageUrl]);

  const handleDownload = useCallback(async () => {
    const element = document.getElementById(SOCIAL_CLIP_GRAPHIC_ID);
    if (!element) {
      toast.error('Graphic not found');
      return;
    }
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#0f0f14',
        scale: 2,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `allfantasy-clip-${id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Image downloaded');
    } catch {
      toast.error('Failed to download image');
    } finally {
      setDownloading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="space-y-4 p-4">
        <Link
          href="/clips"
          className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to clips
        </Link>
        <p className="text-red-400">Clip not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/clips"
          className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to clips
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1.5 border-white/20"
            data-testid="social-clip-share-graphic-button"
          >
            <Share2 className="h-4 w-4" />
            {shareDone ? 'Copied!' : 'Share graphic'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openTwitterShare}
            className="gap-1.5 border-white/20"
            data-testid="social-clip-share-x-button"
          >
            Post to X
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openFacebookShare}
            className="gap-1.5 border-white/20"
            data-testid="social-clip-share-facebook-button"
          >
            Share to Facebook
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="gap-1.5 border-white/20"
            data-testid="social-clip-download-graphic-button"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download graphic
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <GraphicRenderer
          payload={payload!}
          clipType={clip.clipType as 'weekly_league_winners' | 'biggest_upset' | 'top_scoring_team'}
          className="shadow-xl"
        />
      </div>
    </div>
  );
}
