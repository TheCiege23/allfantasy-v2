import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'

const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    // Fetch conversation metadata
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id,userId,title,messageCount,lastMessageAt,dataSources,createdAt,updatedAt')
      .eq('id', id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Verify ownership
    if (conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('chat_history')
      .select('id,conversationId,role,content,meta,createdAt')
      .eq('conversationId', id)
      .order('createdAt', { ascending: true })

    if (messagesError) {
      console.error('[GET /api/chimmy/conversations/:id] messages error:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({
      conversation,
      messages: messages ?? [],
    })
  } catch (err: unknown) {
    console.error('[GET /api/chimmy/conversations/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const body = await req.json().catch(() => ({}))
    const payload = UpdateConversationSchema.parse(body)

    if (!payload.title) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    // Verify ownership first
    const { data: conversation, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('userId')
      .eq('id', id)
      .single()

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update conversation
    const { data: updated, error: updateError } = await supabase
      .from('chat_conversations')
      .update({
        title: payload.title,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id,title,messageCount,lastMessageAt,updatedAt')
      .single()

    if (updateError) {
      console.error('[PATCH /api/chimmy/conversations/:id] update error:', updateError)
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err: unknown) {
    console.error('[PATCH /api/chimmy/conversations/:id] error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', issues: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    // Verify ownership first
    const { data: conversation, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('userId')
      .eq('id', id)
      .single()

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete all messages for this conversation first
    await supabase.from('chat_history').delete().eq('conversationId', id)

    // Then delete the conversation
    const { error: deleteError } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[DELETE /api/chimmy/conversations/:id] delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[DELETE /api/chimmy/conversations/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
