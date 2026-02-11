import { getAgeDefinition, getTurretMaxLevel, getTurretUpgradeCost } from '../game/constants/ages';
import { getUnitsForAge } from '../game/constants/units';
import type { Side } from '../game/types';
import {
  addShards,
  applyMetaUpgrade,
  loadProgress,
  saveProgress,
  setSelectedStartAge,
  updateHighestAge,
} from './localPersistence';
import type { BattleSnapshot, GameCommand, GameUiState, ProgressState } from './types';

type Listener = () => void;
const MAX_DEBUG_LOG_LINES = 80;

function createUnitButtons(ageIndex: number) {
  return getUnitsForAge(ageIndex).map((unit) => ({
    unitId: unit.id,
    name: unit.name,
    icon: unit.icon,
    color: unit.color,
    cost: unit.cost,
    spawnRateMs: unit.cooldownMs,
    queuedCount: 0,
  }));
}

function clampSoundVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createInitialState(progress: ProgressState): GameUiState {
  const ageIndex = progress.selectedStartAge;
  const age = getAgeDefinition(ageIndex);

  return {
    mode: 'start',
    showHowTo: false,
    paused: false,
    soundOn: true,
    soundVolume: 0.34,
    debugAiVsAi: false,
    debugLogs: [],
    winner: null,
    gold: 0,
    aiGold: 0,
    playerAgeIndex: ageIndex,
    aiAgeIndex: ageIndex,
    playerBaseHp: 1000,
    aiBaseHp: 1000,
    playerBaseMaxHp: 1000,
    aiBaseMaxHp: 1000,
    playerTurretLevel: 0,
    playerTurretMaxLevel: getTurretMaxLevel(ageIndex),
    playerTurretUpgradeCost: getTurretUpgradeCost(ageIndex, 0),
    aiTurretLevel: 0,
    aiTurretMaxLevel: getTurretMaxLevel(ageIndex),
    playerQueueCount: 0,
    playerQueueLimit: 5,
    playerQueuePreview: [],
    aiQueueCount: 0,
    aiQueueLimit: 5,
    canAdvanceAge: age.advanceCost !== null,
    advanceAgeCost: age.advanceCost,
    unitButtons: createUnitButtons(ageIndex),
    progress,
    battleMessage: 'Choose your upgrades and launch a battle.',
  };
}

export class GameBridge {
  private state: GameUiState;

  private readonly listeners = new Set<Listener>();

  private commandQueue: GameCommand[] = [];

