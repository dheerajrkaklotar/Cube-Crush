import {
  BLOCK_COLOR_LIST,
  BlockColorId,
  ClassicDifficulty,
  CollectibleType,
  DockPiece,
  GameMode,
  GridCell,
  PieceShape,
} from './types';

export interface ShapeTemplate {
  id: string;
  name: string;
  matrix: number[][];
  preferredColor: BlockColorId;
  weight: number; // probability weight
  difficulty: 'easy' | 'medium' | 'hard';
}

export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  // Small & forgiving shapes
  {
    id: 'dot-1',
    name: 'Single Jewel',
    matrix: [[1]],
    preferredColor: 'yellow',
    weight: 7,
    difficulty: 'easy',
  },
  {
    id: 'domino-h',
    name: '2-Bar Horizontal',
    matrix: [[1, 1]],
    preferredColor: 'orange',
    weight: 9,
    difficulty: 'easy',
  },
  {
    id: 'domino-v',
    name: '2-Bar Vertical',
    matrix: [[1], [1]],
    preferredColor: 'orange',
    weight: 9,
    difficulty: 'easy',
  },
  {
    id: 'tromino-h',
    name: '3-Bar Horizontal',
    matrix: [[1, 1, 1]],
    preferredColor: 'cyan',
    weight: 11,
    difficulty: 'easy',
  },
  {
    id: 'tromino-v',
    name: '3-Bar Vertical',
    matrix: [[1], [1], [1]],
    preferredColor: 'cyan',
    weight: 11,
    difficulty: 'easy',
  },
  {
    id: 'corner-sm-tl',
    name: 'Mini Corner TL',
    matrix: [
      [1, 1],
      [1, 0],
    ],
    preferredColor: 'green',
    weight: 9,
    difficulty: 'easy',
  },
  {
    id: 'corner-sm-tr',
    name: 'Mini Corner TR',
    matrix: [
      [1, 1],
      [0, 1],
    ],
    preferredColor: 'green',
    weight: 9,
    difficulty: 'easy',
  },
  {
    id: 'corner-sm-bl',
    name: 'Mini Corner BL',
    matrix: [
      [1, 0],
      [1, 1],
    ],
    preferredColor: 'green',
    weight: 9,
    difficulty: 'easy',
  },
  {
    id: 'corner-sm-br',
    name: 'Mini Corner BR',
    matrix: [
      [0, 1],
      [1, 1],
    ],
    preferredColor: 'green',
    weight: 9,
    difficulty: 'easy',
  },
  {
    id: 'square-2x2',
    name: '2×2 Block',
    matrix: [
      [1, 1],
      [1, 1],
    ],
    preferredColor: 'yellow',
    weight: 13,
    difficulty: 'easy',
  },

  // Medium standard tetrominoes
  {
    id: 'bar-4h',
    name: '4-Beam Horizontal',
    matrix: [[1, 1, 1, 1]],
    preferredColor: 'cyan',
    weight: 9,
    difficulty: 'medium',
  },
  {
    id: 'bar-4v',
    name: '4-Beam Vertical',
    matrix: [[1], [1], [1], [1]],
    preferredColor: 'cyan',
    weight: 9,
    difficulty: 'medium',
  },
  {
    id: 't-up',
    name: 'T-Block Up',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    preferredColor: 'purple',
    weight: 9,
    difficulty: 'medium',
  },
  {
    id: 't-down',
    name: 'T-Block Down',
    matrix: [
      [1, 1, 1],
      [0, 1, 0],
    ],
    preferredColor: 'purple',
    weight: 9,
    difficulty: 'medium',
  },
  {
    id: 't-left',
    name: 'T-Block Left',
    matrix: [
      [0, 1],
      [1, 1],
      [0, 1],
    ],
    preferredColor: 'purple',
    weight: 8,
    difficulty: 'medium',
  },
  {
    id: 't-right',
    name: 'T-Block Right',
    matrix: [
      [1, 0],
      [1, 1],
      [1, 0],
    ],
    preferredColor: 'purple',
    weight: 8,
    difficulty: 'medium',
  },
  {
    id: 'l-1',
    name: 'L-Shape Right',
    matrix: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    preferredColor: 'orange',
    weight: 9,
    difficulty: 'medium',
  },
  {
    id: 'l-2',
    name: 'J-Shape Left',
    matrix: [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    preferredColor: 'orange',
    weight: 9,
    difficulty: 'medium',
  },
  {
    id: 'l-3',
    name: 'L-Bar Wide',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
    ],
    preferredColor: 'red',
    weight: 9,
    difficulty: 'medium',
  },
  {
    id: 'l-4',
    name: 'J-Bar Wide',
    matrix: [
      [1, 1, 1],
      [0, 0, 1],
    ],
    preferredColor: 'red',
    weight: 9,
    difficulty: 'medium',
  },
  {
    id: 'z-h',
    name: 'Z-Step',
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    preferredColor: 'red',
    weight: 7,
    difficulty: 'medium',
  },
  {
    id: 's-h',
    name: 'S-Step',
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    preferredColor: 'green',
    weight: 7,
    difficulty: 'medium',
  },
  {
    id: 'diag-2',
    name: 'Twin Diagonal',
    matrix: [
      [1, 0],
      [0, 1],
    ],
    preferredColor: 'purple',
    weight: 5,
    difficulty: 'medium',
  },

  // Heavy signature Block Blast shapes
  {
    id: 'bar-5h',
    name: '5-Laser Horizontal',
    matrix: [[1, 1, 1, 1, 1]],
    preferredColor: 'cyan',
    weight: 6,
    difficulty: 'hard',
  },
  {
    id: 'bar-5v',
    name: '5-Laser Vertical',
    matrix: [[1], [1], [1], [1], [1]],
    preferredColor: 'cyan',
    weight: 6,
    difficulty: 'hard',
  },
  {
    id: 'corner-3x3-tl',
    name: 'Big Corner TL',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
    ],
    preferredColor: 'purple',
    weight: 6,
    difficulty: 'hard',
  },
  {
    id: 'corner-3x3-tr',
    name: 'Big Corner TR',
    matrix: [
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1],
    ],
    preferredColor: 'purple',
    weight: 6,
    difficulty: 'hard',
  },
  {
    id: 'corner-3x3-bl',
    name: 'Big Corner BL',
    matrix: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
    ],
    preferredColor: 'purple',
    weight: 6,
    difficulty: 'hard',
  },
  {
    id: 'corner-3x3-br',
    name: 'Big Corner BR',
    matrix: [
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
    ],
    preferredColor: 'purple',
    weight: 6,
    difficulty: 'hard',
  },
  {
    id: 'rect-2x3',
    name: '2×3 Slab',
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
    ],
    preferredColor: 'yellow',
    weight: 6,
    difficulty: 'hard',
  },
  {
    id: 'rect-3x2',
    name: '3×2 Slab',
    matrix: [
      [1, 1],
      [1, 1],
      [1, 1],
    ],
    preferredColor: 'yellow',
    weight: 6,
    difficulty: 'hard',
  },
  {
    id: 'square-3x3',
    name: '3×3 Mega Cube',
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    preferredColor: 'red',
    weight: 6,
    difficulty: 'hard',
  },
];

