import React, { useState } from 'react';
import { sound } from './sound';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export function PrivacyPolicyModal({ onClose }: PrivacyPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<'POLICY' | 'TERMS'>('POLICY');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#070E29]/90 select-text">
      <div className="w-full max-w-2xl max-h-[88vh] rounded-3xl bg-[#132259] border-2 border-[#3B5FD9] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0E1A45] border-b border-[#2A45A3] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <h2 className="font-display font-black text-lg sm:text-xl text-white leading-tight">
                Cube Crush! — Privacy Policy
              </h2>
              <span className="text-[11px] text-sky-300/80 font-medium">
                Official Game Privacy, AdMob Disclosure & Terms
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playPickup();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#1D327A] hover:bg-[#2845A8] border border-sky-400/40 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-[#101D4C] border-b border-[#253E94] shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              sound.playPickup();
              setActiveTab('POLICY');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'POLICY'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-[#192D73] text-sky-200 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playPickup();
              setActiveTab('TERMS');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'TERMS'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-[#192D73] text-sky-200 hover:text-white'
            }`}
          >
            Game Rules & Terms
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left text-xs sm:text-sm text-sky-100/90 leading-relaxed">
          {activeTab === 'POLICY' && (
            <>
              <div className="rounded-2xl bg-[#0E1A45] border border-[#2B46A0] p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-sky-300/75">App Name: </span>
                  <strong className="text-white">Cube Crush! (8×8 Block Puzzle)</strong>
                </div>
                <div>
                  <span className="text-sky-300/75">Package ID: </span>
                  <span className="font-mono-tabular text-amber-300">com.cubecrush.blockblast</span>
                </div>
                <div>
                  <span className="text-sky-300/75">Contact: </span>
                  <span className="text-emerald-300">dheerajkaklotar352@gmail.com</span>
                </div>
              </div>

              <section className="space-y-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                  1. Overview & Commitment to Privacy
                </h3>
                <p>
                  Welcome to <strong>Cube Crush!</strong> (&ldquo;the Game&rdquo;). We respect your privacy and designed Cube Crush! so you can enjoy 8×8 jewel block puzzle gameplay in both Classic Mode and Adventure Mode without creating an account or sharing personal identity data.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                  2. Personal Data We Do Not Collect
                </h3>
                <p>
                  The Game does <strong>not</strong> request, access, or store your name, phone number, email address, contacts, camera, microphone, photos, or precise GPS location.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                  3. On-Device Gameplay Storage (LocalStorage)
                </h3>
                <p>
                  Your game progress is saved strictly on your own device using local storage so it persists across sessions:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sky-100/85">
                  <li>High Scores and Classic Mode Difficulty selection (Easy, Medium, Hard).</li>
                  <li>Daily Streak counter and 24-hour resetting Daily Missions progress.</li>
                  <li>Rotate Hint and Mega Bomb Hint token balances.</li>
                  <li>Music Volume (0%–100%), Music Speed (Slow, Normal, Fast), and Mute settings.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                  4. Advertising & Third-Party SDKs (Google AdMob & AdSense)
                </h3>
                <p>
                  To keep Cube Crush! free for all players, the Game integrates <strong>Google AdMob</strong> and <strong>Google AdSense</strong> to display:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sky-100/85">
                  <li>
                    <strong>320×50 Bottom Banner Ads</strong> during menu and gameplay screens.
                  </li>
                  <li>
                    <strong>Full-Screen Interstitial Ads</strong> between completed or restarted rounds.
                  </li>
                  <li>
                    <strong>Optional Full-Screen Rewarded Video Ads</strong> when you voluntarily choose to watch an ad to receive <strong>+1 Rotate Hint</strong> or <strong>+1 Mega Bomb Hint</strong>.
                  </li>
                </ul>
                <p className="text-xs text-sky-200/80 mt-1">
                  Google AdMob may use your device&apos;s Advertising ID, coarse IP region, and ad performance metrics to provide and measure advertisements in compliance with{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-300 underline hover:text-white"
                  >
                    Google&apos;s Privacy Policy
                  </a>
                  . You can reset your Advertising ID or opt out of personalized ads anytime in your Android device Settings.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                  5. Children&apos;s Privacy & Family Safety
                </h3>
                <p>
                  Cube Crush! is an arcade puzzle game suitable for general audiences. We do not knowingly collect personal information from children under 13. If you have any questions, contact us at{' '}
                  <strong className="text-white">dheerajkaklotar352@gmail.com</strong>.
                </p>
              </section>
            </>
          )}

          {activeTab === 'TERMS' && (
            <>
              <section className="space-y-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                  1. Gameplay Modes & Scoring
                </h3>
                <p>
                  Cube Crush! features <strong>Classic Mode</strong> (Easy, Medium, and Hard spawn difficulties) and <strong>Adventure Mode</strong> (6 progressive stages collecting Stars & Gems). Clearing multiple horizontal or vertical lines simultaneously or on consecutive moves awards Combo multipliers.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                  2. Hints, Boosters & Rewarded Ads
                </h3>
                <p>
                  New installations start with <strong>3 Rotate Hints</strong> and <strong>3 Mega Bomb Hints</strong>. Hint balances are saved persistently across matches and do not automatically reset on game restart. Players can earn additional hints by completing Daily Missions or watching a full-screen Rewarded Video Ad (+1 hint per completed ad).
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                  3. Contact & Support
                </h3>
                <p>
                  For support, bug reports, or privacy inquiries regarding Cube Crush!, reach out to:{' '}
                  <strong className="text-emerald-300">dheerajkaklotar352@gmail.com</strong>.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#0E1A45] border-t border-[#2A45A3] flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-sky-300/75">
            Cube Crush! v1.0.0 · Developer: dheerajkaklotar352@gmail.com
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playPickup();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-black text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