  public constructor() {
    this.state = createInitialState(loadProgress());
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getState(): GameUiState {
    return this.state;
  }

  public dispatch(command: GameCommand): void {
    switch (command.type) {
      case 'set_how_to': {
        this.patchState({ showHowTo: command.value });
        return;
      }
      case 'toggle_sound': {
        this.patchState({ soundOn: !this.state.soundOn });
        return;
      }
      case 'set_sound_volume': {
        this.patchState({ soundVolume: clampSoundVolume(command.value) });
        return;
      }
      case 'set_debug_ai_vs_ai': {
        if (!import.meta.env.DEV) {
          return;
        }

        this.patchState({ debugAiVsAi: command.value });
        return;
      }
      case 'set_start_age': {
        const progress = setSelectedStartAge(this.state.progress, command.ageIndex);
        const ageIndex = progress.selectedStartAge;
        const age = getAgeDefinition(ageIndex);

        this.setProgress(progress);
        this.patchState({
          playerAgeIndex: ageIndex,
          aiAgeIndex: ageIndex,
          playerTurretLevel: 0,
          playerTurretMaxLevel: getTurretMaxLevel(ageIndex),
          playerTurretUpgradeCost: getTurretUpgradeCost(ageIndex, 0),
          aiTurretLevel: 0,
          aiTurretMaxLevel: getTurretMaxLevel(ageIndex),
          playerQueueCount: 0,
          playerQueueLimit: 5,
          playerQueuePreview: [],
          aiQueueCount: 0,
          aiQueueLimit: 5,
          canAdvanceAge: age.advanceCost !== null,
          advanceAgeCost: age.advanceCost,
          unitButtons: createUnitButtons(ageIndex),
        });
        return;
      }
      case 'return_to_menu': {
        this.patchState({
          mode: 'start',
          paused: false,
          winner: null,
          showHowTo: false,
          debugLogs: [],
          playerQueueCount: 0,
          playerQueuePreview: [],
          aiQueueCount: 0,
          battleMessage: 'Choose your upgrades and launch a battle.',
        });
        return;
      }
      case 'buy_meta_upgrade': {
        const nextProgress = applyMetaUpgrade(this.state.progress, command.upgrade);
        if (nextProgress === this.state.progress) {
          this.patchState({
            battleMessage: 'Not enough shards for that upgrade.',
          });
          return;
        }

        this.setProgress(nextProgress);
        this.patchState({
          battleMessage:
            command.upgrade === 'income'
              ? 'Passive income upgraded.'
              : 'Base durability upgraded.',
        });
        return;
      }
      case 'start_match': {
        this.commandQueue.push(command);
        this.patchState({
          mode: 'playing',
          paused: false,
          winner: null,
          showHowTo: false,
          debugLogs: [],
          playerQueueCount: 0,
          playerQueuePreview: [],
          aiQueueCount: 0,
          battleMessage: 'Clash begins. Push the enemy base.',
        });
        return;
      }
      case 'restart_match': {
        this.commandQueue.push(command);
        this.patchState({
          mode: 'playing',
          paused: false,
          winner: null,
          showHowTo: false,
          debugLogs: [],
          playerQueueCount: 0,
          playerQueuePreview: [],
          aiQueueCount: 0,
          battleMessage: 'Fresh battle deployed.',
        });
        return;
      }
      case 'toggle_pause': {
        if (this.state.mode !== 'playing') {
          return;
        }

        this.commandQueue.push(command);
        this.patchState({ paused: !this.state.paused });
        return;
      }
      case 'advance_age':
      case 'upgrade_turret':
      case 'spawn_unit': {
        if (this.state.mode !== 'playing') {
          return;
        }

        this.commandQueue.push(command);
        return;
      }
      default: {
        const exhaustive: never = command;
        throw new Error(`Unhandled command: ${String(exhaustive)}`);
      }
    }
  }

  public drainCommands(): GameCommand[] {
    const commands = [...this.commandQueue];
    this.commandQueue = [];
    return commands;
  }

  public applyBattleSnapshot(snapshot: BattleSnapshot): void {
    this.patchState(snapshot);
  }

  public pushDebugLog(message: string): void {
    if (!import.meta.env.DEV || !message.trim()) {
      return;
    }

    const nextLogs = [...this.state.debugLogs, message];
    if (nextLogs.length > MAX_DEBUG_LOG_LINES) {
      nextLogs.splice(0, nextLogs.length - MAX_DEBUG_LOG_LINES);
    }

    this.patchState({ debugLogs: nextLogs });
  }

  public unlockAge(ageIndex: number): void {
    const nextProgress = updateHighestAge(this.state.progress, ageIndex);
    if (nextProgress !== this.state.progress) {
      this.setProgress(nextProgress);
    }
  }

  public endMatch(winner: Side, playerAgeIndex: number): void {
    let nextProgress = updateHighestAge(this.state.progress, playerAgeIndex);
    nextProgress = addShards(nextProgress, winner === 'player' ? 3 : 1);

    this.setProgress(nextProgress);
    this.patchState({
      mode: 'ended',
      paused: false,
      winner,
      battleMessage:
        winner === 'player'
          ? 'Victory. You gained 3 shards.'
          : 'Defeat. You gained 1 shard for perseverance.',
    });
  }

  private setProgress(progress: ProgressState): void {
    saveProgress(progress);
    this.patchState({ progress });
  }

  private patchState(patch: Partial<GameUiState>): void {
    this.state = {
      ...this.state,
      ...patch,
    };

    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const gameBridge = new GameBridge();
