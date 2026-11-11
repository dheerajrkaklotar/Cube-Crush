import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  ADVENTURE_LEVELS,
} from './levels';
import {
  DailyMissionsState,
  updateDailyMissionsOnMove,
} from './missions';
import {
  canPlaceShapeAnywhere,
  canPlaceShapeAt,
  getPredictedClears,
  rotatePieceShape,
  spawnDockBatch,
} from './shapes';
import { sound } from './sound';
import {
  BLOCK_PALETTE,
  BlockColorId,
  ClassicDifficulty,
  CollectibleType,
  DockPiece,
  FloatingCallout,
  FlyingCollectible,
  GameMode,
  GameScreenState,
  GridCell,
  HudSnapshot,
  LaserBeam,
  Particle,
} from './types';

export interface BlockBlastEngineHandle {
  startNewGame: (mode: GameMode, levelId?: number, difficulty?: ClassicDifficulty) => void;
  rotateAvailablePieces: () => void;
  toggleBombMode: () => void;
  refillBoosterTokens: (type: 'ROTATE' | 'BOMB', amount?: number) => void;
}

interface BlockBlastCanvasProps {
  screenState: GameScreenState;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onStateChange: (newState: GameScreenState) => void;
  onMissionsUpdate?: (missionsState: DailyMissionsState) => void;
}

interface BoardMetrics {
  canvasW: number;
  canvasH: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  cellSize: number;
  cellGap: number;
  boardPad: number;
  dockY: number;
  dockH: number;
  dockWidth: number;
  dockX: number;
}

const PRAISE_WORDS = [
  'GOOD!',
  'NICE!',
  'GREAT!',
  'AMAZING!',
  'EXCELLENT!',
  'UNBELIEVABLE!',
  'LEGENDARY!',
];

const ROTATE_TOKENS_KEY = 'cube_crush_rotate_tokens';
const BOMB_TOKENS_KEY = 'cube_crush_bomb_tokens';
const BOOSTERS_INIT_KEY = 'cube_crush_boosters_initialized';

function loadSavedBoosterTokens(): { rotateTokens: number; bombTokens: number } {
  try {
    const initialized = localStorage.getItem(BOOSTERS_INIT_KEY) === 'true';
    if (!initialized) {
      localStorage.setItem(BOOSTERS_INIT_KEY, 'true');
      localStorage.setItem(ROTATE_TOKENS_KEY, '3');
      localStorage.setItem(BOMB_TOKENS_KEY, '3');
      return { rotateTokens: 3, bombTokens: 3 };
    }
    const r = parseInt(localStorage.getItem(ROTATE_TOKENS_KEY) ?? '0', 10);
    const b = parseInt(localStorage.getItem(BOMB_TOKENS_KEY) ?? '0', 10);
    return {
      rotateTokens: Number.isNaN(r) ? 0 : Math.max(0, r),
      bombTokens: Number.isNaN(b) ? 0 : Math.max(0, b),
    };
  } catch {
    return { rotateTokens: 3, bombTokens: 3 };
  }
}

function saveBoosterTokens(rotateTokens: number, bombTokens: number): void {
  try {
    localStorage.setItem(BOOSTERS_INIT_KEY, 'true');
    localStorage.setItem(ROTATE_TOKENS_KEY, String(Math.max(0, rotateTokens)));
    localStorage.setItem(BOMB_TOKENS_KEY, String(Math.max(0, bombTokens)));
  } catch {
    // ignore
  }
}

