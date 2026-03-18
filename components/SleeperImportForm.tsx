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

export default function SleeperImportForm() {
  const [userId, setUserId] = useState('');
  const [season, setSeason] = useState(CURRENT_IMPORT_SEASON);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!userId.trim()) return;
    setLoading(true);

    try {
      const userRes = await fetch(`https://api.sleeper.app/v1/user/${userId.trim()}`);
      if (!userRes.ok) {
        toast.error('Sleeper username not found. Please check and try again.');
        setLoading(false);
        return;
      }
      const userData = await userRes.json();

      const res = await fetch('/api/import-sleeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sleeperUserId: userData.user_id,
          sport: 'nfl',
          season,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Imported ${data.imported} league${data.imported !== 1 ? 's' : ''}! View them on the Rankings page.`);
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
    <Card className="border-cyan-900/30 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold">S</span>
          Import from Sleeper
        </CardTitle>
        <CardDescription>
          Enter your Sleeper username to import your NFL leagues, current team records, and weekly scores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="sleeper-username" className="mb-1 block text-sm text-gray-400">
            Sleeper Username
          </label>
          <Input
            id="sleeper-username"
            placeholder="e.g. cjabar (find at sleeper.app)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={loading}
            className="border-cyan-600/40 bg-gray-900 focus:border-cyan-500"
          />
        </div>

        <div>
          <label htmlFor="sleeper-season" className="mb-1 block text-sm text-gray-400">
            Season
          </label>
          <select
            id="sleeper-season"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="w-full rounded-md border border-cyan-600/40 bg-gray-900 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            disabled={loading}
          >
            {SEASON_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleImport}
          disabled={loading || !userId.trim()}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Import Leagues & Weekly Data'}
        </Button>
      </CardContent>
    </Card>
  );
}
