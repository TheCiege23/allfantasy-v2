"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Language = "en" | "es";

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const translations: Record<string, Record<string, string>> = {
  en: {
    // Common
    "common.language": "Language",
    "common.english": "English",
    "common.spanish": "Spanish",
    "common.signIn": "Sign in",
    "common.signUp": "Sign up",

    // Homepage
    "home.tagline": "AI fantasy sports for real players.",
    "home.title": "AI-Powered Fantasy Sports Tools",
    "home.subtitle":
      "Analyze trades, manage leagues, dominate bracket challenges, and make smarter fantasy decisions.",
    "home.featureSummary":
      "AllFantasy gives you one place for fantasy sports tools, AI insights, bracket contests, and legacy experiences.",

    "home.hero.cta.primary": "Get started",
    "home.hero.cta.secondary": "View plans",
    "home.hero.cta.app": "Open Sports App",
    "home.hero.cta.bracket": "NCAA Bracket Challenge",
    "home.hero.cta.legacy": "Open AllFantasy Legacy",
    "home.hero.tradeTeaser": "Or jump straight to the Trade Analyzer →",

    "home.products.heading": "Choose your AllFantasy path",

    "home.products.app.title": "AllFantasy Sports App",
    "home.products.app.body":
      "AI-powered fantasy tools for rosters, leagues, player insights, and trade analysis.",
    "home.products.app.primary": "Open Sports App",
    "home.products.app.signIn": "Sign in",
    "home.products.app.signUp": "Sign up",

    "home.products.bracket.title": "AllFantasy NCAA Bracket Challenge",
    "home.products.bracket.body":
      "Create picks, compete in bracket contests, and track your tournament experience.",
    "home.products.bracket.primary": "Open NCAA Bracket Challenge",
    "home.products.bracket.signIn": "Sign in",
    "home.products.bracket.signUp": "Sign up",

    "home.products.legacy.title": "AllFantasy Legacy",
    "home.products.legacy.body":
      "Track your dynasty history, rivalries, hall of fame moments, and fantasy legacy.",
    "home.products.legacy.primary": "Open AllFantasy Legacy",
    "home.products.legacy.signIn": "Sign in",
    "home.products.legacy.signUp": "Sign up",

    "home.trade.title": "AI Trade Analyzer",
    "home.trade.body":
      "Instantly evaluate fantasy trades with AI-powered insights.",
    "home.trade.cta": "Try Trade Analyzer",
    "home.trade.note": "Keeps the current workflow exactly the same.",

    "home.trust.item1": "AI-powered fantasy analysis.",
    "home.trust.item2": "No passwords required for league imports.",
    "home.trust.item3": "Built for serious fantasy players.",

    "home.footer.nav.app": "Sports App",
    "home.footer.nav.bracket": "Bracket Challenge",
    "home.footer.nav.legacy": "Legacy",
    "home.footer.nav.trade": "Trade Analyzer",

    "home.demo.title": "How AllFantasy Helps You Win",
    "home.demo.subtitle":
      "Use AI tools to analyze trades, manage leagues, and dominate fantasy competitions.",
    "home.demo.card1.title": "AI Trade Analyzer",
    "home.demo.card1.body":
      "Instantly evaluate fantasy trades using AI-powered analysis.",
    "home.demo.card1.cta": "Try Trade Analyzer",
    "home.demo.card2.title": "Fantasy Sports App",
    "home.demo.card2.body":
      "Manage your roster, analyze players, and optimize your fantasy team.",
    "home.demo.card2.cta": "Open Sports App",
    "home.demo.card3.title": "Bracket Challenge",
    "home.demo.card3.body":
      "Create picks, compete with friends, and track tournament results.",
    "home.demo.card3.cta": "Join Bracket Challenge",

    "home.preview.title": "AI Trade Analyzer Preview",
    "home.preview.subtitle":
      "Instantly start evaluating fantasy trades with AI-powered insights.",
    "home.preview.teamA.label": "Team A receives",
    "home.preview.teamA.placeholder": "e.g., WR A. St. Brown, 2025 1st round pick",
    "home.preview.teamB.label": "Team B receives",
    "home.preview.teamB.placeholder": "e.g., RB B. Hall, 2026 2nd round pick",
    "home.preview.helper":
      "Use natural language or player names. The full analyzer will help interpret the details.",
    "home.preview.cta.primary": "Analyze Trade",
    "home.preview.cta.secondary": "Open Full Trade Analyzer",

    "home.section.legacy.title": "AllFantasy Legacy",
    "home.section.legacy.body":
      "Original AllFantasy experience for deep league history, trade reports, and legacy tools.",
    "home.section.legacy.cta": "Go to AllFantasy Legacy",

    "home.section.bracket.title": "NCAA Bracket Challenge",
    "home.section.bracket.body":
      "Build pools, invite friends, track standings, and use AI to stress‑test your bracket.",
    "home.section.bracket.signIn": "Sign in to Bracket",
    "home.section.bracket.signUp": "Sign up for Bracket",

    "home.section.app.title": "AllFantasy Sports App",
    "home.section.app.body":
      "Full fantasy co‑GM experience across leagues: trades, waivers, rankings, and league workflows.",
    "home.section.app.signIn": "Sign in to Sports App",
    "home.section.app.signUp": "Sign up for Sports App",
    "home.section.app.trade": "Open Trade Analyzer",

    "home.tools.title": "Popular Fantasy Tools",
    "home.tools.trade.title": "Trade Analyzer",
    "home.tools.trade.body": "Evaluate fantasy trades with AI grades and context-aware analysis.",
    "home.tools.trade.cta": "Open Trade Analyzer",
    "home.tools.mockDraft.title": "Mock Draft Simulator",
    "home.tools.mockDraft.body": "Run snake or auction mocks with AI-powered suggestions.",
    "home.tools.mockDraft.cta": "Start Mock Draft",
    "home.tools.waiver.title": "Waiver Wire Advisor",
    "home.tools.waiver.body": "Get pickup and lineup recommendations tuned to your league.",
    "home.tools.waiver.cta": "Open Waiver Advisor",
    "home.tools.draftAssistant.title": "AI Draft Assistant",
    "home.tools.draftAssistant.body": "Draft smarter with real-time rankings and strategy tips.",
    "home.tools.draftAssistant.cta": "Open Draft Assistant",
    "home.tools.matchup.title": "Matchup Simulator",
    "home.tools.matchup.body": "Simulate head-to-head and project scoring outcomes.",
    "home.tools.matchup.cta": "Open Matchup Simulator",
    "home.trending.title": "Trending Features",
    "home.trending.players": "Trending Players",
    "home.trending.strategies": "Draft Strategies",
    "home.trending.leaderboards": "Bracket Leaderboards",
    "home.quick.title": "Quick Tools",
    "home.quick.trade": "Jump to Trade Analyzer",
    "home.quick.mockDraft": "Start a Mock Draft",
    "home.quick.rankings": "View Power Rankings",
    "home.chimmy.title": "Meet Chimmy",
    "home.chimmy.body": "Your AI fantasy assistant that analyzes trades, drafts, waivers, and matchups in real time.",
    "home.chimmy.cta": "Ask Chimmy",
    "home.products.app.sports": "NFL, NBA, MLB, NHL, Soccer, NCAA",

    // Live bracket intel
    "bracket.live.title": "Live bracket intelligence",
    "bracket.live.loading": "Loading live updates…",
    "bracket.live.error": "Unable to load live bracket updates. Please try again.",
    "bracket.live.empty": "Live updates will appear here once tournament games are in progress.",
    "bracket.live.survival.label": "Bracket survival probability",
    "bracket.live.survival.alivePct": "Percent of picked teams still alive",
    "bracket.live.survival.championAlive": "Champion still alive",
    "bracket.live.survival.yes": "Yes",
    "bracket.live.survival.no": "No",
    "bracket.live.upset.title": "Upset watch",
    "bracket.live.upset.item": "#{{round}}: {{home}} vs {{away}}",

    // Bracket review page
    "bracket.review.page.title": "Bracket Review",
    "bracket.review.page.subtitle":
      "See how your bracket stacks up using simulations, risk context, upset exposure, uniqueness, and AI-supported explanation.",
    "bracket.review.missingEntry": "No bracket entry was provided to review.",
    "bracket.review.backToBracketHub": "Back to Bracket Hub",
    "bracket.review.back": "Back",

    "bracket.review.simulation.title": "Simulation results",

    "bracket.review.risk.title": "Risk analysis",
    "bracket.review.risk.score": "Risk score",
    "bracket.review.risk.level.low": "Lower-risk bracket",
    "bracket.review.risk.level.medium": "Balanced risk bracket",
    "bracket.review.risk.level.high": "High-variance bracket",
    "bracket.review.risk.level.unknown": "Risk profile unavailable",

    "bracket.review.health.title": "Bracket health",
    "bracket.review.health.loading": "Loading health…",
    "bracket.review.health.label": "overall health score",

    "bracket.review.upset.title": "Upset profile",
    "bracket.review.upset.total": "Total upsets picked",
    "bracket.review.upset.rate": "Upset rate",
    "bracket.review.upset.roundLabel.1": "Round 1",
    "bracket.review.upset.roundLabel.2": "Round 2",
    "bracket.review.upset.roundLabel.3": "Sweet 16",
    "bracket.review.upset.roundLabel.4": "Elite 8",
    "bracket.review.upset.roundLabel.5": "Final Four",
    "bracket.review.upset.roundLabel.6": "Championship",

    "bracket.review.uniqueness.title": "Bracket uniqueness",
    "bracket.review.uniqueness.score": "Uniqueness",
    "bracket.review.uniqueness.label.low": "More common build",
    "bracket.review.uniqueness.label.medium": "Moderately unique",
    "bracket.review.uniqueness.label.high": "Highly unique",
    "bracket.review.uniqueness.label.unknown": "Uniqueness unavailable",

    "bracket.review.champion.title": "Champion probability",
    "bracket.review.champion.pick": "Your champion",
    "bracket.review.champion.modelProb": "Model win probability",
    "bracket.review.champion.popularity": "Public pick rate",
    "bracket.review.champion.label.chalk": "Popular chalk",
    "bracket.review.champion.label.contrarian": "Contrarian pick",
    "bracket.review.champion.label.mixed": "Balanced mix",
    "bracket.review.popularityUniqueness.title": "Popularity & uniqueness",
    "bracket.review.upsetRate": "Upset rate",

    "bracket.review.ai.title": "AI strategic insights",
    "bracket.review.disclaimer":
      "Bracket Review uses simulation-based estimates and structured analytics. It highlights strengths, risks, and uniqueness; it does not guarantee any outcome.",

    // Bracket Intelligence dashboard
    "bracket.intel.dashboard.title": "Bracket Intelligence",
    "bracket.intel.dashboard.subtitle":
      "Live summary of your bracket’s health, remaining potential, simulation-based projections, and AI-supported insights.",
    "bracket.intel.dashboard.missingEntry": "No bracket entry was provided to analyze.",
    "bracket.intel.dashboard.error": "Unable to load bracket intelligence. Please try again.",
    "bracket.intel.dashboard.summary.rank": "Current rank",
    "bracket.intel.dashboard.summary.points": "Total points",
    "bracket.intel.dashboard.summary.correct": "Correct picks",
    "bracket.intel.dashboard.summary.remaining": "Remaining possible points",
    "bracket.intel.dashboard.health.title": "Bracket health",
    "bracket.intel.dashboard.health.status.strong": "Your bracket is in strong shape with meaningful upside remaining.",
    "bracket.intel.dashboard.health.status.stable": "Solid bracket with room to move based on remaining games.",
    "bracket.intel.dashboard.health.status.fragile": "Bracket is fragile; remaining games matter a lot.",
    "bracket.intel.dashboard.health.status.on_the_edge": "Bracket is on the edge; surviving paths are narrow.",
    "bracket.intel.dashboard.outcomes.title": "Finish range",
    "bracket.intel.dashboard.outcomes.best": "Best possible finish",
    "bracket.intel.dashboard.outcomes.worst": "Worst possible finish",
    "bracket.intel.dashboard.outcomes.likely": "Most likely finish range",
    "bracket.intel.dashboard.uniqueness.title": "Bracket uniqueness",
    "bracket.intel.dashboard.uniqueness.scoreLabel": "uniqueness score",
    "bracket.intel.dashboard.uniqueness.percentile": "More unique than",
    "bracket.intel.dashboard.uniqueness.helper":
      "Higher scores and percentiles indicate a more differentiated bracket compared with this pool.",
    "bracket.intel.dashboard.simulation.title": "League finish probabilities",
    "bracket.intel.dashboard.simulation.win": "Chance to win league:",
    "bracket.intel.dashboard.simulation.top3": "Estimated chance to finish top 3:",
    "bracket.intel.dashboard.simulation.top10": "Estimated chance to finish top 10:",
    "bracket.intel.dashboard.ai.title": "AI bracket insights",

    // Bracket social / competition
    "bracket.social.h2h.title": "Head-to-head vs league leader",
    "bracket.social.h2h.you": "You",
    "bracket.social.h2h.leader": "League leader",
    "bracket.social.h2h.error": "Unable to load head-to-head comparison.",
    "bracket.social.intel.openDashboard": "Open Bracket Intelligence",

    "home.hero.alreadyMember": "Already a member?",
    "home.hero.return": "Return to your experience",

    // Bracket intelligence - simulation
    "bracket.intel.actions.title": "Entry Actions",
    "bracket.intel.actions.backToPool": "Back to Pool",
    "bracket.intel.actions.openCoach": "Open AI Coach",
    "bracket.intel.actions.copyLink": "Copy Entry Link",
    "bracket.intel.simulate.title": "Tournament simulation",
    "bracket.intel.simulate.run": "Run tournament simulation",
    "bracket.intel.simulate.running": "Running simulation...",
    "bracket.intel.simulate.winChance": "Chance to win league",
    "bracket.intel.simulate.top5": "Chance to finish top 5",
    "bracket.intel.simulate.expectedRank": "Expected rank",
    "bracket.intel.simulate.note":
      "Simulation-based estimates only. They are not guarantees of any outcome.",
    "bracket.intel.simulate.error": "Unable to run simulation. Please try again.",

    // Massive leaderboard
    "bracket.leaderboard.title": "Leaderboard",
    "bracket.leaderboard.loading": "Loading leaderboard…",
    "bracket.leaderboard.empty": "No entries to display yet.",
    "bracket.leaderboard.error": "Unable to load leaderboard.",
    "bracket.leaderboard.unknownUser": "Unknown manager",

    // Tournament chaos meter
    "bracket.chaos.title": "Tournament Chaos Meter",
    "bracket.chaos.loading": "Measuring chaos…",
    "bracket.chaos.empty": "Chaos data is not available yet.",
    "bracket.chaos.error": "Unable to load chaos score.",
    "bracket.chaos.scoreLabel": "overall chaos score",
    "bracket.chaos.label.predictable": "So far, this tournament has been fairly predictable.",
    "bracket.chaos.label.moderate": "Some surprises, but the bracket is still mostly on script.",
    "bracket.chaos.label.high": "This tournament has had plenty of chaos and unexpected results.",
    "bracket.chaos.label.madness": "Full-blown March Madness — massive upsets and wild swings everywhere.",

    // Bracket intelligence - review
    "bracket.intel.review.title": "Analyze my bracket",
    "bracket.intel.review.run": "Run bracket review",
    "bracket.intel.review.running": "Reviewing...",
    "bracket.intel.review.strengths": "Bracket strengths",
    "bracket.intel.review.risks": "Potential risks",
    "bracket.intel.review.strategy": "Strategy notes",
    "bracket.intel.review.note":
      "This review highlights bracket context and risk; it does not guarantee results.",
    "bracket.intel.review.error": "Unable to analyze bracket. Please try again.",
    "bracket.intel.review.metrics.uniqueness": "Uniqueness",
    "bracket.intel.review.metrics.upsetRate": "Upset exposure",
    "bracket.intel.review.metrics.championPopularity": "Champion popularity",

    // Bracket entry submission
    "bracket.entry.submit.cta": "Submit bracket",
    "bracket.entry.submit.loading": "Submitting...",
    "bracket.entry.submit.success": "Bracket submitted. It will lock at tip-off.",
    "bracket.entry.submit.error":
      "Unable to submit bracket. Please check your picks and try again.",

    // Bracket status labels
    "bracket.status.draft": "Draft",
    "bracket.status.submitted": "Submitted",
    "bracket.status.locked": "Locked",
    "bracket.status.scored": "Scored",
    "bracket.status.invalidated": "Invalidated",

    // Auth - login
    "auth.login.title": "Welcome back",
    "auth.login.subtitle":
      "Sign in once to access WebApp, Bracket, and Legacy.",
    "auth.login.emailOrUsername": "Email or Username",
    "auth.login.password": "Password",
    "auth.login.forgotPassword": "Forgot password?",
    "auth.login.primaryCta": "Sign In",
    "auth.login.orWith": "or sign in with",
    "auth.login.sleeperLabel": "Sleeper Username",
    "auth.login.sleeperCta": "Sign in with Sleeper",
    "auth.login.noAccount": "Don’t have an account?",
    "auth.login.goToSignup": "Sign up",

    // Auth - signup
    "auth.signup.title": "Create your account",
    "auth.signup.subtitle":
      "Join the AI-powered fantasy sports platform.",
    "auth.signup.username": "Username *",
    "auth.signup.displayName": "Display Name",
    "auth.signup.email": "Email *",
    "auth.signup.password": "Password *",
    "auth.signup.passwordConfirm": "Confirm Password *",
    "auth.signup.timezone": "Timezone",
    "auth.signup.language": "Language",
    "auth.signup.profileImage": "Profile Image (placeholder)",
    "auth.signup.phoneLabel": "Phone",
    "auth.signup.verificationMethod": "Verification method",
    "auth.signup.verify.email": "Email",
    "auth.signup.verify.phone": "Phone",
    "auth.signup.ageConfirm":
      "I confirm that I am 18 years of age or older. *",
    "auth.signup.primaryCta": "Create Account",
    "auth.signup.haveAccount": "Already have an account?",
    "auth.signup.goToLogin": "Sign in",

    // Legacy landing
    "legacy.landing.title": "The original AllFantasy experience.",
    "legacy.landing.subtitle": "Deep league history, legacy reports, and classic tools.",
    "legacy.landing.body":
      "AllFantasy Legacy is where the platform started — long-run league history, deep career breakdowns, and tools built for power users who have been grinding fantasy for years.",
    "legacy.landing.primaryCta": "Go to AllFantasy Legacy",
    "legacy.landing.secondaryCta": "Sign in to Legacy",

    // Bracket landing
    "bracket.landing.title": "AllFantasy NCAA Bracket Challenge.",
    "bracket.landing.subtitle": "Build pools, invite friends, and follow the chaos.",
    "bracket.landing.body":
      "Create private pools, join public contests, track live standings, and let AI help pressure-test your bracket before tip-off.",
    "bracket.landing.signIn": "Sign in to Bracket Challenge",
    "bracket.landing.signUp": "Sign up for Bracket Challenge",
    "bracket.landing.secondaryLink": "Open Bracket Hub",

    // App landing
    "app.landing.title": "Your AI co‑GM for every league.",
    "app.landing.subtitle": "Trades, waivers, rankings, and league workflows in one place.",
    "app.landing.body":
      "The AllFantasy Sports App is the main product experience — connect leagues, run AI trade checks, manage rosters, and get week-to-week recommendations.",
    "app.landing.signIn": "Sign in to Sports App",
    "app.landing.signUp": "Sign up for Sports App",
    "app.landing.continue": "Open Sports App",
    "app.landing.feature.trades": "AI trade analyzer with context-aware grades.",
    "app.landing.feature.waivers": "Waiver and lineup help tuned to your league.",
    "app.landing.feature.workflows": "League and roster workflows built for serious players.",

    // App page sections
    "app.page.hero.h1": "AllFantasy Sports App",
    "app.page.hero.subtitle":
      "AI-powered fantasy sports tools to analyze trades, manage teams, and dominate your leagues.",
    "app.page.hero.supporting":
      "AllFantasy combines powerful analytics, fantasy insights, and AI-powered decision tools in one platform.",
    "app.page.hero.cta.signup": "Sign Up for Sports App",
    "app.page.hero.cta.signin": "Sign In",
    "app.page.hero.cta.trade": "Try Trade Analyzer",

    "app.page.features.title": "Core tools inside the Sports App",
    "app.page.features.trade.title": "AI Trade Analyzer",
    "app.page.features.trade.body": "Evaluate fantasy trades instantly using AI-driven grades and context.",
    "app.page.features.roster.title": "Roster Insights",
    "app.page.features.roster.body": "See which moves help your lineup most each week.",
    "app.page.features.league.title": "League Management",
    "app.page.features.league.body": "Track leagues, teams, and key activity from one place.",
    "app.page.features.player.title": "Player Analysis",
    "app.page.features.player.body": "Compare players and trends across your favorite formats.",

    "app.page.demo.title": "What the Sports App looks like",
    "app.page.demo.subtitle":
      "Preview how trade analysis, rosters, and player insights come together in one experience.",

    "app.page.ai.title": "AI-Powered Fantasy Insights",
    "app.page.ai.trade.title": "Trade Evaluation",
    "app.page.ai.trade.body":
      "Run trades through AI to understand fairness, risk, and long-term impact.",
    "app.page.ai.compare.title": "Player Comparison",
    "app.page.ai.compare.body":
      "Quickly compare players by role, usage, and long-run outlook.",
    "app.page.ai.lineup.title": "Lineup Optimization",
    "app.page.ai.lineup.body":
      "Get AI suggestions for start/sit calls and waiver priorities.",

    "app.page.sports.title": "Supported Fantasy Sports",
    "app.page.sports.helper":
      "AllFantasy is built to support multi-sport fantasy players across the major formats.",

    "app.page.cta.title": "Ready to improve your fantasy strategy?",
    "app.page.cta.subtitle":
      "Join the AllFantasy Sports App and start using AI-powered tools for every league.",
    "app.page.cta.primary": "Create Your Account",
    "app.page.cta.secondary": "Open Trade Analyzer",

    // Trade analyzer landing
    "trade.landing.title": "Fantasy trade analyzer that actually understands your league.",
    "trade.landing.subtitle": "Stop arguing in the group chat. Show the receipts.",
    "trade.landing.body":
      "AllFantasy’s trade analyzer turns players and picks into deterministic grades, explanations, and counter-offer ideas in under a minute.",
    "trade.landing.openAnalyzer": "Open Trade Analyzer",
    "trade.landing.signIn": "Sign in",
    "trade.landing.signUp": "Sign up",
    "trade.landing.feature.grades": "Deterministic letter grades instead of vibes.",
    "trade.landing.feature.context": "Considers lineup impact, replacement value, and league context.",
    "trade.landing.feature.counter": "Suggests smarter counters so you don’t leave value on the table.",

    // Trade analyzer page sections
    "trade.page.hero.h1": "AI Fantasy Trade Analyzer",
    "trade.page.hero.subtitle":
      "Evaluate fantasy trades with AI-powered insights and make smarter roster decisions.",
    "trade.page.hero.supporting":
      "Use AllFantasy to analyze trade value, compare assets, and get a clearer view of whether a deal helps your team.",
    "trade.page.hero.cta.analyze": "Analyze a Trade",
    "trade.page.hero.cta.signup": "Sign Up",
    "trade.page.hero.cta.app": "Open Sports App",

    "trade.page.entry.title": "Start a trade evaluation",
    "trade.page.entry.body":
      "Describe both sides of your trade and jump straight into the analyzer. No complicated setup required.",

    "trade.page.how.title": "How the Trade Analyzer Works",
    "trade.page.how.step1.title": "Enter your trade",
    "trade.page.how.step1.body": "Add the players, picks, and assets involved on each side.",
    "trade.page.how.step2.title": "Get AI insights",
    "trade.page.how.step2.body": "Review AI-powered grades, context, and risks for each team.",
    "trade.page.how.step3.title": "Make smarter decisions",
    "trade.page.how.step3.body": "Use the analysis to decide if the trade helps your roster and league.",

    "trade.page.benefits.title": "Why use AllFantasy Trade Analyzer",
    "trade.page.benefits.card1.title": "AI-powered analysis",
    "trade.page.benefits.card1.body":
      "Get intelligent trade feedback faster than arguing in the group chat.",
    "trade.page.benefits.card2.title": "Clearer trade decisions",
    "trade.page.benefits.card2.body":
      "Understand whether a move improves your team in both the short and long term.",
    "trade.page.benefits.card3.title": "Built for fantasy players",
    "trade.page.benefits.card3.body":
      "Use a tool designed for real leagues, rosters, and keeper/dynasty formats.",
    "trade.page.benefits.card4.title": "Fast and easy to use",
    "trade.page.benefits.card4.body":
      "Start evaluating trades in just a few clicks, no spreadsheets required.",

    "trade.page.sports.title": "Supported Fantasy Sports",
    "trade.page.sports.helper":
      "Use the Trade Analyzer across your favorite fantasy sports formats.",

    "trade.page.trust.title": "Built to support smarter fantasy trading",
    "trade.page.trust.item1": "AI-powered fantasy analysis tuned for real leagues.",
    "trade.page.trust.item2": "Focused on helping serious fantasy players find an edge.",
    "trade.page.trust.item3": "Designed to slot into your existing league and chat workflows.",

    "trade.page.cta.title": "Ready to evaluate your next fantasy trade?",
    "trade.page.cta.subtitle":
      "Use the AllFantasy Trade Analyzer to get clearer answers before you hit accept.",
    "trade.page.cta.primary": "Analyze a Trade",
    "trade.page.cta.secondary": "Create Your Account",

    // Bracket page sections
    "bracket.page.hero.h1": "AllFantasy NCAA Bracket Challenge",
    "bracket.page.hero.subtitle":
      "Build your bracket, get AI-powered insights, and compete with smarter tournament picks.",
    "bracket.page.hero.supporting":
      "Use AllFantasy to create brackets, import tournament teams, track matchups, and get AI help making better selections.",
    "bracket.page.hero.cta.create": "Create a Bracket",
    "bracket.page.hero.cta.join": "Join Bracket Challenge",
    "bracket.page.hero.cta.signIn": "Sign In",
    "bracket.page.hero.cta.signUp": "Sign Up",
    "bracket.page.hero.cta.app": "Open Sports App",

    "bracket.page.entry.title": "Start your bracket",
    "bracket.page.entry.card.create.title": "Create New Bracket",
    "bracket.page.entry.card.create.body":
      "Start a fresh NCAA bracket and make your picks round by round.",
    "bracket.page.entry.card.create.cta": "Create Bracket",
    "bracket.page.entry.card.join.title": "Join Existing Bracket",
    "bracket.page.entry.card.join.body":
      "Enter a bracket challenge and compete with friends, leagues, or your office.",
    "bracket.page.entry.card.join.cta": "Join a Bracket",
    "bracket.page.entry.card.ai.title": "Use AI Bracket Help",
    "bracket.page.entry.card.ai.body":
      "Let AI suggest safer paths, upset darts, and bracket strategies.",
    "bracket.page.entry.card.ai.cta": "Try AI Bracket Help",

    "bracket.page.how.title": "How the Bracket Challenge Works",
    "bracket.page.how.step1.title": "Load tournament teams",
    "bracket.page.how.step1.body":
      "Import or populate the official NCAA tournament teams into your bracket.",
    "bracket.page.how.step2.title": "Build your picks",
    "bracket.page.how.step2.body":
      "Fill out your bracket round by round and lock in your predictions.",
    "bracket.page.how.step3.title": "Use AI insights",
    "bracket.page.how.step3.body":
      "Lean on AI for matchup context, upset alerts, and path analysis.",

    "bracket.page.ai.title": "AI Bracket Assistant",
    "bracket.page.ai.body":
      "AllFantasy’s AI Bracket Assistant helps you pressure-test upsets, explore chalk paths, and understand how each pick shapes your tournament outcome.",
    "bracket.page.ai.feature.matchup": "Matchup insights",
    "bracket.page.ai.feature.matchup.body":
      "See AI notes on key matchups, style clashes, and late-game risk.",
    "bracket.page.ai.feature.upset": "Upset alerts",
    "bracket.page.ai.feature.upset.body":
      "Spot high-upside upset spots without punting your whole bracket.",
    "bracket.page.ai.feature.strategy": "Strategy profiles",
    "bracket.page.ai.feature.strategy.body":
      "Lean safe, balanced, or upset-heavy based on how you want to play.",
    "bracket.page.ai.cta": "Try AI Bracket Help",

    "bracket.page.teams.title": "Team import & bracket population",
    "bracket.page.teams.body":
      "AllFantasy supports loading official NCAA tournament teams into structured bracket trees, so picks stay aligned with real matchups and regions.",
    "bracket.page.teams.item1": "Seeded team slots by region and round.",
    "bracket.page.teams.item2": "Support for play-in games and updated matchups.",
    "bracket.page.teams.item3": "Data model built for yearly tournament updates.",
    "bracket.page.teams.cta": "Open Bracket Hub",

    "bracket.page.benefits.title": "Why use AllFantasy for brackets",
    "bracket.page.benefits.card1.title": "AI-powered picks",
    "bracket.page.benefits.card1.body":
      "Get smarter bracket insights before you lock your selections.",
    "bracket.page.benefits.card2.title": "Clean team import",
    "bracket.page.benefits.card2.body":
      "Load tournament teams into the bracket quickly and accurately.",
    "bracket.page.benefits.card3.title": "Competitive bracket experience",
    "bracket.page.benefits.card3.body":
      "Create, join, and track bracket contests with pools built for real groups.",
    "bracket.page.benefits.card4.title": "Built for fast decisions",
    "bracket.page.benefits.card4.body":
      "Move from team loading to bracket creation in just a few steps.",

    // Bracket AI assistant – shared labels
    "bracket.ai.confidence.low": "Low",
    "bracket.ai.confidence.medium": "Medium",
    "bracket.ai.confidence.high": "High",
    "bracket.ai.style.safe": "Safe",
    "bracket.ai.style.balanced": "Balanced",
    "bracket.ai.style.upsetHeavy": "Upset-aware",
    "bracket.ai.style.chaos": "High-variance",

    // Bracket AI – Pick wizard
    "bracket.ai.wizard.loading": "Loading AI analysis…",
    "bracket.ai.wizard.analysis.title": "AI Matchup Insights",
    "bracket.ai.wizard.analysis.confidenceShort": "conf",
    "bracket.ai.wizard.analysis.keyFactors": "Key factors",
    "bracket.ai.wizard.analysis.suggestedLean": "Suggested lean",
    "bracket.ai.wizard.analysis.confidenceLabel": "Confidence",
    "bracket.ai.wizard.analysis.upsetWatch": "Upset watch",
    "bracket.ai.wizard.analysis.sources": "Context and references",
    "bracket.ai.wizard.recommendation.title": "AI Pick Analysis",
    "bracket.ai.wizard.recommendation.recommended": "Recommended direction",
    "bracket.ai.wizard.recommendation.leverage": "Leverage-oriented angle",
    "bracket.ai.wizard.recommendation.confidence": "Strategy confidence",

    // Bracket AI – Pick assist sidebar
    "bracket.ai.pickAssist.title": "AI Matchup Insights",
    "bracket.ai.pickAssist.subtitleIdle":
      "Analyze unpicked matchups using current signals.",
    "bracket.ai.pickAssist.subtitleActive":
      "Updated AI suggestions based on your pool.",
    "bracket.ai.pickAssist.button.analyze": "Analyze",
    "bracket.ai.pickAssist.button.refresh": "Refresh",
    "bracket.ai.pickAssist.button.loading": "Analyzing…",
    "bracket.ai.pickAssist.emptyHelper":
      "Use AI to scan unpicked matchups for win-probability leans and potential upset spots. Final choices are always yours.",
    "bracket.ai.pickAssist.upsetStrip": "Upset opportunities detected",

    "bracket.page.cta.title": "Ready to build your bracket?",
    "bracket.page.cta.subtitle":
      "Create your NCAA bracket, get AI support on key matchups, and track how your picks hold up.",
    "bracket.page.cta.primary": "Create Your Bracket",
    "bracket.page.cta.secondary": "Try AI Bracket Help",
  },
  es: {
    // Common
    "common.language": "Idioma",
    "common.english": "Inglés",
    "common.spanish": "Español",
    "common.signIn": "Iniciar sesión",
    "common.signUp": "Crear cuenta",

    // Homepage
    "home.tagline": "IA de fantasy sports para jugadores de verdad.",
    "home.title": "Herramientas de fantasy con IA",
    "home.subtitle":
      "Analiza traspasos, gestiona ligas, domina brackets y toma mejores decisiones de fantasy.",
    "home.featureSummary":
      "AllFantasy te da un solo lugar para herramientas de fantasy, insights con IA, concursos de brackets y experiencias legacy.",

    "home.hero.cta.primary": "Empezar",
    "home.hero.cta.secondary": "Ver planes",
    "home.hero.cta.app": "Abrir Sports App",
    "home.hero.cta.bracket": "Desafío de Bracket NCAA",
    "home.hero.cta.legacy": "Abrir AllFantasy Legacy",
    "home.hero.tradeTeaser": "O ir directo al Analizador de Traspasos →",

    "home.products.heading": "Elige tu camino en AllFantasy",

    "home.products.app.title": "AllFantasy Sports App",
    "home.products.app.body":
      "Herramientas de fantasy con IA para rosters, ligas, insights de jugadores y análisis de traspasos.",
    "home.products.app.primary": "Abrir Sports App",
    "home.products.app.signIn": "Iniciar sesión",
    "home.products.app.signUp": "Crear cuenta",

    "home.products.bracket.title": "Desafío AllFantasy NCAA Bracket",
    "home.products.bracket.body":
      "Crea picks, compite en concursos de brackets y sigue tu experiencia del torneo.",
    "home.products.bracket.primary": "Abrir NCAA Bracket Challenge",
    "home.products.bracket.signIn": "Iniciar sesión",
    "home.products.bracket.signUp": "Crear cuenta",

    "home.products.legacy.title": "AllFantasy Legacy",
    "home.products.legacy.body":
      "Rastrea tu historial de dinastía, rivalidades, momentos del salón de la fama y tu legado de fantasía.",
    "home.products.legacy.primary": "Abrir AllFantasy Legacy",
    "home.products.legacy.signIn": "Iniciar sesión",
    "home.products.legacy.signUp": "Crear cuenta",

    "home.trade.title": "AI Trade Analyzer",
    "home.trade.body":
      "Evalúa traspasos de fantasy al instante con insights de IA.",
    "home.trade.cta": "Probar Trade Analyzer",
    "home.trade.note": "Mantiene el flujo actual exactamente igual.",

    "home.trust.item1": "Análisis de fantasy impulsado por IA.",
    "home.trust.item2": "Sin contraseñas necesarias para importar ligas.",
    "home.trust.item3": "Diseñado para jugadores de fantasy competitivos.",

    "home.footer.nav.app": "Sports App",
    "home.footer.nav.bracket": "Bracket Challenge",
    "home.footer.nav.legacy": "Legacy",
    "home.footer.nav.trade": "Trade Analyzer",

    "home.demo.title": "Cómo te ayuda AllFantasy a ganar",
    "home.demo.subtitle":
      "Usa herramientas con IA para analizar traspasos, gestionar ligas y dominar competiciones de fantasy.",
    "home.demo.card1.title": "AI Trade Analyzer",
    "home.demo.card1.body":
      "Evalúa traspasos de fantasy al instante con análisis impulsados por IA.",
    "home.demo.card1.cta": "Probar Trade Analyzer",
    "home.demo.card2.title": "Fantasy Sports App",
    "home.demo.card2.body":
      "Gestiona tu roster, analiza jugadores y optimiza tu equipo de fantasy.",
    "home.demo.card2.cta": "Abrir Sports App",
    "home.demo.card3.title": "Bracket Challenge",
    "home.demo.card3.body":
      "Crea picks, compite con amigos y sigue los resultados del torneo.",
    "home.demo.card3.cta": "Unirse al Bracket Challenge",

    "home.preview.title": "Vista previa del AI Trade Analyzer",
    "home.preview.subtitle":
      "Empieza a evaluar traspasos de fantasy al instante con insights impulsados por IA.",
    "home.preview.teamA.label": "Equipo A recibe",
    "home.preview.teamA.placeholder": "ej., WR A. St. Brown, pick de 1ª ronda 2025",
    "home.preview.teamB.label": "Equipo B recibe",
    "home.preview.teamB.placeholder": "ej., RB B. Hall, pick de 2ª ronda 2026",
    "home.preview.helper":
      "Puedes usar lenguaje natural o nombres de jugadores. El analizador completo interpretará los detalles.",
    "home.preview.cta.primary": "Analizar traspaso",
    "home.preview.cta.secondary": "Abrir Trade Analyzer completo",

    "home.section.legacy.title": "AllFantasy Legacy",
    "home.section.legacy.body":
      "La experiencia original de AllFantasy para historial profundo de ligas, reportes de traspasos y herramientas legacy.",
    "home.section.legacy.cta": "Ir a AllFantasy Legacy",

    "home.section.bracket.title": "Desafío NCAA Bracket",
    "home.section.bracket.body":
      "Crea pools, invita amigos, sigue posiciones y usa IA para poner a prueba tu bracket.",
    "home.section.bracket.signIn": "Entrar al Bracket",
    "home.section.bracket.signUp": "Registrarse para Bracket",

    "home.section.app.title": "AllFantasy Sports App",
    "home.section.app.body":
      "Experiencia completa de co‑GM: traspasos, waivers, rankings y flujos de liga.",
    "home.section.app.signIn": "Entrar a Sports App",
    "home.section.app.signUp": "Registrarse en Sports App",
    "home.section.app.trade": "Abrir Trade Analyzer",

    "home.tools.title": "Herramientas de fantasía populares",
    "home.tools.trade.title": "Trade Analyzer",
    "home.tools.trade.body": "Evalúa trades con calificaciones IA y análisis contextual.",
    "home.tools.trade.cta": "Abrir Trade Analyzer",
    "home.tools.mockDraft.title": "Simulador de mock draft",
    "home.tools.mockDraft.body": "Haz mocks snake o subasta con sugerencias IA.",
    "home.tools.mockDraft.cta": "Empezar mock draft",
    "home.tools.waiver.title": "Asesor de waivers",
    "home.tools.waiver.body": "Recomendaciones de pickups y alineación para tu liga.",
    "home.tools.waiver.cta": "Abrir Waiver Advisor",
    "home.tools.draftAssistant.title": "Asistente de draft con IA",
    "home.tools.draftAssistant.body": "Draft más inteligente con rankings y consejos en tiempo real.",
    "home.tools.draftAssistant.cta": "Abrir Draft Assistant",
    "home.tools.matchup.title": "Simulador de enfrentamientos",
    "home.tools.matchup.body": "Simula cara a cara y proyecciones de puntuación.",
    "home.tools.matchup.cta": "Abrir Matchup Simulator",
    "home.trending.title": "Tendencias",
    "home.trending.players": "Jugadores en tendencia",
    "home.trending.strategies": "Estrategias de draft",
    "home.trending.leaderboards": "Clasificación de brackets",
    "home.quick.title": "Accesos rápidos",
    "home.quick.trade": "Ir al Trade Analyzer",
    "home.quick.mockDraft": "Empezar mock draft",
    "home.quick.rankings": "Ver Power Rankings",
    "home.chimmy.title": "Conoce a Chimmy",
    "home.chimmy.body": "Tu asistente de fantasía con IA que analiza trades, drafts, waivers y enfrentamientos en tiempo real.",
    "home.chimmy.cta": "Preguntar a Chimmy",
    "home.products.app.sports": "NFL, NBA, MLB, NHL, Soccer, NCAA",

    "home.hero.alreadyMember": "¿Ya tienes cuenta?",
    "home.hero.return": "Volver a tu experiencia",

    // Bracket intelligence - simulation
    "bracket.intel.actions.title": "Acciones de tu bracket",
    "bracket.intel.actions.backToPool": "Volver al pool",
    "bracket.intel.actions.openCoach": "Abrir AI Coach",
    "bracket.intel.actions.copyLink": "Copiar enlace del bracket",
    "bracket.intel.simulate.title": "Simulación del torneo",
    "bracket.intel.simulate.run": "Ejecutar simulación",
    "bracket.intel.simulate.running": "Ejecutando simulación...",
    "bracket.intel.simulate.winChance": "Probabilidad de ganar la liga",
    "bracket.intel.simulate.top5": "Probabilidad de terminar en top 5",
    "bracket.intel.simulate.expectedRank": "Posición esperada",
    "bracket.intel.simulate.note":
      "Estimaciones basadas en simulación. No son garantías de ningún resultado.",
    "bracket.intel.simulate.error": "No se pudo ejecutar la simulación. Inténtalo de nuevo.",

    // Massive leaderboard
    "bracket.leaderboard.title": "Tabla de posiciones",
    "bracket.leaderboard.loading": "Cargando tabla de posiciones…",
    "bracket.leaderboard.empty": "Todavía no hay entradas para mostrar.",
    "bracket.leaderboard.error": "No se pudo cargar la tabla de posiciones.",
    "bracket.leaderboard.unknownUser": "Manager desconocido",

    // Tournament chaos meter
    "bracket.chaos.title": "Índice de caos del torneo",
    "bracket.chaos.loading": "Midiendo el caos…",
    "bracket.chaos.empty": "Aún no hay datos de caos disponibles.",
    "bracket.chaos.error": "No se pudo cargar el índice de caos.",
    "bracket.chaos.scoreLabel": "puntaje global de caos",
    "bracket.chaos.label.predictable": "Hasta ahora, este torneo ha sido bastante predecible.",
    "bracket.chaos.label.moderate": "Algunas sorpresas, pero el cuadro sigue más o menos según el guion.",
    "bracket.chaos.label.high": "Este torneo ha tenido bastante caos y resultados inesperados.",
    "bracket.chaos.label.madness": "Caos total de March Madness: upsets gigantes y giros salvajes por todos lados.",

    // Bracket intelligence - review
    "bracket.intel.review.title": "Analizar mi bracket",
    "bracket.intel.review.run": "Ejecutar análisis",
    "bracket.intel.review.running": "Analizando...",
    "bracket.intel.review.strengths": "Fortalezas del bracket",
    "bracket.intel.review.risks": "Riesgos potenciales",
    "bracket.intel.review.strategy": "Notas de estrategia",
    "bracket.intel.review.note":
      "Este análisis resalta contexto y riesgo; no garantiza resultados.",
    "bracket.intel.review.error": "No se pudo analizar el bracket. Inténtalo de nuevo.",
    "bracket.intel.review.metrics.uniqueness": "Singularidad",
    "bracket.intel.review.metrics.upsetRate": "Exposición a upsets",
    "bracket.intel.review.metrics.championPopularity": "Popularidad del campeón",

    // Bracket entry submission
    "bracket.entry.submit.cta": "Enviar bracket",
    "bracket.entry.submit.loading": "Enviando...",
    "bracket.entry.submit.success": "Bracket enviado. Se bloqueará al inicio del torneo.",
    "bracket.entry.submit.error":
      "No se pudo enviar el bracket. Revisa tus picks e inténtalo de nuevo.",

    // Bracket status labels
    "bracket.status.draft": "Borrador",
    "bracket.status.submitted": "Enviado",
    "bracket.status.locked": "Bloqueado",
    "bracket.status.scored": "Puntuado",
    "bracket.status.invalidated": "Invalidado",

    // Bracket review page
    "bracket.review.page.title": "Análisis de bracket",
    "bracket.review.page.subtitle":
      "Revisa cómo se comporta tu bracket con simulaciones, contexto de riesgo, exposición a upsets, singularidad y explicación asistida por IA.",
    "bracket.review.missingEntry": "No se proporcionó un bracket para analizar.",
    "bracket.review.backToBracketHub": "Volver al Bracket Hub",
    "bracket.review.back": "Volver",

    "bracket.review.simulation.title": "Resultados de simulación",

    "bracket.review.risk.title": "Análisis de riesgo",
    "bracket.review.risk.score": "Puntaje de riesgo",
    "bracket.review.risk.level.low": "Bracket de menor riesgo",
    "bracket.review.risk.level.medium": "Bracket con riesgo equilibrado",
    "bracket.review.risk.level.high": "Bracket de alta varianza",
    "bracket.review.risk.level.unknown": "Perfil de riesgo no disponible",

    "bracket.review.upset.title": "Perfil de upsets",
    "bracket.review.upset.total": "Upsets totales seleccionados",
    "bracket.review.upset.rate": "Tasa de upsets",
    "bracket.review.upset.roundLabel.1": "Ronda 1",
    "bracket.review.upset.roundLabel.2": "Ronda 2",
    "bracket.review.upset.roundLabel.3": "Sweet 16",
    "bracket.review.upset.roundLabel.4": "Elite 8",
    "bracket.review.upset.roundLabel.5": "Final Four",
    "bracket.review.upset.roundLabel.6": "Campeonato",

    "bracket.review.uniqueness.title": "Singularidad del bracket",
    "bracket.review.uniqueness.score": "Singularidad",
    "bracket.review.uniqueness.label.low": "Construcción más común",
    "bracket.review.uniqueness.label.medium": "Moderadamente singular",
    "bracket.review.uniqueness.label.high": "Muy singular",
    "bracket.review.uniqueness.label.unknown": "Singularidad no disponible",

    "bracket.review.champion.title": "Probabilidad del campeón",
    "bracket.review.champion.pick": "Tu campeón",
    "bracket.review.champion.modelProb": "Probabilidad de título según el modelo",
    "bracket.review.champion.popularity": "Porcentaje de brackets que lo eligen",
    "bracket.review.champion.label.chalk": "Favorito popular",
    "bracket.review.champion.label.contrarian": "Pick contracorriente",
    "bracket.review.champion.label.mixed": "Equilibrado",
    "bracket.review.popularityUniqueness.title": "Popularidad y unicidad",
    "bracket.review.upsetRate": "Tasa de upsets",

    "bracket.review.health.title": "Salud del bracket",
    "bracket.review.health.loading": "Cargando salud…",
    "bracket.review.health.label": "puntaje de salud general",

    "bracket.review.ai.title": "Notas estratégicas de IA",
    "bracket.review.disclaimer":
      "Bracket Review usa estimaciones basadas en simulación y analítica estructurada. Destaca fortalezas, riesgos y singularidad; no garantiza ningún resultado.",

    // Bracket Intelligence dashboard
    "bracket.intel.dashboard.title": "Inteligencia del bracket",
    "bracket.intel.dashboard.subtitle":
      "Resumen en vivo del estado de tu bracket, potencial restante, proyecciones basadas en simulación y notas asistidas por IA.",
    "bracket.intel.dashboard.missingEntry": "No se proporcionó un bracket para analizar.",
    "bracket.intel.dashboard.error": "No se pudo cargar la inteligencia del bracket. Inténtalo de nuevo.",
    "bracket.intel.dashboard.summary.rank": "Posición actual",
    "bracket.intel.dashboard.summary.points": "Puntos totales",
    "bracket.intel.dashboard.summary.correct": "Picks correctos",
    "bracket.intel.dashboard.summary.remaining": "Puntos posibles restantes",
    "bracket.intel.dashboard.health.title": "Salud del bracket",
    "bracket.intel.dashboard.health.status.strong":
      "Tu bracket está en buena forma y aún tiene upside significativo.",
    "bracket.intel.dashboard.health.status.stable":
      "Bracket sólido con margen para moverse según los partidos restantes.",
    "bracket.intel.dashboard.health.status.fragile":
      "El bracket es frágil; los partidos que quedan importan mucho.",
    "bracket.intel.dashboard.health.status.on_the_edge":
      "El bracket está al límite; los caminos de supervivencia son estrechos.",
    "bracket.intel.dashboard.outcomes.title": "Rango de posición final",
    "bracket.intel.dashboard.outcomes.best": "Mejor posición posible",
    "bracket.intel.dashboard.outcomes.worst": "Peor posición posible",
    "bracket.intel.dashboard.outcomes.likely": "Rango de posición más probable",
    "bracket.intel.dashboard.uniqueness.title": "Singularidad del bracket",
    "bracket.intel.dashboard.uniqueness.scoreLabel": "puntaje de singularidad",
    "bracket.intel.dashboard.uniqueness.percentile": "Más singular que",
    "bracket.intel.dashboard.uniqueness.helper":
      "Los puntajes y percentiles más altos indican un bracket más diferenciado frente a este grupo.",
    "bracket.intel.dashboard.simulation.title": "Probabilidades en la liga",
    "bracket.intel.dashboard.simulation.win": "Probabilidad de ganar la liga:",
    "bracket.intel.dashboard.simulation.top3": "Probabilidad estimada de terminar en top 3:",
    "bracket.intel.dashboard.simulation.top10": "Probabilidad estimada de terminar en top 10:",
    "bracket.intel.dashboard.ai.title": "Insights de IA sobre tu bracket",

    // Bracket social / competition
    "bracket.social.h2h.title": "Cara a cara vs líder de la liga",
    "bracket.social.h2h.you": "Tú",
    "bracket.social.h2h.leader": "Líder de la liga",
    "bracket.social.h2h.error": "No se pudo cargar la comparación cara a cara.",
    "bracket.social.intel.openDashboard": "Abrir Bracket Intelligence",

    // Auth - login
    "auth.login.title": "Bienvenido de nuevo",
    "auth.login.subtitle":
      "Inicia sesión una vez para usar WebApp, Bracket y Legacy.",
    "auth.login.emailOrUsername": "Correo o usuario",
    "auth.login.password": "Contraseña",
    "auth.login.forgotPassword": "¿Olvidaste tu contraseña?",
    "auth.login.primaryCta": "Iniciar sesión",
    "auth.login.orWith": "o entra con",
    "auth.login.sleeperLabel": "Usuario de Sleeper",
    "auth.login.sleeperCta": "Entrar con Sleeper",
    "auth.login.noAccount": "¿No tienes cuenta?",
    "auth.login.goToSignup": "Regístrate",

    // Auth - signup
    "auth.signup.title": "Crea tu cuenta",
    "auth.signup.subtitle":
      "Únete a la plataforma de fantasy con IA.",
    "auth.signup.username": "Usuario *",
    "auth.signup.displayName": "Nombre para mostrar",
    "auth.signup.email": "Correo electrónico *",
    "auth.signup.password": "Contraseña *",
    "auth.signup.passwordConfirm": "Confirmar contraseña *",
    "auth.signup.timezone": "Zona horaria",
    "auth.signup.language": "Idioma",
    "auth.signup.profileImage": "Imagen de perfil (placeholder)",
    "auth.signup.phoneLabel": "Teléfono",
    "auth.signup.verificationMethod": "Método de verificación",
    "auth.signup.verify.email": "Correo",
    "auth.signup.verify.phone": "Teléfono",
    "auth.signup.ageConfirm":
      "Confirmo que tengo 18 años o más. *",
    "auth.signup.primaryCta": "Crear cuenta",
    "auth.signup.haveAccount": "¿Ya tienes cuenta?",
    "auth.signup.goToLogin": "Inicia sesión",

    // Legacy landing
    "legacy.landing.title": "La experiencia original de AllFantasy.",
    "legacy.landing.subtitle": "Historial profundo de ligas, reportes legacy y herramientas clásicas.",
    "legacy.landing.body":
      "AllFantasy Legacy es donde empezó todo: historial largo de ligas, análisis de carrera y herramientas pensadas para jugadores que llevan años compitiendo.",
    "legacy.landing.primaryCta": "Ir a AllFantasy Legacy",
    "legacy.landing.secondaryCta": "Iniciar sesión en Legacy",

    // Bracket landing
    "bracket.landing.title": "Desafío AllFantasy NCAA Bracket.",
    "bracket.landing.subtitle": "Arma tu bracket, crea pools y sigue la locura.",
    "bracket.landing.body":
      "Crea pools privados, únete a concursos públicos, sigue posiciones en vivo y usa IA para poner a prueba tu bracket antes del tip-off.",
    "bracket.landing.signIn": "Entrar al Bracket Challenge",
    "bracket.landing.signUp": "Registrarse para Bracket Challenge",
    "bracket.landing.secondaryLink": "Abrir Bracket Hub",

    // App landing
    "app.landing.title": "Tu co‑GM con IA para cada liga.",
    "app.landing.subtitle": "Trades, waivers, rankings y flujos de liga en un solo lugar.",
    "app.landing.body":
      "La AllFantasy Sports App es la experiencia principal: conecta ligas, corre checks de traspasos con IA, gestiona plantillas y recibe recomendaciones semana a semana.",
    "app.landing.signIn": "Entrar a Sports App",
    "app.landing.signUp": "Registrarse en Sports App",
    "app.landing.continue": "Abrir Sports App",
    "app.landing.feature.trades": "Analizador de traspasos con calificaciones contextuales.",
    "app.landing.feature.waivers": "Ayuda con waivers y alineaciones adaptada a tu liga.",
    "app.landing.feature.workflows": "Flujos de liga y roster pensados para jugadores competitivos.",

    // App page sections
    "app.page.hero.h1": "AllFantasy Sports App",
    "app.page.hero.subtitle":
      "Herramientas de fantasy con IA para analizar traspasos, gestionar equipos y dominar tus ligas.",
    "app.page.hero.supporting":
      "AllFantasy combina analítica potente, insights de fantasy y herramientas de decisión con IA en una sola plataforma.",
    "app.page.hero.cta.signup": "Registrarse en Sports App",
    "app.page.hero.cta.signin": "Iniciar sesión",
    "app.page.hero.cta.trade": "Probar Trade Analyzer",

    "app.page.features.title": "Herramientas clave dentro de Sports App",
    "app.page.features.trade.title": "AI Trade Analyzer",
    "app.page.features.trade.body":
      "Evalúa traspasos de fantasy al instante con calificaciones y contexto generados por IA.",
    "app.page.features.roster.title": "Insights de roster",
    "app.page.features.roster.body":
      "Descubre qué movimientos ayudan más a tu alineación cada semana.",
    "app.page.features.league.title": "Gestión de ligas",
    "app.page.features.league.body":
      "Sigue tus ligas, equipos y la actividad clave desde un solo lugar.",
    "app.page.features.player.title": "Análisis de jugadores",
    "app.page.features.player.body":
      "Compara jugadores y tendencias en tus formatos favoritos.",

    "app.page.demo.title": "Cómo se ve Sports App",
    "app.page.demo.subtitle":
      "Previsualiza cómo se combinan análisis de traspasos, rosters e insights de jugadores en una sola experiencia.",

    "app.page.ai.title": "Insights de fantasy impulsados por IA",
    "app.page.ai.trade.title": "Evaluación de traspasos",
    "app.page.ai.trade.body":
      "Pasa tus traspasos por IA para entender justicia, riesgo e impacto a largo plazo.",
    "app.page.ai.compare.title": "Comparación de jugadores",
    "app.page.ai.compare.body":
      "Compara rápidamente jugadores por rol, uso y proyección a futuro.",
    "app.page.ai.lineup.title": "Optimización de alineación",
    "app.page.ai.lineup.body":
      "Recibe sugerencias con IA para decisiones de start/sit y prioridades de waivers.",

    // Live bracket intel
    "bracket.live.title": "Inteligencia en vivo del bracket",
    "bracket.live.loading": "Cargando actualizaciones en vivo…",
    "bracket.live.error": "No se pudieron cargar las actualizaciones en vivo. Inténtalo de nuevo.",
    "bracket.live.empty": "Las actualizaciones en vivo aparecerán aquí cuando haya partidos del torneo en juego.",
    "bracket.live.survival.label": "Probabilidad de supervivencia del bracket",
    "bracket.live.survival.alivePct": "Porcentaje de equipos elegidos que siguen vivos",
    "bracket.live.survival.championAlive": "Campeón aún vivo",
    "bracket.live.survival.yes": "Sí",
    "bracket.live.survival.no": "No",
    "bracket.live.upset.title": "Upset watch",
    "bracket.live.upset.item": "Ronda {{round}}: {{home}} vs {{away}}",

    "app.page.sports.title": "Deportes de fantasy compatibles",
    "app.page.sports.helper":
      "AllFantasy está pensado para jugadores multisport en los formatos de fantasy más importantes.",

    "app.page.cta.title": "¿Listo para mejorar tu estrategia de fantasy?",
    "app.page.cta.subtitle":
      "Únete a AllFantasy Sports App y empieza a usar herramientas con IA para cada liga.",
    "app.page.cta.primary": "Crear cuenta",
    "app.page.cta.secondary": "Abrir Trade Analyzer",

    // Trade analyzer landing
    "trade.landing.title": "Analizador de traspasos que realmente entiende tu liga.",
    "trade.landing.subtitle": "Deja de pelear en el chat. Muestra los datos.",
    "trade.landing.body":
      "El analizador de traspasos de AllFantasy convierte jugadores y picks en calificaciones deterministas, explicaciones y contraofertas en menos de un minuto.",
    "trade.landing.openAnalyzer": "Abrir Trade Analyzer",
    "trade.landing.signIn": "Iniciar sesión",
    "trade.landing.signUp": "Crear cuenta",
    "trade.landing.feature.grades": "Calificaciones con letra en lugar de solo sensaciones.",
    "trade.landing.feature.context": "Tiene en cuenta impacto en tu alineación, valor de reemplazo y contexto de liga.",
    "trade.landing.feature.counter": "Sugiere mejores contraofertas para no regalar valor.",

    // Trade analyzer page sections
    "trade.page.hero.h1": "AI Fantasy Trade Analyzer",
    "trade.page.hero.subtitle":
      "Evalúa traspasos de fantasy con insights impulsados por IA y toma mejores decisiones de roster.",
    "trade.page.hero.supporting":
      "Usa AllFantasy para analizar valor de traspasos, comparar activos y ver con más claridad si un movimiento ayuda a tu equipo.",
    "trade.page.hero.cta.analyze": "Analizar traspaso",
    "trade.page.hero.cta.signup": "Crear cuenta",
    "trade.page.hero.cta.app": "Abrir Sports App",

    "trade.page.entry.title": "Empieza a evaluar un traspaso",
    "trade.page.entry.body":
      "Describe ambos lados de tu traspaso y entra directo al analizador. Sin configuraciones complicadas.",

    "trade.page.how.title": "Cómo funciona el Trade Analyzer",
    "trade.page.how.step1.title": "Ingresa tu traspaso",
    "trade.page.how.step1.body": "Añade jugadores, picks y activos involucrados en cada lado.",
    "trade.page.how.step2.title": "Recibe insights con IA",
    "trade.page.how.step2.body":
      "Revisa calificaciones, contexto y riesgos generados por IA para cada equipo.",
    "trade.page.how.step3.title": "Toma mejores decisiones",
    "trade.page.how.step3.body":
      "Usa el análisis para decidir si el traspaso ayuda a tu roster y a tu liga.",

    "trade.page.benefits.title": "Por qué usar AllFantasy Trade Analyzer",
    "trade.page.benefits.card1.title": "Análisis impulsado por IA",
    "trade.page.benefits.card1.body":
      "Obtén feedback inteligente sobre traspasos más rápido que discutiendo en el chat.",
    "trade.page.benefits.card2.title": "Decisiones de traspaso más claras",
    "trade.page.benefits.card2.body":
      "Entiende si un movimiento mejora tu equipo a corto y largo plazo.",
    "trade.page.benefits.card3.title": "Hecho para jugadores de fantasy",
    "trade.page.benefits.card3.body":
      "Usa una herramienta diseñada para ligas reales, rosters y formatos keeper/dynasty.",
    "trade.page.benefits.card4.title": "Rápido y fácil de usar",
    "trade.page.benefits.card4.body":
      "Empieza a evaluar traspasos en pocos clics, sin hojas de cálculo.",

    "trade.page.sports.title": "Deportes de fantasy compatibles",
    "trade.page.sports.helper":
      "Usa el Trade Analyzer en tus formatos de fantasy favoritos.",

    "trade.page.trust.title": "Pensado para apoyar traspasos de fantasy más inteligentes",
    "trade.page.trust.item1":
      "Análisis de fantasy con IA ajustado a ligas reales.",
    "trade.page.trust.item2":
      "Enfocado en ayudar a jugadores competitivos a encontrar ventaja.",
    "trade.page.trust.item3":
      "Diseñado para encajar en tus flujos actuales de liga y chat.",

    "trade.page.cta.title": "¿Listo para evaluar tu próximo traspaso de fantasy?",
    "trade.page.cta.subtitle":
      "Usa el AllFantasy Trade Analyzer para tener respuestas más claras antes de darle a aceptar.",
    "trade.page.cta.primary": "Analizar traspaso",
    "trade.page.cta.secondary": "Crear cuenta",

    // Bracket page sections
    "bracket.page.hero.h1": "AllFantasy NCAA Bracket Challenge",
    "bracket.page.hero.subtitle":
      "Arma tu bracket, recibe insights con IA y compite con picks de torneo más inteligentes.",
    "bracket.page.hero.supporting":
      "Usa AllFantasy para crear brackets, importar equipos del torneo, seguir cruces y recibir ayuda con IA al hacer tus selecciones.",
    "bracket.page.hero.cta.create": "Crear un bracket",
    "bracket.page.hero.cta.join": "Unirse al Bracket Challenge",
    "bracket.page.hero.cta.signIn": "Iniciar sesión",
    "bracket.page.hero.cta.signUp": "Crear cuenta",
    "bracket.page.hero.cta.app": "Abrir Sports App",

    "bracket.page.entry.title": "Empieza tu bracket",
    "bracket.page.entry.card.create.title": "Crear nuevo bracket",
    "bracket.page.entry.card.create.body":
      "Inicia un bracket NCAA desde cero y haz tus picks ronda por ronda.",
    "bracket.page.entry.card.create.cta": "Crear bracket",
    "bracket.page.entry.card.join.title": "Unirse a un bracket existente",
    "bracket.page.entry.card.join.body":
      "Entra a un Bracket Challenge y compite con amigos, ligas o tu oficina.",
    "bracket.page.entry.card.join.cta": "Unirse a un bracket",
    "bracket.page.entry.card.ai.title": "Usar ayuda de bracket con IA",
    "bracket.page.entry.card.ai.body":
      "Deja que la IA sugiera rutas seguras, upsets y estrategias de bracket.",
    "bracket.page.entry.card.ai.cta": "Probar ayuda de IA",

    "bracket.page.how.title": "Cómo funciona el Bracket Challenge",
    "bracket.page.how.step1.title": "Carga los equipos del torneo",
    "bracket.page.how.step1.body":
      "Importa o pobla los equipos oficiales del torneo NCAA en tu bracket.",
    "bracket.page.how.step2.title": "Arma tus picks",
    "bracket.page.how.step2.body":
      "Completa tu bracket ronda por ronda y fija tus predicciones.",
    "bracket.page.how.step3.title": "Usa insights con IA",
    "bracket.page.how.step3.body":
      "Apóyate en la IA para contexto de cruces, upsets y análisis de rutas.",

    "bracket.page.ai.title": "AI Bracket Assistant",
    "bracket.page.ai.body":
      "El AI Bracket Assistant de AllFantasy te ayuda a poner a prueba upsets, explorar rutas chalk y entender cómo cada pick afecta tu torneo.",
    "bracket.page.ai.feature.matchup": "Insights de cruces",
    "bracket.page.ai.feature.matchup.body":
      "Ve notas de IA sobre cruces clave, estilos de juego y riesgo en el cierre.",
    "bracket.page.ai.feature.upset": "Alertas de upset",
    "bracket.page.ai.feature.upset.body":
      "Detecta spots de upsets con alto upside sin regalar todo tu bracket.",
    "bracket.page.ai.feature.strategy": "Perfiles de estrategia",
    "bracket.page.ai.feature.strategy.body":
      "Elige rutas más seguras, balanceadas o cargadas de upsets según cómo quieras jugar.",
    "bracket.page.ai.cta": "Probar ayuda de IA para brackets",

    "bracket.page.teams.title": "Importación de equipos y población del bracket",
    "bracket.page.teams.body":
      "AllFantasy soporta cargar los equipos oficiales del torneo NCAA en árboles de bracket estructurados, para que tus picks se alineen con cruces y regiones reales.",
    "bracket.page.teams.item1": "Slots de equipos con seed por región y ronda.",
    "bracket.page.teams.item2": "Soporte para play‑ins y cruces actualizados.",
    "bracket.page.teams.item3": "Modelo de datos pensado para torneos por temporada.",
    "bracket.page.teams.cta": "Abrir Bracket Hub",

    "bracket.page.benefits.title": "Por qué usar AllFantasy para brackets",
    "bracket.page.benefits.card1.title": "Picks con IA",
    "bracket.page.benefits.card1.body":
      "Recibe insights más inteligentes antes de fijar tus selecciones.",
    "bracket.page.benefits.card2.title": "Importación limpia de equipos",
    "bracket.page.benefits.card2.body":
      "Carga equipos del torneo en el bracket de forma rápida y precisa.",
    "bracket.page.benefits.card3.title": "Experiencia competitiva de brackets",
    "bracket.page.benefits.card3.body":
      "Crea, únete y sigue pools de brackets pensados para grupos reales.",
    "bracket.page.benefits.card4.title": "Pensado para decisiones rápidas",
    "bracket.page.benefits.card4.body":
      "Pasa de cargar equipos a crear tu bracket en pocos pasos.",

    // Bracket AI assistant – shared labels
    "bracket.ai.confidence.low": "Baja",
    "bracket.ai.confidence.medium": "Media",
    "bracket.ai.confidence.high": "Alta",
    "bracket.ai.style.safe": "Conservadora",
    "bracket.ai.style.balanced": "Equilibrada",
    "bracket.ai.style.upsetHeavy": "Con foco en upsets",
    "bracket.ai.style.chaos": "Alta varianza",

    // Bracket AI – Pick wizard
    "bracket.ai.wizard.loading": "Cargando análisis de IA…",
    "bracket.ai.wizard.analysis.title": "Insights de cruces con IA",
    "bracket.ai.wizard.analysis.confidenceShort": "conf",
    "bracket.ai.wizard.analysis.keyFactors": "Factores clave",
    "bracket.ai.wizard.analysis.suggestedLean": "Inclinación sugerida",
    "bracket.ai.wizard.analysis.confidenceLabel": "Nivel de confianza",
    "bracket.ai.wizard.analysis.upsetWatch": "Riesgo de upset",
    "bracket.ai.wizard.analysis.sources": "Contexto y referencias",
    "bracket.ai.wizard.recommendation.title": "Análisis de pick con IA",
    "bracket.ai.wizard.recommendation.recommended": "Dirección recomendada",
    "bracket.ai.wizard.recommendation.leverage": "Ángulo de leverage",
    "bracket.ai.wizard.recommendation.confidence": "Confianza de la estrategia",

    // Bracket AI – Pick assist sidebar
    "bracket.ai.pickAssist.title": "Insights de cruces con IA",
    "bracket.ai.pickAssist.subtitleIdle":
      "Analiza cruces sin elegir usando las señales actuales.",
    "bracket.ai.pickAssist.subtitleActive":
      "Sugerencias de IA actualizadas según tu pool.",
    "bracket.ai.pickAssist.button.analyze": "Analizar",
    "bracket.ai.pickAssist.button.refresh": "Actualizar",
    "bracket.ai.pickAssist.button.loading": "Analizando…",
    "bracket.ai.pickAssist.emptyHelper":
      "Usa la IA para escanear cruces sin pick, ver inclinaciones probables y posibles upsets. La decisión final siempre es tuya.",
    "bracket.ai.pickAssist.upsetStrip": "Oportunidades de upset detectadas",

    "bracket.page.cta.title": "¿Listo para armar tu bracket?",
    "bracket.page.cta.subtitle":
      "Crea tu bracket NCAA, recibe apoyo de IA en cruces clave y sigue cómo aguantan tus picks.",
    "bracket.page.cta.primary": "Crear tu bracket",
    "bracket.page.cta.secondary": "Probar ayuda de IA para brackets",
  },
};

export function LanguageProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("af_lang")
          : null;
      if (stored === "en" || stored === "es") {
        setLanguageState(stored);
      } else if (typeof navigator !== "undefined") {
        const nav = navigator.language.toLowerCase();
        if (nav.startsWith("es")) {
          setLanguageState("es");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem("af_lang", lang);
    } catch {
      // ignore
    }
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: string) => {
        const dict = translations[language] || translations.en;
        return dict[key] ?? translations.en[key] ?? key;
      },
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProviderClient");
  }
  return ctx;
}

