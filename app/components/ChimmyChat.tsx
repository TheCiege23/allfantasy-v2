'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Volume2, VolumeX, Image as ImageIcon, Mic, MicOff, Loader2, Square } from 'lucide-react';
import { toast } from 'sonner';
import { speakChimmy, stopChimmyVoice, isChimmyVoicePlaying, getDefaultChimmyChips } from '@/lib/chimmy-interface';
import type { ChimmyTtsVoice } from '@/lib/chimmy-interface';
import { confirmTokenSpend } from '@/lib/tokens/client-confirm';
import { sendChimmyMessage } from '@/lib/chimmy-chat/ChimmyChatService';
import { buildChimmyVoiceSummary } from '@/lib/chimmy-chat/presentation';
import {
  CHIMMY_DEFAULT_UPGRADE_PATH,
  CHIMMY_GENERIC_ERROR_MESSAGE,
  CHIMMY_PREMIUM_CTA_LABEL,
  CHIMMY_PREMIUM_FEATURE_MESSAGE,
} from '@/lib/chimmy-chat/response-copy';

const HEART_EMOJI = '\u{1F496}';
const CHIMMY_TTS_VOICE_STORAGE_KEY = 'chimmy_tts_voice';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
  upgradePath?: string | null;
};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

function renderContentWithLinks(content: string) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>);
    }
    nodes.push(
      <a
        key={`link-${match.index}`}
        href={match[2]}
        className="underline text-cyan-300 hover:text-cyan-200"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(<span key="text-end">{content.slice(lastIndex)}</span>);
  }

  return <div className="whitespace-pre-wrap">{nodes.length ? nodes : content}</div>;
}

const CHIMMY_GREETING = `Hi, I'm Chimmy ${HEART_EMOJI} I'm your calm, evidence-based fantasy assistant. Ask me about your roster, league, trades, waivers, or upload a screenshot and I'll break it down clearly.`;

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `chimmy-${Date.now()}`;
}

