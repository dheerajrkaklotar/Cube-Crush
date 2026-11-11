import React, { useEffect } from 'react';
import {
  DEFAULT_BANNER_AD_UNIT_ID,
  GOOGLE_ADSENSE_CLIENT_ID,
  loadAdConfig,
} from './RewardedAdModal';

export function FixedBannerAd() {
  const adConfig = loadAdConfig();
  const unitId = adConfig.bannerAdUnitId || DEFAULT_BANNER_AD_UNIT_ID;
  const slotId = unitId.includes('/') ? unitId.split('/')[1] : adConfig.adSlotId || '6300978111';
  const isGoogleTestUnit = unitId.startsWith('ca-app-pub-3940256099942544/');

  useEffect(() => {
    const win = window as unknown as {
      adsbygoogle?: unknown[];
      Android?: { showBannerAd?: (id: string) => void };
      admob?: { banner?: { show?: (opts: { id: string }) => void } };
    };

    // 1. Trigger Native Android AdMob Banner if running inside an APK wrapper
    try {
      if (win.Android?.showBannerAd) {
        win.Android.showBannerAd(unitId);
      } else if (win.admob?.banner?.show) {
        win.admob.banner.show({ id: unitId });
      }
    } catch {
      // Ignore if native APK bridge is not present
    }

    // 2. Push fixed 320x50 slot to adsbygoogle
    try {
      (win.adsbygoogle = win.adsbygoogle || []).push({});
    } catch {
      // Ignore if AdSense is still initializing
    }
  }, [unitId]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center py-1 bg-[#0A1230]/95 border-t border-sky-500/25 select-none pointer-events-auto">
      {/* Fixed 320x50 Banner Ad Container */}
      <div
        className="relative w-[320px] h-[50px] bg-[#111927] border border-slate-700/80 overflow-hidden flex items-center justify-between px-2.5 shadow-md"
        style={{ width: '320px', height: '50px' }}
      >
        {/* Live AdSense / AdMob WebView Fixed 320x50 Slot */}
        <ins
          className="adsbygoogle absolute inset-0 z-20"
          style={{ display: 'inline-block', width: '320px', height: '50px' }}
          data-ad-client={
            isGoogleTestUnit ? 'ca-pub-3940256099942544' : GOOGLE_ADSENSE_CLIENT_ID
          }
          data-ad-slot={slotId}
          data-ad-unit={unitId}
          {...(isGoogleTestUnit ? { 'data-adtest': 'on' } : {})}
        />

        {/* Official Google AdMob 320x50 Fixed Test Banner Visual (Visible in Web/APK Test Mode) */}
        <div className="relative z-10 w-full h-full flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-col items-start text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono-tabular text-[9px] font-extrabold uppercase">
                {isGoogleTestUnit ? 'Test Ad' : 'Ad'}
              </span>
              <span className="text-[11px] font-bold text-white truncate max-w-[175px]">
                {isGoogleTestUnit
                  ? 'AdMob 320×50 Test Banner'
                  : 'Sponsored Banner 320×50'}
              </span>
            </div>
            <span className="font-mono-tabular text-[9px] text-sky-300/85 truncate max-w-[235px]">
              {unitId}
            </span>
          </div>

          <span className="px-2 py-1 rounded bg-sky-500 text-slate-950 font-display font-extrabold text-[10px] shrink-0">
            320×50
          </span>
        </div>
      </div>
    </div>
  );
}
