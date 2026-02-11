import { GAME_CONFIG_META } from '../config/resolveConfig';

export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 900;
export const LANE_Y = 520;

export const PLAYER_BASE_X = 120;
export const AI_BASE_X = WORLD_WIDTH - 120;

export const BASE_BASE_HP = GAME_CONFIG_META.baseHp;
export const BASE_PASSIVE_INCOME_PER_SECOND = GAME_CONFIG_META.goldPerSecond;
export const PASSIVE_INCOME_TICK_MS = 1000;

export const FIXED_STEP_MS = 1000 / 60;

export const BASE_TOUCH_RANGE = 70;
export const UNIT_MIN_SPACING = 24;
export const UNIT_SPAWN_OFFSET_FROM_BASE = 108;

export const PLAYER_GOLD_ON_START = 75;
export const AI_GOLD_ON_START = 75;

export const AI_DECISION_INTERVAL_MS = 900;

export const HUD_SYNC_INTERVAL_MS = 90;