export function canPlaceShapeAt(
  grid: GridCell[][],
  matrix: number[][],
  startR: number,
  startC: number
): boolean {
  const rows = matrix.length;
  const cols = matrix[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] === 1) {
        const gr = startR + r;
        const gc = startC + c;
        if (gr < 0 || gr >= 8 || gc < 0 || gc >= 8) {
          return false;
        }
        if (grid[gr][gc].filled) {
          return false;
        }
      }
    }
  }
  return true;
}

export function canPlaceShapeAnywhere(grid: GridCell[][], matrix: number[][]): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (canPlaceShapeAt(grid, matrix, r, c)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Predicts which rows and columns will be cleared if `matrix` is placed at `(startR, startC)`
 */
export function getPredictedClears(
  grid: GridCell[][],
  matrix: number[][],
  startR: number,
  startC: number
): { rows: number[]; cols: number[] } {
  if (!canPlaceShapeAt(grid, matrix, startR, startC)) {
    return { rows: [], cols: [] };
  }

  const occupied = Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (__, c) => grid[r][c].filled)
  );

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[0].length; c++) {
      if (matrix[r][c] === 1) {
        occupied[startR + r][startC + c] = true;
      }
    }
  }

  const rows: number[] = [];
  const cols: number[] = [];

  for (let r = 0; r < 8; r++) {
    if (occupied[r].every(Boolean)) {
      rows.push(r);
    }
  }

  for (let c = 0; c < 8; c++) {
    let full = true;
    for (let r = 0; r < 8; r++) {
      if (!occupied[r][c]) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }

  return { rows, cols };
}

export function rotatePieceShape(shape: PieceShape): PieceShape {
  const oldRows = shape.matrix.length;
  const oldCols = shape.matrix[0].length;
  const newMatrix: number[][] = Array.from({ length: oldCols }, () =>
    Array(oldRows).fill(0)
  );
  const newCollectibles: CollectibleType[][] | undefined = shape.collectibles
    ? Array.from({ length: oldCols }, () => Array(oldRows).fill('none'))
    : undefined;

  for (let r = 0; r < oldRows; r++) {
    for (let c = 0; c < oldCols; c++) {
      newMatrix[c][oldRows - 1 - r] = shape.matrix[r][c];
      if (newCollectibles && shape.collectibles) {
        newCollectibles[c][oldRows - 1 - r] = shape.collectibles[r][c];
      }
    }
  }

  return {
    ...shape,
    matrix: newMatrix,
    collectibles: newCollectibles,
  };
}

