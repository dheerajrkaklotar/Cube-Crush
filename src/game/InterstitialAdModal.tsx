import React, { useEffect, useState } from 'react';
import {
  DEFAULT_INTERSTITIAL_AD_UNIT_ID,
  GOOGLE_ADSENSE_CLIENT_ID,
  loadAdConfig,
  recordAdImpression,
} from './RewardedAdModal';

interface InterstitialAdModalProps {
  onClose: () => void;
}

export function InterstitialAdModal({ onClose }: InterstitialAdModalProps) {
  const SKIP_DELAY = 3; // Standard 3-second interstitial close countdown
  const [secondsLeft, setSecondsLeft] = useState<number>(SKIP_DELAY);
  const [canClose, setCanClose] = useState<boolean>(false);
  const [adConfig] = useState(() => loadAdConfig());

  const interstitialUnitId =
    adConfig.interstitialAdUnitId || DEFAULT_INTERSTITIAL_AD_UNIT_ID;
  const slotId = interstitialUnitId.includes('/')
    ? interstitialUnitId.split('/')[1]
    : '1033173712';
  const isGoogleTestUnit = interstitialUnitId.startsWith(
    'ca-app-pub-3940256099942544/'
  );

  useEffect(() => {
    const win = window as unknown as {
      adsbygoogle?: unknown[];
      adBreak?: (opts: Record<string, unknown>) => void;
      Android?: {
        showInterstitial?: (id?: string) => void;
      };
      admob?: {
        interstitial?: {
          config?: (opts: { id: string }) => void;
          prepare?: () => void;
          show?: () => void;
          load?: (opts: { id: string }) => Promise<void>;
        };
      };
    };

    // 1. Trigger Native Android AdMob Interstitial Ad (ca-app-pub-3940256099942544/1033173712)
    try {
      if (win.Android?.showInterstitial) {
        win.Android.showInterstitial(interstitialUnitId);
      } else if (win.admob?.interstitial) {
        if (typeof win.admob.interstitial.load === 'function') {
          win.admob.interstitial
            .load({ id: interstitialUnitId })
            .then(() => win.admob?.interstitial?.show?.())
            .catch(() => {});
        } else {
          win.admob.interstitial.config?.({ id: interstitialUnitId });
          win.admob.interstitial.prepare?.();
          win.admob.interstitial.show?.();
        }
      }
    } catch {
      // Ignore if native APK bridge is not present
    }

    // 2. Push slot to adsbygoogle
    try {
      (win.adsbygoogle = win.adsbygoogle || []).push({});
    } catch {
      // Ignore
    }

    // 3. Trigger Google H5 Games Ads Placement API (next/browse interstitial)
    if (typeof win.adBreak === 'function') {
      try {
        win.adBreak({
          type: 'next',
          name: 'round_interstitial',
          adBreakDone: () => {
            recordAdImpression();
          },
        });
      } catch {
        // Fallback
      }
    }

    recordAdImpression();

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [interstitialUnitId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 select-none">
      {/* Top Interstitial Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#09102A] border-b border-sky-500/25">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono-tabular text-[11px] font-extrabold">
            {isGoogleTestUnit ? 'TEST INTERSTITIAL AD' : 'INTERSTITIAL AD'}
          </span>
          <span className="font-mono-tabular text-xs text-sky-200/90 truncate max-w-[210px] sm:max-w-xs">
            {interstitialUnitId}
          </span>
        </div>

        <button
          type="button"
          disabled={!canClose}
          onClick={onClose}
          className={`px-3.5 py-1.5 rounded-xl font-display font-extrabold text-xs transition-all whitespace-nowrap ${
            canClose
              ? 'bg-white text-slate-950 hover:bg-slate-200 cursor-pointer shadow'
              : 'bg-slate-800 text-slate-400 cursor-not-allowed'
          }`}
        >
          {canClose ? 'Close Ad ✕' : `Close in ${secondsLeft}s`}
        </button>
      </div>

      {/* Fullscreen Interstitial Ad Body */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <ins
          className="adsbygoogle absolute inset-0 z-20"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={
            isGoogleTestUnit
              ? 'ca-pub-3940256099942544'
              : GOOGLE_ADSENSE_CLIENT_ID
          }
          data-ad-slot={slotId}
          data-ad-unit={interstitialUnitId}
          data-ad-format="auto"
          data-full-width-responsive="true"
          {...(isGoogleTestUnit ? { 'data-adtest': 'on' } : {})}
        />

        {/* Official Google AdMob Fullscreen Interstitial Test Preview Card */}
        <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#131F3A] border-2 border-sky-400/70 p-6 flex flex-col items-center gap-3 shadow-2xl pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-mono-tabular text-xs font-black uppercase">
            Google AdMob Interstitial Test Ad
          </span>
          <h3 className="font-display font-black text-2xl text-white">
            Nice job!
          </h3>
          <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed">
            You are displaying a full-screen <strong>Interstitial Test Ad</strong> from AdMob.
          </p>
          <div className="w-full rounded-xl bg-[#0B1326] border border-sky-500/30 px-3 py-2 font-mono-tabular text-xs text-amber-300 break-all">
            {interstitialUnitId}
          </div>
          <span className="text-[11px] text-sky-300/75">
            {canClose
              ? 'Tap "Close Ad ✕" at the top right to continue playing.'
              : `Wait ${secondsLeft}s to close...`}
          </span>
        </div>
      </div>
    </div>
  );
}
