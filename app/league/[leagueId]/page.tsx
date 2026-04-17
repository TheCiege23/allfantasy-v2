"use client";
/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import AdminButton from "@/components/shared/AdminButton";
import BreathingCircle, {
  type BreathingPhase,
  type BreathingTheme,
} from "@/components/BreathingCircle";
import ZenBackground from "@/components/ZenBackground";

type SessionMode = "meditation" | "breathing";
type Tab = "create" | "history" | "favorites";

type VisualScene = {
  label: string;
  value: string;
  description: string;
  background: string;
  overlay: string;
  breathingTheme: BreathingTheme;
};

type BreathingPattern = {
  label: string;
  value: string;
  description: string;
  inhale: number;
  hold: number;
  exhale: number;
};

type SessionHistoryItem = {
  sessionId: string;
  mode: string;
  meditationType: string;
  mood: string;
  duration: string;
  breathingPattern: string | null;
  voice: string;
  visual: string;
  sounds: string[];
  text: string;
  isFavorite: boolean;
  playCount: number;
  completedCount: number;
  createdAt: string;
};

type Preset = {
  presetId: string;
  name: string;
  mode: string;
  meditationType: string;
  breathingPattern: string | null;
  voiceTone: string;
  visual: string;
  duration: string;
  sounds: string[];
};

type VoiceTone = {
  label: string;
  value: string;
  description: string;
  voice: string;
};

type SoundOption = {
  label: string;
  value: string;
  file: string;
  icon: string;
  accent: string;
};

type SpeechRecognitionResultLike = {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultLike) => void | Promise<void>) | null;
  start: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SubscriptionTier = "free" | "premium";

type CurrentUser = {
  userId: string;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  role: "user" | "admin" | "super_admin";
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
};

type ViewerEntitlements = {
  tier: SubscriptionTier;
  maxDailyMeditations: number | null;
  maxDurationMinutes: number;
  premiumVoices: boolean;
  sleepMode: boolean;
  soundMixer: boolean;
  sessionHistory: boolean;
  dailyPlans: boolean;
  allowedVoiceTones: string[];
  allowedSounds: string[];
  maxSounds: number;
};

const moods = ["Calm", "Overwhelmed", "Unfocused", "Low Energy"];
const durations = ["1 min", "3 min", "5 min", "10 min"];
const meditationTypes = [
  { label: "Stress Relief", value: "stress_relief" },
  { label: "Focus", value: "focus" },
  { label: "Sleep", value: "sleep" },
  { label: "Energy", value: "energy" },
  { label: "Anxiety Reset", value: "anxiety_reset" },
  { label: "Quick Calm", value: "quick_calm" },
];

const soundOptions: SoundOption[] = [
  { label: "Rain", value: "Raindrop", file: "/sounds/Raindrop.mp3", icon: "RN", accent: "from-sky-500/20 to-blue-500/10" },
  { label: "Ocean", value: "ocean", file: "/sounds/ocean.mp3", icon: "OC", accent: "from-cyan-500/20 to-indigo-500/10" },
  { label: "Forest", value: "forest", file: "/sounds/forest.mp3", icon: "FR", accent: "from-emerald-500/20 to-lime-500/10" },
  { label: "Campfire", value: "Campfire", file: "/sounds/Campfire.mp3", icon: "CF", accent: "from-orange-500/20 to-amber-500/10" },
  { label: "Birds", value: "Birds", file: "/sounds/Birds.mp3", icon: "BD", accent: "from-violet-500/20 to-sky-500/10" },
  { label: "Wind", value: "Wind", file: "/sounds/Wind.mp3", icon: "WD", accent: "from-slate-500/20 to-blue-500/10" },
];

const voiceTones: VoiceTone[] = [
  { label: "Calm Female", value: "calm-female", description: "Gentle and balanced.", voice: "marin" },
  { label: "Deep Male", value: "deep-male", description: "Grounded and warm.", voice: "onyx" },
  { label: "Soft Guide", value: "soft-guide", description: "Smooth and comforting.", voice: "sage" },
  { label: "Whisper Guide", value: "whisper-guide", description: "Very soft and bedtime style.", voice: "verse" },
];

