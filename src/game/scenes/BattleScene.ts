import Phaser from 'phaser';
import { canAdvanceAge, getAgeDefinition } from '../constants/ages';
import {
  AI_BASE_X,
  BASE_BASE_HP,
  BASE_PASSIVE_INCOME_PER_SECOND,
  FIXED_STEP_MS,
  HUD_SYNC_INTERVAL_MS,
  LANE_Y,
  PASSIVE_INCOME_TICK_MS,
  PLAYER_BASE_X,
  PLAYER_GOLD_ON_START,
  AI_GOLD_ON_START,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../constants/balance';
import { getUnitDefinition, getUnitsForAge } from '../constants/units';
import type { BaseState, Side, UnitButtonState, UnitEntity, UnitId } from '../types';
import { GameBridge } from '../../state/gameBridge';
import type { GameCommand } from '../../state/types';
import { USER_GESTURE_EVENT } from '../../state/interactionEvents';
import { AiSystem } from '../systems/AiSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { UnitSystem } from '../systems/UnitSystem';

const BGM_KEY = 'bgm_glorious_morning';

export class BattleScene extends Phaser.Scene {
  private readonly bridge: GameBridge;

  private readonly combatSystem = new CombatSystem();

  private unitSystem!: UnitSystem;

  private projectileSystem!: ProjectileSystem;

  private aiSystem!: AiSystem;

  private playerBase!: BaseState;

  private aiBase!: BaseState;

  private playerGold = PLAYER_GOLD_ON_START;

  private aiGold = AI_GOLD_ON_START;

  private playerIncomePerSecond = BASE_PASSIVE_INCOME_PER_SECOND;

  private aiIncomePerSecond = BASE_PASSIVE_INCOME_PER_SECOND;

  private playerAgeIndex = 0;

  private aiAgeIndex = 0;

  private playerCooldowns = new Map<UnitId, number>();

  private aiCooldowns = new Map<UnitId, number>();

  private fixedAccumulatorMs = 0;

  private incomeAccumulatorMs = 0;

  private hudAccumulatorMs = 0;

  private elapsedMs = 0;

  private matchRunning = false;

  private paused = false;

  private battleMessage = 'Choose your upgrades and launch a battle.';

  private bgm?: Phaser.Sound.BaseSound;

  private readonly userGestureListener = () => {
    this.ensureBgmPlaying();
  };

  public constructor(bridge: GameBridge) {
    super('battle');
    this.bridge = bridge;
  }

  public preload(): void {
    this.load.audio(BGM_KEY, 'assets/music/91476_Glorious_morning.mp3');
  }

  public create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(0x101827);

    this.drawBackdrop();
    this.playerBase = this.createBase('player');
    this.aiBase = this.createBase('ai');

    this.projectileSystem = new ProjectileSystem({
      scene: this,
      getUnits: () => this.unitSystem.getAll(),
      getEnemyBaseX: (attackerSide) => this.getEnemyBase(attackerSide).x,
      damageBase: (attackerSide, damage) => this.damageBase(attackerSide, damage),
      damageUnit: (unit, damage, attackerSide, sourceUnitId, projectile) => {
        const totalDamage =
          projectile.executeThreshold !== undefined &&
          projectile.executeBonusDamage &&
          unit.hp / unit.def.maxHp <= projectile.executeThreshold
            ? damage + projectile.executeBonusDamage
            : damage;

        this.damageUnit(unit, totalDamage, attackerSide, sourceUnitId, {
          debuffDurationMs: projectile.debuffDurationMs,
          debuffAttackSpeedMultiplier: projectile.debuffAttackSpeedMultiplier,
        });
      },
    });

    this.unitSystem = new UnitSystem(
      {
        scene: this,
        nowMs: () => this.elapsedMs,
        getHomeBaseX: (side) => this.getHomeBase(side).x,
        getEnemyBaseX: (side) => this.getEnemyBase(side).x,
        damageBase: (attackerSide, damage) => this.damageBase(attackerSide, damage),
        damageUnit: (unit, damage, attackerSide, sourceUnitId, modifiers) =>
          this.damageUnit(unit, damage, attackerSide, sourceUnitId, modifiers),
        spawnProjectile: (options) => this.projectileSystem.spawn(options),
      },
      this.combatSystem,
    );

    this.aiSystem = new AiSystem({
      getAiAgeIndex: () => this.aiAgeIndex,
      getAiGold: () => this.aiGold,
      getAiBaseX: () => this.aiBase.x,
      getPlayerFrontX: () => this.getFrontX('player'),
      getAiAdvanceCost: () => getAgeDefinition(this.aiAgeIndex).advanceCost,
      canAiAdvance: () => canAdvanceAge(this.aiAgeIndex),
      getRoster: () => getUnitsForAge(this.aiAgeIndex),
      trySpawnUnit: (unitId) => this.trySpawnUnit('ai', unitId),
      tryAdvanceAge: () => this.tryAdvanceAge('ai'),
    });

    window.addEventListener(USER_GESTURE_EVENT, this.userGestureListener);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onSceneDestroy, this);

    this.syncSoundState();
    this.syncHudSnapshot(true);
  }

  public update(_time: number, delta: number): void {
    this.consumeCommands();
    this.syncSoundState();

    if (!this.matchRunning || this.paused) {
      return;
    }

    const clampedDelta = Math.min(delta, 120);
    this.fixedAccumulatorMs += clampedDelta;

    while (this.fixedAccumulatorMs >= FIXED_STEP_MS) {
      this.simulateStep(FIXED_STEP_MS);
      this.fixedAccumulatorMs -= FIXED_STEP_MS;
    }

    this.hudAccumulatorMs += clampedDelta;
    if (this.hudAccumulatorMs >= HUD_SYNC_INTERVAL_MS) {
      this.hudAccumulatorMs = 0;
      this.syncHudSnapshot();
    }
  }

  private consumeCommands(): void {
    const commands = this.bridge.drainCommands();
    for (const command of commands) {
      this.handleCommand(command);
    }
  }

  private handleCommand(command: GameCommand): void {
    switch (command.type) {
      case 'start_match': {
        this.startMatch();
        break;
      }
      case 'restart_match': {
        this.startMatch();
        break;
      }
      case 'spawn_unit': {
        if (!this.matchRunning || this.paused) {
          break;
        }

        const spawned = this.trySpawnUnit('player', command.unitId);
        if (!spawned) {
          this.battleMessage = 'Cannot deploy that unit right now.';
          this.syncHudSnapshot(true);
        }
        break;
      }
      case 'advance_age': {
        if (!this.matchRunning || this.paused) {
          break;
        }

        const advanced = this.tryAdvanceAge(command.side);
        if (!advanced && command.side === 'player') {
          this.battleMessage = 'Not enough gold to advance age.';
          this.syncHudSnapshot(true);
        }
        break;
      }
      case 'toggle_pause': {
        this.paused = !this.paused;
        this.syncHudSnapshot(true);
        break;
      }
      default:
        break;
    }
  }

  private startMatch(): void {
    this.unitSystem.reset();
    this.projectileSystem.reset();
    this.aiSystem.reset();

    this.fixedAccumulatorMs = 0;
    this.incomeAccumulatorMs = 0;
    this.hudAccumulatorMs = 0;
    this.elapsedMs = 0;

    const progress = this.bridge.getState().progress;
    this.playerAgeIndex = progress.selectedStartAge;
    this.aiAgeIndex = progress.selectedStartAge;

    const playerMaxBaseHp = BASE_BASE_HP + progress.meta.baseHpLevel * 90;
    const aiMaxBaseHp = BASE_BASE_HP + progress.selectedStartAge * 30;

    this.playerBase.maxHp = playerMaxBaseHp;
    this.playerBase.hp = playerMaxBaseHp;
    this.aiBase.maxHp = aiMaxBaseHp;
    this.aiBase.hp = aiMaxBaseHp;

    this.playerGold = PLAYER_GOLD_ON_START + progress.selectedStartAge * 80;
    this.aiGold = AI_GOLD_ON_START + progress.selectedStartAge * 80;

    this.playerIncomePerSecond = BASE_PASSIVE_INCOME_PER_SECOND + progress.meta.incomeLevel * 2;
    this.aiIncomePerSecond = BASE_PASSIVE_INCOME_PER_SECOND + progress.selectedStartAge * 1.4;

    this.playerCooldowns = new Map<UnitId, number>();
    this.aiCooldowns = new Map<UnitId, number>();
    for (const unit of Object.values(getUnitsForAge(this.playerAgeIndex))) {
      this.playerCooldowns.set(unit.id, 0);
      this.aiCooldowns.set(unit.id, 0);
    }

    this.playerBase.weaponCooldownMs = 0;
    this.aiBase.weaponCooldownMs = 0;

    this.updateBaseVisual('player');
    this.updateBaseVisual('ai');

    this.paused = false;
    this.matchRunning = true;
    this.battleMessage = 'Clash begins. Break the enemy stronghold.';
    this.ensureBgmPlaying();

    this.syncHudSnapshot(true);
  }

  private simulateStep(deltaMs: number): void {
    this.elapsedMs += deltaMs;

    this.tickCooldowns(this.playerCooldowns, deltaMs);
    this.tickCooldowns(this.aiCooldowns, deltaMs);

    this.incomeAccumulatorMs += deltaMs;
    while (this.incomeAccumulatorMs >= PASSIVE_INCOME_TICK_MS) {
      this.playerGold += this.playerIncomePerSecond;
      this.aiGold += this.aiIncomePerSecond;
      this.incomeAccumulatorMs -= PASSIVE_INCOME_TICK_MS;
    }

    this.aiSystem.update(deltaMs);
    this.unitSystem.update(deltaMs);
    this.projectileSystem.update(deltaMs);
    this.updateBaseAttacks(deltaMs);

    if (this.playerBase.hp <= 0) {
      this.finishMatch('ai');
      return;
    }

    if (this.aiBase.hp <= 0) {
      this.finishMatch('player');
    }
  }

  private updateBaseAttacks(deltaMs: number): void {
    this.playerBase.weaponCooldownMs -= deltaMs;
    this.aiBase.weaponCooldownMs -= deltaMs;

    this.tryBaseAttack('player');
    this.tryBaseAttack('ai');
  }

  private tryBaseAttack(side: Side): void {
    const base = this.getHomeBase(side);
    if (base.weaponCooldownMs > 0) {
      return;
    }

    const ageIndex = side === 'player' ? this.playerAgeIndex : this.aiAgeIndex;
    const weapon = getAgeDefinition(ageIndex).baseWeapon;

    const enemyTarget = this.unitSystem
      .getAll()
      .filter((unit) => unit.alive && unit.side !== side)
      .sort((left, right) => Math.abs(left.x - base.x) - Math.abs(right.x - base.x))
      .find((unit) => Math.abs(unit.x - base.x) <= weapon.range);

    if (!enemyTarget) {
      return;
    }

    const direction = side === 'player' ? 1 : -1;
    this.projectileSystem.spawn({
      side,
      sourceUnitId: 'base',
      x: base.x + direction * 44,
      y: LANE_Y - 66,
      targetX: enemyTarget.x,
      targetY: enemyTarget.y,
      damage: weapon.damage,
      speed: weapon.projectileSpeed,
      radius: 5,
      color: weapon.color,
      targetBase: false,
    });

    base.weaponCooldownMs = weapon.cooldownMs;
  }

  private trySpawnUnit(side: Side, unitId: UnitId): boolean {
    const ageIndex = side === 'player' ? this.playerAgeIndex : this.aiAgeIndex;
    const unit = getUnitDefinition(unitId);

    const roster = getUnitsForAge(ageIndex);
    if (!roster.some((entry) => entry.id === unit.id)) {
      return false;
    }

    const sideGold = side === 'player' ? this.playerGold : this.aiGold;
    if (sideGold < unit.cost) {
      return false;
    }

    const cooldownMap = side === 'player' ? this.playerCooldowns : this.aiCooldowns;
    const remainingCooldown = cooldownMap.get(unit.id) ?? 0;
    if (remainingCooldown > 0) {
      return false;
    }

    if (side === 'player') {
      this.playerGold -= unit.cost;
    } else {
      this.aiGold -= unit.cost;
    }

    this.unitSystem.spawn(side, unit);
    cooldownMap.set(unit.id, unit.cooldownMs);
    return true;
  }

  private tryAdvanceAge(side: Side): boolean {
    const isPlayer = side === 'player';
    const currentAge = isPlayer ? this.playerAgeIndex : this.aiAgeIndex;
    if (!canAdvanceAge(currentAge)) {
      return false;
    }

    const advanceCost = getAgeDefinition(currentAge).advanceCost;
    if (advanceCost === null) {
      return false;
    }

    if (isPlayer && this.playerGold < advanceCost) {
      return false;
    }

    if (!isPlayer && this.aiGold < advanceCost) {
      return false;
    }

    if (isPlayer) {
      this.playerGold -= advanceCost;
      this.playerAgeIndex += 1;
      this.bridge.unlockAge(this.playerAgeIndex);
      this.battleMessage = `Advanced to ${getAgeDefinition(this.playerAgeIndex).label}.`;
      this.updateBaseVisual('player');
    } else {
      this.aiGold -= advanceCost;
      this.aiAgeIndex += 1;
      this.updateBaseVisual('ai');
    }

    return true;
  }

  private damageUnit(
    unit: UnitEntity,
    damage: number,
    attackerSide: Side,
    _sourceUnitId: UnitId | 'base',
    modifiers?: { debuffDurationMs?: number; debuffAttackSpeedMultiplier?: number },
  ): void {
    if (!unit.alive) {
      return;
    }

    const killed = this.combatSystem.applyDamageToUnit(unit, damage);

    if (modifiers?.debuffDurationMs) {
      unit.debuffedUntilMs = Math.max(unit.debuffedUntilMs, this.elapsedMs + modifiers.debuffDurationMs);
      unit.debuffAttackSpeedMultiplier = Math.min(
        unit.debuffAttackSpeedMultiplier,
        modifiers.debuffAttackSpeedMultiplier ?? 0.75,
      );
    }

    if (!killed) {
      return;
    }

    unit.alive = false;
    if (attackerSide === 'player') {
      this.playerGold += unit.def.bounty;
    } else {
      this.aiGold += unit.def.bounty;
    }
  }

  private damageBase(attackerSide: Side, damage: number): void {
    const defenderBase = this.getEnemyBase(attackerSide);
    defenderBase.hp = Math.max(0, defenderBase.hp - damage);

    defenderBase.core.setFillStyle(0xef4444, 1);
    this.time.delayedCall(80, () => {
      if (!this.matchRunning) {
        return;
      }
      this.updateBaseVisual(defenderBase.side);
    });
  }

  private finishMatch(winner: Side): void {
    this.matchRunning = false;
    this.paused = false;
    this.syncHudSnapshot(true);
    this.bridge.endMatch(winner, this.playerAgeIndex);
  }

  private tickCooldowns(cooldowns: Map<UnitId, number>, deltaMs: number): void {
    for (const [unitId, remaining] of cooldowns.entries()) {
      cooldowns.set(unitId, Math.max(0, remaining - deltaMs));
    }
  }

  private getHomeBase(side: Side): BaseState {
    return side === 'player' ? this.playerBase : this.aiBase;
  }

  private getEnemyBase(side: Side): BaseState {
    return side === 'player' ? this.aiBase : this.playerBase;
  }

  private getFrontX(side: Side): number {
    const aliveUnits = this.unitSystem
      .getAll()
      .filter((unit) => unit.alive && unit.side === side)
      .map((unit) => unit.x);

    if (aliveUnits.length === 0) {
      return this.getHomeBase(side).x;
    }

    return side === 'player' ? Math.max(...aliveUnits) : Math.min(...aliveUnits);
  }

  private syncHudSnapshot(force = false): void {
    if (!force && !this.matchRunning) {
      return;
    }

    const playerAge = getAgeDefinition(this.playerAgeIndex);
    const unitButtons: UnitButtonState[] = getUnitsForAge(this.playerAgeIndex).map((unit) => ({
      unitId: unit.id,
      name: unit.name,
      icon: unit.icon,
      cost: unit.cost,
      cooldownMs: unit.cooldownMs,
      cooldownRemainingMs: this.playerCooldowns.get(unit.id) ?? 0,
    }));

    this.bridge.applyBattleSnapshot({
      gold: Math.floor(this.playerGold),
      aiGold: Math.floor(this.aiGold),
      playerAgeIndex: this.playerAgeIndex,
      aiAgeIndex: this.aiAgeIndex,
      playerBaseHp: this.playerBase.hp,
      aiBaseHp: this.aiBase.hp,
      playerBaseMaxHp: this.playerBase.maxHp,
      aiBaseMaxHp: this.aiBase.maxHp,
      canAdvanceAge: playerAge.advanceCost !== null,
      advanceAgeCost: playerAge.advanceCost,
      unitButtons,
      battleMessage: this.battleMessage,
    });
  }

  private drawBackdrop(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x0b1324, 1);
    this.add.circle(250, 130, 220, 0xf59e0b, 0.1);
    this.add.circle(WORLD_WIDTH - 220, 180, 260, 0x3b82f6, 0.1);

    this.add.rectangle(WORLD_WIDTH / 2, LANE_Y + 65, WORLD_WIDTH, 240, 0x1f3b24, 0.4);
    this.add.rectangle(WORLD_WIDTH / 2, LANE_Y + 126, WORLD_WIDTH, 2, 0x92a3b8, 0.35);
  }

  private createBase(side: Side): BaseState {
    const x = side === 'player' ? PLAYER_BASE_X : AI_BASE_X;
    const core = this.add.rectangle(x, LANE_Y + 20, 126, 210, 0x334155, 1);
    core.setDepth(4);

    const tower = this.add.rectangle(x, LANE_Y - 95, 72, 130, 0xf59e0b, 1);
    tower.setDepth(6);

    return {
      side,
      x,
      hp: BASE_BASE_HP,
      maxHp: BASE_BASE_HP,
      weaponCooldownMs: 0,
      tower,
      core,
    };
  }

  private updateBaseVisual(side: Side): void {
    const base = this.getHomeBase(side);
    const age = getAgeDefinition(side === 'player' ? this.playerAgeIndex : this.aiAgeIndex);

    const tint = Number.parseInt(age.accentColor.replace('#', ''), 16);
    const alpha = side === 'player' ? 0.9 : 0.8;

    base.tower.setFillStyle(tint, alpha);
    base.core.setFillStyle(side === 'player' ? 0x1f2937 : 0x334155, 1);
  }

  private ensureBgmPlaying(): void {
    if (!this.bridge.getState().soundOn || !this.cache.audio.exists(BGM_KEY)) {
      return;
    }

    if (!this.bgm) {
      this.bgm = this.sound.add(BGM_KEY, {
        loop: true,
        volume: 0.34,
      });
    }

    if (!this.bgm.isPlaying) {
      this.sound.mute = false;
      this.bgm.play();
    }
  }

  private syncSoundState(): void {
    const soundOn = this.bridge.getState().soundOn;
    this.sound.mute = !soundOn;

    if (soundOn) {
      this.ensureBgmPlaying();
    }
  }

  private onSceneDestroy(): void {
    window.removeEventListener(USER_GESTURE_EVENT, this.userGestureListener);

    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = undefined;
    }
  }
}