export const BlockBlastCanvas = forwardRef<BlockBlastEngineHandle, BlockBlastCanvasProps>(
  ({ screenState, onHudUpdate, onStateChange, onMissionsUpdate }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const screenStateRef = useRef<GameScreenState>(screenState);
    screenStateRef.current = screenState;

    const onHudUpdateRef = useRef(onHudUpdate);
    onHudUpdateRef.current = onHudUpdate;

    const onStateChangeRef = useRef(onStateChange);
    onStateChangeRef.current = onStateChange;

    const onMissionsUpdateRef = useRef(onMissionsUpdate);
    onMissionsUpdateRef.current = onMissionsUpdate;

    // Mutable simulation state inside ref so 60fps loop never re-mounts
    const simRef = useRef({
      mode: 'CLASSIC' as GameMode,
      difficulty: 'MEDIUM' as ClassicDifficulty,
      levelId: 1,
      levelName: 'Amethyst Gate',
      score: 0,
      displayScore: 0,
      highScore: 0,
      combo: 0,
      maxCombo: 0,
      movesSinceLastClear: 0,
      linesClearedTotal: 0,
      starsCollected: 0,
      targetStars: 5,
      gemsCollected: 0,
      targetGems: 5,
      targetScore: 400,
      rotateTokens: 3,
      bombTokens: 3,
      activeTool: 'NONE' as 'NONE' | 'BOMB',

      grid: Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, (): GridCell => ({
          filled: false,
          color: 'cyan',
          collectible: 'none',
          placeAnim: 1,
        }))
      ),

      dock: [] as DockPiece[],

      // Drag state
      draggingIndex: null as number | null,
      pointerX: 0,
      pointerY: 0,
      isTouchDrag: false,
      dragScale: 0.6,
      hoverR: null as number | null,
      hoverC: null as number | null,

      // Keyboard cursor state
      kbSelectedIndex: 0 as number | null,
      kbCursorR: 3,
      kbCursorC: 3,
      kbActive: false,

      // Bomb hover
      bombHoverR: null as number | null,
      bombHoverC: null as number | null,

      // Effects & Juice
      hitstopTimer: 0,
      shakeTimer: 0,
      shakeIntensity: 0,
      boardPulse: 0,
      particles: [] as Particle[],
      lasers: [] as LaserBeam[],
      callouts: [] as FloatingCallout[],
      flyingCollectibles: [] as FlyingCollectible[],

      // Background ambient motes
      ambientMotes: Array.from({ length: 22 }, () => ({
        x: Math.random(),
        y: Math.random(),
        size: 8 + Math.random() * 24,
        speed: 0.012 + Math.random() * 0.025,
        alpha: 0.03 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
      })),

      metrics: {
        canvasW: 800,
        canvasH: 900,
        boardX: 160,
        boardY: 110,
        boardSize: 480,
        cellSize: 56,
        cellGap: 3,
        boardPad: 10,
        dockY: 620,
        dockH: 150,
        dockWidth: 480,
        dockX: 160,
      } as BoardMetrics,
    });

    const syncHud = () => {
      const s = simRef.current;
      saveBoosterTokens(s.rotateTokens, s.bombTokens);
      onHudUpdateRef.current({
        score: s.score,
        highScore: s.highScore,
        combo: s.combo,
        maxCombo: s.maxCombo,
        linesClearedTotal: s.linesClearedTotal,
        mode: s.mode,
        difficulty: s.difficulty,
        levelId: s.levelId,
        levelName: s.levelName,
        starsCollected: s.starsCollected,
        targetStars: s.targetStars,
        gemsCollected: s.gemsCollected,
        targetGems: s.targetGems,
        targetScore: s.targetScore,
        rotateTokens: s.rotateTokens,
        bombTokens: s.bombTokens,
        activeTool: s.activeTool,
        selectedDockIndex: s.kbActive ? s.kbSelectedIndex : s.draggingIndex,
      });
    };

    const initGame = (
      mode: GameMode,
      levelId: number = 1,
      difficulty: ClassicDifficulty = 'MEDIUM'
    ) => {
      const s = simRef.current;
      const savedBoosters = loadSavedBoosterTokens();
      s.mode = mode;
      s.difficulty = difficulty;
      s.score = 0;
      s.displayScore = 0;
      s.combo = 0;
      s.maxCombo = 0;
      s.movesSinceLastClear = 0;
      s.linesClearedTotal = 0;
      s.starsCollected = 0;
      s.gemsCollected = 0;
      // Persist hints across rounds & app restarts (3-3 given only on first-ever install)
      s.rotateTokens = savedBoosters.rotateTokens;
      s.bombTokens = savedBoosters.bombTokens;
      s.activeTool = 'NONE';
      s.draggingIndex = null;
      s.hoverR = null;
      s.hoverC = null;
      s.kbActive = false;
      s.kbSelectedIndex = 0;
      s.particles = [];
      s.lasers = [];
      s.callouts = [];
      s.flyingCollectibles = [];

      try {
        const savedHigh = localStorage.getItem('block_blast_high_score');
        if (savedHigh) s.highScore = Math.max(s.highScore, parseInt(savedHigh, 10) || 0);
      } catch {
        // ignore
      }

      // Reset 8x8 grid
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          s.grid[r][c] = {
            filled: false,
            color: 'cyan',
            collectible: 'none',
            placeAnim: 1,
          };
        }
      }

      if (mode === 'ADVENTURE') {
        const level =
          ADVENTURE_LEVELS.find((l) => l.id === levelId) || ADVENTURE_LEVELS[0];
        s.levelId = level.id;
        s.levelName = level.name;
        s.targetStars = level.targetStars;
        s.targetGems = level.targetGems;
        s.targetScore = level.targetScore;

        for (const item of level.initialCells) {
          if (item.r >= 0 && item.r < 8 && item.c >= 0 && item.c < 8) {
            s.grid[item.r][item.c] = {
              filled: true,
              color: item.color,
              collectible: item.collectible || 'none',
              placeAnim: 0,
            };
          }
        }
      } else {
        s.levelId = 1;
        s.levelName = `Classic · ${difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}`;
        s.targetStars = 0;
        s.targetGems = 0;
        s.targetScore = 0;
      }

      s.dock = spawnDockBatch(s.grid, mode, 0, difficulty);
      syncHud();
    };

    const spawnBlockBurst = (
      x: number,
      y: number,
      colorHex: string,
      count: number = 9
    ) => {
      const s = simRef.current;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 90 + Math.random() * 240;
        s.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          size: 6 + Math.random() * 9,
          color: colorHex,
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 12,
          life: 0,
          maxLife: 0.42 + Math.random() * 0.25,
          shape: i % 3 === 0 ? 'spark' : 'square',
        });
      }
    };

    const checkAnyMovesPossible = (): boolean => {
      const s = simRef.current;
      const unplaced = s.dock.filter((d) => !d.placed);
      if (unplaced.length === 0) return true;

      for (const piece of unplaced) {
        if (canPlaceShapeAnywhere(s.grid, piece.shape.matrix)) {
          return true;
        }
      }
      return false;
    };

    const checkAdventureVictory = (): boolean => {
      const s = simRef.current;
      if (s.mode !== 'ADVENTURE') return false;
      return (
        s.starsCollected >= s.targetStars &&
        s.gemsCollected >= s.targetGems &&
        s.score >= s.targetScore
      );
    };

    const executePlacePiece = (
      dockIdx: number,
      startR: number,
      startC: number
    ): boolean => {
      const s = simRef.current;
      const dockPiece = s.dock[dockIdx];
      if (!dockPiece || dockPiece.placed) return false;

      const { matrix, color, collectibles } = dockPiece.shape;
      if (!canPlaceShapeAt(s.grid, matrix, startR, startC)) {
        return false;
      }

      const m = s.metrics;
      let cellsPlaced = 0;
      let sumX = 0;
      let sumY = 0;

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[0].length; c++) {
          if (matrix[r][c] === 1) {
            const gr = startR + r;
            const gc = startC + c;
            const colType = collectibles ? collectibles[r][c] : 'none';
            s.grid[gr][gc] = {
              filled: true,
              color,
              collectible: colType,
              placeAnim: 0,
            };
            cellsPlaced++;
            const cx =
              m.boardX + m.boardPad + gc * (m.cellSize + m.cellGap) + m.cellSize / 2;
            const cy =
              m.boardY + m.boardPad + gr * (m.cellSize + m.cellGap) + m.cellSize / 2;
            sumX += cx;
            sumY += cy;

            // Subtle placement dust particles
            s.particles.push({
              x: cx,
              y: cy,
              vx: (Math.random() - 0.5) * 70,
              vy: (Math.random() - 0.5) * 70,
              size: 4 + Math.random() * 4,
              color: BLOCK_PALETTE[color].topBevel,
              alpha: 0.75,
              rotation: 0,
              vRot: 0,
              life: 0,
              maxLife: 0.22,
              shape: 'spark',
            });
          }
        }
      }

      dockPiece.placed = true;
      s.draggingIndex = null;
      s.hoverR = null;
      s.hoverC = null;

      // Base points for placing cells (10 pts per block cell)
      const placementPoints = cellsPlaced * 10;
      s.score += placementPoints;

      // Check full rows and columns
      const fullRows: number[] = [];
      const fullCols: number[] = [];

      for (let r = 0; r < 8; r++) {
        let full = true;
        for (let c = 0; c < 8; c++) {
          if (!s.grid[r][c].filled) {
            full = false;
            break;
          }
        }
        if (full) fullRows.push(r);
      }

      for (let c = 0; c < 8; c++) {
        let full = true;
        for (let r = 0; r < 8; r++) {
          if (!s.grid[r][c].filled) {
            full = false;
            break;
          }
        }
        if (full) fullCols.push(c);
      }

      const totalLines = fullRows.length + fullCols.length;
      const centerPlacementX = cellsPlaced > 0 ? sumX / cellsPlaced : m.boardX + m.boardSize / 2;
      const centerPlacementY = cellsPlaced > 0 ? sumY / cellsPlaced : m.boardY + m.boardSize / 2;

      if (totalLines > 0) {
        s.combo += 1;
        s.movesSinceLastClear = 0;
        if (s.combo > s.maxCombo) s.maxCombo = s.combo;
        s.linesClearedTotal += totalLines;

        // Reward tactical tokens on high combos
        if (s.combo % 3 === 0) {
          s.rotateTokens = Math.min(9, s.rotateTokens + 1);
        }
        if (totalLines >= 3 || s.combo % 5 === 0) {
          s.bombTokens = Math.min(5, s.bombTokens + 1);
        }

        // Authentic Block Blast line-clear & combo scoring
        const lineBase =
          totalLines === 1
            ? 100
            : totalLines === 2
            ? 300
            : totalLines === 3
            ? 600
            : totalLines * 300;
        const comboBonus = s.combo > 1 ? (s.combo - 1) * 80 * totalLines : 0;
        const clearGain = lineBase + comboBonus;
        s.score += clearGain;

        const themeGlow = BLOCK_PALETTE[color].glow;

        // Spawn laser beams
        for (const r of fullRows) {
          s.lasers.push({
            isRow: true,
            index: r,
            color: themeGlow,
            life: 0,
            maxLife: 0.36,
          });
        }
        for (const c of fullCols) {
          s.lasers.push({
            isRow: false,
            index: c,
            color: themeGlow,
            life: 0,
            maxLife: 0.36,
          });
        }

        // Collect unique cells to clear
        const toClear = new Set<string>();
        for (const r of fullRows) {
          for (let c = 0; c < 8; c++) toClear.add(`${r},${c}`);
        }
        for (const c of fullCols) {
          for (let r = 0; r < 8; r++) toClear.add(`${r},${c}`);
        }

        let collectedAny = false;
        let jewelsCollectedInMove = 0;
        toClear.forEach((key) => {
          const [rStr, cStr] = key.split(',');
          const r = Number(rStr);
          const c = Number(cStr);
          const cell = s.grid[r][c];
          const cx =
            m.boardX + m.boardPad + c * (m.cellSize + m.cellGap) + m.cellSize / 2;
          const cy =
            m.boardY + m.boardPad + r * (m.cellSize + m.cellGap) + m.cellSize / 2;

          spawnBlockBurst(cx, cy, BLOCK_PALETTE[cell.color].main, 8);

          if (cell.collectible === 'star' || cell.collectible === 'gem') {
            collectedAny = true;
            jewelsCollectedInMove++;
            if (cell.collectible === 'star') s.starsCollected++;
            if (cell.collectible === 'gem') s.gemsCollected++;

            s.flyingCollectibles.push({
              id: `fly-${Date.now()}-${r}-${c}`,
              type: cell.collectible,
              startX: cx,
              startY: cy,
              targetX: m.boardX + m.boardSize * (cell.collectible === 'star' ? 0.38 : 0.62),
              targetY: Math.max(28, m.boardY - 42),
              progress: 0,
              color: cell.collectible === 'star' ? '#FACC15' : '#E879F9',
            });
          }

          s.grid[r][c] = {
            filled: false,
            color: 'cyan',
            collectible: 'none',
            placeAnim: 1,
          };
        });

        // Update Daily Missions on line clear
        const missionRes = updateDailyMissionsOnMove({
          linesClearedInMove: totalLines,
          rowsClearedInMove: fullRows.length,
          colsClearedInMove: fullCols.length,
          currentCombo: s.combo,
          currentGameScore: s.score,
          jewelsCollectedInMove,
        });
        if (missionRes.newlyCompleted.length > 0) {
          missionRes.newlyCompleted.forEach((mc) => {
            if (mc.rewardLabel.includes('Bomb')) {
              s.bombTokens = Math.min(9, s.bombTokens + 1);
            } else {
              s.rotateTokens = Math.min(9, s.rotateTokens + 1);
            }
            s.callouts.push({
              id: `mission-${Date.now()}-${mc.id}`,
              text: 'MISSION COMPLETE!',
              subText: `${mc.title} (${mc.rewardLabel})`,
              x: m.boardX + m.boardSize / 2,
              y: m.boardY + m.boardSize * 0.35,
              vy: -50,
              color: '#86EFAC',
              strokeColor: '#064E3B',
              scale: 0.2,
              life: 0,
              maxLife: 1.45,
              isMajor: true,
            });
          });
          sound.playCollectible();
        }
        onMissionsUpdateRef.current?.(missionRes.state);

        // All-clear board bonus!
        let anyLeft = false;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (s.grid[r][c].filled) {
              anyLeft = true;
              break;
            }
          }
        }
        if (!anyLeft) {
          s.score += 500;
          s.callouts.push({
            id: `allclear-${Date.now()}`,
            text: 'ALL CLEAR! +500',
            x: m.boardX + m.boardSize / 2,
            y: m.boardY + m.boardSize / 2 - 40,
            vy: -55,
            color: '#FDE047',
            strokeColor: '#9A3412',
            scale: 0.2,
            life: 0,
            maxLife: 1.35,
            isMajor: true,
          });
        }

        // Hitstop & Camera Shake
        if (totalLines >= 2 || s.combo >= 2) {
          s.hitstopTimer = Math.min(0.065, 0.025 + totalLines * 0.012);
        }
        s.shakeTimer = 0.22 + Math.min(0.2, totalLines * 0.06);
        s.shakeIntensity = Math.min(14, 3 + totalLines * 3 + s.combo * 1.5);
        s.boardPulse = 1;

        // Floating Score & Praise Callout (like screenshot #2: "+200 Amazing!")
        const praiseIdx = Math.min(
          PRAISE_WORDS.length - 1,
          totalLines - 1 + Math.floor(s.combo / 2)
        );
        const praise =
          s.combo >= 2
            ? `COMBO ×${s.combo}!`
            : totalLines >= 2
            ? `${totalLines}× BLAST!`
            : PRAISE_WORDS[praiseIdx];

        s.callouts.push({
          id: `callout-${Date.now()}`,
          text: `+${clearGain}`,
          subText: praise,
          x: Math.max(
            m.boardX + 90,
            Math.min(m.boardX + m.boardSize - 90, centerPlacementX)
          ),
          y: Math.max(m.boardY + 60, centerPlacementY),
          vy: -65,
          color: '#FFFBEB',
          strokeColor: '#0284C7',
          scale: 0.1,
          life: 0,
          maxLife: 1.15,
          isMajor: totalLines >= 2 || s.combo >= 2,
        });

        sound.playLineClear(totalLines, s.combo);
        if (collectedAny) {
          sound.playCollectible();
        }
      } else {
        // Combo grace rule: in Block Blast, you keep your combo streak for up to 2 non-clearing placements in a 3-piece batch!
        s.movesSinceLastClear += 1;
        if (s.movesSinceLastClear >= 3) {
          s.combo = 0;
        }
        sound.playPlace(cellsPlaced);

        // Also update score-based daily missions on non-clearing placement
        const missionRes = updateDailyMissionsOnMove({
          linesClearedInMove: 0,
          rowsClearedInMove: 0,
          colsClearedInMove: 0,
          currentCombo: s.combo,
          currentGameScore: s.score,
          jewelsCollectedInMove: 0,
        });
        if (missionRes.newlyCompleted.length > 0) {
          missionRes.newlyCompleted.forEach((mc) => {
            if (mc.rewardLabel.includes('Bomb')) {
              s.bombTokens = Math.min(9, s.bombTokens + 1);
            } else {
              s.rotateTokens = Math.min(9, s.rotateTokens + 1);
            }
            s.callouts.push({
              id: `mission-${Date.now()}-${mc.id}`,
              text: 'MISSION COMPLETE!',
              subText: `${mc.title} (${mc.rewardLabel})`,
              x: m.boardX + m.boardSize / 2,
              y: m.boardY + m.boardSize * 0.35,
              vy: -50,
              color: '#86EFAC',
              strokeColor: '#064E3B',
              scale: 0.2,
              life: 0,
              maxLife: 1.45,
              isMajor: true,
            });
          });
          sound.playCollectible();
        }
        onMissionsUpdateRef.current?.(missionRes.state);
      }

      if (s.score > s.highScore) {
        s.highScore = s.score;
        try {
          localStorage.setItem('block_blast_high_score', String(s.highScore));
        } catch {
          // ignore
        }
      }

      // Check if all 3 dock pieces are placed -> spawn new batch of 3
      if (s.dock.every((d) => d.placed)) {
        s.dock = spawnDockBatch(s.grid, s.mode, s.score, s.difficulty);
      }

      // Update keyboard selection to next unplaced piece
      const nextUnplaced = s.dock.findIndex((d) => !d.placed);
      s.kbSelectedIndex = nextUnplaced !== -1 ? nextUnplaced : null;

      syncHud();

      // Check Adventure Victory
      if (checkAdventureVictory()) {
        sound.playVictory();
        setTimeout(() => {
          onStateChangeRef.current('VICTORY');
        }, 420);
        return true;
      }

      // Check if any remaining piece can be placed
      if (!checkAnyMovesPossible()) {
        sound.playGameOver();
        setTimeout(() => {
          onStateChangeRef.current('GAME_OVER');
        }, 520);
      }

      return true;
    };

    const executeBombAt = (centerR: number, centerC: number) => {
      const s = simRef.current;
      if (s.bombTokens <= 0) return;

      const m = s.metrics;
      s.bombTokens -= 1;
      s.activeTool = 'NONE';
      s.bombHoverR = null;
      s.bombHoverC = null;

      let blasted = 0;
      for (let r = centerR - 1; r <= centerR + 1; r++) {
        for (let c = centerC - 1; c <= centerC + 1; c++) {
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const cell = s.grid[r][c];
            const cx =
              m.boardX + m.boardPad + c * (m.cellSize + m.cellGap) + m.cellSize / 2;
            const cy =
              m.boardY + m.boardPad + r * (m.cellSize + m.cellGap) + m.cellSize / 2;

            if (cell.filled) {
              blasted++;
              spawnBlockBurst(cx, cy, BLOCK_PALETTE[cell.color].main, 10);
              if (cell.collectible === 'star') s.starsCollected++;
              if (cell.collectible === 'gem') s.gemsCollected++;
              s.grid[r][c] = {
                filled: false,
                color: 'cyan',
                collectible: 'none',
                placeAnim: 1,
              };
            } else {
              spawnBlockBurst(cx, cy, '#38BDF8', 4);
            }
          }
        }
      }

      s.score += blasted * 25;
      if (s.score > s.highScore) s.highScore = s.score;
      s.shakeTimer = 0.28;
      s.shakeIntensity = 11;
      sound.playPowerup();
      sound.playLineClear(2, 2);

      const cx =
        m.boardX + m.boardPad + centerC * (m.cellSize + m.cellGap) + m.cellSize / 2;
      const cy =
        m.boardY + m.boardPad + centerR * (m.cellSize + m.cellGap) + m.cellSize / 2;

      s.callouts.push({
        id: `bomb-${Date.now()}`,
        text: 'MEGA BLAST!',
        subText: `+${blasted * 25}`,
        x: cx,
        y: cy,
        vy: -60,
        color: '#FDE047',
        strokeColor: '#DC2626',
        scale: 0.2,
        life: 0,
        maxLife: 1.0,
        isMajor: true,
      });

      syncHud();
    };

    useImperativeHandle(ref, () => ({
      startNewGame: (
        mode: GameMode,
        levelId: number = 1,
        difficulty: ClassicDifficulty = 'MEDIUM'
      ) => {
        initGame(mode, levelId, difficulty);
      },
      rotateAvailablePieces: () => {
        const s = simRef.current;
        if (s.rotateTokens <= 0) {
          sound.playInvalidDrop();
          return;
        }
        const unplaced = s.dock.filter((d) => !d.placed);
        if (unplaced.length === 0) return;

        s.rotateTokens -= 1;
        s.dock.forEach((d) => {
          if (!d.placed) {
            d.shape = rotatePieceShape(d.shape);
            d.spawnAnim = 0.25;
          }
        });
        sound.playPowerup();
        syncHud();

        // If previously stuck and now still no moves or rescued, re-evaluate
        if (screenStateRef.current === 'PLAYING' && !checkAnyMovesPossible()) {
          // still no moves
        }
      },
      toggleBombMode: () => {
        const s = simRef.current;
        if (s.bombTokens <= 0 && s.activeTool !== 'BOMB') {
          sound.playInvalidDrop();
          return;
        }
        s.activeTool = s.activeTool === 'BOMB' ? 'NONE' : 'BOMB';
        sound.playPickup();
        syncHud();
      },
      refillBoosterTokens: (type: 'ROTATE' | 'BOMB', amount: number = 1) => {
        const s = simRef.current;
        const m = s.metrics;
        if (type === 'ROTATE') {
          s.rotateTokens += amount;
        } else {
          s.bombTokens += amount;
        }
        s.callouts.push({
          id: `ad-refill-${Date.now()}`,
          text: `+${amount} ${type === 'ROTATE' ? 'ROTATE' : 'BOMB'} ${amount === 1 ? 'HINT' : 'HINTS'}!`,
          subText: 'AD REWARD CLAIMED',
          x: m.boardX + m.boardSize / 2,
          y: m.boardY + m.boardSize * 0.4,
          vy: -50,
          color: '#FDE047',
          strokeColor: '#065F46',
          scale: 0.2,
          life: 0,
          maxLife: 1.35,
          isMajor: true,
        });
        sound.playPowerup();
        syncHud();
      },
    }));

    // Initialize default game on mount
    useEffect(() => {
      initGame('CLASSIC', 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Main Canvas Layout, Input Listeners & 60fps Render Loop
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const computeMetrics = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Calculate responsive 8x8 board & bottom dock geometry (reserving 58px at bottom for 320x50 Fixed Banner Ad)
        const topReserved = h < 680 ? 86 : 112;
        const bottomReserved = h < 680 ? 182 : 216;
        const availableH = Math.max(240, h - topReserved - bottomReserved);
        const availableW = Math.max(260, w - 32);

        const boardSize = Math.floor(Math.min(availableW, availableH, 500));
        const boardPad = Math.max(8, Math.floor(boardSize * 0.022));
        const cellGap = Math.max(2, Math.floor(boardSize * 0.007));
        const innerSize = boardSize - boardPad * 2 - cellGap * 7;
        const cellSize = innerSize / 8;

        const boardX = Math.floor((w - boardSize) / 2);
        const boardY = Math.floor(
          topReserved + Math.max(0, (availableH - boardSize) * 0.32)
        );

        const dockY = boardY + boardSize + Math.max(12, Math.floor(bottomReserved * 0.08));
        const dockH = Math.min(136, Math.max(92, h - dockY - 62));
        const dockWidth = Math.min(w - 24, Math.max(boardSize, 340));
        const dockX = Math.floor((w - dockWidth) / 2);

        simRef.current.metrics = {
          canvasW: w,
          canvasH: h,
          boardX,
          boardY,
          boardSize,
          cellSize,
          cellGap,
          boardPad,
          dockY,
          dockH,
          dockWidth,
          dockX,
        };
      };

      computeMetrics();
      window.addEventListener('resize', computeMetrics);

      // Helper to convert dragged pointer coordinates to best 8x8 grid (startR, startC)
      const updateDragHoverGrid = () => {
        const s = simRef.current;
        if (s.draggingIndex === null) {
          s.hoverR = null;
          s.hoverC = null;
          return;
        }
        const piece = s.dock[s.draggingIndex];
        if (!piece || piece.placed) return;

        const m = s.metrics;
        const rows = piece.shape.matrix.length;
        const cols = piece.shape.matrix[0].length;
        const step = m.cellSize + m.cellGap;

        const pieceW = cols * step - m.cellGap;
        const pieceH = rows * step - m.cellGap;

        // Lift piece above finger/cursor so player has unobstructed view
        const liftOffset = s.isTouchDrag ? m.cellSize * 1.65 : m.cellSize * 0.55;
        const topLeftX = s.pointerX - pieceW / 2;
        const topLeftY = s.pointerY - liftOffset - pieceH / 2;

        const rawC = (topLeftX - (m.boardX + m.boardPad)) / step;
        const rawR = (topLeftY - (m.boardY + m.boardPad)) / step;

        const snapC = Math.round(rawC);
        const snapR = Math.round(rawR);

        // Allow magnetic snapping if within 0.78 cell tolerance
        if (
          Math.abs(rawC - snapC) < 0.78 &&
          Math.abs(rawR - snapR) < 0.78 &&
          canPlaceShapeAt(s.grid, piece.shape.matrix, snapR, snapC)
        ) {
          if (s.hoverR !== snapR || s.hoverC !== snapC) {
            s.hoverR = snapR;
            s.hoverC = snapC;
            sound.playHoverSnap();
          }
          return;
        }

        // Check slight neighbor offsets for magnetic forgiveness on tight placements
        const offsets = [
          [0, 0],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
        let bestR: number | null = null;
        let bestC: number | null = null;
        let bestDist = 0.85;

        for (const [dr, dc] of offsets) {
          const tr = snapR + dr;
          const tc = snapC + dc;
          const dist = Math.hypot(rawR - tr, rawC - tc);
          if (
            dist < bestDist &&
            canPlaceShapeAt(s.grid, piece.shape.matrix, tr, tc)
          ) {
            bestDist = dist;
            bestR = tr;
            bestC = tc;
          }
        }

        if (bestR !== s.hoverR || bestC !== s.hoverC) {
          if (bestR !== null && bestC !== null) {
            sound.playHoverSnap();
          }
          s.hoverR = bestR;
          s.hoverC = bestC;
        }
      };

      const handlePointerDown = (e: PointerEvent) => {
        if (screenStateRef.current !== 'PLAYING') return;
        const s = simRef.current;
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const m = s.metrics;

        // Check if Bomb Tool is active and clicking on the 8x8 board
        if (s.activeTool === 'BOMB') {
          const step = m.cellSize + m.cellGap;
          const gc = Math.floor((px - (m.boardX + m.boardPad)) / step);
          const gr = Math.floor((py - (m.boardY + m.boardPad)) / step);
          if (gr >= 0 && gr < 8 && gc >= 0 && gc < 8) {
            executeBombAt(gr, gc);
            return;
          }
        }

        // Check if clicking one of the 3 dock slots
        const slotWidth = m.dockWidth / 3;
        if (
          py >= m.dockY - 24 &&
          py <= m.dockY + m.dockH + 24 &&
          px >= m.dockX - 16 &&
          px <= m.dockX + m.dockWidth + 16
        ) {
          const slotIdx = Math.max(
            0,
            Math.min(2, Math.floor((px - m.dockX) / slotWidth))
          );
          const piece = s.dock[slotIdx];
          if (piece && !piece.placed) {
            s.draggingIndex = slotIdx;
            s.kbActive = false;
            s.pointerX = px;
            s.pointerY = py;
            s.isTouchDrag = e.pointerType === 'touch';
            s.dragScale = 0.62;
            sound.playPickup();
            updateDragHoverGrid();
            syncHud();
          }
        }
      };

      const handlePointerMove = (e: PointerEvent) => {
        const s = simRef.current;
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const m = s.metrics;

        if (s.activeTool === 'BOMB') {
          const step = m.cellSize + m.cellGap;
          const gc = Math.floor((px - (m.boardX + m.boardPad)) / step);
          const gr = Math.floor((py - (m.boardY + m.boardPad)) / step);
          if (gr >= 0 && gr < 8 && gc >= 0 && gc < 8) {
            s.bombHoverR = gr;
            s.bombHoverC = gc;
          } else {
            s.bombHoverR = null;
            s.bombHoverC = null;
          }
        }

        if (s.draggingIndex !== null) {
          s.pointerX = px;
          s.pointerY = py;
          updateDragHoverGrid();
        }
      };

      const handlePointerUp = () => {
        const s = simRef.current;
        if (s.draggingIndex === null) return;

        const idx = s.draggingIndex;
        const hr = s.hoverR;
        const hc = s.hoverC;

        if (hr !== null && hc !== null) {
          const placed = executePlacePiece(idx, hr, hc);
          if (placed) return;
        }

        // Invalid drop -> spring back to dock slot
        const piece = s.dock[idx];
        if (piece) {
          piece.returnAnim = 0;
          piece.dragStartX = s.pointerX;
          piece.dragStartY = s.pointerY;
        }
        s.draggingIndex = null;
        s.hoverR = null;
        s.hoverC = null;
        sound.playInvalidDrop();
        syncHud();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        const s = simRef.current;
        if (e.key === 'Escape') {
          if (screenStateRef.current === 'PLAYING') {
            onStateChangeRef.current('PAUSED');
          } else if (screenStateRef.current === 'PAUSED') {
            onStateChangeRef.current('PLAYING');
          }
          return;
        }

        if (screenStateRef.current === 'TITLE') {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            initGame('CLASSIC', 1);
            onStateChangeRef.current('PLAYING');
          }
          return;
        }

        if (screenStateRef.current !== 'PLAYING') return;

        // Select dock piece 1, 2, 3
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          const idx = Number(e.key) - 1;
          if (s.dock[idx] && !s.dock[idx].placed) {
            s.kbActive = true;
            s.kbSelectedIndex = idx;
            sound.playPickup();
            syncHud();
          }
          return;
        }

        if (e.key === 'Tab') {
          e.preventDefault();
          s.kbActive = true;
          const start = s.kbSelectedIndex ?? 0;
          for (let i = 1; i <= 3; i++) {
            const next = (start + i) % 3;
            if (s.dock[next] && !s.dock[next].placed) {
              s.kbSelectedIndex = next;
              sound.playPickup();
              syncHud();
              break;
            }
          }
          return;
        }

        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          if (s.rotateTokens > 0) {
            s.rotateTokens -= 1;
            s.dock.forEach((d) => {
              if (!d.placed) {
                d.shape = rotatePieceShape(d.shape);
                d.spawnAnim = 0.25;
              }
            });
            sound.playPowerup();
            syncHud();
          } else {
            sound.playInvalidDrop();
          }
          return;
        }

        // Move keyboard placement cursor
        if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(
            e.key
          )
        ) {
          e.preventDefault();
          s.kbActive = true;
          if (s.kbSelectedIndex === null || s.dock[s.kbSelectedIndex]?.placed) {
            const firstAvailable = s.dock.findIndex((d) => !d.placed);
            s.kbSelectedIndex = firstAvailable !== -1 ? firstAvailable : null;
          }
          if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            s.kbCursorR = Math.max(0, s.kbCursorR - 1);
          } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            s.kbCursorR = Math.min(7, s.kbCursorR + 1);
          } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            s.kbCursorC = Math.max(0, s.kbCursorC - 1);
          } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            s.kbCursorC = Math.min(7, s.kbCursorC + 1);
          }
          sound.playHoverSnap();
          syncHud();
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (s.kbActive && s.kbSelectedIndex !== null) {
            const ok = executePlacePiece(
              s.kbSelectedIndex,
              s.kbCursorR,
              s.kbCursorC
            );
            if (!ok) sound.playInvalidDrop();
          }
        }
      };

      const handleBlur = () => {
        const s = simRef.current;
        s.draggingIndex = null;
        s.hoverR = null;
        s.hoverC = null;
      };

      canvas.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('blur', handleBlur);

      // Drawing helpers
      const drawStarIcon = (
        c: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        radius: number
      ) => {
        c.save();
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? radius : radius * 0.44;
          const angle = (Math.PI * i) / 5 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.closePath();
        const grad = c.createRadialGradient(cx, cy - radius * 0.2, 1, cx, cy, radius);
        grad.addColorStop(0, '#FEF08A');
        grad.addColorStop(0.6, '#FACC15');
        grad.addColorStop(1, '#CA8A04');
        c.fillStyle = grad;
        c.shadowColor = 'rgba(250, 204, 21, 0.8)';
        c.shadowBlur = 8;
        c.fill();
        c.lineWidth = 1.5;
        c.strokeStyle = '#FEF9C3';
        c.stroke();
        c.restore();
      };

      const drawGemIcon = (
        c: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        radius: number
      ) => {
        c.save();
        c.beginPath();
        c.moveTo(cx, cy - radius);
        c.lineTo(cx + radius * 0.88, cy);
        c.lineTo(cx, cy + radius);
        c.lineTo(cx - radius * 0.88, cy);
        c.closePath();

        const grad = c.createLinearGradient(
          cx - radius,
          cy - radius,
          cx + radius,
          cy + radius
        );
        grad.addColorStop(0, '#F5D0FE');
        grad.addColorStop(0.5, '#E879F9');
        grad.addColorStop(1, '#A21CAF');
        c.fillStyle = grad;
        c.shadowColor = 'rgba(232, 121, 249, 0.85)';
        c.shadowBlur = 8;
        c.fill();
        c.lineWidth = 1.5;
        c.strokeStyle = '#FAE8FF';
        c.stroke();

        // Inner facet shine
        c.beginPath();
        c.moveTo(cx, cy - radius * 0.52);
        c.lineTo(cx + radius * 0.44, cy);
        c.lineTo(cx, cy + radius * 0.52);
        c.lineTo(cx - radius * 0.44, cy);
        c.closePath();
        c.fillStyle = 'rgba(255, 255, 255, 0.42)';
        c.fill();
        c.restore();
      };

      const drawBeveledBlock = (
        c: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        colorId: BlockColorId,
        alpha: number = 1,
        collectible: CollectibleType = 'none',
        shimmerOverride: BlockColorId | null = null
      ) => {
        const theme = BLOCK_PALETTE[shimmerOverride || colorId];
        const bevel = Math.max(3, size * 0.145);

        c.save();
        c.globalAlpha = alpha;

        // 1. Base outer shadow
        c.fillStyle = 'rgba(8, 15, 40, 0.4)';
        c.beginPath();
        c.roundRect(x + 1, y + 2, size, size, 5);
        c.fill();

        // 2. Top bevel polygon
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + size, y);
        c.lineTo(x + size - bevel, y + bevel);
        c.lineTo(x + bevel, y + bevel);
        c.closePath();
        c.fillStyle = theme.topBevel;
        c.fill();

        // 3. Left bevel polygon
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + bevel, y + bevel);
        c.lineTo(x + bevel, y + size - bevel);
        c.lineTo(x, y + size);
        c.closePath();
        c.fillStyle = theme.sideBevel;
        c.fill();

        // 4. Right bevel polygon
        c.beginPath();
        c.moveTo(x + size, y);
        c.lineTo(x + size, y + size);
        c.lineTo(x + size - bevel, y + size - bevel);
        c.lineTo(x + size - bevel, y + bevel);
        c.closePath();
        c.fillStyle = theme.mainBottom;
        c.fill();

        // 5. Bottom deep bevel polygon
        c.beginPath();
        c.moveTo(x, y + size);
        c.lineTo(x + bevel, y + size - bevel);
        c.lineTo(x + size - bevel, y + size - bevel);
        c.lineTo(x + size, y + size);
        c.closePath();
        c.fillStyle = theme.bottomBevel;
        c.fill();

        // 6. Center jewel face gradient
        const innerX = x + bevel;
        const innerY = y + bevel;
        const innerW = size - bevel * 2;
        const faceGrad = c.createLinearGradient(
          innerX,
          innerY,
          innerX + innerW,
          innerY + innerW
        );
        faceGrad.addColorStop(0, theme.main);
        faceGrad.addColorStop(1, theme.mainBottom);
        c.fillStyle = faceGrad;
        c.fillRect(innerX, innerY, innerW, innerW);

        // 7. Glossy inner top rim highlight
        c.strokeStyle = theme.innerFacet;
        c.lineWidth = Math.max(1, size * 0.032);
        c.strokeRect(innerX + 1, innerY + 1, innerW - 2, innerW - 2);

        // 8. Collectible emblem (Star or Gem)
        if (collectible === 'star') {
          drawStarIcon(c, x + size / 2, y + size / 2, size * 0.28);
        } else if (collectible === 'gem') {
          drawGemIcon(c, x + size / 2, y + size / 2, size * 0.28);
        }

        c.restore();
      };

      // Animation loop
      let lastTime = performance.now();
      let rafId = 0;

      const renderFrame = (now: number) => {
        rafId = requestAnimationFrame(renderFrame);
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Math.min(rawDt, 0.05);

        const s = simRef.current;
        const m = s.metrics;

        // Smooth score count-up
        if (s.displayScore < s.score) {
          const diff = s.score - s.displayScore;
          s.displayScore += Math.max(1, Math.ceil(diff * Math.min(1, dt * 16)));
        } else if (s.displayScore > s.score) {
          s.displayScore = s.score;
        }

        // Hitstop freeze check
        const effectiveDt = s.hitstopTimer > 0 ? dt * 0.08 : dt;
        if (s.hitstopTimer > 0) {
          s.hitstopTimer = Math.max(0, s.hitstopTimer - dt);
        }

        // Camera shake decay
        let shakeX = 0;
        let shakeY = 0;
        if (s.shakeTimer > 0) {
          s.shakeTimer = Math.max(0, s.shakeTimer - dt);
          const mag = s.shakeIntensity * (s.shakeTimer / 0.3);
          shakeX = (Math.random() - 0.5) * mag * 2;
          shakeY = (Math.random() - 0.5) * mag * 2;
        }

        if (s.boardPulse > 0) {
          s.boardPulse = Math.max(0, s.boardPulse - dt * 3.5);
        }

        // 1. Draw Vibrant Block Blast Royal Blue Backdrop
        const bgGrad = ctx.createLinearGradient(0, 0, 0, m.canvasH);
        bgGrad.addColorStop(0, '#3D65DC');
        bgGrad.addColorStop(0.5, '#294BB6');
        bgGrad.addColorStop(1, '#1A3182');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, m.canvasW, m.canvasH);

        // Ambient floating geometric blocks in background
        ctx.save();
        for (const mote of s.ambientMotes) {
          mote.y -= mote.speed * dt;
          if (mote.y < -0.1) {
            mote.y = 1.1;
            mote.x = Math.random();
          }
          const mx = mote.x * m.canvasW;
          const my = mote.y * m.canvasH;
          ctx.fillStyle = `rgba(147, 197, 253, ${mote.alpha})`;
          ctx.beginPath();
          ctx.roundRect(mx, my, mote.size, mote.size, 6);
          ctx.fill();
        }
        ctx.restore();

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Determine active ghost placement (from pointer drag OR keyboard cursor)
        let activePieceIdx: number | null = s.draggingIndex;
        let previewR: number | null = s.hoverR;
        let previewC: number | null = s.hoverC;

        if (
          activePieceIdx === null &&
          s.kbActive &&
          s.kbSelectedIndex !== null &&
          s.dock[s.kbSelectedIndex] &&
          !s.dock[s.kbSelectedIndex].placed
        ) {
          const kbPiece = s.dock[s.kbSelectedIndex];
          if (
            canPlaceShapeAt(
              s.grid,
              kbPiece.shape.matrix,
              s.kbCursorR,
              s.kbCursorC
            )
          ) {
            activePieceIdx = s.kbSelectedIndex;
            previewR = s.kbCursorR;
            previewC = s.kbCursorC;
          }
        }

        // Calculate predicted row/col clears for real-time line highlight!
        let predictedRows: number[] = [];
        let predictedCols: number[] = [];
        let previewColor: BlockColorId | null = null;

        if (
          activePieceIdx !== null &&
          previewR !== null &&
          previewC !== null &&
          s.dock[activePieceIdx]
        ) {
          const piece = s.dock[activePieceIdx];
          previewColor = piece.shape.color;
          const pred = getPredictedClears(
            s.grid,
            piece.shape.matrix,
            previewR,
            previewC
          );
          predictedRows = pred.rows;
          predictedCols = pred.cols;
        }

        // 2. Draw 8x8 Recessed Navy Board Frame
        ctx.save();
        // Outer glow on combo or predicted clear
        if (predictedRows.length > 0 || predictedCols.length > 0 || s.boardPulse > 0) {
          ctx.shadowColor = previewColor
            ? BLOCK_PALETTE[previewColor].glow
            : '#38BDF8';
          ctx.shadowBlur = 18 + s.boardPulse * 14;
        } else {
          ctx.shadowColor = 'rgba(6, 12, 34, 0.55)';
          ctx.shadowBlur = 24;
          ctx.shadowOffsetY = 8;
        }

        // Outer beveled board casing
        ctx.fillStyle = '#1D3175';
        ctx.beginPath();
        ctx.roundRect(m.boardX - 5, m.boardY - 5, m.boardSize + 10, m.boardSize + 10, 16);
        ctx.fill();
        ctx.restore();

        // Inner dark indigo recessed board tray
        ctx.fillStyle = '#111C44';
        ctx.beginPath();
        ctx.roundRect(m.boardX, m.boardY, m.boardSize, m.boardSize, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. Draw 8x8 Grid Slots & Placed Blocks
        const step = m.cellSize + m.cellGap;
        const pulseGlow = 0.65 + 0.35 * Math.sin(now * 0.012);

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const cx = m.boardX + m.boardPad + c * step;
            const cy = m.boardY + m.boardPad + r * step;

            // Empty recessed cell slot
            ctx.fillStyle = '#19275C';
            ctx.beginPath();
            ctx.roundRect(cx, cy, m.cellSize, m.cellSize, 5);
            ctx.fill();

            // Subtle inner shadow top edge inside empty cell
            ctx.strokeStyle = 'rgba(10, 16, 40, 0.45)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx + 0.5, cy + 0.5, m.cellSize - 1, m.cellSize - 1);

            const cell = s.grid[r][c];
            if (cell.filled) {
              if (cell.placeAnim < 1) {
                cell.placeAnim = Math.min(1, cell.placeAnim + effectiveDt * 7.5);
              }
              // Spring scale bounce on newly placed blocks
              const scaleBounce =
                cell.placeAnim < 1
                  ? 0.85 + Math.sin(cell.placeAnim * Math.PI) * 0.22
                  : 1;

              const isPredictedLine =
                predictedRows.includes(r) || predictedCols.includes(c);

              const drawSize = m.cellSize * scaleBounce;
              const offset = (m.cellSize - drawSize) / 2;

              drawBeveledBlock(
                ctx,
                cx + offset,
                cy + offset,
                drawSize,
                cell.color,
                1,
                cell.collectible,
                isPredictedLine && previewColor ? previewColor : null
              );

              if (isPredictedLine) {
                ctx.save();
                ctx.fillStyle = `rgba(255, 255, 255, ${0.28 * pulseGlow})`;
                ctx.fillRect(cx, cy, m.cellSize, m.cellSize);
                ctx.restore();
              }
            }
          }
        }

        // 4. Draw Ghost Piece Preview on Board
        if (
          activePieceIdx !== null &&
          previewR !== null &&
          previewC !== null &&
          s.dock[activePieceIdx]
        ) {
          const piece = s.dock[activePieceIdx];
          const { matrix, color, collectibles } = piece.shape;
          for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[0].length; c++) {
              if (matrix[r][c] === 1) {
                const gr = previewR + r;
                const gc = previewC + c;
                const cx = m.boardX + m.boardPad + gc * step;
                const cy = m.boardY + m.boardPad + gr * step;
                const colType = collectibles ? collectibles[r][c] : 'none';
                drawBeveledBlock(
                  ctx,
                  cx,
                  cy,
                  m.cellSize,
                  color,
                  0.52,
                  colType
                );
              }
            }
          }
        }

        // Draw Keyboard Cursor Outline when using keyboard navigation
        if (s.kbActive && screenStateRef.current === 'PLAYING' && s.draggingIndex === null) {
          const selPiece =
            s.kbSelectedIndex !== null ? s.dock[s.kbSelectedIndex] : null;
          const rows = selPiece ? selPiece.shape.matrix.length : 1;
          const cols = selPiece ? selPiece.shape.matrix[0].length : 1;
          const valid =
            selPiece &&
            canPlaceShapeAt(
              s.grid,
              selPiece.shape.matrix,
              s.kbCursorR,
              s.kbCursorC
            );

          const kx = m.boardX + m.boardPad + s.kbCursorC * step;
          const ky = m.boardY + m.boardPad + s.kbCursorR * step;
          const kw = Math.min(8 - s.kbCursorC, cols) * step - m.cellGap;
          const kh = Math.min(8 - s.kbCursorR, rows) * step - m.cellGap;

          ctx.save();
          ctx.strokeStyle = valid ? '#38BDF8' : '#F43F5E';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(kx - 2, ky - 2, kw + 4, kh + 4);
          ctx.restore();
        }

        // Draw 3x3 Bomb Target Preview if Bomb Tool is active
        if (
          s.activeTool === 'BOMB' &&
          s.bombHoverR !== null &&
          s.bombHoverC !== null
        ) {
          const r0 = Math.max(0, s.bombHoverR - 1);
          const c0 = Math.max(0, s.bombHoverC - 1);
          const r1 = Math.min(7, s.bombHoverR + 1);
          const c1 = Math.min(7, s.bombHoverC + 1);

          const bx = m.boardX + m.boardPad + c0 * step;
          const by = m.boardY + m.boardPad + r0 * step;
          const bw = (c1 - c0 + 1) * step - m.cellGap;
          const bh = (r1 - r0 + 1) * step - m.cellGap;

          ctx.save();
          ctx.fillStyle = `rgba(244, 63, 94, ${0.26 * pulseGlow})`;
          ctx.strokeStyle = '#FB7185';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, 8);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // 5. Draw Predicted Line-Clear Neon Beams
        if (predictedRows.length > 0 || predictedCols.length > 0) {
          const beamColor = previewColor
            ? BLOCK_PALETTE[previewColor].glow
            : '#38BDF8';
          ctx.save();
          ctx.strokeStyle = beamColor;
          ctx.lineWidth = 3;
          ctx.shadowColor = beamColor;
          ctx.shadowBlur = 12;

          for (const r of predictedRows) {
            const ry = m.boardY + m.boardPad + r * step;
            ctx.strokeRect(
              m.boardX + m.boardPad - 2,
              ry - 2,
              m.boardSize - m.boardPad * 2 + 4,
              m.cellSize + 4
            );
          }
          for (const c of predictedCols) {
            const cx = m.boardX + m.boardPad + c * step;
            ctx.strokeRect(
              cx - 2,
              m.boardY + m.boardPad - 2,
              m.cellSize + 4,
              m.boardSize - m.boardPad * 2 + 4
            );
          }
          ctx.restore();
        }

        // 6. Draw Active Line-Clear Laser Sweeps
        for (let i = s.lasers.length - 1; i >= 0; i--) {
          const laser = s.lasers[i];
          laser.life += effectiveDt;
          if (laser.life >= laser.maxLife) {
            s.lasers.splice(i, 1);
            continue;
          }
          const p = laser.life / laser.maxLife;
          const alpha = 1 - p;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = laser.color;
          ctx.shadowBlur = 24;

          if (laser.isRow) {
            const ry = m.boardY + m.boardPad + laser.index * step;
            const h = m.cellSize * (1 - p * 0.45);
            ctx.fillRect(
              m.boardX + m.boardPad,
              ry + (m.cellSize - h) / 2,
              m.boardSize - m.boardPad * 2,
              h
            );
          } else {
            const cx = m.boardX + m.boardPad + laser.index * step;
            const w = m.cellSize * (1 - p * 0.45);
            ctx.fillRect(
              cx + (m.cellSize - w) / 2,
              m.boardY + m.boardPad,
              w,
              m.boardSize - m.boardPad * 2
            );
          }
          ctx.restore();
        }

        // 7. Draw Bottom 3-Piece Dock Tray
        const slotW = m.dockWidth / 3;
        ctx.save();
        ctx.fillStyle = 'rgba(17, 28, 68, 0.55)';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(m.dockX, m.dockY, m.dockWidth, m.dockH, 16);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        for (let idx = 0; idx < 3; idx++) {
          const dockPiece = s.dock[idx];
          if (!dockPiece || dockPiece.placed) continue;

          // Update spawn bounce animation
          if (dockPiece.spawnAnim < 1) {
            dockPiece.spawnAnim = Math.min(1, dockPiece.spawnAnim + effectiveDt * 4.5);
          }
          if (dockPiece.returnAnim < 1) {
            dockPiece.returnAnim = Math.min(1, dockPiece.returnAnim + effectiveDt * 6.5);
          }

          if (s.draggingIndex === idx) continue; // Drawn on top at pointer position

          const slotCenterX = m.dockX + slotW * idx + slotW / 2;
          const slotCenterY = m.dockY + m.dockH / 2;

          // Highlight selected slot if keyboard mode is active
          if (s.kbActive && s.kbSelectedIndex === idx) {
            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
            ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(
              m.dockX + slotW * idx + 6,
              m.dockY + 6,
              slotW - 12,
              m.dockH - 12,
              12
            );
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          const { matrix, color, collectibles } = dockPiece.shape;
          const rows = matrix.length;
          const cols = matrix[0].length;
          const maxDim = Math.max(rows, cols);

          // Fit comfortably inside the dock slot
          const basePreviewCell = Math.min(
            m.cellSize * 0.58,
            (Math.min(slotW, m.dockH) - 24) / Math.max(3, maxDim)
          );

          // Back-out spring ease
          const t = dockPiece.spawnAnim;
          const springScale =
            t < 1 ? 0.3 + Math.sin(t * Math.PI * 0.85) * 0.78 : 1;

          const pCell = basePreviewCell * springScale;
          const pGap = 2;
          const totalW = cols * (pCell + pGap) - pGap;
          const totalH = rows * (pCell + pGap) - pGap;

          // Interpolate from drag release position if snapping back
          let centerX = slotCenterX;
          let centerY = slotCenterY;
          if (dockPiece.returnAnim < 1) {
            const ease = 1 - Math.pow(1 - dockPiece.returnAnim, 3);
            centerX =
              dockPiece.dragStartX + (slotCenterX - dockPiece.dragStartX) * ease;
            centerY =
              dockPiece.dragStartY + (slotCenterY - dockPiece.dragStartY) * ease;
          }

          const startX = centerX - totalW / 2;
          const startY = centerY - totalH / 2;

          // Dim piece slightly if it currently has zero valid moves on the board
          const canFit = canPlaceShapeAnywhere(s.grid, matrix);
          const pieceAlpha = canFit ? 1 : 0.42;

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (matrix[r][c] === 1) {
                const colType = collectibles ? collectibles[r][c] : 'none';
                drawBeveledBlock(
                  ctx,
                  startX + c * (pCell + pGap),
                  startY + r * (pCell + pGap),
                  pCell,
                  color,
                  pieceAlpha,
                  colType
                );
              }
            }
          }
        }

        // 8. Draw Actively Dragged Piece Under Finger / Cursor
        if (s.draggingIndex !== null && s.dock[s.draggingIndex]) {
          const piece = s.dock[s.draggingIndex];
          s.dragScale = Math.min(1, s.dragScale + effectiveDt * 9);

          const { matrix, color, collectibles } = piece.shape;
          const rows = matrix.length;
          const cols = matrix[0].length;
          const dCell = m.cellSize * s.dragScale;
          const dGap = m.cellGap * s.dragScale;
          const pieceW = cols * (dCell + dGap) - dGap;
          const pieceH = rows * (dCell + dGap) - dGap;

          const liftOffset = s.isTouchDrag
            ? m.cellSize * 1.65
            : m.cellSize * 0.55;
          const startX = s.pointerX - pieceW / 2;
          const startY = s.pointerY - liftOffset - pieceH / 2;

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 12;

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (matrix[r][c] === 1) {
                const colType = collectibles ? collectibles[r][c] : 'none';
                drawBeveledBlock(
                  ctx,
                  startX + c * (dCell + dGap),
                  startY + r * (dCell + dGap),
                  dCell,
                  color,
                  0.96,
                  colType
                );
              }
            }
          }
          ctx.restore();
        }

        // 9. Update & Draw Shatter Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const pt = s.particles[i];
          pt.life += effectiveDt;
          if (pt.life >= pt.maxLife) {
            s.particles.splice(i, 1);
            continue;
          }
          const progress = pt.life / pt.maxLife;
          pt.x += pt.vx * effectiveDt;
          pt.y += pt.vy * effectiveDt;
          pt.vy += 460 * effectiveDt; // gravity
          pt.rotation += pt.vRot * effectiveDt;

          ctx.save();
          ctx.globalAlpha = (1 - progress) * pt.alpha;
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rotation);
          ctx.fillStyle = pt.color;

          const sz = pt.size * (1 - progress * 0.35);
          if (pt.shape === 'square') {
            ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, sz * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // 10. Update & Draw Flying Stars / Gems to Top Collector HUD
        for (let i = s.flyingCollectibles.length - 1; i >= 0; i--) {
          const fc = s.flyingCollectibles[i];
          fc.progress += effectiveDt * 2.1;
          if (fc.progress >= 1) {
            spawnBlockBurst(fc.targetX, fc.targetY, fc.color, 6);
            s.flyingCollectibles.splice(i, 1);
            continue;
          }
          const t = fc.progress;
          const ease = 1 - Math.pow(1 - t, 3);
          const arcX =
            fc.startX +
            (fc.targetX - fc.startX) * ease +
            Math.sin(t * Math.PI) * 36;
          const arcY = fc.startY + (fc.targetY - fc.startY) * ease;

          if (fc.type === 'star') {
            drawStarIcon(ctx, arcX, arcY, 15 * (1 + Math.sin(t * Math.PI) * 0.3));
          } else {
            drawGemIcon(ctx, arcX, arcY, 15 * (1 + Math.sin(t * Math.PI) * 0.3));
          }
        }

        // 11. Update & Draw Floating Praise Callouts (+200, Amazing!, Combo x3!)
        for (let i = s.callouts.length - 1; i >= 0; i--) {
          const co = s.callouts[i];
          co.life += effectiveDt;
          if (co.life >= co.maxLife) {
            s.callouts.splice(i, 1);
            continue;
          }
          const p = co.life / co.maxLife;
          co.y += co.vy * effectiveDt;
          co.vy *= 0.94;

          const scale =
            p < 0.18
              ? 0.4 + (p / 0.18) * 0.78
              : p > 0.75
              ? 1.18 - ((p - 0.75) / 0.25) * 0.3
              : 1.18;
          const alpha = p > 0.72 ? 1 - (p - 0.72) / 0.28 : 1;

          ctx.save();
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.translate(co.x, co.y);
          ctx.scale(scale, scale);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.font = `900 ${co.isMajor ? 30 : 25}px Outfit, sans-serif`;
          ctx.lineWidth = 6;
          ctx.strokeStyle = co.strokeColor;
          ctx.strokeText(co.text, 0, 0);
          ctx.fillStyle = co.color;
          ctx.fillText(co.text, 0, 0);

          if (co.subText) {
            ctx.font = `800 20px Outfit, sans-serif`;
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#0F172A';
            ctx.strokeText(co.subText, 0, 28);
            ctx.fillStyle = '#38BDF8';
            ctx.fillText(co.subText, 0, 28);
          }
          ctx.restore();
        }

        ctx.restore();
      };

      rafId = requestAnimationFrame(renderFrame);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', computeMetrics);
        canvas.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('blur', handleBlur);
      };
    }, []);

    return (
      <div className="relative w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-grab active:cursor-grabbing"
        />
      </div>
    );
  }
);
