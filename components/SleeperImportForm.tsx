'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const SLEEPER_LAUNCH_YEAR = 2017;

function getImportErrorMessage(data: { error?: string } | null | undefined, fallback: string) {
  if (data?.error === 'VERIFICATION_REQUIRED') return 'Verify your email or phone before importing leagues.';
  if (data?.error === 'AGE_REQUIRED') return 'Confirm that you are 18+ before importing leagues.';
  if (data?.error === 'UNAUTHENTICATED' || data?.error === 'Unauthorized' || data?.error === 'Authentication required') {
    return 'Sign in to import leagues.';
  }
  return data?.error || fallback;
}

export default function SleeperImportForm() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{
    imported: number;
    seasons: number;
    years: number[];
  } | null>(null);

  const scanEndYear = new Date().getFullYear() + 1;

  const handleImport = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setDone(null);

    try {
      const res = await fetch('/api/leagues/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          platform: 'sleeper',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setDone({
          imported: data.imported ?? 0,
          seasons: data.seasons ?? 0,
          years: Array.isArray(data.years) ? data.years : [],
        });
        toast.success(
          `Imported ${data.imported ?? 0} unique league${(data.imported ?? 0) !== 1 ? 's' : ''} (${data.seasons ?? 0} season rows).`
        );
      } else {
        toast.error(getImportErrorMessage(data, 'Import failed'));
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-white/10 bg-[#0a1228]/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl text-white">
          {/* Sleeper logo used for platform identification under nominative fair use for integration UI — similar to OAuth connect buttons. Replace with official asset if Sleeper provides brand guidelines. */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[16px] font-black text-white"
            style={{ background: 'linear-gradient(135deg, #1a9e5c, #16a34a)' }}
            aria-hidden
          >
            S
          </div>
          <span>Import from Sleeper</span>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Connect your Sleeper account to import all your leagues and every season automatically — from {SLEEPER_LAUNCH_YEAR}{' '}
          to {scanEndYear}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {done ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 text-slate-200">
            <p className="font-semibold text-emerald-400">Import complete</p>
            <p className="mt-1 text-sm">
              {done.imported} unique leagues · {done.seasons} season records
              {done.years.length > 0 ? ` · years: ${done.years.join(', ')}` : ''}
            </p>
            <Button asChild className="mt-4 w-full bg-sky-600/90 hover:bg-sky-500">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        ) : null}

        <div>
          <label htmlFor="sleeper-username" className="mb-1 block text-sm text-slate-400">
            Sleeper Username
          </label>
          <Input
            id="sleeper-username"
            placeholder="e.g. your Sleeper username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="border-white/15 bg-[#040915] text-white placeholder:text-slate-500 focus-visible:ring-sky-500/40"
          />
        </div>

        <ul className="space-y-1 text-sm text-slate-400">
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span> All sports we scan on Sleeper (NFL, NBA)
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span> All seasons ({SLEEPER_LAUNCH_YEAR} → {scanEndYear})
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span> Dynasty, redraft, and best ball
          </li>
        </ul>

        {loading ? (
          <div className="space-y-2 rounded-lg border border-white/10 bg-[#040915] p-4">
            <p className="text-center text-sm text-slate-300">Scanning {SLEEPER_LAUNCH_YEAR}–{scanEndYear}…</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-sky-600 to-emerald-600" />
            </div>
          </div>
        ) : (
          <Button
            onClick={handleImport}
            disabled={!username.trim()}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50"
          >
            Import All Leagues
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
