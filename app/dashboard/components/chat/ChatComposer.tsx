'use client'

import { Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AttachmentPreview, type PendingGif, type PollDraft, type UploadedAttachment } from './AttachmentPreview'
import { EmojiPicker } from './EmojiPicker'
import { GifPicker } from './GifPicker'
import { PollComposer } from './PollComposer'
import { VoiceRecorder } from './VoiceRecorder'

export type LeagueComposerPayload = {
  text: string
  gifId?: string
  giphyId?: string
  gifUrl?: string
  previewUrl?: string
  gifTitle?: string
  attachments?: Array<{
    type: 'image' | 'video' | 'voice'
    url: string
    duration?: number
    mimeType?: string
  }>
  poll?: { question: string; options: string[]; closeAt: Date; allowMultiple: boolean }
}

type ChatComposerProps = {
  leagueId: string
  onSend: (message: LeagueComposerPayload) => void | Promise<void>
  placeholder?: string
  /** Renders "Ask Chimmy" in the composer toolbar (e.g. league chat left panel). */
  onAskChimmy?: () => void
}

type Picker = 'gif' | 'emoji' | 'poll' | null

export function ChatComposer({
  leagueId,
  onSend,
  placeholder = 'Message league...',
  onAskChimmy,
}: ChatComposerProps) {
  const [text, setText] = useState('')
  const [activePicker, setActivePicker] = useState<Picker>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])
  const [pendingGif, setPendingGif] = useState<PendingGif | null>(null)
  const [pollDraft, setPollDraft] = useState<PollDraft | null>(null)
  const [sending, setSending] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [text, autoResize])

  const insertChar = useCallback((char: string) => {
    const ta = textareaRef.current
    if (!ta) {
      setText((t) => t + char)
      return
    }
    setText((prev) => {
      const s = ta.selectionStart ?? prev.length
      const e = ta.selectionEnd ?? prev.length
      const next = prev.slice(0, s) + char + prev.slice(e)
      const pos = s + char.length
      queueMicrotask(() => {
        ta.setSelectionRange(pos, pos)
        ta.focus()
      })
      return next
    })
  }, [])

  const uploadFile = useCallback(
    async (file: File, type: 'image' | 'video' | 'voice') => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      fd.append('leagueId', leagueId)
      const res = await fetch('/api/chat/upload', { method: 'POST', body: fd })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; mimeType?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Upload failed')
        return null
      }
      return { url: data.url, mimeType: data.mimeType ?? file.type }
    },
    [leagueId]
  )

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const r = await uploadFile(file, 'image')
    if (!r) return
    setAttachments((a) => [...a, { type: 'image', url: r.url, mimeType: r.mimeType, name: file.name }])
  }

  const onVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url
    try {
      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res()
        video.onerror = () => rej(new Error('bad'))
      })
      if (video.duration > 120) {
        toast.error('Video must be under 2 minutes')
        URL.revokeObjectURL(url)
        return
      }
    } catch {
      toast.error('Could not read video')
      URL.revokeObjectURL(url)
      return
    }
    URL.revokeObjectURL(url)
    const r = await uploadFile(file, 'video')
    if (!r) return
    setAttachments((a) => [
      ...a,
      {
        type: 'video',
        url: r.url,
        mimeType: r.mimeType,
        name: file.name,
        duration: video.duration,
      },
    ])
  }

  const canSend =
    text.trim().length > 0 ||
    Boolean(pendingGif) ||
    attachments.length > 0 ||
    Boolean(pollDraft)

  const handleSend = useCallback(async () => {
    if (!canSend || sending) return
    setSending(true)
    try {
      const payload: LeagueComposerPayload = {
        text: text.trim(),
        ...(pendingGif && {
          gifId: pendingGif.id,
          giphyId: pendingGif.giphyId,
          gifUrl: pendingGif.url,
          previewUrl: pendingGif.previewUrl,
          gifTitle: pendingGif.title,
        }),
        ...(attachments.length ? { attachments: attachments.map((a) => ({ ...a })) } : {}),
        ...(pollDraft ? { poll: { ...pollDraft } } : {}),
      }
      await onSend(payload)
      setText('')
      setPendingGif(null)
      setAttachments([])
      setPollDraft(null)
      setActivePicker(null)
      queueMicrotask(() => {
        const el = textareaRef.current
        if (el) {
          el.style.height = 'auto'
          autoResize()
        }
      })
    } finally {
      setSending(false)
    }
  }, [attachments, autoResize, canSend, onSend, pendingGif, pollDraft, sending, text])

  const toolBtn = (active: boolean) =>
    `px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
      active ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
    }`

  return (
    <div className="flex min-w-0 flex-1 flex-col" data-testid="league-chat-composer">
      <AttachmentPreview
        gif={pendingGif}
        attachments={attachments}
        poll={pollDraft}
        onRemoveGif={() => setPendingGif(null)}
        onRemoveAttachment={(i) => setAttachments((a) => a.filter((_, j) => j !== i))}
        onRemovePoll={() => setPollDraft(null)}
        onEditPoll={() => setActivePicker('poll')}
      />

      <div className="relative w-full">
        {activePicker === 'gif' ? (
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1">
            <GifPicker
              onSelect={(g) => {
                setPendingGif({
                  id: g.id,
                  giphyId: g.giphyId,
                  url: g.url,
                  previewUrl: g.previewUrl,
                  title: g.title,
                })
                setActivePicker(null)
              }}
              onClose={() => setActivePicker(null)}
            />
          </div>
        ) : null}
        {activePicker === 'emoji' ? (
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1">
            <EmojiPicker onSelect={(c) => insertChar(c)} onClose={() => setActivePicker(null)} />
          </div>
        ) : null}
        {activePicker === 'poll' ? (
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1">
            <PollComposer
              initial={pollDraft}
              onCreatePoll={(p) => {
                setPollDraft(p)
                setActivePicker(null)
              }}
              onCancel={() => setActivePicker(null)}
            />
          </div>
        ) : null}

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[12px] leading-[1.4] text-white outline-none placeholder:text-white/30 min-h-[36px] max-h-[120px] overflow-y-auto"
            data-testid="league-chat-textarea"
          />

          {isRecording ? (
            <VoiceRecorder
              leagueId={leagueId}
              onComplete={(p) => {
                setAttachments((a) => [
                  ...a,
                  {
                    type: 'voice',
                    url: p.url,
                    duration: p.duration,
                    mimeType: p.mimeType,
                    name: p.name,
                  },
                ])
                setIsRecording(false)
              }}
              onCancel={() => setIsRecording(false)}
            />
          ) : (
            <div className="flex items-center gap-1 px-2 pb-2 pt-1">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
                <button
                  type="button"
                  className={toolBtn(activePicker === 'gif')}
                  onClick={() => setActivePicker((p) => (p === 'gif' ? null : 'gif'))}
                >
                  GIF
                </button>
                <button
                  type="button"
                  className={toolBtn(activePicker === 'emoji')}
                  onClick={() => setActivePicker((p) => (p === 'emoji' ? null : 'emoji'))}
                  aria-label="Emoji"
                >
                  😀
                </button>
                <button
                  type="button"
                  className={toolBtn(activePicker === 'poll')}
                  onClick={() => setActivePicker((p) => (p === 'poll' ? null : 'poll'))}
                  aria-label="Poll"
                >
                  📊
                </button>
                <button
                  type="button"
                  className={toolBtn(false)}
                  onClick={() => setIsRecording(true)}
                  aria-label="Voice note"
                >
                  🎤
                </button>
                <button
                  type="button"
                  className={toolBtn(false)}
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Photo"
                >
                  📷
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={onImageChange}
                />
                <button
                  type="button"
                  className={toolBtn(false)}
                  onClick={() => videoInputRef.current?.click()}
                  aria-label="Video"
                >
                  🎥
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={onVideoChange}
                />
              </div>

              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!canSend || sending}
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-cyan-500/10 hover:text-cyan-400 disabled:opacity-40"
                  aria-label="Send league message"
                  data-testid="league-chat-send"
                >
                  <Send size={14} strokeWidth={2} />
                </button>
                {onAskChimmy ? (
                  <button
                    type="button"
                    onClick={onAskChimmy}
                    className="rounded-md bg-violet-500/20 px-2 py-1.5 text-[9px] font-bold text-violet-300 transition-colors hover:bg-violet-500/30"
                  >
                    Ask Chimmy
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
