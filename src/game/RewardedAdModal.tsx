import React, { useEffect, useState } from 'react';
import { sound } from './sound';

export type BoosterRewardType = 'ROTATE' | 'BOMB';

// Hardcoded Google AdSense Publisher ID & Official AdMob Demo Ad Unit IDs
export const GOOGLE_ADSENSE_PUBLISHER_ID = 'pub-8252748238984276';
export const GOOGLE_ADSENSE_CLIENT_ID = 'ca-pub-8252748238984276';

export const DEFAULT_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
export const DEFAULT_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';
export const DEFAULT_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

export interface AdConfig {
  publisherId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  adSlotId: string;
  directAdUrl: string;
  totalImpressions: number;
}

const AD_CONFIG_KEY = 'cube_crush_ad_monetization_config';

export function loadAdConfig(): AdConfig {
  try {
    const raw = localStorage.getItem(AD_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AdConfig>;
      return {
        publisherId: GOOGLE_ADSENSE_CLIENT_ID,
        bannerAdUnitId:
          parsed.bannerAdUnitId?.trim() || DEFAULT_BANNER_AD_UNIT_ID,
        interstitialAdUnitId:
          parsed.interstitialAdUnitId?.trim() || DEFAULT_INTERSTITIAL_AD_UNIT_ID,
        rewardedAdUnitId:
          parsed.rewardedAdUnitId?.trim() || DEFAULT_REWARDED_AD_UNIT_ID,
        adSlotId: parsed.adSlotId?.trim() || '5224354917',
        directAdUrl: parsed.directAdUrl?.trim() || '',
        totalImpressions: Number(parsed.totalImpressions) || 0,
      };
    }
  } catch {
    // ignore
  }
  return {
    publisherId: GOOGLE_ADSENSE_CLIENT_ID,
    bannerAdUnitId: DEFAULT_BANNER_AD_UNIT_ID,
    interstitialAdUnitId: DEFAULT_INTERSTITIAL_AD_UNIT_ID,
    rewardedAdUnitId: DEFAULT_REWARDED_AD_UNIT_ID,
    adSlotId: '5224354917',
    directAdUrl: '',
    totalImpressions: 0,
  };
}

export function saveAdConfig(config: AdConfig): void {
  try {
    localStorage.setItem(
      AD_CONFIG_KEY,
      JSON.stringify({
        ...config,
        publisherId: GOOGLE_ADSENSE_CLIENT_ID,
      })
    );
  } catch {
    // ignore
  }
}

export function recordAdImpression(): AdConfig {
  const current = loadAdConfig();
  const updated: AdConfig = {
    ...current,
    publisherId: GOOGLE_ADSENSE_CLIENT_ID,
    totalImpressions: current.totalImpressions + 1,
  };
  saveAdConfig(updated);
  return updated;
}

interface RewardedAdModalProps {
  rewardType: BoosterRewardType;
  onRewardEarned: (type: BoosterRewardType) => void;
  onCancel: () => void;
}

