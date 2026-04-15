import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'

const ConversationQuerySchema = z.object({
  limit: z.string().pipe(z.coerce.number().int().positive().default(20)),
  offset: z.string().pipe(z.coerce.number().int().nonnegative().default(0)),
})

const SaveConversationSchema = z.object({
  title: z.string().min(1).max(200),
  messageCount: z.number().int().nonnegative().default(0),
})

/**
 * GET /api/chimmy/conversations
 * List user's saved conversations (paginated, sorted by most recent)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const query = ConversationQuerySchema.parse({
      limit: searchParams.get('limit') ?? '20',
      offset: searchParams.get('offset') ?? '0',
    })

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase not configured', conversations: [], total: 0 },
        { status: 503 }
      )
    }

    // Query conversations for this user, sorted by most recent first
    const { data: conversations, error: fetchError, count } = await supabase
      .from('chat_conversations')
      .select('id,title,messageCount,lastMessageAt,dataSources,createdAt,updatedAt', {
        count: 'exact',
      })
      .eq('userId', session.user.id)
      .order('lastMessageAt', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1)

    if (fetchError) {
      console.error('[GET /api/chimmy/conversations] fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    return NextResponse.json({
      conversations: conversations ?? [],
      total: count ?? 0,
      limit: query.limit,
      offset: query.offset,
    })
  } catch (err: unknown) {
    console.error('[GET /api/chimmy/conversations] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/chimmy/conversations
 * Create a new conversation (save current thread)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const payload = SaveConversationSchema.parse(body)

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    // Insert new conversation
    const { data: conversation, error: insertError } = await supabase
      .from('chat_conversations')
      .insert({
        userId: session.user.id,
        title: payload.title,
        messageCount: payload.messageCount,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select('id,title,messageCount,lastMessageAt,createdAt')
      .single()

    if (insertError) {
      console.error('[POST /api/chimmy/conversations] insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json(conversation, { status: 201 })
  } catch (err: unknown) {
    console.error('[POST /api/chimmy/conversations] error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', issues: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
