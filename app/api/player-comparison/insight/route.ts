import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export async function POST(req: Request) {
  let body: {
    playerA?: string;
    playerB?: string;
    players?: string[];
    summaryLines?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const summaryLines = Array.isArray(body.summaryLines) ? body.summaryLines : [];
  const playersList = Array.isArray(body.players) && body.players.length >= 2
    ? body.players.map((p) => String(p).trim()).filter(Boolean)
    : [body.playerA?.trim(), body.playerB?.trim()].filter(Boolean) as string[];
  const playerLabel = playersList.length >= 2
    ? playersList.join(', ')
    : `${body.playerA?.trim() ?? 'Player A'} vs ${body.playerB?.trim() ?? 'Player B'}`;

  if (!openai.apiKey) {
    return NextResponse.json({
      recommendation: `Comparison: ${playerLabel}. ${summaryLines.length > 0 ? summaryLines.join(' ') : 'Add data to see insights.'} Configure OpenAI API key for AI-generated recommendation.`,
    });
  }

  try {
    const prompt = `You are a fantasy sports analyst. Given this comparison summary between ${playersList.length} players, write a short AI recommendation (2-4 sentences): who has the edge for dynasty/redraft and why. Be concise and specific.

Players: ${playersList.join(', ')}

Summary facts:
${summaryLines.length > 0 ? summaryLines.map((l) => `- ${l}`).join('\n') : '(No summary data)'}

Respond with only the recommendation text, no preamble.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 256,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return NextResponse.json({
      recommendation: text || 'Unable to generate recommendation.',
    });
  } catch (e) {
    console.error('[player-comparison/insight]', e);
    return NextResponse.json(
      { error: 'AI insight failed', recommendation: summaryLines.join(' ') || 'See comparison chart for details.' },
      { status: 500 }
    );
  }
}
