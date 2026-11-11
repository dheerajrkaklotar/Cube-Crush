import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { sound } from './sound';
import { BLOCK_COLOR_LIST, BLOCK_PALETTE, BlockColorId } from './types';

export const GAME_ICON_PATH = './pwa-512x512.png';

interface IntroSequenceProps {
  onComplete: () => void;
}

interface IntroCube {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  color: BlockColorId;
  phase: 'converge' | 'orbit';
  angle: number;
  radius: number;
  orbitSpeed: number;
}

interface ShockRing {
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [progress, setProgress] = useState(0);
  const [phaseText, setPhaseText] = useState('Summoning Cube Matrix...');
  const [isExiting, setIsExiting] = useState(false);
  const soundPlayedRef = useRef(false);

  const triggerSoundIfReady = () => {
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      sound.playIntroFanfare();
    }
  };

  useEffect(() => {
    // Attempt to play intro fanfare immediately
    triggerSoundIfReady();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Create 32 colorful 3D beveled cubes that converge, slam, and burst outward
    const cubes: IntroCube[] = Array.from({ length: 32 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 32 + (Math.random() - 0.5) * 0.2;
      const startDist = Math.max(width, height) * (0.55 + Math.random() * 0.35);
      const color = BLOCK_COLOR_LIST[i % BLOCK_COLOR_LIST.length];
      return {
        x: width / 2 + Math.cos(angle) * startDist,
        y: height / 2 + Math.sin(angle) * startDist,
        vx: 0,
        vy: 0,
        size: 22 + (i % 4) * 8,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 7,
        color,
        phase: 'converge',
        angle,
        radius: 155 + (i % 5) * 38,
        orbitSpeed: (i % 2 === 0 ? 1 : -1) * (0.65 + (i % 3) * 0.25),
      };
    });

    const rings: ShockRing[] = [];
    let burstTriggered = false;
    let flashAlpha = 0;

    const drawMiniBeveledCube = (
      c: CanvasRenderingContext2D,
      size: number,
      colorId: BlockColorId
    ) => {
      const theme = BLOCK_PALETTE[colorId];
      const half = size / 2;
      const b = Math.max(3, size * 0.16);

      // Shadow
      c.fillStyle = 'rgba(10, 18, 42, 0.45)';
      c.beginPath();
      c.roundRect(-half + 2, -half + 3, size, size, 6);
      c.fill();

      // Main face
      c.fillStyle = theme.main;
      c.beginPath();
      c.roundRect(-half, -half, size, size, 6);
      c.fill();

      // Top highlight bevel
      c.fillStyle = theme.topBevel;
      c.fillRect(-half + b * 0.5, -half + b * 0.4, size - b, b * 0.7);

      // Bottom deep shadow bevel
      c.fillStyle = theme.bottomBevel;
      c.fillRect(-half + b * 0.5, half - b * 1.1, size - b, b * 0.75);

      // Inner jewel rim
      c.strokeStyle = theme.innerFacet;
      c.lineWidth = 1.5;
      c.strokeRect(-half + b, -half + b, size - b * 2, size - b * 2);
    };

    const TOTAL_DURATION = 3.9; // seconds
    const SLAM_TIME = 0.62;
    const startTime = performance.now();
    let rafId = 0;
    let completed = false;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const elapsed = (now - startTime) / 1000;
      const pct = Math.min(100, Math.floor((elapsed / TOTAL_DURATION) * 100));
      setProgress(pct);

      if (elapsed > 0.65 && elapsed < 2.2) {
        setPhaseText('CUBE CRUSH! · Charging Blast Core...');
      } else if (elapsed >= 2.2) {
        setPhaseText('Ready to Crush!');
      }

      if (elapsed >= TOTAL_DURATION - 0.35 && !completed) {
        setIsExiting(true);
      }

      if (elapsed >= TOTAL_DURATION && !completed) {
        completed = true;
        onCompleteRef.current();
        return;
      }

      const cx = width / 2;
      const cy = height / 2 - 24;

      // Deep slate-teal radial backdrop matching the CUBE CRUSH! icon palette (#243447 -> #131E2E)
      const bgGrad = ctx.createRadialGradient(
        cx,
        cy,
        30,
        cx,
        cy,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, '#2B4865');
      bgGrad.addColorStop(0.52, '#1E3148');
      bgGrad.addColorStop(1, '#0F1A2C');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Trigger shockwave burst at SLAM_TIME
      if (elapsed >= SLAM_TIME && !burstTriggered) {
        burstTriggered = true;
        flashAlpha = 0.85;
        rings.push(
          {
            radius: 40,
            maxRadius: Math.max(width, height) * 0.65,
            alpha: 1,
            color: '#38BDF8',
            lineWidth: 10,
          },
          {
            radius: 20,
            maxRadius: Math.max(width, height) * 0.5,
            alpha: 0.9,
            color: '#FACC15',
            lineWidth: 6,
          }
        );

        cubes.forEach((cb) => {
          cb.phase = 'orbit';
        });
      }

      // Rotating sunbeams behind the icon after slam
      if (elapsed >= SLAM_TIME) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(elapsed * 0.35);
        const rayCount = 16;
        for (let i = 0; i < rayCount; i++) {
          ctx.rotate((Math.PI * 2) / rayCount);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-28, -Math.max(width, height) * 0.7);
          ctx.lineTo(28, -Math.max(width, height) * 0.7);
          ctx.closePath();
          ctx.fillStyle =
            i % 2 === 0
              ? 'rgba(56, 189, 248, 0.055)'
              : 'rgba(250, 204, 21, 0.045)';
          ctx.fill();
        }
        ctx.restore();
      }

      // Update & draw 3D beveled cubes
      cubes.forEach((cb, idx) => {
        cb.rotation += cb.vRot * 0.016;

        if (cb.phase === 'converge') {
          const t = Math.min(1, elapsed / SLAM_TIME);
          const easeIn = t * t * t;
          const startDist = Math.max(width, height) * 0.65;
          const curDist = startDist * (1 - easeIn);
          cb.x = cx + Math.cos(cb.angle + t * 1.2) * curDist;
          cb.y = cy + Math.sin(cb.angle + t * 1.2) * curDist;
        } else {
          const postT = elapsed - SLAM_TIME;
          const burstOut = 1 - Math.pow(Math.max(0, 1 - postT * 1.8), 3);
          const curAngle = cb.angle + postT * cb.orbitSpeed;
          const curRad =
            cb.radius * burstOut + Math.sin(postT * 3 + idx) * 12;
          cb.x = cx + Math.cos(curAngle) * curRad;
          cb.y = cy + Math.sin(curAngle) * curRad;
        }

        ctx.save();
        ctx.translate(cb.x, cb.y);
        ctx.rotate(cb.rotation);
        drawMiniBeveledCube(ctx, cb.size, cb.color);
        ctx.restore();
      });

      // Draw expanding shockwave rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.radius += (r.maxRadius - r.radius) * 0.085;
        r.alpha *= 0.94;
        if (r.alpha <= 0.02) {
          rings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.alpha;
        ctx.lineWidth = r.lineWidth;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
      }

      // Impact screen flash decay
      if (flashAlpha > 0.01) {
        ctx.save();
        ctx.fillStyle = `rgba(224, 242, 254, ${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        flashAlpha *= 0.84;
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={triggerSoundIfReady}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 overflow-hidden select-none cursor-pointer bg-[#0F1A2C]"
    >
      {/* 60fps Animated Block Burst Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" />

      {/* Top Bar: Studio Kicker */}
      <div className="relative z-10 w-full max-w-xl flex items-center justify-center">
        <span className="text-xs font-semibold tracking-wider text-sky-200/80">
          Cube Crush! Arcade Edition
        </span>
      </div>

      {/* Center Animated Game Icon Hero */}
      <div className="relative z-10 flex flex-col items-center my-auto">
        <motion.div
          initial={{ scale: 0, rotate: -14, opacity: 0 }}
          animate={{
            scale: [0, 1.18, 0.94, 1.04, 1],
            rotate: [-14, 5, -3, 1, 0],
            opacity: [0, 1, 1, 1, 1],
            y: [0, -8, 0, -6, 0],
          }}
          transition={{
            delay: 0.52,
            duration: 1.4,
            times: [0, 0.35, 0.58, 0.78, 1],
            ease: 'easeOut',
          }}
          className="relative group"
        >
          {/* Outer Neon Cyan & Gold Pulse Ring */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.65, 0.95, 0.65],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-3 rounded-[40px] bg-gradient-to-tr from-cyan-400 via-amber-300 to-fuchsia-400 opacity-75 blur-md"
          />

          {/* Game Icon Frame with Sweeping Glossy Light Sheen */}
          <div className="relative w-60 h-60 sm:w-72 sm:h-72 rounded-[36px] overflow-hidden border-4 border-[#39B5D8] shadow-[0_20px_50px_rgba(0,0,0,0.75)] bg-[#253342]">
            <img
              src={GAME_ICON_PATH}
              alt="Cube Crush! Game Icon"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            {/* Animated Specular Light Sweep across the Icon */}
            <motion.div
              initial={{ x: '-140%' }}
              animate={{ x: '220%' }}
              transition={{
                delay: 1.0,
                duration: 1.35,
                repeat: Infinity,
                repeatDelay: 0.9,
                ease: 'easeInOut',
              }}
              className="pointer-events-none absolute inset-y-0 w-24 -skew-x-25 bg-gradient-to-r from-transparent via-white/45 to-transparent"
            />
          </div>

          {/* Floating Sparkle Stars around the Octopus & Cubes */}
          <motion.div
            animate={{ scale: [0.8, 1.3, 0.8], rotate: [0, 25, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute -top-4 -left-4 w-9 h-9 text-amber-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2L12 1Z" />
            </svg>
          </motion.div>

          <motion.div
            animate={{ scale: [1.2, 0.75, 1.2], rotate: [0, -25, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="absolute -bottom-3 -right-4 w-10 h-10 text-cyan-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.9)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2L12 1Z" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Animated Subtitle & Energy Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.45 }}
          className="mt-7 w-64 sm:w-72 flex flex-col items-center gap-2"
        >
          <div className="w-full flex items-center justify-between text-xs font-bold text-sky-100">
            <span>{phaseText}</span>
            <span className="font-mono-tabular text-amber-300">{progress}%</span>
          </div>

          <div className="w-full h-3 rounded-full bg-[#111E30] border border-cyan-400/40 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-300 to-emerald-400 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* Bottom Hint */}
      <div className="relative z-10 text-xs text-sky-200/70">
        Tap anywhere for sound · Starting automatically
      </div>
    </motion.div>
  );
}