const visualScenes: VisualScene[] = [
  {
    label: "Morning Mist",
    value: "mist",
    description: "Soft sky tones with a clean, airy feeling.",
    background: "linear-gradient(180deg, #f0f9ff 0%, #dbeafe 100%)",
    overlay: "radial-gradient(circle at 50% 40%, rgba(224, 242, 254, 0.45), rgba(224, 242, 254, 0.08) 60%, transparent 80%)",
    breathingTheme: "mist",
  },
  {
    label: "Golden Sunrise",
    value: "sunrise",
    description: "Warm light and amber tones for uplifting calm.",
    background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 45%, #fde68a 100%)",
    overlay: "radial-gradient(circle at 50% 35%, rgba(255, 237, 213, 0.5), rgba(253, 186, 116, 0.12) 65%, transparent 82%)",
    breathingTheme: "sunrise",
  },
  {
    label: "Forest Calm",
    value: "forest",
    description: "Natural greens with grounded softness.",
    background: "linear-gradient(180deg, #ecfdf5 0%, #dcfce7 45%, #bbf7d0 100%)",
    overlay: "radial-gradient(circle at 50% 38%, rgba(220, 252, 231, 0.5), rgba(74, 222, 128, 0.12) 65%, transparent 82%)",
    breathingTheme: "forest",
  },
  {
    label: "Night Tide",
    value: "night",
    description: "Deep blue tones for evening wind-down sessions.",
    background: "linear-gradient(180deg, #0f172a 0%, #1e3a8a 52%, #1d4ed8 100%)",
    overlay: "radial-gradient(circle at 50% 34%, rgba(147, 197, 253, 0.36), rgba(59, 130, 246, 0.1) 65%, transparent 82%)",
    breathingTheme: "night",
  },
];

const breathingPatterns: BreathingPattern[] = [
  { label: "Balanced (4-4-6)", value: "balanced-446", description: "Steady rhythm.", inhale: 4, hold: 4, exhale: 6 },
  { label: "Box (4-4-4)", value: "box-444", description: "Even rhythm.", inhale: 4, hold: 4, exhale: 4 },
  { label: "Relaxing (4-7-8)", value: "relax-478", description: "Long exhale pattern.", inhale: 4, hold: 7, exhale: 8 },
];

const CHUNK_CHAR_LIMIT = 520;

const defaultEntitlements: ViewerEntitlements = {
  tier: "free",
  maxDailyMeditations: 3,
  maxDurationMinutes: 5,
  premiumVoices: false,
  sleepMode: false,
  soundMixer: false,
  sessionHistory: false,
  dailyPlans: false,
  allowedVoiceTones: ["calm-female"],
  allowedSounds: ["Raindrop", "ocean", "forest"],
  maxSounds: 1,
};

function splitMeditationIntoChunks(text: string, maxChars = CHUNK_CHAR_LIMIT) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return [normalized];
  const chunks: string[] = [];
  let currentChunk = "";
  for (const sentence of sentences) {
    const candidate = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      currentChunk = candidate;
      continue;
    }
    if (currentChunk) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    if (sentence.length <= maxChars) {
      currentChunk = sentence;
      continue;
    }
    let start = 0;
    while (start < sentence.length) {
      const end = Math.min(start + maxChars, sentence.length);
      chunks.push(sentence.slice(start, end).trim());
      start = end;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks.filter(Boolean);
}

