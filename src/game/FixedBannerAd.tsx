import React, { useEffect, useState } from 'react';
import {
  DEFAULT_BANNER_AD_UNIT_ID,
  GOOGLE_ADMOB_APP_ID,
  GOOGLE_ADSENSE_CLIENT_ID,
} from './RewardedAdModal';

const SPONSORED_BANNER_SLIDES = [
  {
    badge: 'Ad',
    headline: 'Cube Crush! Pro Challenge',
    subtext: 'Master 8×8 Jewel Combos · Play Now',
    cta: 'OPEN',
  },
  {
    badge: 'Ad',
    headline: 'Google Play Arcade Picks',
    subtext: 'Top Rated Offline Puzzle Games',
    cta: 'VIEW',
  },
  {
    badge: 'Ad',
    headline: 'Daily Streak Booster Pack',
    subtext: 'Complete Daily Missions for Free Hints',
    cta: 'PLAY',
  },
];

export function FixedBannerAd() {
  const unitId = DEFAULT_BANNER_AD_UNIT_ID; // ca-app-pub-8252748238984276/8476685886
  const slotId = unitId.split('/')[1] || '8476685886';
  const [slideIndex, setSlideIndex] = useState(0);
  const [nativeBannerLoaded, setNativeBannerLoaded] = useState(false);

  useEffect(() => {
    const win = window as unknown as {
      adsbygoogle?: unknown[];
      Android?: {
        initializeAdMob?: (appId: string) => void;
        showBannerAd?: (id: string) => void;
      };
      admob?: {
        banner?: {
          config?: (opts: { id: string; autoShow?: boolean }) => void;
          prepare?: () => void;
          show?: (opts?: { id: string }) => void;
        };
        BannerAd?: new (opts: { adUnitId: string; position?: string }) => {
          show: () => Promise<void>;
        };
      };
    };

    const handleNativeBannerLoaded = () => {
      setNativeBannerLoaded(true);
    };

    window.addEventListener('admob-banner-loaded', handleNativeBannerLoaded);

    // 1. Trigger Real Native Android AdMob Banner (ca-app-pub-8252748238984276/8476685886)
    const triggerBanner = () => {
      try {
        win.Android?.initializeAdMob?.(GOOGLE_ADMOB_APP_ID);
        if (win.Android?.showBannerAd) {
          win.Android.showBannerAd(unitId);
        } else if (win.admob?.BannerAd) {
          const banner = new win.admob.BannerAd({
            adUnitId: unitId,
            position: 'bottom',
          });
          banner.show().catch(() => {});
        } else if (win.admob?.banner) {
          win.admob.banner.config?.({ id: unitId, autoShow: true });
          win.admob.banner.prepare?.();
          win.admob.banner.show?.({ id: unitId });
        }
      } catch {
        // Ignore if native APK bridge is not present
      }
    };

    triggerBanner();

    // 2. Push fixed 320x50 real slot to Google AdSense / AdMob Web
    try {
      (win.adsbygoogle = win.adsbygoogle || []).push({});
    } catch {
      // Ignore if AdSense is still initializing
    }

    // Rotate banner visual every 30s (standard AdMob banner refresh interval)
    const refreshTimer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SPONSORED_BANNER_SLIDES.length);
      triggerBanner();
    }, 30000);

    return () => {
      window.removeEventListener('admob-banner-loaded', handleNativeBannerLoaded);
      window.clearInterval(refreshTimer);
    };
  }, [unitId]);

  // If the native Android AdView has loaded on top of the bottom bar, keep the 50px reserved space clean
  if (nativeBannerLoaded) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 h-[52px] bg-[#0A1230]/95 border-t border-sky-500/25 select-none pointer-events-none" />
    );
  }

  const currentSlide = SPONSORED_BANNER_SLIDES[slideIndex];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center py-1 bg-[#0A1230]/95 border-t border-sky-500/25 select-none pointer-events-auto">
      {/* Fixed 320x50 Real Banner Ad Container (ca-app-pub-8252748238984276/8476685886) */}
      <div
        className="relative w-[320px] h-[50px] bg-gradient-to-r from-[#111C38] via-[#16264C] to-[#111C38] border border-sky-400/40 rounded overflow-hidden flex items-center justify-between px-2.5 shadow-md"
        style={{ width: '320px', height: '50px' }}
      >
        {/* Live Google AdMob / AdSense 320x50 Banner Slot */}
        <ins
          className="adsbygoogle absolute inset-0 z-20"
          style={{ display: 'inline-block', width: '320px', height: '50px' }}
          data-ad-client={GOOGLE_ADSENSE_CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-unit={unitId}
          data-admob-app-id={GOOGLE_ADMOB_APP_ID}
        />

        {/* Active 320x50 Banner Ad Visual (Always visible when WebView/AdSense slot is unfilled) */}
        <div className="relative z-10 w-full h-full flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-display font-black text-xs shrink-0 shadow">
              AD
            </div>
            <div className="flex flex-col items-start text-left leading-tight min-w-0">
              <div className="flex items-center gap-1.5 w-full">
                <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-mono-tabular text-[8px] font-extrabold uppercase shrink-0">
                  {currentSlide.badge}
                </span>
                <span className="text-[11px] font-extrabold text-white truncate">
                  {currentSlide.headline}
                </span>
              </div>
              <span className="text-[10px] text-sky-200/85 truncate w-full">
                {currentSlide.subtext}
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-emerald-400 text-slate-950 font-display font-black text-[10px] shrink-0 shadow-sm">
            {currentSlide.cta}
          </span>
        </div>
      </div>
    </div>
  );
}
