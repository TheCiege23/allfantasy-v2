'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CURRENT_IMPORT_SEASON = new Date().getFullYear();
const SEASON_OPTIONS = Array.from({ length: 4 }, (_, index) => CURRENT_IMPORT_SEASON - index);

function getImportErrorMessage(data: { error?: string } | null | undefined, fallback: string) {
  if (data?.error === 'VERIFICATION_REQUIRED') return 'Verify your email or phone before importing leagues.';
  if (data?.error === 'AGE_REQUIRED') return 'Confirm that you are 18+ before importing leagues.';
  if (data?.error === 'UNAUTHENTICATED' || data?.error === 'Unauthorized' || data?.error === 'Authentication required') {
    return 'Sign in to import leagues.';
  }
  return data?.error || fallback;
}

export default function EspnImportForm() {
  const [leagueId, setLeagueId] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [swid, setSwid] = useState('');
  const [season, setSeason] = useState(CURRENT_IMPORT_SEASON);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!leagueId.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/import-espn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: leagueId.trim(),
          season,
          ...(espnS2 ? { espnS2 } : {}),
          ...(swid ? { swid } : {}),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Imported "${data.leagueName}"! View it on the Rankings page.`);
      } else {
        toast.error(getImportErrorMessage(data, 'ESPN import failed'));
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-900/30 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold">E</span>
          Import from ESPN
        </CardTitle>
        <CardDescription>
          Enter your ESPN league ID to import league settings, manager rosters, schedule data, and discovered prior seasons. Full draft and trade history are not imported yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="espn-league-id" className="mb-1 block text-sm text-gray-400">
            ESPN League ID
          </label>
          <Input
            id="espn-league-id"
            placeholder="e.g. 12345678 (found in your league URL)"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            disabled={loading}
            className="border-purple-600/40 bg-gray-900 focus:border-purple-500"
          />
        </div>

        <div>
          <label htmlFor="espn-season" className="mb-1 block text-sm text-gray-400">
            Season
          </label>
          <select
            id="espn-season"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="w-full rounded-md border border-purple-600/40 bg-gray-900 px-4 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            disabled={loading}
          >
            {SEASON_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
            Private league? Add authentication cookies
          </summary>
          <div className="mt-3 space-y-3 rounded-lg border border-purple-900/20 bg-gray-950/50 p-3">
            <div>
              <label htmlFor="espn-s2" className="mb-1 block text-xs text-gray-500">
                ESPN S2 Cookie
              </label>
              <Input
                id="espn-s2"
                type="password"
                placeholder="Found in browser cookies at fantasy.espn.com"
                value={espnS2}
                onChange={(e) => setEspnS2(e.target.value)}
                disabled={loading}
                className="border-purple-600/40 bg-gray-900 text-sm focus:border-purple-500"
              />
            </div>
            <div>
              <label htmlFor="espn-swid" className="mb-1 block text-xs text-gray-500">
                SWID Cookie
              </label>
              <Input
                id="espn-swid"
                type="password"
                placeholder="Also found in browser cookies (starts with {)"
                value={swid}
                onChange={(e) => setSwid(e.target.value)}
                disabled={loading}
                className="border-purple-600/40 bg-gray-900 text-sm focus:border-purple-500"
              />
            </div>
            <p className="text-xs text-gray-600">
              Open fantasy.espn.com, press F12, then go to Application and Cookies to find these values. If you enter them here, they&apos;ll be saved securely for future ESPN imports.
            </p>
          </div>
        </details>

        <Button
          onClick={handleImport}
          disabled={loading || !leagueId.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Import League & History'}
        </Button>
      </CardContent>
    </Card>
  );
}
