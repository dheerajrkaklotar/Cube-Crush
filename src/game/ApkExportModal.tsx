import React, { useEffect, useState } from 'react';
import { GAME_ICON_PATH } from './IntroSequence';
import {
  AdConfig,
  GOOGLE_ADSENSE_CLIENT_ID,
  loadAdConfig,
  saveAdConfig,
} from './RewardedAdModal';

interface ApkExportModalProps {
  onClose: () => void;
}

export function ApkExportModal({ onClose }: ApkExportModalProps) {
  const [adConfig, setAdConfig] = useState<AdConfig>(() => loadAdConfig());
  const [savedNotice, setSavedNotice] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => {
          if (k.includes('v1') || k.includes('v2')) {
            caches.delete(k);
          }
        });
      });
    }
  }, []);

  const handleSaveAdSettings = () => {
    saveAdConfig(adConfig);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleDownloadFile = async (
    url: string,
    filename: string,
    mimeType: string,
    useNativeShare: boolean = false
  ) => {
    const key = `${filename}-${useNativeShare ? 'share' : 'dl'}`;
    try {
      setDownloadingKey(key);
      setStatusMessage(`Preparing ${filename}...`);

      const res = await fetch(`${url}?t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buf = await res.arrayBuffer();
      if (filename.endsWith('.zip')) {
        const bytes = new Uint8Array(buf);
        if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
          throw new Error('Server returned HTML instead of ZIP');
        }
      }

      const blob = new Blob([buf], { type: mimeType });
      const file = new File([blob], filename, { type: mimeType });

      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (
        useNativeShare &&
        typeof nav.share === 'function' &&
        (!nav.canShare || nav.canShare({ files: [file] }))
      ) {
        await nav.share({
          files: [file],
          title: filename,
        });
        setStatusMessage(`✓ ${filename} saved/shared!`);
        setDownloadingKey(null);
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      setStatusMessage(`✓ ${filename} downloaded successfully!`);
    } catch (err) {
      setStatusMessage(
        `Error: ${err instanceof Error ? err.message : 'Download failed'}`
      );
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 select-none overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-[#122052] border-2 border-sky-400/70 overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0B1437] border-b border-sky-500/25">
          <div className="flex items-center gap-3">
            <img
              src={GAME_ICON_PATH}
              alt="Cube Crush!"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl border border-sky-400 object-cover"
            />
            <div className="flex flex-col text-left">
              <h2 className="font-display font-black text-lg sm:text-xl text-white leading-tight">
                AI Studio Creator Export (Hidden on Web)
              </h2>
              <span className="text-xs text-sky-300/85">
                AdSense: {GOOGLE_ADSENSE_CLIENT_ID} · PWABuilder Fixed
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1A2D70] hover:bg-[#243D96] text-sky-200 font-bold text-sm flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-left max-h-[78vh] overflow-y-auto">
          {/* Step 1: Fixed PWABuilder + Netlify ZIP & Individual Fixed Files */}
          <div className="rounded-2xl bg-[#182B6B] border border-emerald-400/70 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-extrabold text-sm sm:text-base text-emerald-300">
                1. PWABuilder Fixed Files (manifest.json + pwabuilder-sw.js)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-tabular text-[10px] font-extrabold">
                FIXED
              </span>
            </div>
            <p className="text-xs text-sky-100/90 leading-relaxed">
              <code>manifest.json</code> (valid <code>start_url: &quot;/&quot;</code> aur{' '}
              <code>192x192 / 512x512 icons</code>) aur{' '}
              <code>pwabuilder-sw.js</code> (valid <code>/offline.html</code>) dono ka error solve karke nayi{' '}
              <code>cube-crush-web-game.zip</code> me daal diya gaya hai! Is nayi ZIP ko{' '}
              <strong>Netlify</strong> par upload karein (is ZIP me کوئی export button nahi hai):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={downloadingKey !== null}
                onClick={() =>
                  handleDownloadFile(
                    '/downloads/cube-crush-web-game.zip',
                    'cube-crush-web-game.zip',
                    'application/zip',
                    false
                  )
                }
                className="py-3 px-4 rounded-xl bg-gradient-to-b from-emerald-300 to-emerald-500 text-slate-950 font-display font-extrabold text-xs sm:text-sm text-center shadow-md hover:brightness-105 transition-all cursor-pointer disabled:opacity-60"
              >
                ⬇ Download Fixed .ZIP
              </button>

              <button
                type="button"
                disabled={downloadingKey !== null}
                onClick={() =>
                  handleDownloadFile(
                    '/downloads/cube-crush-web-game.zip',
                    'cube-crush-web-game.zip',
                    'application/zip',
                    true
                  )
                }
                className="py-3 px-4 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-display font-extrabold text-xs sm:text-sm text-center shadow-md hover:brightness-105 transition-all cursor-pointer disabled:opacity-60"
              >
                📤 Share / Save .ZIP to Phone
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={downloadingKey !== null}
                onClick={() =>
                  handleDownloadFile(
                    '/manifest.json',
                    'manifest.json',
                    'application/json',
                    false
                  )
                }
                className="py-2 px-3 rounded-xl bg-[#0D1842] hover:bg-[#162766] border border-sky-400/40 text-sky-200 font-mono-tabular text-xs font-bold cursor-pointer"
              >
                ⬇ manifest.json
              </button>

              <button
                type="button"
                disabled={downloadingKey !== null}
                onClick={() =>
                  handleDownloadFile(
                    '/pwabuilder-sw.js',
                    'pwabuilder-sw.js',
                    'application/javascript',
                    false
                  )
                }
                className="py-2 px-3 rounded-xl bg-[#0D1842] hover:bg-[#162766] border border-sky-400/40 text-sky-200 font-mono-tabular text-xs font-bold cursor-pointer"
              >
                ⬇ pwabuilder-sw.js
              </button>
            </div>

            {statusMessage && (
              <div className="rounded-xl bg-[#0D173B] border border-sky-400/40 px-3 py-2 text-xs font-semibold text-amber-300">
                {statusMessage}
              </div>
            )}
          </div>

          {/* Active AdMob / AdSense Unit IDs */}
          <div className="rounded-2xl bg-[#182B6B] border border-[#3859C4] p-4 flex flex-col gap-3">
            <span className="font-display font-extrabold text-sm text-sky-200">
              2. Active AdMob / AdSense Unit IDs
            </span>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-sky-200">
                Fixed-Size Banner Ad Unit ID (320×50)
              </label>
              <input
                type="text"
                value={adConfig.bannerAdUnitId}
                onChange={(e) =>
                  setAdConfig({ ...adConfig, bannerAdUnitId: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0D173B] border border-[#2A45A3] text-xs text-white font-mono-tabular"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-sky-200">
                Interstitial Ad Unit ID (Between Rounds)
              </label>
              <input
                type="text"
                value={adConfig.interstitialAdUnitId}
                onChange={(e) =>
                  setAdConfig({
                    ...adConfig,
                    interstitialAdUnitId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0D173B] border border-[#2A45A3] text-xs text-white font-mono-tabular"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-sky-200">
                Rewarded Ad Unit ID (+1 Hint Refill)
              </label>
              <input
                type="text"
                value={adConfig.rewardedAdUnitId}
                onChange={(e) =>
                  setAdConfig({ ...adConfig, rewardedAdUnitId: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0D173B] border border-[#2A45A3] text-xs text-white font-mono-tabular"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveAdSettings}
              className="py-2 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-extrabold text-xs cursor-pointer self-start"
            >
              {savedNotice ? '✓ Saved Ad Settings!' : 'Save Ad Settings'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#0E1942] border-t border-sky-500/20 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#22398E] hover:bg-[#2C48B0] text-white font-display font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
