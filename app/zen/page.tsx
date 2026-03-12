"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Heart, MoonStar, Play, RefreshCw, Sparkles, Sunrise, Wind } from "lucide-react";
import BreathingCircle, { type BreathingPhase } from "@/components/BreathingCircle";
import ZenBackground from "@/components/ZenBackground";
import { MOOD_OPTIONS } from "@/lib/mood";
import type { Badge, StreakData } from "@/lib/streaks";

const scenes = [
  { label: "Morning Mist", value: "mist", description: "Soft sky tones for a gentle reset.", theme: "mist" as const },
  { label: "Golden Sunrise", value: "sunrise", description: "Warm amber light for grounded energy.", theme: "sunrise" as const },
  { label: "Forest Calm", value: "forest", description: "Quiet greens for deeper settling.", theme: "forest" as const },
  { label: "Night Tide", value: "night", description: "A darker horizon for slower breathing.", theme: "night" as const },
];

const patterns = [
  { label: "Balanced 4-4-6", value: "balanced-446", inhale: 4, hold: 4, exhale: 6 },
  { label: "Box 4-4-4", value: "box-444", inhale: 4, hold: 4, exhale: 4 },
  { label: "Relax 4-7-8", value: "relax-478", inhale: 4, hold: 7, exhale: 8 },
];

const emptyStreak: StreakData = { currentStreak: 0, longestStreak: 0, totalDays: 0, lastActiveDate: null, badges: [], todayCompleted: false };
const durations = ["1 min", "3 min", "5 min", "10 min"];