export function RewardedAdModal({
  rewardType,
  onRewardEarned,
  onCancel,
}: RewardedAdModalProps) {
  const AD_DURATION = 5; // 5 seconds full-screen rewarded video timer
  const [secondsLeft, setSecondsLeft] = useState<number>(AD_DURATION);
  const [completed, setCompleted] = useState<boolean>(false);
  const [adConfig] = useState<AdConfig>(() => loadAdConfig());

  const rewardedUnitId =
    adConfig.rewardedAdUnitId || DEFAULT_REWARDED_AD_UNIT_ID;
  const slotId = rewardedUnitId.includes('/')
    ? rewardedUnitId.split('/')[1]
    : adConfig.adSlotId || '5224354917';
  const isGoogleTestUnit = rewardedUnitId.startsWith(
    'ca-app-pub-3940256099942544/'
  );

  useEffect(() => {
    const win = window as unknown as {
      adsbygoogle?: unknown[];
      adBreak?: (opts: Record<string, unknown>) => void;
      Android?: {
        showRewardedAd?: (id?: string) => void;
      };
      admob?: {
        rewardvideo?: {
          config?: (opts: { id: string }) => void;
          prepare?: () => void;
          show?: () => void;
        };
        rewarded?: {
          load?: (opts: { id: string }) => Promise<void>;
          show?: () => Promise<void>;
        };
      };
    };

    // 1. Trigger Native Android AdMob Full-Screen Rewarded Ad (ca-app-pub-3940256099942544/5224354917)
    try {
      if (win.Android?.showRewardedAd) {
        win.Android.showRewardedAd(rewardedUnitId);
      } else if (win.admob?.rewardvideo) {
        win.admob.rewardvideo.config?.({ id: rewardedUnitId });
        win.admob.rewardvideo.prepare?.();
        win.admob.rewardvideo.show?.();
      } else if (win.admob?.rewarded) {
        win.admob.rewarded
          .load?.({ id: rewardedUnitId })
          .then(() => win.admob?.rewarded?.show?.())
          .catch(() => {});
      }
    } catch {
      // Ignore if native APK bridge is not present
    }

    // 2. Push full-screen slot to adsbygoogle
    try {
      (win.adsbygoogle = win.adsbygoogle || []).push({});
    } catch {
      // Ignore if AdSense script is still initializing
    }

    // 3. Trigger Google H5 Games Ads Placement API (window.adBreak) if active
    if (typeof win.adBreak === 'function') {
      try {
        win.adBreak({
          type: 'reward',
          name: `refill_${rewardType.toLowerCase()}`,
          beforeReward: (showAdFn: () => void) => showAdFn(),
          adViewed: () => {
            recordAdImpression();
            setCompleted(true);
            setSecondsLeft(0);
          },
          adDismissed: () => {
            onCancel();
          },
        });
      } catch {
        // Fallback to rewarded timer
      }
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setCompleted(true);
          recordAdImpression();
          sound.playCollectible();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [onCancel, rewardType, rewardedUnitId]);

  const progressPct = Math.round(((AD_DURATION - secondsLeft) / AD_DURATION) * 100);
  const rewardLabel =
    rewardType === 'ROTATE' ? '+1 Rotate Hint' : '+1 Mega Bomb Hint';

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col justify-between bg-[#070D22] select-none overflow-hidden">
      {/* Top Full-Screen Ad Bar */}
      <div className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#0B1433] border-b border-sky-500/25 z-30">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-md bg-amber-400 text-slate-950 font-mono-tabular text-xs font-black uppercase">
            {isGoogleTestUnit ? 'TEST REWARDED VIDEO AD' : 'REWARDED VIDEO AD'}
          </span>
          <span className="text-xs sm:text-sm font-bold text-sky-100">
            {completed
              ? `Reward Granted: ${rewardLabel}`
              : `${secondsLeft}s remaining for ${rewardLabel}`}
          </span>
        </div>

        {completed ? (
          <button
            type="button"
            onClick={() => onRewardEarned(rewardType)}
            className="px-4 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-black text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shadow-md"
          >
            Claim +1 & Close ✕
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Skip / Cancel
          </button>
        )}
      </div>

      {/* Center Full-Screen Rewarded Video Ad Viewport (ca-app-pub-3940256099942544/5224354917) */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-[#091230] via-[#0F1E4D] to-[#081029]">
        {adConfig.directAdUrl ? (
          <iframe
            src={adConfig.directAdUrl}
            title="Full Screen Rewarded Ad"
            className="w-full h-full border-0 bg-black z-20"
            allow="autoplay; encrypted-media"
          />
        ) : (
          <>
            <ins
              className="adsbygoogle absolute inset-0 z-20"
              style={{ display: 'block', width: '100%', height: '100%' }}
              data-ad-client={
                isGoogleTestUnit
                  ? 'ca-pub-3940256099942544'
                  : GOOGLE_ADSENSE_CLIENT_ID
              }
              data-ad-slot={slotId}
              data-ad-unit={rewardedUnitId}
              data-ad-format="auto"
              data-full-width-responsive="true"
              {...(isGoogleTestUnit ? { 'data-adtest': 'on' } : {})}
            />

            {/* Full-Screen Google AdMob Rewarded Video Showcase */}
            <div className="relative z-10 w-full max-w-md flex flex-col items-center justify-center gap-5 pointer-events-none">
              {/* Countdown Ring / Rewarded Video Play Icon */}
              <div className="relative w-24 h-24 rounded-full bg-amber-400/15 border-4 border-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.35)]">
                {completed ? (
                  <span className="font-display font-black text-4xl text-emerald-400">
                    ✓
                  </span>
                ) : (
                  <span className="font-mono-tabular font-black text-3xl text-amber-300">
                    {secondsLeft}s
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-mono-tabular text-xs font-black uppercase tracking-wider">
                  Full-Screen Rewarded Video Ad
                </span>
                <h2 className="font-display font-black text-3xl sm:text-4xl text-white drop-shadow">
                  {completed ? 'Reward Unlocked!' : 'Nice job! Test Ad Playing'}
                </h2>
                <p className="text-sm sm:text-base text-sky-100/90 max-w-sm leading-relaxed">
                  You are displaying a <strong>Full-Screen Rewarded Video Ad</strong> from Google AdMob.
                </p>
              </div>

              <div className="w-full rounded-2xl bg-[#0A132C]/90 border border-sky-400/40 px-4 py-3 flex flex-col items-center gap-1 shadow-lg">
                <span className="text-[11px] uppercase tracking-wider font-bold text-sky-300/75">
                  Active Rewarded Ad Unit ID
                </span>
                <span className="font-mono-tabular text-xs sm:text-sm font-bold text-amber-300 break-all">
                  {rewardedUnitId}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Full-Width Progress Bar along bottom of video area */}
        <div className="absolute inset-x-0 bottom-0 h-2.5 bg-black/60 z-30">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Bottom Full-Screen Reward Action Footer */}
      <div className="w-full px-5 py-4 bg-[#0B1433] border-t border-sky-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 z-30">
        <div className="flex flex-col text-center sm:text-left">
          <span className="text-sm font-extrabold text-white">
            Reward: {rewardLabel}
          </span>
          <span className="text-xs text-sky-300/85">
            {completed
              ? 'Video ad complete! Tap Claim below to receive your +1 hint.'
              : `Watch for ${secondsLeft} more second${secondsLeft === 1 ? '' : 's'} to unlock ${rewardLabel}...`}
          </span>
        </div>

        <button
          type="button"
          disabled={!completed}
          onClick={() => onRewardEarned(rewardType)}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-display font-black text-base transition-all whitespace-nowrap ${
            completed
              ? 'bg-gradient-to-b from-emerald-300 to-emerald-500 text-slate-950 shadow-[0_4px_0_#065F46] cursor-pointer hover:brightness-105'
              : 'bg-[#182966] text-sky-300/50 cursor-not-allowed'
          }`}
        >
          {completed ? `Claim ${rewardLabel}` : `Unlocking in ${secondsLeft}s...`}
        </button>
      </div>
    </div>
  );
}
