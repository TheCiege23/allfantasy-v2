'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CLIP_TYPES, type ClipType } from '@/lib/social-clips/types';
import { useUserTimezone } from '@/hooks/useUserTimezone';

const CLIP_TYPE_LABELS: Record<ClipType, string> = {
  weekly_league_winners: 'Weekly League Winners',
  biggest_upset: 'Biggest Upset',
  top_scoring_team: 'Top Scoring Team',
};

interface ClipRow {
  id: string;
  clipType: string;
  title: string;
  subtitle: string | null;
  createdAt: string;
}

export default function ClipsPage() {
  const { formatDateInTimezone } = useUserTimezone();
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<ClipType>('weekly_league_winners');

  const fetchClips = () => {
    setLoading(true);
    fetch('/api/clips', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.clips) setClips(data.clips);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClips();
  }, []);

  const handleGenerate = () => {
    setGenerating(true);
    fetch('/api/clips/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selectedType }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          window.location.href = `/clips/${data.id}`;
          return;
        }
        setGenerating(false);
      })
      .catch(() => setGenerating(false));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/social-clips" className="text-cyan-400 hover:underline">
          Grok social clip generator (captions, hashtags, optional auto-post) →
        </Link>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Social clips</CardTitle>
          <p className="text-sm text-zinc-400">
            Generate shareable graphics: league winners, biggest upset, top scoring team.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Clip type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ClipType)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            >
              {CLIP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CLIP_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            Generate new graphic
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Your clips</h2>
        {loading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : clips.length === 0 ? (
          <p className="text-zinc-500">No clips yet. Generate one above.</p>
        ) : (
          <ul className="space-y-2">
            {clips.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clips/${c.id}`}
                  className="block rounded-lg border border-white/10 bg-white/5 p-3 text-white hover:bg-white/10"
                >
                  <span className="font-medium">{c.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {CLIP_TYPE_LABELS[c.clipType as ClipType] ?? c.clipType} ·{' '}
                    {formatDateInTimezone(c.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
