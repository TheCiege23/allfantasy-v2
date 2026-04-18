"use client";
// components/StartSitPopup/index.jsx
// Drop this popup anywhere. Calls /api/start-sit/* — no API keys in the browser.

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./StartSitPopup.module.css";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SPORT_LABELS = {
  all:    "All Sports",
  nfl:    "NFL",
  nba:    "NBA",
  mlb:    "MLB",
  nhl:    "NHL",
  soccer: "Soccer / MLS",
  cfb:    "College Football",
  cbb:    "College Basketball",
};

const WEEK_OPTIONS = [
  { value: "current", label: "Current Week" },
  { value: "next",    label: "Next Week" },
  ...Array.from({ length: 18 }, (_, i) => ({ value: String(i + 1), label: `Week ${i + 1}` })),
];

const FORMAT_OPTIONS = [
  "PPR", "Half PPR", "Standard", "2QB", "Superflex",
  "IDP", "Dynasty", "Keeper", "Zombie League", "Survivor", "Tournament",
];

const LENS_OPTIONS = [
  { id: "balanced", icon: "⚖", label: "Balanced",     sub: "Pure expected value"  },
  { id: "safe",     icon: "🛡", label: "Safe Floor",   sub: "Limit downside risk"  },
  { id: "upside",   icon: "🚀", label: "Upside Swing", sub: "Chase the ceiling"    },
];

const SPORT_EMOJI = { nfl:"🏈", nba:"🏀", mlb:"⚾", nhl:"🏒", soccer:"⚽", cfb:"🏈", cbb:"🏀", all:"🏆" };

