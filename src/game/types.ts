export type BlockColorId = 'red' | 'yellow' | 'green' | 'cyan' | 'purple' | 'orange';

export type CollectibleType = 'none' | 'star' | 'gem';

export type GameMode = 'CLASSIC' | 'ADVENTURE';

export type ClassicDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type GameScreenState = 'INTRO' | 'TITLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export interface BlockColorTheme {
  id: BlockColorId;
  name: string;
  main: string;       // Primary face gradient top-left
  mainBottom: string; // Primary face gradient bottom-right
  topBevel: string;   // Bright specular top/left bevel
  sideBevel: string;  // Medium side bevel
  bottomBevel: string;// Deep shadow bottom/right bevel
  innerFacet: string; // Subtle glossy inner square rim
  glow: string;       // Particle and laser glow color
}

export const BLOCK_PALETTE: Record<BlockColorId, BlockColorTheme> = {
  red: {
    id: 'red',
    name: 'Ruby Red',
    main: '#FF3B56',
    mainBottom: '#D91432',
    topBevel: '#FF8596',
    sideBevel: '#EE2241',
    bottomBevel: '#98081E',
    innerFacet: 'rgba(255, 190, 200, 0.35)',
    glow: '#FF4D67',
  },
  yellow: {
    id: 'yellow',
    name: 'Golden Sun',
    main: '#FFCA28',
    mainBottom: '#F59E0B',
    topBevel: '#FFF085',
    sideBevel: '#FBBF24',
    bottomBevel: '#B45309',
    innerFacet: 'rgba(255, 250, 205, 0.45)',
    glow: '#FACC15',
  },
  green: {
    id: 'green',
    name: 'Emerald Mint',
    main: '#2CE574',
    mainBottom: '#10B952',
    topBevel: '#86F7B0',
    sideBevel: '#18CC5E',
    bottomBevel: '#077833',
    innerFacet: 'rgba(200, 255, 220, 0.38)',
    glow: '#34D399',
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Sky',
    main: '#1AD1FF',
    mainBottom: '#0095EB',
    topBevel: '#94EAFF',
    sideBevel: '#05B2F5',
    bottomBevel: '#005A9E',
    innerFacet: 'rgba(200, 245, 255, 0.42)',
    glow: '#38BDF8',
  },
  purple: {
    id: 'purple',
    name: 'Amethyst Jewel',
    main: '#B85CFF',
    mainBottom: '#8429DE',
    topBevel: '#DFA8FF',
    sideBevel: '#9E3FEF',
    bottomBevel: '#53109C',
    innerFacet: 'rgba(235, 205, 255, 0.38)',
    glow: '#C084FC',
  },
  orange: {
    id: 'orange',
    name: 'Tangerine Blaze',
    main: '#FF7B29',
    mainBottom: '#EA4C0F',
    topBevel: '#FFB585',
    sideBevel: '#F56218',
    bottomBevel: '#9E2B04',
    innerFacet: 'rgba(255, 220, 190, 0.38)',
    glow: '#FB923C',
  },
};

export const BLOCK_COLOR_LIST: BlockColorId[] = ['red', 'yellow', 'green', 'cyan', 'purple', 'orange'];

export interface GridCell {
  filled: boolean;
  color: BlockColorId;
  collectible: CollectibleType;
  placeAnim: number; // 0 to 1 scale bounce when newly placed
}

export interface PieceShape {
  id: string;
  name: string;
  matrix: number[][]; // 2D array of 0/1
  color: BlockColorId;
  collectibles?: CollectibleType[][]; // matches matrix dimensions
}

export interface DockPiece {
  uid: string;
  shape: PieceShape;
  placed: boolean;
  spawnAnim: number; // 0 to 1 spring in
  returnAnim: number; // 0 to 1 when snapping back
  dragStartX: number;
  dragStartY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  shape: 'square' | 'spark' | 'ring';
}

export interface LaserBeam {
  isRow: boolean;
  index: number; // 0..7
  color: string;
  life: number;
  maxLife: number;
}

export interface FloatingCallout {
  id: string;
  text: string;
  subText?: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  strokeColor: string;
  scale: number;
  life: number;
  maxLife: number;
  isMajor: boolean;
}

export interface FlyingCollectible {
  id: string;
  type: CollectibleType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0..1
  color: string;
}

export interface AdventureLevel {
  id: number;
  name: string;
  subtitle: string;
  targetStars: number;
  targetGems: number;
  targetScore: number;
  initialCells: {
    r: number;
    c: number;
    color: BlockColorId;
    collectible?: CollectibleType;
  }[];
}

export interface HudSnapshot {
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  linesClearedTotal: number;
  mode: GameMode;
  difficulty: ClassicDifficulty;
  levelId: number;
  levelName: string;
  starsCollected: number;
  targetStars: number;
  gemsCollected: number;
  targetGems: number;
  targetScore: number;
  rotateTokens: number;
  bombTokens: number;
  activeTool: 'NONE' | 'BOMB';
  selectedDockIndex: number | null;
}