function createShapeFromTemplate(
  template: ShapeTemplate,
  mode: GameMode
): PieceShape {
  // 70% chance to use its iconic Block Blast color, 30% vibrant variation
  const color: BlockColorId =
    Math.random() < 0.72
      ? template.preferredColor
      : BLOCK_COLOR_LIST[Math.floor(Math.random() * BLOCK_COLOR_LIST.length)];

  const rows = template.matrix.length;
  const cols = template.matrix[0].length;
  let collectibles: CollectibleType[][] | undefined;

  if (mode === 'ADVENTURE') {
    collectibles = Array.from({ length: rows }, () =>
      Array<CollectibleType>(cols).fill('none')
    );
    // Embed 1 or 2 stars/gems in Adventure pieces so player can always progress
    const filledCoords: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (template.matrix[r][c] === 1) filledCoords.push([r, c]);
      }
    }
    if (filledCoords.length > 0 && Math.random() < 0.68) {
      const [tr, tc] =
        filledCoords[Math.floor(Math.random() * filledCoords.length)];
      collectibles[tr][tc] = Math.random() < 0.52 ? 'star' : 'gem';
    }
  }

  return {
    id: template.id,
    name: template.name,
    matrix: template.matrix.map((row) => [...row]),
    color,
    collectibles,
  };
}

export function spawnDockBatch(
  grid: GridCell[][],
  mode: GameMode,
  score: number,
  classicDifficulty: ClassicDifficulty = 'MEDIUM'
): DockPiece[] {
  // Calculate board fullness ratio
  let filledCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (grid[r][c].filled) filledCount++;
    }
  }
  const fullness = filledCount / 64;

  const activeDifficulty: ClassicDifficulty =
    mode === 'CLASSIC' ? classicDifficulty : 'MEDIUM';

  // Filter templates that can currently fit on the board
  const placeableTemplates = SHAPE_TEMPLATES.filter((t) =>
    canPlaceShapeAnywhere(grid, t.matrix)
  );

  const pickWeighted = (pool: ShapeTemplate[]): ShapeTemplate => {
    const list = pool.length > 0 ? pool : SHAPE_TEMPLATES;
    const adjustedWeights = list.map((t) => {
      let w = t.weight;

      // Apply Classic Mode difficulty modifiers to block spawn variety & frequency
      if (activeDifficulty === 'EASY') {
        if (t.difficulty === 'easy') w *= 2.6;
        if (t.difficulty === 'medium') w *= 0.9;
        if (t.difficulty === 'hard') w *= 0.25;
      } else if (activeDifficulty === 'HARD') {
        if (t.difficulty === 'easy') w *= 0.45;
        if (t.difficulty === 'medium') w *= 1.35;
        if (t.difficulty === 'hard') w *= 2.5;
      }

      // Adaptive board-fullness weighting
      if (fullness > 0.55 && activeDifficulty !== 'HARD') {
        if (t.difficulty === 'easy') w *= activeDifficulty === 'EASY' ? 2.8 : 2.2;
        if (t.difficulty === 'hard') w *= 0.35;
      } else if (score > 1200 && t.difficulty === 'hard') {
        w *= activeDifficulty === 'HARD' ? 1.5 : 1.25;
      }
      return w;
    });

    const total = adjustedWeights.reduce((acc, v) => acc + v, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
      roll -= adjustedWeights[i];
      if (roll <= 0) return list[i];
    }
    return list[list.length - 1];
  };

  // Number of guaranteed placeable pieces per 3-piece dock batch depends on difficulty
  const guaranteedFitCount =
    activeDifficulty === 'EASY' ? 3 : activeDifficulty === 'HARD' ? 1 : 2;

  const chosen: ShapeTemplate[] = [];
  for (let i = 0; i < 3; i++) {
    if (i < guaranteedFitCount && placeableTemplates.length > 0) {
      chosen.push(pickWeighted(placeableTemplates));
    } else {
      chosen.push(pickWeighted(SHAPE_TEMPLATES));
    }
  }

  return chosen.map((tpl, idx) => ({
    uid: `piece-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    shape: createShapeFromTemplate(tpl, mode),
    placed: false,
    spawnAnim: 0,
    returnAnim: 1,
    dragStartX: 0,
    dragStartY: 0,
  }));
}