export default function ChimmyChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: CHIMMY_GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<ChimmyTtsVoice>('rachel');
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState(() => createSessionId());

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedChips = useMemo(() => getDefaultChimmyChips(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!isChimmyVoicePlaying() && isVoicePlaying) setIsVoicePlaying(false);
    }, 500);
    return () => clearInterval(t);
  }, [isVoicePlaying]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedVoice = window.localStorage.getItem(CHIMMY_TTS_VOICE_STORAGE_KEY);
    if (storedVoice === 'rachel' || storedVoice === 'adam') {
      setSelectedVoice(storedVoice);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CHIMMY_TTS_VOICE_STORAGE_KEY, selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice input failed. Please try again.');
    };
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || '';
      if (!transcript) return;
      setInput(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    setIsVoicePlaying(true);
    speakChimmy(text, 'calm', {
      voice: selectedVoice,
      onEnd: () => setIsVoicePlaying(false),
      onError: () => {
        setIsVoicePlaying(false);
        toast.error('Voice playback failed. Please try again.');
      },
      onUnavailable: (message) => {
        setIsVoicePlaying(false);
        toast.error(message);
      },
    });
  };

  const handleStopVoice = () => {
    stopChimmyVoice();
    setIsVoicePlaying(false);
  };

  const startNewConversation = () => {
    handleStopVoice();
    setMessages([{ role: 'assistant', content: CHIMMY_GREETING }]);
    setInput('');
    setImagePreview(null);
    setImageFile(null);
    setSessionId(createSessionId());
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported on this browser.');
      return;
    }
    try {
      if (isListening) recognitionRef.current.stop();
      else recognitionRef.current.start();
    } catch {
      toast.error('Could not start voice capture.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!input.trim() && !imageFile) return;

    try {
      const { confirmed, preview } = await confirmTokenSpend('ai_chimmy_chat_message');
      if (!preview.canSpend) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: CHIMMY_PREMIUM_FEATURE_MESSAGE,
            upgradePath: CHIMMY_DEFAULT_UPGRADE_PATH,
          },
        ]);
        return;
      }
      if (!confirmed) return;
    } catch (error) {
      console.error(
        '[ChimmyChat] Token preview failed, continuing without preflight:',
        error instanceof Error ? error.message : error
      );
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: input || 'Analyze this screenshot and tell me what to do.',
      image: imagePreview || null,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    const outgoingText = input;
    setInput('');
    setIsTyping(true);

    try {
      let streamedAssistantHandled = false;
      const result = await sendChimmyMessage({
        message: outgoingText || '',
        imageFile,
        conversation: nextMessages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
          imageUrl: m.image ?? null,
        })),
        context: {
          sessionId,
        },
        confirmTokenSpend: false,
        onChunk: (text) => {
          streamedAssistantHandled = true;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: text };
              return next;
            }
            return [...prev, { role: 'assistant', content: text }];
          });
        },
      });
      if (result.sessionId) {
        setSessionId(result.sessionId);
      }
      const reply = result.response || CHIMMY_GENERIC_ERROR_MESSAGE;

      if (!streamedAssistantHandled) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: reply,
            upgradePath: result.upgradeRequired ? result.upgradePath ?? CHIMMY_DEFAULT_UPGRADE_PATH : null,
          },
        ]);
      }
      speak(buildChimmyVoiceSummary({ content: reply }));
      if (!result.ok && result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error(CHIMMY_GENERIC_ERROR_MESSAGE);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: CHIMMY_GENERIC_ERROR_MESSAGE, upgradePath: null },
      ]);
    } finally {
      setIsTyping(false);
      setImagePreview(null);
      setImageFile(null);
    }
  };

  return (
    <div className="flex flex-col h-fill-dynamic bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden touch-scroll">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-2xl">
            {HEART_EMOJI}
          </div>
          <div>
            <div className="font-semibold">Chimmy</div>
            <div className="text-xs text-emerald-400">Feminine, kind, and straight-to-the-point</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startNewConversation}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition"
            title="Start a new conversation"
          >
            <Square className="w-4 h-4 text-cyan-400" />
            New conversation
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="p-3 rounded-full hover:bg-white/10 transition"
            title="Toggle Chimmy voice replies"
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300">
            <span>Voice</span>
            <select
              value={selectedVoice}
              onChange={(event) => setSelectedVoice(event.target.value as ChimmyTtsVoice)}
              className="bg-slate-900 text-white rounded-lg px-2 py-1 outline-none"
              aria-label="Select Chimmy voice"
            >
              <option value="rachel">Rachel</option>
              <option value="adam">Adam</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length <= 1 && suggestedChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedChips.slice(0, 4).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setInput(chip.prompt)}
                className="px-4 py-2 rounded-2xl bg-slate-800 border border-slate-600 text-slate-200 text-sm hover:border-cyan-500/50 hover:bg-slate-700 transition"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-3xl ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
              {renderContentWithLinks(msg.content)}
              {msg.role === 'assistant' && msg.upgradePath && (
                <div className="mt-4">
                  <a
                    href={msg.upgradePath}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/25"
                  >
                    {CHIMMY_PREMIUM_CTA_LABEL}
                  </a>
                </div>
              )}
              {msg.image && (
                <img src={msg.image} alt="Uploaded screenshot" className="mt-4 rounded-2xl max-w-full shadow-lg" />
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 pl-4">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 border-t border-slate-800 bg-slate-900">
        <div className="flex gap-3">
          <label className="p-4 bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-700 transition flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-cyan-400" />
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <button
            type="button"
            onClick={toggleListening}
            className={`p-4 rounded-2xl transition flex items-center justify-center ${isListening ? 'bg-pink-600/80 hover:bg-pink-500/80' : 'bg-slate-800 hover:bg-slate-700'}`}
            title="Voice message"
          >
            {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-cyan-400" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about your roster, league, trades, waivers, or upload a screenshot"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
          />

          <button
            onClick={sendMessage}
            disabled={isTyping}
            className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center hover:scale-105 transition disabled:opacity-50"
          >
            {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </button>
        </div>

        {imagePreview && (
          <div className="mt-4 flex items-center gap-3 bg-slate-800 p-3 rounded-2xl">
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl" />
            <button
              onClick={() => {
                setImagePreview(null);
                setImageFile(null);
              }}
              className="text-red-400 text-sm hover:text-red-300"
            >
              Remove image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
