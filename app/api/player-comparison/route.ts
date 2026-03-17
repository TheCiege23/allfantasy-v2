import { NextRequest, NextResponse } from 'next/server';
import { comparePlayers, comparePlayersMulti, type ScoringFormat } from '@/lib/player-comparison-lab';

export async function GET(req: NextRequest) {
  const playerA = req.nextUrl.searchParams.get('playerA')?.trim();
  const playerB = req.nextUrl.searchParams.get('playerB')?.trim();

  if (!playerA || !playerB) {
    return NextResponse.json(
      { error: 'Missing playerA or playerB' },
      { status: 400 }
    );
  }

  try {
    const result = await comparePlayers(playerA, playerB);
    if (!result) {
      return NextResponse.json(
        { error: 'Could not resolve one or both players' },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('[player-comparison]', e);
    return NextResponse.json(
      { error: 'Comparison failed' },
      { status: 500 }
    );
  }
}

const SCORING_FORMATS: ScoringFormat[] = ['ppr', 'half_ppr', 'non_ppr'];

export async function POST(req: NextRequest) {
  let body: {
    players?: string[];
    sport?: string | null;
    scoringFormat?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawPlayers = Array.isArray(body.players) ? body.players : [];
  const players = rawPlayers.map((p) => String(p).trim()).filter(Boolean);
  if (players.length < 2 || players.length > 6) {
    return NextResponse.json(
      { error: 'Provide 2–6 player names in "players" array' },
      { status: 400 }
    );
  }

  const sport = body.sport != null ? String(body.sport).trim() || null : null;
  const scoringFormat = body.scoringFormat != null && SCORING_FORMATS.includes(body.scoringFormat as ScoringFormat)
    ? (body.scoringFormat as ScoringFormat)
    : 'ppr';

  try {
    const result = await comparePlayersMulti(players, {
      sport: sport ?? undefined,
      scoringFormat,
    });
    if (!result) {
      return NextResponse.json(
        { error: 'Could not resolve enough players' },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('[player-comparison POST]', e);
    return NextResponse.json(
      { error: 'Comparison failed' },
      { status: 500 }
    );
  }
}