// ─── Recommendation logic (client-side, mirrors server logic) ─────────────────
function getRec(player, lens) {
  if (lens === "safe") {
    if (player.floor >= 12)  return { rec: "START", color: "#00d4aa" };
    if (player.floor >= 7)   return { rec: "FLEX",  color: "#f5a623" };
    return { rec: "SIT", color: "#f06060" };
  }
  if (lens === "upside") {
    if (player.ceiling >= 34) return { rec: "START", color: "#00d4aa" };
    if (player.ceiling >= 22) return { rec: "FLEX",  color: "#f5a623" };
    return { rec: "SIT", color: "#f06060" };
  }
  if (player.projected >= 18) return { rec: "START", color: "#00d4aa" };
  if (player.projected >= 11) return { rec: "FLEX",  color: "#f5a623" };
  return { rec: "SIT", color: "#f06060" };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ApiPill({ label, live }) {
  return (
    <span className={`${styles.apiPill} ${live ? styles.live : ""}`}>
      {live && <span className={styles.liveDot} />}
      {label}
    </span>
  );
}

function PlayerCard({ player, lens, onAskChimmy }) {
  const { rec, color } = getRec(player, lens);
  const borderColor    = color;
  const confClass      = player.confidence >= 75 ? styles.confHigh : player.confidence >= 55 ? styles.confMid : styles.confLow;
  const trendColor     = player.trend === "up" ? "#00d4aa" : player.trend === "down" ? "#f06060" : "#5c6480";
  const trendArrow     = player.trend === "up" ? "↑" : player.trend === "down" ? "↓" : "→";

  return (
    <div className={styles.playerCard} style={{ borderLeftColor: borderColor }}>
      <div className={styles.pcHeader}>
        <div>
          <div className={styles.pcName}>{player.name}</div>
          <div className={styles.pcMeta}>{player.position} · {player.team} vs {player.opponent}</div>
        </div>
        <div className={styles.pcRecCol}>
          <div className={styles.pcRec} style={{ color }}>{rec}</div>
          {player.status !== "Active" && (
            <span className={styles.badgeInjury}>⚠ {player.status}</span>
          )}
        </div>
      </div>

      <div className={styles.pcStats}>
        {[
          { label: "Projected", val: player.projected, cls: "" },
          { label: "Floor",     val: player.floor,     cls: styles.amber },
          { label: "Ceiling",   val: player.ceiling,   cls: styles.blue  },
        ].map(({ label, val, cls }) => (
          <div key={label} className={styles.pcStat}>
            <div className={styles.pcStatLabel}>{label}</div>
            <div className={`${styles.pcStatVal} ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className={styles.pcNote}>{player.note}</div>

      <div className={styles.pcConfRow}>
        <span className={styles.pcConfLabel}>Confidence: {player.confidence}%</span>
        <span style={{ color: trendColor, fontSize: 11, fontWeight: 700 }}>{trendArrow} Trend</span>
      </div>
      <div className={styles.confBar}>
        <div className={`${styles.confFill} ${confClass}`} style={{ width: `${player.confidence}%` }} />
      </div>

      <div className={styles.pcFooter}>
        <span className={styles.pcFooterMeta}>Matchup: #{player.matchupRank}</span>
        <button className={styles.btnAskChimmy} onClick={() => onAskChimmy(player)}>
          Ask Chimmy ↗
        </button>
      </div>
    </div>
  );
}

// ─── Main popup ────────────────────────────────────────────────────────────────
export default function StartSitPopup({ isOpen, onClose, userId }) {
  const [sport,       setSport]       = useState("nfl");
  const [leagues,     setLeagues]     = useState([]);
  const [leagueId,    setLeagueId]    = useState("");
  const [leagueName,  setLeagueName]  = useState("");
  const [week,        setWeek]        = useState("current");
  const [format,      setFormat]      = useState("PPR");
  const [lens,        setLens]        = useState("balanced");

  const [roster,      setRoster]      = useState([]);
  const [injuries,    setInjuries]    = useState([]);
  const [weather,     setWeather]     = useState([]);
  const [matchups,    setMatchups]    = useState([]);

  const [loading,     setLoading]     = useState({ roster: false, injuries: false, weather: false, matchups: false });
  const [source,      setSource]      = useState("—");
  const [apiStatus,   setApiStatus]   = useState({ sports: false, news: false, ai: false });
  const [overallConf, setOverallConf] = useState(null);
  const [statusInfo,  setStatusInfo]  = useState({ title: "Select a league", sub: "", icon: "⚡", color: "#00d4aa" });

  const [chatMessages, setChatMessages] = useState([{
    role: "chimmy",
    content: "Hey! I'm Chimmy. Select your league above and ask me anything about your lineup — I have live access to player projections, injuries, weather, and matchup data.",
  }]);
  const [chatLoading,   setChatLoading]  = useState(false);
  const [chatHistory,   setChatHistory]  = useState([]);
  const [chatInput,     setChatInput]    = useState("");
  const chatRef  = useRef(null);
  const inputRef = useRef(null);

  // ── Load leagues when sport changes ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const res  = await fetch(`/api/start-sit/leagues?userId=${userId ?? ""}`);
        const data = await res.json();
        const sportKey = sport === "all" ? null : sport;
        const list = sportKey
          ? (data[sportKey] ?? [])
          : Object.values(data).flat();
        const allOpt = { id: "all", name: `All ${SPORT_LABELS[sport] || "Leagues"}` };
        const merged = [allOpt, ...list];
        setLeagues(merged);
        setLeagueId(allOpt.id);
        setLeagueName(allOpt.name);
      } catch (err) {
        console.error("[leagues]", err);
      }
    };
    load();
  }, [sport, isOpen, userId]);

  // ── Load all data ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!leagueId) return;
    setLoading({ roster: true, injuries: true, weather: true, matchups: true });

    const params = new URLSearchParams({ leagueId, sport, week, format });

    const [rosterRes, injuryRes, weatherRes, matchupRes] = await Promise.allSettled([
      fetch(`/api/start-sit/roster?${params}`).then((r) => r.json()),
      fetch(`/api/start-sit/injuries?sport=${sport}`).then((r) => r.json()),
      fetch(`/api/start-sit/weather?sport=${sport}`).then((r) => r.json()),
      fetch(`/api/start-sit/matchups?sport=${sport}&week=${week}`).then((r) => r.json()),
    ]);

    const rosterData  = rosterRes.status  === "fulfilled" ? rosterRes.value.players   ?? [] : [];
    const injuryData  = injuryRes.status  === "fulfilled" ? injuryRes.value.injuries  ?? [] : [];
    const weatherData = weatherRes.status === "fulfilled" ? weatherRes.value.weather  ?? [] : [];
    const matchupData = matchupRes.status === "fulfilled" ? matchupRes.value.matchups ?? [] : [];

    setRoster(rosterData);
    setInjuries(injuryData);
    setWeather(weatherData);
    setMatchups(matchupData);
    setLoading({ roster: false, injuries: false, weather: false, matchups: false });

    if (rosterRes.status === "fulfilled") {
      setSource(rosterRes.value.source ?? "API");
      setApiStatus((s) => ({ ...s, sports: true, news: injuryData.length > 0 }));
    }

    if (rosterData.length > 0) {
      const avg    = Math.round(rosterData.reduce((a, p) => a + p.confidence, 0) / rosterData.length);
      const issues = rosterData.filter((p) => p.status !== "Active");
      setOverallConf(avg);
      setStatusInfo(issues.length > 0
        ? { title: `${issues.length} injury flag${issues.length > 1 ? "s" : ""} detected`, sub: issues.map((p) => p.name).join(", ") + " — review before locking", icon: "⚠", color: "#f5a623" }
        : { title: "Lineup looks good", sub: `No critical issues for ${leagueName}`, icon: "⚡", color: "#00d4aa" }
      );
    }
  }, [leagueId, sport, week, format, leagueName]);

  useEffect(() => {
    if (isOpen && leagueId) loadAll();
  }, [isOpen, leagueId, week, format, loadAll]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages, chatLoading]);

  // ── Escape to close ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Chimmy ────────────────────────────────────────────────────────────────────
  const sendChimmy = useCallback(async (msg) => {
    if (!msg.trim()) return;
    setChatMessages((p) => [...p, { role: "user", content: msg }]);
    setChatLoading(true);
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    try {
      const res  = await fetch("/api/start-sit/chimmy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory, context: { sport, leagueName, lens, format, week, roster, injuries, weather, matchups } }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Sorry, I couldn't generate a response right now.";
      setChatMessages((p) => [...p, { role: "chimmy", content: reply }]);
      setChatHistory((p) => [...p, { role: "assistant", content: reply }]);
      setApiStatus((s) => ({ ...s, ai: true }));
    } catch {
      setChatMessages((p) => [...p, { role: "chimmy", content: "AI temporarily unavailable. Check your API key configuration in Vercel environment variables." }]);
    }
    setChatLoading(false);
  }, [chatHistory, sport, leagueName, lens, format, week, roster, injuries, weather, matchups]);

  const handleAskAboutPlayer = useCallback((player) => {
    const q = `Analyze ${player.name} (${player.position}, ${player.team}) vs ${player.opponent} — proj: ${player.projected}pts, floor: ${player.floor}, ceil: ${player.ceiling}, status: ${player.status}. Should I start them under the ${lens} lens?`;
    sendChimmy(q);
    document.querySelector(`.${styles.chimmySection}`)?.scrollIntoView({ behavior: "smooth" });
  }, [lens, sendChimmy]);

  const handleSendInput = () => {
    if (!chatInput.trim()) return;
    sendChimmy(chatInput.trim());
    setChatInput("");
  };

  const confColor = overallConf == null ? "#9ba3bf" : overallConf >= 75 ? "#00d4aa" : overallConf >= 60 ? "#f5a623" : "#f06060";

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Start/Sit Tactical Decision Room">

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div className={styles.titleRow}>
            <div className={styles.headerIcon}>⚡</div>
            <div>
              <div className={styles.titleText}>Start/Sit</div>
              <div className={styles.subtitleText}>Tactical Decision Room</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <ApiPill label="Sports APIs"  live={apiStatus.sports} />
            <ApiPill label="X/Grok News" live={apiStatus.news}   />
            <ApiPill label="AI Engine"   live={apiStatus.ai}     />
            <button className={styles.btnRefresh} onClick={loadAll} title="Refresh all data">↻</button>
            <button className={styles.btnClose}   onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className={styles.body}>

          {/* Controls */}
          <div className={styles.controlsBar}>
            {[
              { label: "Sport",       el: (
                <select className={styles.ctrlSelect} value={sport} onChange={(e) => setSport(e.target.value)}>
                  {Object.entries(SPORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )},
              { label: "League",      el: (
                <select className={`${styles.ctrlSelect} ${styles.leagueSelect}`} value={leagueId} onChange={(e) => { const o = leagues.find((l) => l.id === e.target.value); setLeagueId(e.target.value); setLeagueName(o?.name ?? ""); }}>
                  {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )},
              { label: "Week / Period", el: (
                <select className={styles.ctrlSelect} value={week} onChange={(e) => setWeek(e.target.value)}>
                  {WEEK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )},
              { label: "Format",      el: (
                <select className={styles.ctrlSelect} value={format} onChange={(e) => setFormat(e.target.value)}>
                  {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              )},
            ].map(({ label, el }) => (
              <div key={label} className={styles.ctrlGroup}>
                <label className={styles.ctrlLabel}>{label}</label>
                {el}
              </div>
            ))}
          </div>

          {/* Lenses */}
          <div className={styles.lensesRow}>
            {LENS_OPTIONS.map((o) => (
              <button key={o.id} className={`${styles.lensBtn} ${lens === o.id ? styles.active : ""}`} onClick={() => setLens(o.id)}>
                <span className={styles.lensIcon}>{o.icon}</span>
                <span className={styles.lensLabel}>{o.label}</span>
                <span className={styles.lensSub}>{o.sub}</span>
              </button>
            ))}
          </div>

          {/* Status banner */}
          <div className={styles.statusBanner}>
            <div className={styles.statusLeft}>
              <div className={styles.statusIcon} style={{ borderColor: statusInfo.color, background: statusInfo.color + "22" }}>
                {statusInfo.icon}
              </div>
              <div>
                <div className={styles.statusTitle} style={{ color: statusInfo.color }}>{statusInfo.title}</div>
                <div className={styles.statusSub}>{statusInfo.sub || `${leagueName} · ${SPORT_LABELS[sport]} · ${format}`}</div>
              </div>
            </div>
            <div className={styles.statusRight}>
              <div className={styles.statusConfLabel}>Overall confidence</div>
              <div className={styles.statusConfVal} style={{ color: confColor }}>
                {overallConf != null ? `${overallConf}%` : "—"}
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div className={styles.mainGrid}>
            {/* Left: Injury / Weather / Matchups */}
            <div className={styles.leftCol}>
              <div className={styles.panel}>
                <div className={styles.sectionTitle}>⚠ Injury &amp; News Feed</div>
                {loading.injuries ? (
                  <div className={styles.feedLoading}>Connecting to X/Grok API...</div>
                ) : (
                  <div className={styles.feedList}>
                    {injuries.map((n, i) => (
                      <div key={i} className={styles.newsItem}>
                        <div className={`${styles.dot} ${styles["dot" + n.severity[0].toUpperCase() + n.severity.slice(1)]}`} />
                        <div className={styles.newsBody}>
                          <div className={styles.newsHeader}>
                            <span className={styles.newsPlayer}>{n.player}</span>
                            <div className={styles.newsMetaRow}>
                              <span className={styles.tag}>{n.source}</span>
                              <span className={styles.newsTime}>{n.time}</span>
                            </div>
                          </div>
                          <div className={styles.newsText}>{n.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${styles.panel} ${styles.mt12}`}>
                <div className={styles.sectionTitle}>☁ Weather &amp; Conditions</div>
                {loading.weather ? (
                  <div className={styles.feedLoading}>Loading weather...</div>
                ) : (
                  <div className={styles.weatherGrid}>
                    {weather.map((w, i) => (
                      <div key={i} className={styles.weatherCard}>
                        <div className={styles.wcLeft}>
                          <span className={styles.wcIcon}>{w.icon}</span>
                          <div>
                            <div className={styles.wcGame}>{w.game}</div>
                            <div className={styles.wcVenue}>{w.venue}</div>
                          </div>
                        </div>
                        <div className={styles.wcRight}>
                          <div className={styles.wcConditions}>{w.temp} · {w.wind}</div>
                          <div className={styles.wcImpact} style={{ color: w.impactColor }}>Impact: {w.impact}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${styles.panel} ${styles.mt12}`}>
                <div className={styles.sectionTitle}>📊 Matchup Intelligence</div>
                {loading.matchups ? (
                  <div className={styles.feedLoading}>Loading matchup data...</div>
                ) : (
                  <div className={styles.matchupList}>
                    {matchups.map((m, i) => (
                      <div key={i} className={styles.matchupRow}>
                        <div className={styles.matchupHeader}>
                          <span className={styles.matchupPos}>{m.position}</span>
                          <span className={styles.matchupRankLabel} style={{ color: m.score >= 70 ? "#00d4aa" : m.score >= 45 ? "#f5a623" : "#f06060" }}>{m.rankLabel}</span>
                        </div>
                        <div className={styles.matchupOpp}>{m.opponent}</div>
                        <div className={styles.matchupBarWrap}>
                          <div className={styles.matchupBarFill} style={{ width: `${m.score}%`, background: m.score >= 70 ? "#00d4aa" : m.score >= 45 ? "#f5a623" : "#f06060" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Roster */}
            <div className={styles.rightCol}>
              <div className={styles.panel}>
                <div className={styles.rosterHeader}>
                  <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                    {SPORT_EMOJI[sport]} Roster Start/Sit Analysis
                  </div>
                  <ApiPill label={loading.roster ? "Fetching…" : source} live={!loading.roster} />
                </div>
                {loading.roster ? (
                  <div className={styles.rosterLoading}>
                    🔄 Fetching from {leagueName}
                    <span className={styles.loadingSource}>Rolling Insights → TheDataDb → ClearSports → Sleeper</span>
                  </div>
                ) : roster.length === 0 ? (
                  <div className={styles.rosterEmpty}>No roster data. Ensure your league is linked to AllFantasy.</div>
                ) : (
                  <div className={styles.rosterGrid}>
                    {roster.map((p) => (
                      <PlayerCard key={p.id} player={p} lens={lens} onAskChimmy={handleAskAboutPlayer} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chimmy */}
          <div className={`${styles.panel} ${styles.chimmySection}`}>
            <div className={styles.chimmyHeader}>
              <div className={styles.chimmyAvatar}>C</div>
              <div>
                <div className={styles.chimmyTitle}>Ask Chimmy</div>
                <div className={styles.chimmySubtitle}>OpenAI · Deepseek · Grok · Anthropic</div>
              </div>
              <div className={styles.quickBtns}>
                {[
                  ["Who to start?",  "Who should I start this week?"],
                  ["Injury risks?",  "Any injury risks I need to know about?"],
                  ["Tough calls",    "Analyze my toughest start/sit decisions"],
                  ["Max ceiling",    "Give me my ceiling lineup under the upside swing lens"],
                ].map(([label, prompt]) => (
                  <button key={label} className={styles.quickBtn} onClick={() => sendChimmy(prompt)}>{label}</button>
                ))}
              </div>
            </div>

            <div className={styles.chimmyChat} ref={chatRef}>
              {chatMessages.map((m, i) => (
                <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.msgUser : styles.msgChimmy}`}>
                  <div className={styles.msgLabel}>{m.role === "user" ? "You" : "Chimmy"}</div>
                  <div className={styles.msgBody} dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br/>") }} />
                </div>
              ))}
              {chatLoading && (
                <div className={`${styles.msg} ${styles.msgChimmy}`}>
                  <div className={styles.msgLabel}>Chimmy</div>
                  <div className={styles.msgBody}><span className={styles.spinner} /> Analyzing with AI engine...</div>
                </div>
              )}
            </div>

            <div className={styles.chimmyInputRow}>
              <input
                ref={inputRef}
                className={styles.chimmyInput}
                type="text"
                placeholder="Ask about any player, matchup, or lineup decision..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendInput()}
              />
              <button className={styles.btnPrimary} onClick={handleSendInput} disabled={chatLoading}>
                Ask ↗
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
