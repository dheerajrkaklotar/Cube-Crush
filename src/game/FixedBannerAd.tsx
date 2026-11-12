import React, { useEffect } from 'react';
import {
  DEFAULT_BANNER_AD_UNIT_ID,
  GOOGLE_ADMOB_APP_ID,
  GOOGLE_ADSENSE_CLIENT_ID,
} from './RewardedAdModal';

export function FixedBannerAd() {
  const unitId = DEFAULT_BANNER_AD_UNIT_ID; // ca-app-pub-8252748238984276/8476685886
  const slotId = unitId.split('/')[1] || '8476685886';

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

    // 1. Trigger Real Native Android AdMob Banner (ca-app-pub-8252748238984276/8476685886)
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

    // 2. Push fixed 320x50 real slot to Google AdSense / AdMob Web
    try {
      (win.adsbygoogle = win.adsbygoogle || []).push({});
    } catch {
      // Ignore if AdSense is still initializing
    }
  }, [unitId]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center py-1 bg-[#0A1230]/95 border-t border-sky-500/25 select-none pointer-events-auto">
      {/* Fixed 320x50 Real Banner Ad Container (ca-app-pub-8252748238984276/8476685886) */}
      <div
        className="relative w-[320px] h-[50px] bg-[#111927] border border-slate-700/80 overflow-hidden flex items-center justify-center shadow-md"
        style={{ width: '320px', height: '50px' }}
      >
        {/* Live Google AdMob / AdSense 320x50 Banner Slot */}
        <ins
          className="adsbygoogle relative z-20"
          style={{ display: 'inline-block', width: '320px', height: '50px' }}
          data-ad-client={GOOGLE_ADSENSE_CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-unit={unitId}
          data-admob-app-id={GOOGLE_ADMOB_APP_ID}
        />

        {/* Subtle background placeholder behind live ad slot */}
        <div className="absolute inset-0 z-10 flex items-center justify-between px-3 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono-tabular text-[9px] font-extrabold uppercase">
              Ad
            </span>
            <span className="text-[11px] font-semibold text-sky-100/85">
              Sponsored
            </span>
          </div>
          <span className="font-mono-tabular text-[9px] text-sky-300/60">
            320×50
          </span>
        </div>
      </div>
    </div>
  );
}
