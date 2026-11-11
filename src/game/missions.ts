export type MissionMetricType =
  | 'SINGLE_MOVE_LINES'
  | 'SINGLE_MOVE_ROWS'
  | 'TOTAL_LINES_TODAY'
  | 'REACH_COMBO'
  | 'SINGLE_GAME_SCORE'
  | 'COLLECT_JEWELS'
  | 'MULTI_BLAST_COUNT';

export interface DailyMissionTemplate {
  id: string;
  title: string;
  metric: MissionMetricType;
  target: number;
  rewardLabel: string;
}

export interface DailyMissionProgress extends DailyMissionTemplate {
  current: number;
  completed: boolean;
}

export interface DailyMissionsState {
  dateKey: string;
  missions: DailyMissionProgress[];
}

export interface GameplayMoveStats {
  linesClearedInMove: number;
  rowsClearedInMove: number;
  colsClearedInMove: number;
  currentCombo: number;
  currentGameScore: number;
  jewelsCollectedInMove: number;
}

const MISSION_POOL: DailyMissionTemplate[] = [
  {
    id: 'clear-3-lines-one-move',
    title: 'Clear 3 lines in one move',
    metric: 'SINGLE_MOVE_LINES',
    target: 3,
    rewardLabel: '+1 Bomb',
  },
  {
    id: 'clear-2-rows-one-move',
    title: 'Clear 2 rows in one move',
    metric: 'SINGLE_MOVE_ROWS',
    target: 2,
    rewardLabel: '+1 Rotate',
  },
  {
    id: 'reach-combo-3',
    title: 'Reach a 3× Combo streak',
    metric: 'REACH_COMBO',
    target: 3,
    rewardLabel: '+1 Rotate',
  },
  {
    id: 'clear-12-lines-today',
    title: 'Blast 12 total lines today',
    metric: 'TOTAL_LINES_TODAY',
    target: 12,
    rewardLabel: '+1 Bomb',
  },
  {
    id: 'score-1200-single-game',
    title: 'Score 1,200 pts in one game',
    metric: 'SINGLE_GAME_SCORE',
    target: 1200,
    rewardLabel: '+1 Rotate',
  },
  {
    id: 'double-blast-3-times',
    title: 'Perform 3 Double-Line Blasts',
    metric: 'MULTI_BLAST_COUNT',
    target: 3,
    rewardLabel: '+1 Bomb',
  },
  {
    id: 'collect-6-jewels',
    title: 'Collect 6 Stars or Gems',
    metric: 'COLLECT_JEWELS',
    target: 6,
    rewardLabel: '+1 Rotate',
  },
];

const STORAGE_KEY = 'block_blast_daily_missions_v1';

export function getTodayDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTimeUntilMidnightLabel(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function hashDateToIndex(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function generateMissionsForDate(dateKey: string): DailyMissionProgress[] {
  const seed = hashDateToIndex(dateKey);

  // Always include 1 signature single-move / combo challenge + 2 rotating challenges
  const picked: DailyMissionTemplate[] = [];
  const usedIndices = new Set<number>();

  // Guarantee first slot is a signature single-move challenge (e.g., Clear 3 lines in one move or Clear 2 rows in one move)
  const firstIdx = seed % 2;
  picked.push(MISSION_POOL[firstIdx]);
  usedIndices.add(firstIdx);

  let step = 1;
  while (picked.length < 3) {
    const idx = (seed + step * 3) % MISSION_POOL.length;
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      picked.push(MISSION_POOL[idx]);
    }
    step++;
  }

  return picked.map((tpl) => ({
    ...tpl,
    current: 0,
    completed: false,
  }));
}

export function loadDailyMissions(): DailyMissionsState {
  const todayKey = getTodayDateKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyMissionsState;
      if (
        parsed &&
        parsed.dateKey === todayKey &&
        Array.isArray(parsed.missions) &&
        parsed.missions.length === 3
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  const freshState: DailyMissionsState = {
    dateKey: todayKey,
    missions: generateMissionsForDate(todayKey),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
  } catch {
    // ignore
  }
  return freshState;
}

export function updateDailyMissionsOnMove(
  stats: GameplayMoveStats
): {
  state: DailyMissionsState;
  newlyCompleted: DailyMissionProgress[];
} {
  const currentState = loadDailyMissions();
  const newlyCompleted: DailyMissionProgress[] = [];

  const updatedMissions = currentState.missions.map((mission) => {
    if (mission.completed) return mission;

    let nextVal = mission.current;
    switch (mission.metric) {
      case 'SINGLE_MOVE_LINES':
        nextVal = Math.max(mission.current, stats.linesClearedInMove);
        break;
      case 'SINGLE_MOVE_ROWS':
        nextVal = Math.max(mission.current, stats.rowsClearedInMove);
        break;
      case 'REACH_COMBO':
        nextVal = Math.max(mission.current, stats.currentCombo);
        break;
      case 'TOTAL_LINES_TODAY':
        nextVal = mission.current + stats.linesClearedInMove;
        break;
      case 'SINGLE_GAME_SCORE':
        nextVal = Math.max(mission.current, stats.currentGameScore);
        break;
      case 'MULTI_BLAST_COUNT':
        if (stats.linesClearedInMove >= 2) {
          nextVal = mission.current + 1;
        }
        break;
      case 'COLLECT_JEWELS':
        nextVal = mission.current + stats.jewelsCollectedInMove;
        break;
    }

    const clamped = Math.min(mission.target, nextVal);
    const isNowCompleted = clamped >= mission.target;
    const updated: DailyMissionProgress = {
      ...mission,
      current: clamped,
      completed: isNowCompleted,
    };

    if (isNowCompleted && !mission.completed) {
      newlyCompleted.push(updated);
    }

    return updated;
  });

  const nextState: DailyMissionsState = {
    dateKey: currentState.dateKey,
    missions: updatedMissions,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // ignore
  }

  return { state: nextState, newlyCompleted };
}
