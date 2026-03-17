'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Check,
  X,
  Copy,
  Send,
  RefreshCw,
  ImagePlus,
  Pencil,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORTED_PLATFORMS } from '@/lib/social-clips-grok/types';
import { toast } from 'sonner';

interface AssetMeta {
  shortCaption?: string;
  headline?: string;
  ctaText?: string;
  hashtags?: string[];
  socialCardCopy?: string;
  clipTitle?: string;
  platformVariants?: Record<string, { caption: string; hashtags: string[] }>;
}

interface Asset {
  id: string;
  sport: string;
  assetType: string;
  title: string;
  contentBody: string;
  provider: string | null;
  approvedForPublish: boolean;
  metadata: AssetMeta;
  createdAt: string;
}

interface Target {
  platform: string;
  accountIdentifier: string | null;
  autoPostingEnabled: boolean;
  connected: boolean;
}

interface LogEntry {
  id: string;
  platform: string;
  status: string;
  responseMetadata: Record<string, unknown> | null;
  createdAt: string;
}

export default function SocialClipDetailPage() {
  const params = useParams<{ assetId: string }>();
  const assetId = params?.assetId ?? '';
  const [asset, setAsset] = useState<Asset | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editShortCaption, setEditShortCaption] = useState('');
  const [editHeadline, setEditHeadline] = useState('');
  const [editCtaText, setEditCtaText] = useState('');
  const [editSocialCardCopy, setEditSocialCardCopy] = useState('');
  const [editClipTitle, setEditClipTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAsset = useCallback(() => {
    if (!assetId) return;
    setLoading(true);
    fetch(`/api/social-clips/${encodeURIComponent(assetId)}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Not found' : 'Failed');
        return r.json();
      })
      .then(setAsset)
      .catch(() => setAsset(null))
      .finally(() => setLoading(false));
  }, [assetId]);

  const fetchTargets = useCallback(() => {
    fetch('/api/share/targets', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => (data?.targets ? setTargets(data.targets) : []))
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(() => {
    if (!assetId) return;
    fetch(`/api/social-clips/${assetId}/logs`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => (data?.logs ? setLogs(data.logs) : []))
      .catch(() => {});
  }, [assetId]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  useEffect(() => {
    if (asset) {
      setEditTitle(asset.title);
      const m = asset.metadata ?? {};
      setEditShortCaption(m.shortCaption ?? '');
      setEditHeadline(m.headline ?? '');
      setEditCtaText(m.ctaText ?? '');
      setEditSocialCardCopy(m.socialCardCopy ?? '');
      setEditClipTitle(m.clipTitle ?? '');
    }
  }, [asset]);
  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);
  useEffect(() => {
    if (assetId) fetchLogs();
  }, [assetId, fetchLogs]);

  const handleApprove = (approved: boolean) => {
    setActionLoading('approve');
    fetch(`/api/social-clips/${assetId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    })
      .then((r) => r.json())
      .then(() => {
        fetchAsset();
        toast.success(approved ? 'Approved for publish' : 'Approval revoked');
      })
      .catch(() => toast.error('Failed'))
      .finally(() => setActionLoading(null));
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => toast.error('Copy failed'));
  };

  const handlePublish = (platform: string) => {
    setActionLoading(`publish-${platform}`);
    fetch(`/api/social-clips/${assetId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) toast.error(data.error);
        else toast.success(data?.message ?? 'Publish requested');
        fetchLogs();
        fetchAsset();
      })
      .catch(() => toast.error('Publish failed'))
      .finally(() => setActionLoading(null));
  };

  const handleRetry = (logId: string) => {
    setActionLoading(`retry-${logId}`);
    fetch(`/api/social-clips/retry/${logId}`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) toast.error(data.error);
        else toast.success('Retry requested');
        fetchLogs();
      })
      .catch(() => toast.error('Retry failed'))
      .finally(() => setActionLoading(null));
  };

  const handleAutoPostToggle = (platform: string, enabled: boolean) => {
    setActionLoading(`auto-${platform}`);
    fetch('/api/share/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, autoPostingEnabled: enabled }),
    })
      .then((r) => r.json())
      .then((data) => (data?.targets ? setTargets(data.targets) : null))
      .then(() => toast.success(enabled ? 'Auto-post on' : 'Auto-post off'))
      .catch(() => toast.error('Failed'))
      .finally(() => setActionLoading(null));
  };

  const handleSaveEdit = () => {
    setSaving(true);
    const metadata = {
      ...(asset?.metadata ?? {}),
      shortCaption: editShortCaption,
      headline: editHeadline,
      ctaText: editCtaText,
      socialCardCopy: editSocialCardCopy,
      clipTitle: editClipTitle,
    };
    fetch(`/api/social-clips/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, metadata }),
    })
      .then((r) => r.json())
      .then(() => {
        toast.success('Saved');
        setEditMode(false);
        fetchAsset();
      })
      .catch(() => toast.error('Save failed'))
      .finally(() => setSaving(false));
  };

  const handleRegenerate = () => {
    setActionLoading('regenerate');
    const sport = asset?.sport ?? 'NFL';
    const assetType = asset?.assetType ?? 'weekly_league_winners';
    fetch('/api/social-clips/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport, assetType }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) window.location.href = `/social-clips/${data.id}`;
        else setActionLoading(null);
      })
      .catch(() => setActionLoading(null));
  };

  const meta = asset?.metadata ?? {};
  const caption = editMode ? editShortCaption : (meta.shortCaption ?? '');
  const headline = editMode ? editHeadline : (meta.headline ?? '');
  const hashtags = (meta.hashtags ?? []).join(' ');
  const fullCaption = [caption, hashtags].filter(Boolean).join('\n');

  if (loading && !asset) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p className="text-zinc-400">Clip not found.</p>
        <Link href="/social-clips" className="mt-2 inline-block text-cyan-400 hover:underline">
          Back to social clips
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Link
          href="/social-clips"
          className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to social clips
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h1 className="text-lg font-semibold text-white">{asset.title}</h1>
        <p className="text-xs text-zinc-500 mt-1">
          {asset.sport} · {asset.assetType} · {new Date(asset.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Preview content / Edit mode */}
      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400">{editMode ? 'Edit' : 'Preview'}</h2>
          {editMode ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
        {editMode ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500">Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Headline</label>
              <input
                value={editHeadline}
                onChange={(e) => setEditHeadline(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Caption</label>
              <textarea
                value={editShortCaption}
                onChange={(e) => setEditShortCaption(e.target.value)}
                rows={3}
                className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">CTA</label>
              <input
                value={editCtaText}
                onChange={(e) => setEditCtaText(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Card copy</label>
              <input
                value={editSocialCardCopy}
                onChange={(e) => setEditSocialCardCopy(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Clip title</label>
              <input
                value={editClipTitle}
                onChange={(e) => setEditClipTitle(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
            </div>
          </div>
        ) : (
          <>
            {headline && <p className="text-white font-medium">{headline}</p>}
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{caption}</p>
            {meta.ctaText && <p className="text-sm text-cyan-400">{meta.ctaText}</p>}
            {hashtags && <p className="text-xs text-zinc-500">{hashtags}</p>}
          </>
        )}
      </div>

      {/* Copy buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyText(fullCaption, 'Caption')}
          className="gap-1"
        >
          <Copy className="h-4 w-4" /> Copy caption
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyText(caption, 'Text')}
          className="gap-1"
        >
          <Copy className="h-4 w-4" /> Copy text
        </Button>
      </div>

      {/* Approve */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Approve for publish:</span>
        {asset.approvedForPublish ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApprove(false)}
            disabled={actionLoading === 'approve'}
            className="gap-1"
          >
            {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Revoke
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => handleApprove(true)}
            disabled={actionLoading === 'approve'}
            className="gap-1"
          >
            {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve
          </Button>
        )}
      </div>

      {/* Connected targets & auto-post */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">Connected accounts & auto-post</h2>
        <p className="text-xs text-zinc-500">
          Connect accounts in settings. When auto-post is on, approved clips can be posted automatically (when provider is configured).
        </p>
        <ul className="space-y-2">
          {SUPPORTED_PLATFORMS.map((platform) => {
            const t = targets.find((x) => x.platform === platform);
            const connected = t?.connected ?? false;
            const autoOn = t?.autoPostingEnabled ?? false;
            return (
              <li key={platform} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <span className="text-sm text-white capitalize">{platform}</span>
                <div className="flex items-center gap-2">
                  {!connected ? (
                    <span className="text-xs text-zinc-500">Not connected</span>
                  ) : (
                    <>
                      <label className="flex items-center gap-1 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          checked={autoOn}
                          onChange={(e) => handleAutoPostToggle(platform, e.target.checked)}
                          disabled={!!actionLoading}
                        />
                        Auto-post
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(platform)}
                        disabled={!asset.approvedForPublish || actionLoading !== null}
                      >
                        {actionLoading === `publish-${platform}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Publish now
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Publish logs & retry */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400">Publish status</h2>
          <Button variant="ghost" size="sm" onClick={fetchLogs} className="gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
        {logs.length === 0 ? (
          <p className="text-xs text-zinc-500">No publish attempts yet.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{log.platform}</span>
                <span className={`text-xs ${log.status === 'success' ? 'text-emerald-400' : log.status === 'failed' || log.status === 'provider_unavailable' ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {log.status}
                </span>
                <span className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</span>
                {(log.status === 'failed' || log.status === 'provider_unavailable') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetry(log.id)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === `retry-${log.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Retry'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Regenerate */}
      <Button variant="outline" onClick={handleRegenerate} disabled={actionLoading !== null} className="gap-2">
        {actionLoading === 'regenerate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        Regenerate new clip
      </Button>
    </div>
  );
}