function durationToSeconds(duration: string) {
  const mins = Number(duration.split(" ")[0]);
  return Number.isNaN(mins) ? 300 : mins * 60;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function buildQuickBreathingScript(pattern: BreathingPattern, duration: string) {
  const totalSeconds = durationToSeconds(duration);
  const cycleSeconds = pattern.inhale + pattern.hold + pattern.exhale;
  const cycles = Math.max(2, Math.floor(totalSeconds / cycleSeconds));
  return `Welcome. We will do a ${duration} breathing session. Use ${pattern.inhale}-${pattern.hold}-${pattern.exhale}. ${Array.from({ length: cycles }, () => `Inhale for ${pattern.inhale}. Hold for ${pattern.hold}. Exhale for ${pattern.exhale}.`).join(" ")} Return to natural breathing.`;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("create");
  const [sessionMode, setSessionMode] = useState<SessionMode>("meditation");
  const [selectedMood, setSelectedMood] = useState("Calm");
  const [selectedDuration, setSelectedDuration] = useState("5 min");
  const [selectedMeditationType, setSelectedMeditationType] = useState("stress_relief");
  const [selectedSounds, setSelectedSounds] = useState<string[]>([]);
  const [selectedVisual, setSelectedVisual] = useState("mist");
  const [selectedPattern, setSelectedPattern] = useState("balanced-446");
  const [selectedVoiceTone, setSelectedVoiceTone] = useState("calm-female");
  const [moodCheckIn, setMoodCheckIn] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceCommandText, setVoiceCommandText] = useState("");
  const [meditationText, setMeditationText] = useState("");
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<BreathingPhase>("Inhale");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessionScreen, setShowSessionScreen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<SessionHistoryItem[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [stats, setStats] = useState({ totalSessions: 0, completedSessions: 0, streakDays: 0 });
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [uploadedScriptBgUrl, setUploadedScriptBgUrl] = useState<string | null>(null);
  const [isScriptExpanded, setIsScriptExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [entitlements, setEntitlements] = useState<ViewerEntitlements>(defaultEntitlements);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientPlayersRef = useRef<HTMLAudioElement[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playbackSessionRef = useRef(0);
  const generationDoneRef = useRef(false);
  const chunkQueueRef = useRef<string[]>([]);
  const activeObjectUrlsRef = useRef<string[]>([]);
  const pendingControllersRef = useRef<AbortController[]>([]);
  const nextChunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentVisual = useMemo(
    () => visualScenes.find((scene) => scene.value === selectedVisual) ?? visualScenes[0],
    [selectedVisual]
  );

  const currentPattern = useMemo(
    () => breathingPatterns.find((pattern) => pattern.value === selectedPattern) ?? breathingPatterns[0],
    [selectedPattern]
  );

  const selectedVoice = useMemo(
    () => voiceTones.find((tone) => tone.value === selectedVoiceTone)?.voice ?? "marin",
    [selectedVoiceTone]
  );

  const progressRatio = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  useEffect(() => {
    return () => {
      if (uploadedScriptBgUrl) {
        URL.revokeObjectURL(uploadedScriptBgUrl);
      }
    };
  }, [uploadedScriptBgUrl]);

  const loadDashboard = async () => {
    const response = await fetch("/api/session-data", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setHistory(data.recent ?? []);
    setFavorites(data.favorites ?? []);
    setPresets(data.presets ?? []);
    setStats(data.stats ?? { totalSessions: 0, completedSessions: 0, streakDays: 0 });
    setCurrentUser(data.currentUser ?? null);
    setEntitlements(data.entitlements ?? defaultEntitlements);
    if (data.preferences) {
      setSelectedVoiceTone(data.preferences.preferredVoiceTone ?? "calm-female");
      setSelectedVisual(data.preferences.preferredVisual ?? "mist");
      setSelectedDuration(data.preferences.preferredDuration ?? "5 min");
      setSelectedSounds(data.preferences.preferredSounds ?? []);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!entitlements.allowedVoiceTones.includes(selectedVoiceTone)) {
      setSelectedVoiceTone(entitlements.allowedVoiceTones[0] ?? "calm-female");
    }

    const clampedSounds = selectedSounds
      .filter((sound) => entitlements.allowedSounds.includes(sound))
      .slice(0, entitlements.maxSounds);

    if (clampedSounds.join("|") !== selectedSounds.join("|")) {
      setSelectedSounds(clampedSounds);
    }

    const durationMinutes = Number(selectedDuration.split(" ")[0]);
    if (durationMinutes > entitlements.maxDurationMinutes) {
      const fallbackDuration = durations.find((item) => Number(item.split(" ")[0]) <= entitlements.maxDurationMinutes) ?? "5 min";
      setSelectedDuration(fallbackDuration);
    }

    if (selectedMeditationType === "sleep" && !entitlements.sleepMode) {
      setSelectedMeditationType("quick_calm");
    }

    if (!entitlements.sessionHistory && tab !== "create") {
      setTab("create");
    }
  }, [entitlements, selectedDuration, selectedMeditationType, selectedSounds, selectedVoiceTone, tab]);

  useEffect(() => {
    void fetch("/api/session-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save-preferences",
        preferredVoiceTone: selectedVoiceTone,
        preferredVisual: selectedVisual,
        preferredDuration: selectedDuration,
        preferredSounds: selectedSounds,
      }),
    });
  }, [selectedVoiceTone, selectedVisual, selectedDuration, selectedSounds]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (seconds: number) => {
    clearTimer();
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearNextChunkTimer = () => {
    if (nextChunkTimerRef.current) {
      clearTimeout(nextChunkTimerRef.current);
      nextChunkTimerRef.current = null;
    }
  };

  const abortPendingRequests = () => {
    for (const controller of pendingControllersRef.current) controller.abort();
    pendingControllersRef.current = [];
  };

  const revokeActiveObjectUrls = () => {
    for (const url of activeObjectUrlsRef.current) URL.revokeObjectURL(url);
    activeObjectUrlsRef.current = [];
  };

  const stopAmbient = () => {
    for (const player of ambientPlayersRef.current) {
      player.pause();
      player.currentTime = 0;
      player.src = "";
    }
    ambientPlayersRef.current = [];
  };

  const stopAllAudio = async () => {
    playbackSessionRef.current += 1;
    generationDoneRef.current = true;
    chunkQueueRef.current = [];
    clearNextChunkTimer();
    abortPendingRequests();
    revokeActiveObjectUrls();
    clearTimer();

    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current.src = "";
      voiceAudioRef.current.onended = null;
    }

    stopAmbient();
    setIsPlaying(false);
    setShowSessionScreen(false);

    if (currentSessionId) {
      await fetch("/api/session-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-played", sessionId: currentSessionId, completed: false }),
      });
    }
  };

  const startAmbientMixer = async () => {
    stopAmbient();
    const chosen = soundOptions.filter((option) => selectedSounds.includes(option.value));
    if (chosen.length === 0) return;

    const players = chosen.map((sound) => {
      const player = new Audio(sound.file);
      player.loop = true;
      player.volume = 0.12;
      return player;
    });

    ambientPlayersRef.current = players;
    await Promise.all(
      players.map(async (player) => {
        try {
          await player.play();
        } catch (error) {
          console.error("Ambient playback error:", error);
        }
      })
    );
  };

  const fetchSpeechChunk = async (chunkText: string, sessionId: number) => {
    if (sessionId !== playbackSessionRef.current) return null;
    const controller = new AbortController();
    pendingControllersRef.current.push(controller);

    try {
      const response = await fetch("/api/generate-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunkText, voice: selectedVoice }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate speech chunk.");
      }

      if (sessionId !== playbackSessionRef.current) return null;
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      activeObjectUrlsRef.current.push(audioUrl);
      return audioUrl;
    } catch (error) {
      if (controller.signal.aborted) return null;
      throw error;
    } finally {
      pendingControllersRef.current = pendingControllersRef.current.filter((p) => p !== controller);
    }
  };

  const finishSession = async () => {
    setIsPlaying(false);
    setShowSessionScreen(false);
    clearTimer();
    stopAmbient();
    if (currentSessionId) {
      await fetch("/api/session-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-played", sessionId: currentSessionId, completed: true }),
      });
      await loadDashboard();
    }
  };

  const playNextChunk = async (sessionId: number) => {
    if (sessionId !== playbackSessionRef.current || !voiceAudioRef.current) return;
    clearNextChunkTimer();
    const nextChunkUrl = chunkQueueRef.current.shift();

    if (nextChunkUrl) {
      try {
        voiceAudioRef.current.src = nextChunkUrl;
        await voiceAudioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Chunk playback error:", error);
        await stopAllAudio();
      }
      return;
    }

    if (generationDoneRef.current) {
      await finishSession();
      return;
    }

    nextChunkTimerRef.current = setTimeout(() => {
      void playNextChunk(sessionId);
    }, 140);
  };

  const playSessionText = async (text: string, sessionId: string | null) => {
    setIsGeneratingSpeech(true);
    await stopAllAudio();

    const playbackId = playbackSessionRef.current;
    const chunks = splitMeditationIntoChunks(text, CHUNK_CHAR_LIMIT);
    if (chunks.length === 0) {
      setMeditationText("Session text is empty.");
      setIsGeneratingSpeech(false);
      return;
    }

    generationDoneRef.current = false;
    chunkQueueRef.current = [];
    await startAmbientMixer();

    const firstChunkUrl = await fetchSpeechChunk(chunks[0], playbackId);
    if (!firstChunkUrl || playbackId !== playbackSessionRef.current || !voiceAudioRef.current) {
      setIsGeneratingSpeech(false);
      return;
    }

    voiceAudioRef.current.onended = () => {
      void playNextChunk(playbackId);
    };

    voiceAudioRef.current.src = firstChunkUrl;
    await voiceAudioRef.current.play();

    setIsPlaying(true);
    setShowSessionScreen(true);
    if (sessionId) setCurrentSessionId(sessionId);
    startTimer(durationToSeconds(selectedDuration));

    void (async () => {
      try {
        for (let i = 1; i < chunks.length; i += 1) {
          if (playbackId !== playbackSessionRef.current) return;
          const chunkUrl = await fetchSpeechChunk(chunks[i], playbackId);
          if (!chunkUrl) return;
          chunkQueueRef.current.push(chunkUrl);
        }
      } catch (error) {
        console.error("Background chunk generation error:", error);
      } finally {
        if (playbackId === playbackSessionRef.current) generationDoneRef.current = true;
      }
    })();

    setIsGeneratingSpeech(false);
  };

  const handleGenerate = async () => {
    try {
      setIsGeneratingText(true);
      setMeditationText("Generating your session...");

      const response = await fetch("/api/generate-meditation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: selectedMood,
          duration: selectedDuration,
          mode: sessionMode,
          meditationType: selectedMeditationType,
          breathingPattern: currentPattern.value,
          checkIn: moodCheckIn,
          voice: selectedVoice,
          visual: selectedVisual,
          sounds: selectedSounds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMeditationText(data.error || "Something went wrong.");
        return;
      }

      setMeditationText(data.meditation);
      setCurrentSessionId(data.sessionId || null);
      await loadDashboard();
    } catch (error) {
      console.error("Session generation error:", error);
      setMeditationText("Something went wrong while generating your session.");
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handlePlay = async () => {
    if (!meditationText) return;
    await playSessionText(meditationText, currentSessionId);
  };

  const handleQuickBreathingStart = async () => {
    const script = buildQuickBreathingScript(currentPattern, selectedDuration);
    setMeditationText(script);

    const response = await fetch("/api/session-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-local-session",
        mode: "breathing",
        meditationType: "quick_calm",
        mood: selectedMood,
        duration: selectedDuration,
        breathingPattern: currentPattern.value,
        voice: selectedVoice,
        visual: selectedVisual,
        sounds: selectedSounds,
        text: script,
      }),
    });

    const payload = await response.json();
    setCurrentSessionId(payload.sessionId || null);
    await playSessionText(script, payload.sessionId || null);
    await loadDashboard();
  };

  const applyVoiceCommand = (command: {
    mode?: string | null;
    mood?: string | null;
    meditationType?: string | null;
    duration?: string | null;
    voiceTone?: string | null;
    visual?: string | null;
    breathingPattern?: string | null;
    sounds?: string[];
  }) => {
    if (command.mode === "meditation" || command.mode === "breathing") setSessionMode(command.mode);
    if (command.mood && moods.includes(command.mood)) setSelectedMood(command.mood);
    if (command.meditationType && meditationTypes.some((item) => item.value === command.meditationType)) {
      setSelectedMeditationType(command.meditationType);
    }
    if (command.duration && durations.includes(command.duration)) setSelectedDuration(command.duration);
    if (command.voiceTone && voiceTones.some((item) => item.value === command.voiceTone)) {
      setSelectedVoiceTone(command.voiceTone);
    }
    if (command.visual && visualScenes.some((item) => item.value === command.visual)) setSelectedVisual(command.visual);
    if (command.breathingPattern && breathingPatterns.some((item) => item.value === command.breathingPattern)) {
      setSelectedPattern(command.breathingPattern);
    }
    if (Array.isArray(command.sounds) && command.sounds.length > 0) {
      const allowed = new Set(soundOptions.map((item) => item.value));
      setSelectedSounds(command.sounds.filter((item) => allowed.has(item)));
    }
  };

  const handleVoiceInput = async () => {
    const SpeechRecognitionClass =
      (window as Window & { SpeechRecognition?: BrowserSpeechRecognitionConstructor; webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor }).SpeechRecognition ||
      (window as Window & { SpeechRecognition?: BrowserSpeechRecognitionConstructor; webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setVoiceCommandText("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceCommandText("Could not capture voice command. Try again.");
    };

    recognition.onresult = async (event: SpeechRecognitionResultLike) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || "";
      if (!transcript) return;

      setVoiceCommandText(transcript);

      try {
        const response = await fetch("/api/interpret-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });

        const data = await response.json();
        if (response.ok && data.command) applyVoiceCommand(data.command);
      } catch (error) {
        console.error("Voice command parse error:", error);
      }
    };

    recognition.start();
  };

  const handleStartInstantly = async () => {
    setSessionMode("meditation");
    setSelectedMood("Calm");
    setSelectedDuration("5 min");
    setSelectedMeditationType("quick_calm");
    setSelectedVoiceTone("calm-female");
    setSelectedVisual("mist");
    setSelectedSounds(["Raindrop"]);
    setMoodCheckIn("I want a quick reset and calm focus.");
    await new Promise((resolve) => setTimeout(resolve, 20));
    await handleGenerate();
  };

  const toggleSound = (value: string) => {
    if (!entitlements.allowedSounds.includes(value)) return;
    setSelectedSounds((prev) => {
      if (prev.includes(value)) return prev.filter((item) => item !== value);
      const next = [...prev, value];
      return next.slice(0, entitlements.maxSounds);
    });
  };

  const handleScriptBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUploadedScriptBgUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    event.target.value = "";
  };

  const handleAuthSubmit = async () => {
    try {
      setIsAuthLoading(true);
      setAuthMessage("");
      const endpoint = authMode === "sign-up" ? "/api/auth/sign-up" : "/api/auth/sign-in";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword, displayName: authName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthMessage(data.error || "Authentication failed.");
        return;
      }
      setAuthMode(null);
      setAuthPassword("");
      setAuthMessage("");
      await loadDashboard();
    } catch (error) {
      console.error("Auth request failed:", error);
      setAuthMessage("Authentication failed.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    setAuthMode(null);
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setBillingMessage("");
    await loadDashboard();
  };

  const handleUpgrade = async () => {
    try {
      setIsBillingLoading(true);
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await response.json();
      setBillingMessage(data.message || data.error || "Upgrade request finished.");
      await loadDashboard();
    } catch (error) {
      console.error("Upgrade failed:", error);
      setBillingMessage("Upgrade request failed.");
    } finally {
      setIsBillingLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    try {
      setIsBillingLoading(true);
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      const data = await response.json();
      setBillingMessage(data.message || data.error || "Billing updated.");
      await loadDashboard();
    } catch (error) {
      console.error("Billing portal failed:", error);
      setBillingMessage("Billing portal request failed.");
    } finally {
      setIsBillingLoading(false);
    }
  };

  const savePreset = async () => {
    const name = `${sessionMode === "breathing" ? "Breath" : "Meditation"} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(/\s/g, "")}`;
    await fetch("/api/session-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save-preset",
        name,
        mode: sessionMode,
        meditationType: selectedMeditationType,
        breathingPattern: sessionMode === "breathing" ? currentPattern.value : null,
        voiceTone: selectedVoiceTone,
        visual: selectedVisual,
        duration: selectedDuration,
        sounds: selectedSounds,
      }),
    });
    await loadDashboard();
  };

  const applyPreset = (preset: Preset) => {
    setSessionMode(preset.mode as SessionMode);
    setSelectedMeditationType(preset.meditationType);
    setSelectedPattern(preset.breathingPattern || "balanced-446");
    setSelectedVoiceTone(preset.voiceTone);
    setSelectedVisual(preset.visual);
    setSelectedDuration(preset.duration);
    setSelectedSounds(preset.sounds);
    setTab("create");
  };

  const deletePresetById = async (presetId: string) => {
    await fetch("/api/session-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-preset", presetId }),
    });
    await loadDashboard();
  };

  const toggleFavorite = async (sessionId: string, currentFavorite: boolean) => {
    await fetch("/api/session-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-favorite", sessionId, favorite: !currentFavorite }),
    });
    await loadDashboard();
  };

  const renderSessionList = (items: SessionHistoryItem[]) => (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.sessionId} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-800">
              {item.mode === "breathing" ? "Breathing" : "Meditation"} | {item.duration}
            </p>
            <button
              onClick={() => void toggleFavorite(item.sessionId, item.isFavorite)}
              className="rounded-lg bg-slate-100 px-2 py-1 text-xs"
            >
              {item.isFavorite ? "Starred" : "Star"}
            </button>
          </div>
          <p className="mb-3 line-clamp-2 text-sm text-slate-600">{item.text}</p>
          <button
            onClick={() => {
              setMeditationText(item.text);
              setSelectedDuration(item.duration);
              setCurrentSessionId(item.sessionId);
              setTab("create");
            }}
            className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-white"
          >
            Load
          </button>
        </div>
      ))}
      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          No sessions yet.
        </p>
      )}
    </div>
  );

  return (
    <main
      className={`relative min-h-screen overflow-hidden px-6 py-8 transition-colors ${
        darkMode ? "text-slate-100" : "text-slate-900"
      }`}
    >
      {/* ── Zen animated background ── */}
      <ZenBackground
        theme={currentVisual.breathingTheme}
        isActive={isPlaying}
        darkMode={darkMode}
      />

      {/* ── Particle layer ── */}
      <div className="particle-layer pointer-events-none fixed inset-0 z-0">
        {Array.from({ length: 22 }).map((_, idx) => (
          <span
            key={idx}
            className="particle"
            style={{
              left: `${(idx * 37) % 100}%`,
              animationDelay: `${idx * 0.6}s`,
              animationDuration: `${12 + (idx % 5) * 3}s`,
            }}
          />
        ))}
      </div>

      <BreathingCircle
        isActive={isPlaying}
        inhaleSeconds={sessionMode === "breathing" ? currentPattern.inhale : 4}
        holdSeconds={sessionMode === "breathing" ? currentPattern.hold : 4}
        exhaleSeconds={sessionMode === "breathing" ? currentPattern.exhale : 6}
        theme={currentVisual.breathingTheme}
        onPhaseChange={setBreathingPhase}
      />

      {/* ── Session screen overlay ── */}
      {showSessionScreen && (
        <section className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/65 px-6 backdrop-blur-sm">
          <div className="mb-8 text-center">
            <p className="text-2xl font-semibold text-white">{breathingPhase}</p>
            <p className="mt-1 text-lg text-white/90">{formatTime(remainingSeconds)} remaining</p>
          </div>
          <div
            className="mb-8 h-32 w-32 rounded-full"
            style={{
              background: `conic-gradient(#38bdf8 ${Math.round(progressRatio * 360)}deg, rgba(255,255,255,0.15) 0deg)`,
            }}
          />
          <button
            onClick={() => void stopAllAudio()}
            className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-900"
          >
            End Session
          </button>
        </section>
      )}

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* ── Header ── */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              {!logoLoadFailed ? (
                <img
                  src="/chimaura-logo.png"
                  alt="ChimAura logo"
                  className="h-16 w-auto"
                  style={{ filter: "drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))" }}
                  onError={() => setLogoLoadFailed(true)}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 via-indigo-300 to-violet-300 text-base font-semibold text-white shadow-md">
                  CA
                </div>
              )}
              <h1 className="sr-only">ChimAura</h1>
            </div>
            <p className="mt-1 text-sm opacity-80">
              Streak: {stats.streakDays} days | Sessions: {stats.totalSessions} | Completed: {stats.completedSessions}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {currentUser && !currentUser.isGuest && (
              <div className="rounded-2xl bg-white/70 px-3 py-2 text-right text-xs text-slate-700 shadow-sm">
                <p className="font-semibold text-slate-900">{currentUser.displayName}</p>
                <p>{currentUser.subscriptionTier === "premium" ? "Premium" : "Free"} plan</p>
              </div>
            )}
            {currentUser && (currentUser.role === "admin" || currentUser.role === "super_admin") ? <AdminButton /> : null}
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {darkMode ? "Light Mode" : "Night Mode"}
            </button>
            <button
              onClick={() => void handleStartInstantly()}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Start Calm Session
            </button>
            {currentUser?.isGuest !== false ? (
              <>
                <button
                  onClick={() => { setAuthMode("sign-in"); setAuthMessage(""); }}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setAuthMode("sign-up"); setAuthMessage(""); }}
                  className="rounded-xl bg-white/85 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                {currentUser.subscriptionTier === "premium" ? (
                  <button
                    onClick={() => void handleBillingPortal()}
                    disabled={isBillingLoading}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                  >
                    {isBillingLoading ? "Loading..." : "Billing"}
                  </button>
                ) : (
                  <button
                    onClick={() => void handleUpgrade()}
                    disabled={isBillingLoading}
                    className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isBillingLoading ? "Upgrading..." : "Upgrade"}
                  </button>
                )}
                <button
                  onClick={() => void handleSignOut()}
                  className="rounded-xl bg-white/85 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </header>

        {billingMessage && (
          <div className="mb-4 rounded-2xl bg-slate-900/85 px-4 py-3 text-sm text-white shadow-lg">
            {billingMessage}
          </div>
        )}

        {authMode && (
          <section className="mb-4 rounded-3xl bg-white/90 p-5 shadow-lg backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {authMode === "sign-up" ? "Create your ChimAura account" : "Sign in to ChimAura"}
                </h2>
                <p className="text-sm text-slate-600">
                  Save your sessions, track your tier, and unlock premium access.
                </p>
              </div>
              <button onClick={() => setAuthMode(null)} className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {authMode === "sign-up" && (
                <input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800" />
              )}
              <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800" />
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void handleAuthSubmit()}
                disabled={isAuthLoading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isAuthLoading ? "Please wait..." : authMode === "sign-up" ? "Create Account" : "Sign In"}
              </button>
              {authMessage && <p className="text-sm text-rose-600">{authMessage}</p>}
            </div>
          </section>
        )}

        <nav className="mb-4 flex flex-wrap gap-2">
          {(["create", ...(entitlements.sessionHistory ? ["history", "favorites"] : [])] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                tab === item ? "bg-slate-900 text-white" : "bg-white/70 text-slate-800"
              }`}
            >
              {item === "create" ? "Create" : item === "history" ? "Recent" : "Favorites"}
            </button>
          ))}
          {!entitlements.sessionHistory && (
            <div className="rounded-xl bg-white/60 px-4 py-2 text-sm text-slate-600">
              Premium unlocks history and favorites.
            </div>
          )}
        </nav>

        {tab === "history" && renderSessionList(history)}
        {tab === "favorites" && renderSessionList(favorites)}

        {tab === "create" && (
          <div className="grid gap-6">
            <div className="rounded-3xl bg-white/85 p-6 shadow-lg backdrop-blur">
              <section className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Session Type</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setSessionMode("meditation")} className={`rounded-xl px-3 py-2 text-sm ${sessionMode === "meditation" ? "bg-slate-900 text-white" : "bg-slate-100"}`}>Meditation</button>
                  <button onClick={() => setSessionMode("breathing")} className={`rounded-xl px-3 py-2 text-sm ${sessionMode === "breathing" ? "bg-slate-900 text-white" : "bg-slate-100"}`}>Breathing Exercise</button>
                </div>
              </section>

              <section className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Meditation Type</h2>
                <div className="grid grid-cols-2 gap-2">
                  {meditationTypes.map((type) => {
                    const locked = type.value === "sleep" && !entitlements.sleepMode;
                    return (
                      <button
                        key={type.value}
                        onClick={() => !locked && setSelectedMeditationType(type.value)}
                        disabled={locked}
                        className={`rounded-xl px-3 py-2 text-sm ${selectedMeditationType === type.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"} ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {type.label}{locked ? " (Premium)" : ""}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Mood + Check-in</h2>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  {moods.map((mood) => (
                    <button key={mood} onClick={() => setSelectedMood(mood)} className={`rounded-xl px-3 py-2 text-sm ${selectedMood === mood ? "bg-blue-600 text-white" : "bg-slate-100"}`}>{mood}</button>
                  ))}
                </div>
                <textarea value={moodCheckIn} onChange={(e) => setMoodCheckIn(e.target.value)} placeholder="How are you feeling today?" className="h-20 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700" />
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => void handleVoiceInput()} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                    {isListening ? "Listening..." : "Voice Command"}
                  </button>
                  {voiceCommandText && <p className="text-xs text-slate-600">Heard: {voiceCommandText}</p>}
                </div>
              </section>

              <section className="mb-6 grid gap-4 md:grid-cols-2">
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-slate-800">Duration</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {durations.map((duration) => {
                      const locked = Number(duration.split(" ")[0]) > entitlements.maxDurationMinutes;
                      return (
                        <button
                          key={duration}
                          onClick={() => !locked && setSelectedDuration(duration)}
                          disabled={locked}
                          className={`rounded-xl px-3 py-2 text-sm ${selectedDuration === duration ? "bg-emerald-600 text-white" : "bg-slate-100"} ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                        >
                          {duration}{locked ? " (Premium)" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-semibold text-slate-800">Voice Tone</label>
                  <select value={selectedVoiceTone} onChange={(e) => setSelectedVoiceTone(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                    {voiceTones.map((tone) => {
                      const locked = !entitlements.allowedVoiceTones.includes(tone.value);
                      return <option key={tone.value} value={tone.value} disabled={locked}>{locked ? `${tone.label} (Premium)` : tone.label}</option>;
                    })}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">{voiceTones.find((tone) => tone.value === selectedVoiceTone)?.description}</p>
                </div>
              </section>

              {sessionMode === "breathing" && (
                <section className="mb-6">
                  <h2 className="mb-2 text-lg font-semibold text-slate-800">Breathing Pattern</h2>
                  <select value={selectedPattern} onChange={(e) => setSelectedPattern(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                    {breathingPatterns.map((pattern) => (<option key={pattern.value} value={pattern.value}>{pattern.label}</option>))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">{currentPattern.description}</p>
                </section>
              )}

              <section className="mb-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-lg font-semibold text-slate-800">Visual Scene</label>
                  <select value={selectedVisual} onChange={(e) => setSelectedVisual(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                    {visualScenes.map((scene) => (<option key={scene.value} value={scene.value}>{scene.label}</option>))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-lg font-semibold text-slate-800">Sound Mixer</label>
                    <p className="text-xs text-slate-500">{entitlements.soundMixer ? "Mix multiple sounds together" : "Free plan: one sound at a time"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {soundOptions.map((sound) => {
                      const active = selectedSounds.includes(sound.value);
                      const locked = !entitlements.allowedSounds.includes(sound.value);
                      return (
                        <button
                          key={sound.value}
                          onClick={() => toggleSound(sound.value)}
                          disabled={locked}
                          className={`group rounded-2xl border px-3 py-2 text-left transition ${
                            active
                              ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                              : `border-slate-200 bg-gradient-to-br ${sound.accent} text-slate-700 hover:border-slate-300`
                          } ${locked ? "cursor-not-allowed opacity-45" : ""}`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-white/70 text-slate-700"}`}>
                              {sound.icon}
                            </span>
                            <span className={`text-[11px] font-semibold ${active ? "text-indigo-100" : "text-slate-500"}`}>
                              {active ? "ON" : locked ? "LOCK" : "OFF"}
                            </span>
                          </div>
                          <p className={`text-sm font-semibold ${active ? "text-white" : "text-slate-800"}`}>{sound.label}{locked ? " (Premium)" : ""}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <div className="mb-3 flex flex-wrap gap-2">
                <button onClick={() => void handleGenerate()} disabled={isGeneratingText} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{isGeneratingText ? "Generating..." : "Generate Session"}</button>
                <button onClick={() => void handlePlay()} disabled={!meditationText || isGeneratingSpeech || isPlaying} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{isGeneratingSpeech ? "Preparing Audio..." : "Play Session"}</button>
                <button onClick={() => void handleQuickBreathingStart()} disabled={isGeneratingSpeech || isPlaying} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Quick Breathing Start</button>
                <button onClick={() => void stopAllAudio()} className="rounded-xl bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-900">Stop</button>
                <button onClick={() => void savePreset()} className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white">Save Preset</button>
              </div>

              <div className={`rounded-2xl border border-white/30 bg-slate-950/30 p-4 text-white shadow-xl backdrop-blur-sm ${isScriptExpanded ? "fixed inset-6 z-40 overflow-hidden" : ""}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-white">Generated Script</h3>
                  <button onClick={() => setIsScriptExpanded((prev) => !prev)} className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30">
                    {isScriptExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>
                <div
                  className="relative overflow-hidden rounded-2xl border border-white/20"
                  style={{
                    backgroundImage: uploadedScriptBgUrl
                      ? `linear-gradient(rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.6)), url(${uploadedScriptBgUrl})`
                      : "linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(49, 46, 129, 0.82), rgba(15, 23, 42, 0.9))",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="flex items-center justify-between border-b border-white/15 bg-slate-900/30 px-3 py-2">
                    <p className="text-xs font-medium text-slate-200">{uploadedScriptBgUrl ? "Custom focus image active" : "Default focus visual active"}</p>
                    <label className="cursor-pointer rounded-lg bg-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/30">
                      Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleScriptBackgroundUpload} />
                    </label>
                  </div>
                  <p className={`overflow-auto whitespace-pre-line px-4 py-4 text-sm leading-7 text-slate-100 ${isScriptExpanded ? "max-h-[78vh]" : "max-h-60"}`}>
                    {meditationText || "Your personalized guided session will appear here."}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-3xl bg-white/85 p-5 shadow-lg backdrop-blur">
                <h3 className="mb-3 text-lg font-semibold text-slate-800">Saved Presets</h3>
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <div key={preset.presetId} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-sm font-semibold text-slate-800">{preset.name}</p>
                      <div className="flex gap-2 text-xs">
                        <button onClick={() => applyPreset(preset)} className="rounded-lg bg-slate-900 px-2 py-1 text-white">Apply</button>
                        <button onClick={() => void deletePresetById(preset.presetId)} className="rounded-lg bg-slate-200 px-2 py-1">Delete</button>
                      </div>
                    </div>
                  ))}
                  {presets.length === 0 && <p className="text-sm text-slate-500">No presets yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <audio ref={voiceAudioRef} />
    </main>
  );
}
