'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Volume2, VolumeX, Image as ImageIcon, Mic, MicOff, Loader2, Square } from 'lucide-react';
import { toast } from 'sonner';
import { speakChimmy, stopChimmyVoice, isChimmyVoicePlaying, getDefaultChimmyChips } from '@/lib/chimmy-interface';
import { confirmTokenSpend } from '@/lib/tokens/client-confirm';
import { sendChimmyMessage } from '@/lib/chimmy-chat/ChimmyChatService';

const HEART_EMOJI = '\u{1F496}';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
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

export default function ChimmyChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: CHIMMY_GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

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
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setIsVoicePlaying(true);
    speakChimmy(text, 'calm', {
      onEnd: () => setIsVoicePlaying(false),
    });
  };

  const handleStopVoice = () => {
    stopChimmyVoice();
    setIsVoicePlaying(false);
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
        toast.error(
          `Need ${preview.tokenCost} token${preview.tokenCost === 1 ? '' : 's'} for this action. Current balance: ${preview.currentBalance}.`
        );
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
      const result = await sendChimmyMessage({
        message: outgoingText || '',
        imageFile,
        conversation: nextMessages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
          imageUrl: m.image ?? null,
        })),
        confirmTokenSpend: false,
      });
      const reply = result.response || `I couldn't read that clearly. Re-send it and I'll be more specific.`;

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      speak(reply);
      if (!result.ok && result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to send message');
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

        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="p-3 rounded-full hover:bg-white/10 transition"
          title="Toggle Chimmy voice replies"
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
        </button>
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
