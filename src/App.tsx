import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BlockBlastCanvas, BlockBlastEngineHandle } from './game/BlockBlastCanvas';
import { GAME_ICON_PATH, IntroSequence } from './game/IntroSequence';
import { ADVENTURE_LEVELS } from './game/levels';
import {
  DailyMissionsState,
  getTimeUntilMidnightLabel,
  loadDailyMissions,
} from './game/missions';
import {
  BoosterRewardType,
  RewardedAdModal,
} from './game/RewardedAdModal';
import { FixedBannerAd } from './game/FixedBannerAd';
import { InterstitialAdModal } from './game/InterstitialAdModal';
import { sound } from './game/sound';
import {
  ClassicDifficulty,
  GameMode,
  GameScreenState,
  HudSnapshot,
} from './game/types';

function CrownSvg({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 24L2 9L10 15L16 6L22 15L30 9L28 24H4Z"
        fill="url(#crownGrad)"
        stroke="#FEF08A"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect
        x="4"
        y="25"
        width="24"
        height="3.5"
        rx="1.75"
        fill="#CA8A04"
        stroke="#FEF08A"
        strokeWidth="1.2"
      />
      <circle cx="16" cy="5" r="2" fill="#FEF9C3" />
      <circle cx="2" cy="8" r="1.8" fill="#FEF9C3" />
      <circle cx="30" cy="8" r="1.8" fill="#FEF9C3" />
      <defs>
        <linearGradient id="crownGrad" x1="16" y1="6" x2="16" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.55" stopColor="#FACC15" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StarSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <path
        d="M14 2.5L17.4 9.6L25.2 10.6L19.5 16L20.9 23.8L14 20.1L7.1 23.8L8.5 16L2.8 10.6L10.6 9.6L14 2.5Z"
        fill="url(#starHudGrad)"
        stroke="#FEF9C3"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="starHudGrad" x1="14" y1="2.5" x2="14" y2="23.8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="0.6" stopColor="#FACC15" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GemSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <path
        d="M14 2.5L24.5 14L14 25.5L3.5 14L14 2.5Z"
        fill="url(#gemHudGrad)"
        stroke="#FAE8FF"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 7.5L19.5 14L14 20.5L8.5 14L14 7.5Z"
        fill="#FFFFFF"
        fillOpacity="0.35"
      />
      <defs>
        <linearGradient id="gemHudGrad" x1="4" y1="3" x2="24" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5D0FE" />
          <stop offset="0.5" stopColor="#E879F9" />
          <stop offset="1" stopColor="#9333EA" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FlameSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <path
        d="M14.8 2.5C15.2 6.8 12.1 9.2 10.6 11.8C9.1 14.3 9.7 17.5 11.8 19.1C11.1 17.4 11.6 15.2 13.4 13.8C13.2 16.4 14.9 18.2 16.2 19.9C17.7 18.4 18.4 16.2 17.9 13.9C20.6 16.1 21.5 19.8 19.6 22.9C18.2 25.1 15.7 26 13.4 26C9.5 26 6.2 22.9 6.2 18.5C6.2 13.6 9.8 10.2 12.6 6.4C13.6 5.1 14.4 3.8 14.8 2.5Z"
        fill="url(#flameGrad)"
        stroke="#FEF08A"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="flameGrad" x1="14" y1="2.5" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="0.45" stopColor="#FB923C" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const STREAK_COUNT_KEY = 'block_blast_daily_streak';
const STREAK_DATE_KEY = 'block_blast_last_played_date';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialDailyStreak(): { count: number; playedToday: boolean } {
  try {
    const savedCount = parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0', 10) || 0;
    const savedDate = localStorage.getItem(STREAK_DATE_KEY) || '';
    if (!savedDate || savedCount <= 0) {
      return { count: 0, playedToday: false };
    }

    const now = new Date();
    const todayStr = formatLocalDate(now);
    if (savedDate === todayStr) {
      return { count: savedCount, playedToday: true };
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);
    if (savedDate === yesterdayStr) {
      return { count: savedCount, playedToday: false };
    }

    // Streak expired if more than 1 day was missed
    return { count: 0, playedToday: false };
  } catch {
    return { count: 0, playedToday: false };
  }
}

function recordDailyGamePlay(): { count: number; playedToday: boolean } {
  try {
    const now = new Date();
    const todayStr = formatLocalDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);

    const savedCount = parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0', 10) || 0;
    const savedDate = localStorage.getItem(STREAK_DATE_KEY) || '';

    let nextCount = 1;
    if (savedDate === todayStr) {
      nextCount = Math.max(1, savedCount);
    } else if (savedDate === yesterdayStr) {
      nextCount = Math.max(1, savedCount) + 1;
    } else {
      nextCount = 1;
    }

    localStorage.setItem(STREAK_COUNT_KEY, String(nextCount));
    localStorage.setItem(STREAK_DATE_KEY, todayStr);
    return { count: nextCount, playedToday: true };
  } catch {
    return { count: 1, playedToday: true };
  }
}

function CubeCrushHeroLockup() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 select-none">
      {/* Animated Game Icon Badge */}
      <motion.div
        animate={{ y: [0, -5, 0], rotate: [0, -2, 2, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[26px] overflow-hidden border-3 border-[#39B5D8] shadow-[0_12px_28px_rgba(8,15,40,0.75)] shrink-0 bg-[#253342]"
      >
        <img
          src={GAME_ICON_PATH}
          alt="Cube Crush! Icon"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Bespoke Inline SVG Title Lockup */}
      <svg
        viewBox="0 0 320 135"
        className="w-full max-w-[290px] h-auto drop-shadow-[0_10px_20px_rgba(9,16,45,0.65)]"
        role="img"
        aria-label="Cube Crush!"
      >
        <defs>
          <linearGradient id="titleWhite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="titleGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="45%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <text
          x="160"
          y="60"
          textAnchor="middle"
          fontFamily="Outfit, sans-serif"
          fontWeight="900"
          fontSize="60"
          letterSpacing="2"
          fill="url(#titleWhite)"
          stroke="#1E293B"
          strokeWidth="9"
          paintOrder="stroke"
        >
          CUBE
        </text>
        <text
          x="160"
          y="118"
          textAnchor="middle"
          fontFamily="Outfit, sans-serif"
          fontWeight="900"
          fontSize="56"
          letterSpacing="1.5"
          fill="url(#titleGold)"
          stroke="#1E293B"
          strokeWidth="9"
          paintOrder="stroke"
        >
          CRUSH!
        </text>
      </svg>
    </div>
  );
}

export default function App() {
  const engineRef = useRef<BlockBlastEngineHandle | null>(null);
  // Start with the animated intro video on initial game load!
  const [screenState, setScreenState] = useState<GameScreenState>('INTRO');
  const [muted, setMuted] = useState<boolean>(() => sound.isMuted());
  const [musicVolume, setMusicVolume] = useState<number>(() => sound.getMusicVolume());
  const [musicSpeed, setMusicSpeed] = useState<number>(() => sound.getMusicSpeed());
  const [selectedAdventureLevel, setSelectedAdventureLevel] = useState<number>(1);
  const [classicDifficulty, setClassicDifficulty] = useState<ClassicDifficulty>(() => {
    try {
      const saved = localStorage.getItem('block_blast_classic_difficulty');
      if (saved === 'EASY' || saved === 'MEDIUM' || saved === 'HARD') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'MEDIUM';
  });
  const [dailyStreak, setDailyStreak] = useState<{ count: number; playedToday: boolean }>(() =>
    getInitialDailyStreak()
  );
  const [dailyMissions, setDailyMissions] = useState<DailyMissionsState>(() =>
    loadDailyMissions()
  );
  const [resetCountdown, setResetCountdown] = useState<string>(() =>
    getTimeUntilMidnightLabel()
  );
  const [activeAdReward, setActiveAdReward] = useState<BoosterRewardType | null>(null);
  const [interstitialAfterAction, setInterstitialAfterAction] = useState<(() => void) | null>(
    null
  );

  // Refresh 24-hour reset countdown and auto-rotate missions at midnight
  useEffect(() => {
    const timer = window.setInterval(() => {
      setResetCountdown(getTimeUntilMidnightLabel());
      setDailyMissions(loadDailyMissions());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const [hud, setHud] = useState<HudSnapshot>({
    score: 0,
    highScore: 0,
    combo: 0,
    maxCombo: 0,
    linesClearedTotal: 0,
    mode: 'CLASSIC',
    difficulty: 'MEDIUM',
    levelId: 1,
    levelName: 'Classic Endless',
    starsCollected: 0,
    targetStars: 5,
    gemsCollected: 0,
    targetGems: 5,
    targetScore: 400,
    rotateTokens: 3,
    bombTokens: 3,
    activeTool: 'NONE',
    selectedDockIndex: null,
  });

  const handleSelectDifficulty = (diff: ClassicDifficulty) => {
    sound.playPickup();
    setClassicDifficulty(diff);
    try {
      localStorage.setItem('block_blast_classic_difficulty', diff);
    } catch {
      // ignore
    }
  };

  const handleStartClassic = () => {
    sound.playPickup();
    sound.startBackgroundMusic();
    setDailyStreak(recordDailyGamePlay());
    engineRef.current?.startNewGame('CLASSIC', 1, classicDifficulty);
    setScreenState('PLAYING');
  };

  const handleStartAdventure = (levelId: number) => {
    sound.playPickup();
    sound.startBackgroundMusic();
    setDailyStreak(recordDailyGamePlay());
    setSelectedAdventureLevel(levelId);
    engineRef.current?.startNewGame('ADVENTURE', levelId, classicDifficulty);
    setScreenState('PLAYING');
  };

  const handleNextAdventureLevel = () => {
    const nextId =
      selectedAdventureLevel < ADVENTURE_LEVELS.length
        ? selectedAdventureLevel + 1
        : 1;
    sound.playPickup();
    // Show Interstitial Ad (ca-app-pub-3940256099942544/1033173712) between stages
    setInterstitialAfterAction(() => () => {
      sound.startBackgroundMusic();
      setDailyStreak(recordDailyGamePlay());
      setSelectedAdventureLevel(nextId);
      engineRef.current?.startNewGame('ADVENTURE', nextId, classicDifficulty);
      setScreenState('PLAYING');
    });
  };

  const handleRestartCurrent = () => {
    sound.playPickup();
    // Show Interstitial Ad (ca-app-pub-3940256099942544/1033173712) when restarting after round end
    setInterstitialAfterAction(() => () => {
      sound.startBackgroundMusic();
      setDailyStreak(recordDailyGamePlay());
      engineRef.current?.startNewGame(hud.mode, hud.levelId, hud.difficulty);
      setScreenState('PLAYING');
    });
  };

  const handleToggleMute = () => {
    const nowMuted = sound.toggleMute();
    setMuted(nowMuted);
    if (!nowMuted) {
      sound.startBackgroundMusic();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setMusicVolume(newVol);
    sound.setMusicVolume(newVol);
    setMuted(sound.isMuted());
    sound.startBackgroundMusic();
  };

  const handleSpeedChange = (newSpeed: number) => {
    setMusicSpeed(newSpeed);
    sound.setMusicSpeed(newSpeed);
    sound.startBackgroundMusic();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#1D3587] select-none">
      {/* Always-live 60fps Canvas World */}
      <BlockBlastCanvas
        ref={engineRef}
        screenState={screenState}
        onHudUpdate={setHud}
        onStateChange={setScreenState}
        onMissionsUpdate={setDailyMissions}
      />

      {/* ANIMATED INTRO VIDEO SEQUENCE WITH UPLOADED GAME ICON */}
      {screenState === 'INTRO' && (
        <IntroSequence
          onComplete={() => {
            sound.startBackgroundMusic();
            setScreenState('TITLE');
          }}
        />
      )}

      {/* Low-Occlusion Top Perimeter HUD (Only visible while playing/paused/modals) */}
      {screenState !== 'TITLE' && screenState !== 'INTRO' && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-3">
          <div className="w-full max-w-[520px] flex items-center justify-between gap-2">
            {/* Top-Left: Crown High Score */}
            <div className="pointer-events-auto flex items-center gap-2 bg-[#142254] border-2 border-[#2E4BA8] rounded-xl px-3 py-1.5 shadow-md">
              <CrownSvg className="w-6 h-6 shrink-0" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-semibold text-sky-200/80 tracking-wider">
                  Best
                </span>
                <span className="font-display font-extrabold text-lg sm:text-xl text-amber-300 tabular-nums">
                  {hud.highScore.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Top-Center: Adventure Mode Star & Gem Objectives OR Classic Combo Streak */}
            {hud.mode === 'ADVENTURE' ? (
              <div className="pointer-events-auto flex items-center gap-3 bg-[#142254] border-2 border-[#2E4BA8] rounded-xl px-3.5 py-1.5 shadow-md">
                <div className="flex items-center gap-1.5">
                  <StarSvg className="w-5 h-5 shrink-0" />
                  <span className="font-display font-extrabold text-base sm:text-lg text-yellow-300 tabular-nums whitespace-nowrap">
                    {hud.starsCollected}/{hud.targetStars}
                  </span>
                </div>
                <span className="text-sky-400/40" aria-hidden="true">
                  ·
                </span>
                <div className="flex items-center gap-1.5">
                  <GemSvg className="w-5 h-5 shrink-0" />
                  <span className="font-display font-extrabold text-base sm:text-lg text-fuchsia-300 tabular-nums whitespace-nowrap">
                    {hud.gemsCollected}/{hud.targetGems}
                  </span>
                </div>
              </div>
            ) : (
              hud.combo > 1 && (
                <div className="bg-[#142254] border-2 border-sky-400 rounded-xl px-3 py-1 shadow-md">
                  <span className="font-display font-black text-sm sm:text-base text-sky-300 tabular-nums whitespace-nowrap">
                    Combo ×{hud.combo}
                  </span>
                </div>
              )
            )}

            {/* Top-Right: Tactical Boosters, Mute & Pause */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              {/* Rotate Dock Pieces Booster (Click when 0 to watch Rewarded Ad for +1) */}
              <button
                type="button"
                onClick={() => {
                  if (hud.rotateTokens > 0) {
                    engineRef.current?.rotateAvailablePieces();
                  } else {
                    sound.playPickup();
                    setActiveAdReward('ROTATE');
                  }
                }}
                title={
                  hud.rotateTokens > 0
                    ? 'Rotate Pieces (Shortcut: R)'
                    : 'Watch Ad to get +1 Rotate Hint'
                }
                className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-transform active:scale-95 cursor-pointer ${
                  hud.rotateTokens > 0
                    ? 'bg-[#172863] border-[#3859C4] hover:border-sky-300 text-sky-200'
                    : 'bg-[#172863] border-amber-400/80 hover:border-amber-300 text-amber-200'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                {hud.rotateTokens > 0 ? (
                  <span className="absolute -bottom-1 -right-1 font-mono-tabular text-[11px] font-bold bg-sky-500 text-slate-950 rounded px-1 leading-tight">
                    {hud.rotateTokens}
                  </span>
                ) : (
                  <span className="absolute -bottom-1.5 -right-1.5 font-mono-tabular text-[10px] font-extrabold bg-amber-400 text-slate-950 rounded px-1 leading-tight shadow">
                    AD
                  </span>
                )}
              </button>

              {/* 3x3 Bomb Blast Booster (Click when 0 to watch Rewarded Ad for +1) */}
              <button
                type="button"
                onClick={() => {
                  if (hud.bombTokens > 0 || hud.activeTool === 'BOMB') {
                    engineRef.current?.toggleBombMode();
                  } else {
                    sound.playPickup();
                    setActiveAdReward('BOMB');
                  }
                }}
                title={
                  hud.bombTokens > 0
                    ? '3×3 Mega Bomb Booster'
                    : 'Watch Ad to get +1 Mega Bomb Hint'
                }
                className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-transform active:scale-95 cursor-pointer ${
                  hud.activeTool === 'BOMB'
                    ? 'bg-rose-600 border-amber-300 text-white scale-105'
                    : hud.bombTokens > 0
                    ? 'bg-[#172863] border-[#3859C4] hover:border-amber-300 text-amber-300'
                    : 'bg-[#172863] border-amber-400/80 hover:border-amber-300 text-amber-200'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="13" r="7" />
                  <path d="M15.5 8.5L18 6" />
                  <path d="M18 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
                </svg>
                {hud.bombTokens > 0 ? (
                  <span className="absolute -bottom-1 -right-1 font-mono-tabular text-[11px] font-bold bg-amber-400 text-slate-950 rounded px-1 leading-tight">
                    {hud.bombTokens}
                  </span>
                ) : (
                  <span className="absolute -bottom-1.5 -right-1.5 font-mono-tabular text-[10px] font-extrabold bg-amber-400 text-slate-950 rounded px-1 leading-tight shadow">
                    AD
                  </span>
                )}
              </button>

              {/* Audio Mute Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#172863] border-2 border-[#3859C4] hover:border-sky-300 text-sky-100 transition-transform active:scale-95 cursor-pointer"
              >
                {muted ? (
                  <svg className="w-5 h-5 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>

              {/* Settings / Pause Button */}
              <button
                type="button"
                onClick={() => {
                  sound.playPickup();
                  setScreenState(screenState === 'PAUSED' ? 'PLAYING' : 'PAUSED');
                }}
                aria-label="Pause Game"
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#172863] border-2 border-[#3859C4] hover:border-sky-300 text-sky-100 transition-transform active:scale-95 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Giant Center Score Readout */}
          <div className="mt-1 flex items-center gap-3">
            <span
              className="font-display font-black text-4xl sm:text-5xl text-white tabular-nums tracking-tight drop-shadow-[0_4px_8px_rgba(8,15,40,0.75)]"
            >
              {hud.score.toLocaleString()}
            </span>
            {hud.mode === 'ADVENTURE' && (
              <span className="text-xs font-semibold text-sky-200/90 tabular-nums">
                / {hud.targetScore.toLocaleString()} Goal
              </span>
            )}
          </div>
        </div>
      )}

      {/* TITLE SCREEN OVERLAY (Kept mounted under INTRO so gameplay board never flashes during intro exit) */}
      {(screenState === 'TITLE' || screenState === 'INTRO') && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-16 bg-[#122259] overflow-y-auto">
          {/* Top Bar: Best Score, Daily Streak & Mute */}
          <div className="w-full max-w-xl flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3 sm:gap-4 text-sm font-semibold tabular-nums">
              <div className="flex items-center gap-1.5 text-amber-300">
                <CrownSvg className="w-5 h-5 shrink-0" />
                <span>Best: {hud.highScore.toLocaleString()}</span>
              </div>
              <span className="text-sky-400/40" aria-hidden="true">
                ·
              </span>
              <div
                className="flex items-center gap-1.5 text-orange-300"
                title={
                  dailyStreak.playedToday
                    ? 'Daily streak active for today!'
                    : 'Play a game today to extend your daily streak!'
                }
              >
                <FlameSvg className="w-5 h-5 shrink-0" />
                <span>
                  Streak: {dailyStreak.count} {dailyStreak.count === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className="px-3.5 py-2 rounded-xl bg-[#1A2E75] border border-[#3656BD] text-xs font-semibold text-sky-100 hover:border-sky-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                {muted ? 'Sound: Off' : 'Sound: On'}
              </button>
            </div>
          </div>

          {/* Center Hero Lockup & Mode Selection */}
          <div className="w-full max-w-lg flex flex-col items-center text-center my-auto py-2">
            <CubeCrushHeroLockup />

            <p className="mt-2 text-xs sm:text-sm text-sky-100/85 max-w-md">
              Place jewel cubes onto the 8×8 grid to crush full rows and columns. Chain consecutive clears for massive combo multipliers!
            </p>

            {/* Primary CTA: Classic Endless Mode + Difficulty Selector */}
            <div className="mt-4 w-full max-w-md flex flex-col gap-3">
              <div className="bg-[#15255E] border-2 border-[#3150B5] rounded-2xl p-3 flex flex-col gap-2.5 shadow-lg">
                {/* Segmented Difficulty Selector (Easy, Medium, Hard) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-sky-200 whitespace-nowrap">
                    Classic Difficulty
                  </span>
                  <div className="flex items-center gap-1 bg-[#0E1A45] p-1 rounded-xl border border-[#27419C]">
                    {(
                      [
                        { id: 'EASY', label: 'Easy' },
                        { id: 'MEDIUM', label: 'Medium' },
                        { id: 'HARD', label: 'Hard' },
                      ] as { id: ClassicDifficulty; label: string }[]
                    ).map((opt) => {
                      const active = classicDifficulty === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectDifficulty(opt.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? opt.id === 'EASY'
                                ? 'bg-emerald-400 text-slate-950 shadow-sm'
                                : opt.id === 'MEDIUM'
                                ? 'bg-amber-300 text-slate-950 shadow-sm'
                                : 'bg-rose-500 text-white shadow-sm'
                              : 'text-sky-200/80 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spawn Variety / Frequency Description */}
                <div className="text-[11px] text-sky-200/85 text-left px-0.5">
                  {classicDifficulty === 'EASY' &&
                    'More compact blocks (1×1, 2×2, mini corners) · High board fit rate'}
                  {classicDifficulty === 'MEDIUM' &&
                    'Balanced polyomino variety and standard large-block spawn frequency'}
                  {classicDifficulty === 'HARD' &&
                    'High frequency of 5-bars, 3×3 cubes & big corners · Strict board spawns'}
                </div>

                <button
                  type="button"
                  onClick={handleStartClassic}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-b from-[#34D399] to-[#059669] border-2 border-[#A7F3D0] shadow-[0_5px_0_#065F46] hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#065F46] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-display font-black text-xl sm:text-2xl text-white tracking-wide whitespace-nowrap">
                      Play Classic Mode
                    </span>
                    <span className="text-xs font-semibold text-emerald-950">
                      {classicDifficulty === 'EASY'
                        ? 'Easy · Compact Spawns'
                        : classicDifficulty === 'MEDIUM'
                        ? 'Medium · Balanced Spawns'
                        : 'Hard · Complex Spawns'}
                    </span>
                  </div>
                  <span className="font-display font-black text-base text-emerald-950 bg-emerald-200/90 px-3 py-1 rounded-xl">
                    Start
                  </span>
                </button>
              </div>

              {/* Daily Missions Card (Resets Every 24 Hours) */}
              <div className="bg-[#15255E] border-2 border-[#3150B5] rounded-2xl p-3.5 flex flex-col gap-2.5 text-left shadow-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm sm:text-base text-sky-200">
                      Daily Missions
                    </span>
                    <span className="text-xs text-sky-400/50" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs font-semibold text-emerald-300 tabular-nums">
                      {dailyMissions.missions.filter((m) => m.completed).length}/
                      {dailyMissions.missions.length} Done
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-sky-300/80 tabular-nums whitespace-nowrap">
                    Resets in {resetCountdown}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {dailyMissions.missions.map((mission) => {
                    const pct = Math.min(
                      100,
                      Math.round((mission.current / mission.target) * 100)
                    );
                    return (
                      <div
                        key={mission.id}
                        className={`rounded-xl px-3 py-2 border transition-colors ${
                          mission.completed
                            ? 'bg-[#102A45] border-emerald-400/60'
                            : 'bg-[#1B2F78] border-[#3554BD]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span
                            className={`font-semibold ${
                              mission.completed ? 'text-emerald-300' : 'text-white'
                            }`}
                          >
                            {mission.completed ? `✓ ${mission.title}` : mission.title}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 tabular-nums">
                            <span className="text-[11px] text-amber-300 font-semibold">
                              {mission.rewardLabel}
                            </span>
                            <span className="text-sky-300/50" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-mono-tabular text-[11px] font-bold text-sky-200">
                              {mission.current}/{mission.target}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 w-full h-1.5 rounded-full bg-[#0E1942] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              mission.completed ? 'bg-emerald-400' : 'bg-sky-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secondary CTA: Adventure Gem Collection Mode */}
              <div className="bg-[#162763] border-2 border-[#3150B5] rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StarSvg className="w-5 h-5" />
                    <span className="font-display font-bold text-sm sm:text-base text-amber-300">
                      Adventure Stages
                    </span>
                    <GemSvg className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-sky-200/80">
                    Collect Stars & Gems
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {ADVENTURE_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleStartAdventure(lvl.id)}
                      className="py-1.5 px-2.5 rounded-xl bg-[#1E3482] hover:bg-[#2845A8] border border-[#4368D9] text-left transition-colors cursor-pointer flex flex-col justify-between"
                    >
                      <span className="font-display font-extrabold text-xs text-amber-300 tabular-nums whitespace-nowrap">
                        Stage {lvl.id}
                      </span>
                      <span className="text-[11px] font-medium text-white truncate w-full">
                        {lvl.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Music Volume & Speed Control Card */}
              <div className="bg-[#14235A] border border-[#2E4BA8] rounded-2xl px-4 py-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-sky-200 whitespace-nowrap">
                    Music Volume
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={muted ? 0 : Math.round(musicVolume * 100)}
                    onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
                    aria-label="Background Music Volume"
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#0D1840] rounded-lg"
                  />
                  <span className="font-mono-tabular text-xs font-bold text-amber-300 w-10 text-right">
                    {muted ? '0%' : `${Math.round(musicVolume * 100)}%`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-sky-200 whitespace-nowrap">
                    Music Speed
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: 'Slow', val: 0.75 },
                      { label: 'Normal', val: 1.0 },
                      { label: 'Fast', val: 1.3 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleSpeedChange(opt.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          Math.abs(musicSpeed - opt.val) < 0.05
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-[#1D327A] text-sky-200 hover:bg-[#2743A0]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div aria-hidden="true" />
        </div>
      )}

      {/* PAUSE MODAL */}
      {screenState === 'PAUSED' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0B1536]/80">
          <div className="w-full max-w-sm rounded-3xl bg-[#162763] border-2 border-[#3B5FD9] p-6 shadow-2xl text-center flex flex-col gap-4">
            <h2 className="font-display font-black text-3xl text-white">
              Game Paused
            </h2>
            <p className="text-sm text-sky-200/85">
              {hud.mode === 'ADVENTURE'
                ? `Stage ${hud.levelId}: ${hud.levelName}`
                : 'Classic Endless Mode'}
            </p>

            <div className="flex justify-center gap-6 py-2 text-sm text-sky-100 tabular-nums">
              <div>
                <div className="text-xs text-sky-300/75">Current Score</div>
                <div className="font-display font-extrabold text-2xl text-amber-300">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-sky-300/75">Max Combo</div>
                <div className="font-display font-extrabold text-2xl text-sky-300">
                  ×{hud.maxCombo}
                </div>
              </div>
            </div>

            {/* Pause Modal Music Volume & Speed Controls */}
            <div className="bg-[#111E4F] border border-[#2B46A0] rounded-2xl p-3.5 flex flex-col gap-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-sky-200 whitespace-nowrap">
                  Music Volume
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={muted ? 0 : Math.round(musicVolume * 100)}
                  onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
                  aria-label="Music Volume"
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#0A1336] rounded-lg"
                />
                <span className="font-mono-tabular text-xs font-bold text-amber-300 w-10 text-right">
                  {muted ? '0%' : `${Math.round(musicVolume * 100)}%`}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-sky-200 whitespace-nowrap">
                  Music Speed
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'Slow', val: 0.75 },
                    { label: 'Normal', val: 1.0 },
                    { label: 'Fast', val: 1.3 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSpeedChange(opt.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        Math.abs(musicSpeed - opt.val) < 0.05
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-[#1B2F75] text-sky-200 hover:bg-[#25409C]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playPickup();
                  setScreenState('PLAYING');
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-extrabold text-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Resume Game
              </button>
              <button
                type="button"
                onClick={handleRestartCurrent}
                className="w-full py-3 px-5 rounded-xl bg-[#21388A] hover:bg-[#2945A8] text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Restart Round
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playPickup();
                  setScreenState('TITLE');
                }}
                className="w-full py-3 px-5 rounded-xl bg-[#111E4F] hover:bg-[#192B6E] text-sky-200 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Back to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REWARDED VIDEO AD MODAL FOR BOOSTER REFILL (ca-app-pub-3940256099942544/5224354917) */}
      {activeAdReward !== null && (
        <RewardedAdModal
          rewardType={activeAdReward}
          onRewardEarned={(type) => {
            engineRef.current?.refillBoosterTokens(type, 1);
            setActiveAdReward(null);
          }}
          onCancel={() => {
            setActiveAdReward(null);
          }}
        />
      )}

      {/* FULL-SCREEN INTERSTITIAL AD MODAL BETWEEN ROUNDS (ca-app-pub-3940256099942544/1033173712) */}
      {interstitialAfterAction !== null && (
        <InterstitialAdModal
          onClose={() => {
            const nextAction = interstitialAfterAction;
            setInterstitialAfterAction(null);
            nextAction();
          }}
        />
      )}

      {/* FIXED-SIZE 320x50 BANNER AD (ca-app-pub-3940256099942544/6300978111) */}
      {screenState !== 'INTRO' && <FixedBannerAd />}

      {/* ADVENTURE VICTORY MODAL */}
      {screenState === 'VICTORY' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0B1536]/85">
          <div className="w-full max-w-md rounded-3xl bg-[#162763] border-2 border-amber-400 p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <CrownSvg className="w-14 h-14" />
            <h2 className="font-display font-black text-3xl sm:text-4xl text-amber-300">
              Stage Cleared!
            </h2>
            <p className="text-sm text-sky-100/90">
              You harvested all target Stars & Gems in{' '}
              <span className="font-semibold text-white">{hud.levelName}</span>!
            </p>

            <div className="w-full grid grid-cols-3 gap-2 bg-[#101C47] rounded-2xl p-3.5 border border-[#2A4396] tabular-nums">
              <div>
                <div className="text-xs text-sky-300/75">Final Score</div>
                <div className="font-display font-extrabold text-xl text-white">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-sky-300/75">Stars</div>
                <div className="font-display font-extrabold text-xl text-yellow-300">
                  {hud.starsCollected}/{hud.targetStars}
                </div>
              </div>
              <div>
                <div className="text-xs text-sky-300/75">Gems</div>
                <div className="font-display font-extrabold text-xl text-fuchsia-300">
                  {hud.gemsCollected}/{hud.targetGems}
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-2.5 mt-2">
              <button
                type="button"
                onClick={handleNextAdventureLevel}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-display font-black text-lg hover:brightness-105 transition-all cursor-pointer whitespace-nowrap"
              >
                Next Adventure Stage
              </button>
              <button
                type="button"
                onClick={() => setScreenState('TITLE')}
                className="w-full py-3 px-5 rounded-xl bg-[#1E3482] hover:bg-[#2642A4] text-sky-100 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER (NO MOVES LEFT) MODAL */}
      {screenState === 'GAME_OVER' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0B1536]/85">
          <div className="w-full max-w-md rounded-3xl bg-[#162763] border-2 border-[#3B5FD9] p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <h2 className="font-display font-black text-3xl sm:text-4xl text-white">
              No Space Left!
            </h2>
            <p className="text-sm text-sky-200/85">
              None of the remaining blocks can fit on the 8×8 board.
            </p>

            <div className="w-full grid grid-cols-3 gap-2 bg-[#101C47] rounded-2xl p-4 border border-[#2A4396] tabular-nums">
              <div>
                <div className="text-xs text-sky-300/75">Score</div>
                <div className="font-display font-extrabold text-2xl text-amber-300">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-sky-300/75">Best</div>
                <div className="font-display font-extrabold text-2xl text-white">
                  {hud.highScore.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-sky-300/75">Lines Blasted</div>
                <div className="font-display font-extrabold text-2xl text-sky-300">
                  {hud.linesClearedTotal}
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={handleRestartCurrent}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Play Again
              </button>

              <button
                type="button"
                onClick={() => setScreenState('TITLE')}
                className="w-full py-3 px-5 rounded-xl bg-[#111E4F] hover:bg-[#192B6E] text-sky-200 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Title Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