function formatTime(seconds: number) {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = (Math.max(0, seconds) % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function buildScript(moodLabel: string, duration: string, sceneLabel: string) {
  return `Welcome. Let ${sceneLabel.toLowerCase()} hold a little space for you. Today you checked in as ${moodLabel.toLowerCase()}. For the next ${duration.toLowerCase()}, soften your shoulders, lengthen your breath, and let your mind arrive where your body already is. You do not need to force calm. Just make a little room for it.`;
}

export default function ZenPage() {
  const [selectedMood, setSelectedMood] = useState("calm");
  const [selectedDuration, setSelectedDuration] = useState("5 min");
  const [selectedScene, setSelectedScene] = useState("mist");
  const [selectedPattern, setSelectedPattern] = useState("balanced-446");
  const [breathingPhase, setBreathingPhase] = useState<BreathingPhase>("Inhale");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading] = useState(false);
  const [script, setScript] = useState("");
  const [streak, setStreak] = useState<StreakData>(emptyStreak);
  const timerRef = useRef<number | null>(null);

  const mood = useMemo(() => MOOD_OPTIONS.find((item) => item.value === selectedMood) ?? MOOD_OPTIONS[0], [selectedMood]);
  const scene = useMemo(() => scenes.find((item) => item.value === selectedScene) ?? scenes[0], [selectedScene]);
  const pattern = useMemo(() => patterns.find((item) => item.value === selectedPattern) ?? patterns[0], [selectedPattern]);
  const earnedBadges = streak.badges.filter((badge) => !badge.locked);

  useEffect(() => {
    void fetch("/api/mood").then((res) => res.ok ? res.json() : null).then((data) => {
      if (data?.mood?.mood) setSelectedMood(data.mood.mood);
    }).catch(() => undefined);

    void fetch("/api/streak").then((res) => res.ok ? res.json() : null).then((data) => {
      if (data?.streak) setStreak(data.streak);
    }).catch(() => undefined);

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
    };
  }, []);

  const stopSession = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setIsPlaying(false);
    setRemainingSeconds(0);
  };

  const startSession = async (mode: "meditation" | "breathing") => {
    const nextScript = mode === "breathing"
      ? `Breathe in for ${pattern.inhale}, hold for ${pattern.hold}, and exhale for ${pattern.exhale}. Stay with this for ${selectedDuration.toLowerCase()} and let the pace steady you.`
      : buildScript(mood.label, selectedDuration, scene.label);

    setScript(nextScript);
    stopSession();
    setIsPlaying(true);
    setRemainingSeconds(Number(selectedDuration.split(" ")[0]) * 60);
    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          timerRef.current = null;
          setIsPlaying(false);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    await fetch("/api/mood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mood: selectedMood }) }).catch(() => undefined);
    const streakRes = await fetch("/api/streak", { method: "POST" }).catch(() => null);
    if (streakRes?.ok) {
      const data = await streakRes.json();
      if (data?.streak) setStreak(data.streak);
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(nextScript);
      utterance.rate = mode === "breathing" ? 0.92 : 0.88;
      utterance.pitch = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const cardClass = "rounded-[28px] border border-white/12 bg-slate-950/45 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <ZenBackground theme={scene.theme} isActive={isPlaying} darkMode />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-sky-200/65">Zen Lab</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
              Gentle guided meditation and breathing for the way you feel today
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200/75 sm:text-base">
              Mood check-ins, guided meditation, calming breathwork, and a soft visual scene you
              can return to whenever you need a reset.
            </p>
          </div>
          <button onClick={() => setSelectedMood(mood.value)} className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16">
            <RefreshCw className="h-4 w-4" />
            Current mood: {mood.label}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4">
            <div className={`${cardClass} overflow-hidden`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-sky-200/65">Today&apos;s check-in</p>
                  <h2 className="mt-2 text-2xl font-semibold">How is your energy landing?</h2>
                  <p className="mt-2 max-w-xl text-sm text-slate-300/80">{mood.recommendations.message}</p>
                </div>
                <Sparkles className="h-6 w-6 text-sky-200/70" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {MOOD_OPTIONS.map((item) => {
                  const active = item.value === selectedMood;
                  return (
                    <button key={item.value} onClick={() => setSelectedMood(item.value)} className={`rounded-3xl border px-4 py-4 text-left transition ${active ? "border-white/30 bg-white/16 shadow-lg" : "border-white/10 bg-white/6 hover:bg-white/10"}`}>
                      <div className="text-2xl">{item.emoji}</div>
                      <p className="mt-3 text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-300/75">{item.recommendations.breathingStyle} breathing</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className={`${cardClass} flex flex-col items-center justify-center`}>
                <BreathingCircle isActive={isPlaying} inhaleSeconds={pattern.inhale} holdSeconds={pattern.hold} exhaleSeconds={pattern.exhale} theme={scene.theme} onPhaseChange={setBreathingPhase} />
                <div className="mt-5 text-center">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-300/65">Current phase</p>
                  <p className="mt-2 text-2xl font-semibold">{breathingPhase}</p>
                  <p className="mt-2 text-sm text-slate-300/70">{remainingSeconds > 0 ? `${formatTime(remainingSeconds)} remaining` : "Ready when you are"}</p>
                </div>
              </div>

              <div className={cardClass}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-100">Duration</span>
                    <select value={selectedDuration} onChange={(event) => setSelectedDuration(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none">
                      {durations.map((duration) => <option key={duration} value={duration} className="bg-slate-950">{duration}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-100">Breathing pattern</span>
                    <select value={selectedPattern} onChange={(event) => setSelectedPattern(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none">
                      {patterns.map((item) => <option key={item.value} value={item.value} className="bg-slate-950">{item.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {scenes.map((item) => {
                    const active = item.value === selectedScene;
                    return (
                      <button key={item.value} onClick={() => setSelectedScene(item.value)} className={`rounded-3xl border p-4 text-left transition ${active ? "border-white/30 bg-white/14" : "border-white/10 bg-white/6 hover:bg-white/10"}`}>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-300/75">{item.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => setScript(buildScript(mood.label, selectedDuration, scene.label))} disabled={isLoading} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px] disabled:opacity-60"><Sparkles className="h-4 w-4" />Generate session</button>
                  <button onClick={() => void startSession("meditation")} className="inline-flex items-center gap-2 rounded-2xl border border-sky-300/20 bg-sky-300/12 px-5 py-3 text-sm font-semibold text-sky-50 transition hover:translate-y-[-1px]"><Play className="h-4 w-4" />Start meditation</button>
                  <button onClick={() => void startSession("breathing")} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-300/12 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:translate-y-[-1px]"><Wind className="h-4 w-4" />Quick breathing</button>
                  <button onClick={stopSession} className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12">Stop</button>
                </div>

                <div className="mt-5 rounded-[26px] border border-white/12 bg-black/22 p-4">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.35em] text-slate-300/65">Generated script</p><p className="mt-1 text-sm text-slate-300/75">Personalized from your mood, breathing rhythm, and chosen visual scene.</p></div><MoonStar className="h-5 w-5 text-slate-300/70" /></div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-100/92">{script || "Generate a session to see your script appear here."}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className={cardClass}>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200/65">Daily calm streak</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div><p className="text-5xl font-black text-amber-300">{streak.currentStreak}</p><p className="mt-2 text-sm text-slate-200/80">{streak.todayCompleted ? "Today is already counted." : "Complete a session to keep it going."}</p></div>
                <div className="rounded-3xl border border-amber-300/14 bg-amber-300/10 px-4 py-3 text-right"><p className="text-xs uppercase tracking-[0.25em] text-amber-100/70">Longest</p><p className="mt-1 text-2xl font-semibold text-amber-50">{streak.longestStreak}</p></div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4"><p className="text-xs uppercase tracking-[0.25em] text-slate-300/65">Total days</p><p className="mt-2 text-2xl font-semibold text-white">{streak.totalDays}</p></div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4"><p className="text-xs uppercase tracking-[0.25em] text-slate-300/65">Last active</p><p className="mt-2 text-sm font-medium text-white">{streak.lastActiveDate ?? "Not yet started"}</p></div>
              </div>
              <div className="mt-5"><p className="text-xs uppercase tracking-[0.25em] text-slate-300/65">Badges</p><div className="mt-3 flex flex-wrap gap-2">{(earnedBadges.length ? earnedBadges : streak.badges).map((badge: Badge) => <div key={badge.id} className={`rounded-full border px-3 py-2 text-sm ${badge.locked ? "border-white/10 bg-white/5 text-slate-300/55" : "border-sky-300/20 bg-sky-300/10 text-sky-50"}`}><span className="mr-2">{badge.emoji}</span>{badge.label}</div>)}</div></div>
            </div>

            <div className={cardClass}>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/65">Mood guidance</p>
              <h3 className="mt-3 text-2xl font-semibold">{mood.label}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-200/80">{mood.recommendations.message}</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4"><div className="flex items-center gap-3"><Heart className="h-5 w-5 text-rose-300" /><div><p className="text-sm font-semibold text-white">Suggested pace</p><p className="text-xs text-slate-300/75">{mood.recommendations.duration}</p></div></div></div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-cyan-300" /><div><p className="text-sm font-semibold text-white">Meditation type</p><p className="text-xs text-slate-300/75">{mood.recommendations.meditationType.replaceAll("_", " ")}</p></div></div></div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4"><div className="flex items-center gap-3"><Wind className="h-5 w-5 text-emerald-300" /><div><p className="text-sm font-semibold text-white">Breathing style</p><p className="text-xs text-slate-300/75">{mood.recommendations.breathingStyle}</p></div></div></div>
              </div>
            </div>

            <div className={cardClass}>
              <p className="text-xs uppercase tracking-[0.35em] text-violet-200/65">Tonight&apos;s wind-down</p>
              <h3 className="mt-3 text-xl font-semibold">A softer landing before sleep</h3>
              <p className="mt-3 text-sm leading-7 text-slate-200/80">Keep your lights low, breathe with the {pattern.label.toLowerCase()} pattern, and spend a few minutes with a slower scene like {scene.label.toLowerCase()}.</p>
              <button onClick={() => { setSelectedDuration("3 min"); setSelectedScene("night"); setSelectedPattern("relax-478"); }} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-violet-300/18 bg-violet-300/12 px-4 py-3 text-sm font-semibold text-violet-50"><Sunrise className="h-4 w-4" />Load night reset</button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}


