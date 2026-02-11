import { AGE_DEFINITIONS } from '../game/constants/ages';
import type { MetaUpgradeId } from '../game/types';
import type { ProgressState } from './types';

const STORAGE_KEY = 'age_of_war_progress_v1';

const DEFAULT_PROGRESS: ProgressState = {
  highestAgeUnlocked: 0,
  shards: 0,
  selectedStartAge: 0,
  meta: {
    incomeLevel: 0,
    baseHpLevel: 0,
  },
};

function clampAgeIndex(ageIndex: number): number {
  return Math.max(0, Math.min(ageIndex, AGE_DEFINITIONS.length - 1));
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PROGRESS };
    }

    const parsed = JSON.parse(raw) as Partial<ProgressState>;

    const highestAgeUnlocked = clampAgeIndex(parsed.highestAgeUnlocked ?? 0);
    // Always start at Hearth Age (index 0) regardless of saved progress
    const selectedStartAge = 0;

    return {
      highestAgeUnlocked,
      selectedStartAge,
      shards: Math.max(0, Math.floor(parsed.shards ?? 0)),
      meta: {
        incomeLevel: Math.max(0, Math.floor(parsed.meta?.incomeLevel ?? 0)),
        baseHpLevel: Math.max(0, Math.floor(parsed.meta?.baseHpLevel ?? 0)),
      },
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getMetaUpgradeCost(progress: ProgressState, upgrade: MetaUpgradeId): number {
  return upgrade === 'income'
    ? 2 + progress.meta.incomeLevel
    : 2 + progress.meta.baseHpLevel;
}

export function applyMetaUpgrade(
  progress: ProgressState,
  upgrade: MetaUpgradeId,
): ProgressState {
  const cost = getMetaUpgradeCost(progress, upgrade);
  if (progress.shards < cost) {
    return progress;
  }

  if (upgrade === 'income') {
    return {
      ...progress,
      shards: progress.shards - cost,
      meta: {
        ...progress.meta,
        incomeLevel: progress.meta.incomeLevel + 1,
      },
    };
  }

  return {
    ...progress,
    shards: progress.shards - cost,
    meta: {
      ...progress.meta,
      baseHpLevel: progress.meta.baseHpLevel + 1,
    },
  };
}

export function updateHighestAge(progress: ProgressState, ageIndex: number): ProgressState {
  const clampedAge = clampAgeIndex(ageIndex);
  if (clampedAge <= progress.highestAgeUnlocked) {
    return progress;
  }

  return {
    ...progress,
    highestAgeUnlocked: clampedAge,
  };
}

export function addShards(progress: ProgressState, amount: number): ProgressState {
  if (amount <= 0) {
    return progress;
  }

  return {
    ...progress,
    shards: progress.shards + amount,
  };
}

export function setSelectedStartAge(progress: ProgressState, ageIndex: number): ProgressState {
  return {
    ...progress,
    selectedStartAge: Math.min(clampAgeIndex(ageIndex), progress.highestAgeUnlocked),
  };
}
