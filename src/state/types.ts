import type { MetaUpgradeId, Side, UnitButtonState, UnitId } from '../game/types';

export type MatchMode = 'start' | 'playing' | 'ended';

export interface MetaProgress {
  incomeLevel: number;
  baseHpLevel: number;
}

export interface ProgressState {
  highestAgeUnlocked: number;
  shards: number;
  meta: MetaProgress;
  selectedStartAge: number;
}

export interface GameUiState {
  mode: MatchMode;
  showHowTo: boolean;
  paused: boolean;
  soundOn: boolean;
  soundVolume: number;
  winner: Side | null;
  gold: number;
  aiGold: number;
  playerAgeIndex: number;
  aiAgeIndex: number;
  playerBaseHp: number;
  aiBaseHp: number;
  playerBaseMaxHp: number;
  aiBaseMaxHp: number;
  playerTurretLevel: number;
  playerTurretMaxLevel: number;
  playerTurretUpgradeCost: number | null;
  aiTurretLevel: number;
  aiTurretMaxLevel: number;
  canAdvanceAge: boolean;
  advanceAgeCost: number | null;
  unitButtons: UnitButtonState[];
  progress: ProgressState;
  battleMessage: string;
}

export type GameCommand =
  | { type: 'start_match' }
  | { type: 'restart_match' }
  | { type: 'spawn_unit'; unitId: UnitId }
  | { type: 'advance_age'; side: Side }
  | { type: 'upgrade_turret'; side: Side }
  | { type: 'toggle_pause' }
  | { type: 'toggle_sound' }
  | { type: 'set_sound_volume'; value: number }
  | { type: 'set_how_to'; value: boolean }
  | { type: 'return_to_menu' }
  | { type: 'set_start_age'; ageIndex: number }
  | { type: 'buy_meta_upgrade'; upgrade: MetaUpgradeId };

export interface BattleSnapshot {
  gold: number;
  aiGold: number;
  playerAgeIndex: number;
  aiAgeIndex: number;
  playerBaseHp: number;
  aiBaseHp: number;
  playerBaseMaxHp: number;
  aiBaseMaxHp: number;
  playerTurretLevel: number;
  playerTurretMaxLevel: number;
  playerTurretUpgradeCost: number | null;
  aiTurretLevel: number;
  aiTurretMaxLevel: number;
  canAdvanceAge: boolean;
  advanceAgeCost: number | null;
  unitButtons: UnitButtonState[];
  battleMessage: string;
}
