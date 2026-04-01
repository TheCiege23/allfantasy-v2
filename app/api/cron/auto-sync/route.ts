import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runPECR } from '@/lib/ai/pecr';
import { syncLeague } from '@/lib/league-sync-core';
import { syncSleeperLeague } from '@/lib/sleeper-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STALE_HOURS = 24;
const BATCH_SIZE = 50;

class AutoSyncUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'AutoSyncUnauthorizedError';
  }
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization')?.trim();
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;

  const token = authHeader.slice(7).trim();
  return token || null;
}

function requireCron(req: Request): boolean {
  const provided =
    getBearerToken(req) ??
    req.headers.get('x-cron-secret') ??
    req.headers.get('x-admin-secret') ??
    '';
  const cronSecret = process.env.CRON_SECRET || process.env.LEAGUE_CRON_SECRET;
  const adminSecret = process.env.BRACKET_ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  return !!(
    provided &&
    ((cronSecret && provided === cronSecret) ||
      (adminSecret && provided === adminSecret))
  );
}

export async function POST(req: Request) {
  try {
    const pecrResult = await runPECR(req, {
      feature: 'cron-auto-sync',
      plan: async (request) => ({
        intent: 'sync',
        steps: ['validate auth', 'run sync', 'verify result'],
        context: { authorized: requireCron(request) },
        refineHints: [],
      }),
      execute: async (plan) => {
        if (plan.context.authorized !== true) {
          throw new AutoSyncUnauthorizedError();
        }

        const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
        const results: { id: string; name: string; type: string; status: string; error?: string }[] = [];

        const genericLeagues = await (prisma as any).league.findMany({
          where: {
            OR: [
              { lastSyncedAt: { lt: staleThreshold } },
              { lastSyncedAt: null },
            ],
            syncStatus: { not: 'error' },
          },
          take: BATCH_SIZE,
          orderBy: { lastSyncedAt: 'asc' },
          select: {
            id: true,
            userId: true,
            platform: true,
            platformLeagueId: true,
            name: true,
          },
        });

        for (const league of genericLeagues) {
          try {
            await syncLeague(league.userId, league.platform, league.platformLeagueId);
            results.push({ id: league.id, name: league.name, type: league.platform, status: 'success' });
          } catch (err: any) {
            console.error(`[Auto-Sync] Generic failed: ${league.name} (${league.id})`, err.message);
            try {
              await (prisma as any).league.update({
                where: { id: league.id },
                data: {
                  syncStatus: 'error',
                  syncError: (err.message || 'Auto-sync failed').slice(0, 500),
                },
              });
            } catch {}
            results.push({ id: league.id, name: league.name, type: league.platform, status: 'error', error: err.message });
          }
        }

        const sleeperLeagues = await (prisma as any).sleeperLeague.findMany({
          where: {
            OR: [
              { lastSyncedAt: { lt: staleThreshold } },
              { lastSyncedAt: null },
            ],
            syncStatus: { not: 'error' },
          },
          take: BATCH_SIZE,
          orderBy: { lastSyncedAt: 'asc' },
          select: {
            id: true,
            userId: true,
            sleeperLeagueId: true,
            name: true,
          },
        });

        for (const league of sleeperLeagues) {
          try {
            await syncSleeperLeague(league.sleeperLeagueId, league.userId);
            results.push({ id: league.id, name: league.name, type: 'sleeper', status: 'success' });
          } catch (err: any) {
            console.error(`[Auto-Sync] Sleeper failed: ${league.name} (${league.id})`, err.message);
            try {
              await (prisma as any).sleeperLeague.update({
                where: { id: league.id },
                data: {
                  syncStatus: 'error',
                  syncError: (err.message || 'Auto-sync failed').slice(0, 500),
                },
              });
            } catch {}
            results.push({ id: league.id, name: league.name, type: 'sleeper', status: 'error', error: err.message });
          }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        console.log(`[Auto-Sync] Complete: ${successCount} synced, ${errorCount} failed, ${results.length} total`);

        return {
          success: true,
          total: results.length,
          synced: successCount,
          failed: errorCount,
          results,
        };
      },
      check: (output) => {
        const failures: string[] = [];
        if (output === null) failures.push('sync returned null');
        if (output === undefined) failures.push('sync returned undefined');

        return {
          passed: failures.length === 0,
          failures,
        };
      },
    });

    return NextResponse.json(pecrResult.output);
  } catch (error) {
    if (error instanceof AutoSyncUnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    throw error;
  }
}
