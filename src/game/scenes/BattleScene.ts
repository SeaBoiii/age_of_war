import Phaser from 'phaser';
import {
  canAdvanceAge,
  canUpgradeTurret,
  getAgeDefinition,
  getTurretLevelDefinition,
  getTurretMaxLevel,
  getTurretUpgradeCost,
} from '../constants/ages';
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
const TURRET_TURN_SPEED_RAD_PER_SECOND = 4.8;
const DEBUG_ENABLED = import.meta.env.DEV;

export class BattleScene extends Phaser.Scene {
  private readonly bridge: GameBridge;

  private readonly combatSystem = new CombatSystem();

  private unitSystem!: UnitSystem;

  private projectileSystem!: ProjectileSystem;

  private aiSystem!: AiSystem;

  private playerAiSystem!: AiSystem;

  private playerBase!: BaseState;

  private aiBase!: BaseState;

  private playerGold = PLAYER_GOLD_ON_START;

  private aiGold = AI_GOLD_ON_START;

  private playerIncomePerSecond = BASE_PASSIVE_INCOME_PER_SECOND;

  private aiIncomePerSecond = BASE_PASSIVE_INCOME_PER_SECOND;

  private playerIncomeMetaBonus = 0;

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

  private lastAiVsAiMode = false;

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

    const selectedStartAge = this.bridge.getState().progress.selectedStartAge;
    this.playerAgeIndex = selectedStartAge;
    this.aiAgeIndex = selectedStartAge;
    this.playerBase.turretLevel = 0;
    this.aiBase.turretLevel = 0;
    this.updateBaseVisual('player');
    this.updateBaseVisual('ai');

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
      isUnderPressure: () => this.getFrontX('player') > this.aiBase.x - 255,
      getLaneAdvantage: () => this.getLaneAdvantage('ai'),
      getAiAdvanceCost: () => getAgeDefinition(this.aiAgeIndex).advanceCost,
      canAiAdvance: () => canAdvanceAge(this.aiAgeIndex),
      getAiTurretUpgradeCost: () => getTurretUpgradeCost(this.aiAgeIndex, this.aiBase.turretLevel),
      canAiUpgradeTurret: () => canUpgradeTurret(this.aiAgeIndex, this.aiBase.turretLevel),
      getRoster: () => getUnitsForAge(this.aiAgeIndex),
      trySpawnUnit: (unitId) => this.trySpawnUnit('ai', unitId),
      tryAdvanceAge: () => this.tryAdvanceAge('ai'),
      tryUpgradeTurret: () => this.tryUpgradeTurret('ai'),
      debugLog: (message) => this.debugLog(`AI ${message}`),
    });

    this.playerAiSystem = new AiSystem({
      getAiAgeIndex: () => this.playerAgeIndex,
      getAiGold: () => this.playerGold,
      isUnderPressure: () => this.getFrontX('ai') < this.playerBase.x + 255,
      getLaneAdvantage: () => this.getLaneAdvantage('player'),
      getAiAdvanceCost: () => getAgeDefinition(this.playerAgeIndex).advanceCost,
      canAiAdvance: () => canAdvanceAge(this.playerAgeIndex),
      getAiTurretUpgradeCost: () => getTurretUpgradeCost(this.playerAgeIndex, this.playerBase.turretLevel),
      canAiUpgradeTurret: () => canUpgradeTurret(this.playerAgeIndex, this.playerBase.turretLevel),
      getRoster: () => getUnitsForAge(this.playerAgeIndex),
      trySpawnUnit: (unitId) => this.trySpawnUnit('player', unitId),
      tryAdvanceAge: () => this.tryAdvanceAge('player'),
      tryUpgradeTurret: () => this.tryUpgradeTurret('player'),
      debugLog: (message) => this.debugLog(`PLAYER-AI ${message}`),
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
        if (this.isAiVsAiMode()) {
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
        if (this.isAiVsAiMode() && command.side === 'player') {
          break;
        }

        const advanced = this.tryAdvanceAge(command.side);
        if (!advanced && command.side === 'player') {
          this.battleMessage = 'Not enough gold to advance age.';
          this.syncHudSnapshot(true);
        }
        break;
      }
      case 'upgrade_turret': {
        if (!this.matchRunning || this.paused) {
          break;
        }
        if (this.isAiVsAiMode() && command.side === 'player') {
          break;
        }

        const upgraded = this.tryUpgradeTurret(command.side);
        if (!upgraded && command.side === 'player') {
          this.battleMessage = 'Cannot upgrade turret right now.';
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
    this.playerAiSystem.reset();

    this.fixedAccumulatorMs = 0;
    this.incomeAccumulatorMs = 0;
    this.hudAccumulatorMs = 0;
    this.elapsedMs = 0;

    const progress = this.bridge.getState().progress;
    this.playerAgeIndex = progress.selectedStartAge;
    this.aiAgeIndex = progress.selectedStartAge;

    const startAge = getAgeDefinition(progress.selectedStartAge);
    const playerMaxBaseHp = BASE_BASE_HP;
    const aiMaxBaseHp = BASE_BASE_HP + startAge.economy.aiBaseHpBonus;

    this.playerBase.maxHp = playerMaxBaseHp;
    this.playerBase.hp = playerMaxBaseHp;
    this.aiBase.maxHp = aiMaxBaseHp;
    this.aiBase.hp = aiMaxBaseHp;

    this.playerGold = PLAYER_GOLD_ON_START + startAge.economy.playerStartGoldBonus;
    this.aiGold = AI_GOLD_ON_START + startAge.economy.aiStartGoldBonus;

    // Meta upgrades are currently KIV in UI, so keep match economy neutral.
    this.playerIncomeMetaBonus = 0;
    this.refreshIncomeRates();

    this.playerCooldowns = new Map<UnitId, number>();
    this.aiCooldowns = new Map<UnitId, number>();

    for (const unit of getUnitsForAge(this.playerAgeIndex)) {
      this.playerCooldowns.set(unit.id, 0);
    }
    for (const unit of getUnitsForAge(this.aiAgeIndex)) {
      this.aiCooldowns.set(unit.id, 0);
    }

    this.playerBase.turretLevel = 0;
    this.aiBase.turretLevel = 0;
    this.playerBase.weaponCooldownMs = 0;
    this.aiBase.weaponCooldownMs = 0;

    this.updateBaseVisual('player');
    this.updateBaseVisual('ai');
    this.rotateTurretToIdle(this.playerBase, FIXED_STEP_MS);
    this.rotateTurretToIdle(this.aiBase, FIXED_STEP_MS);

    this.paused = false;
    this.matchRunning = true;
    this.lastAiVsAiMode = this.isAiVsAiMode();
    this.battleMessage = 'Clash begins. Break the enemy stronghold.';
    this.debugLog(
      `match-start playerAge=${getAgeDefinition(this.playerAgeIndex).label} aiAge=${getAgeDefinition(this.aiAgeIndex).label} playerTurret=L1 aiTurret=L1`,
    );
    this.debugLog(`mode=${this.lastAiVsAiMode ? 'AI vs AI' : 'Player vs AI'}`);
    this.ensureBgmPlaying();

    this.syncHudSnapshot(true);
  }

  private simulateStep(deltaMs: number): void {
    this.elapsedMs += deltaMs;

    const aiVsAiMode = this.isAiVsAiMode();
    if (aiVsAiMode !== this.lastAiVsAiMode) {
      this.lastAiVsAiMode = aiVsAiMode;
      this.playerAiSystem.reset();
      this.debugLog(`mode-changed ${aiVsAiMode ? 'AI vs AI enabled' : 'AI vs AI disabled'}`);
    }

    this.tickCooldowns(this.playerCooldowns, deltaMs);
    this.tickCooldowns(this.aiCooldowns, deltaMs);

    this.incomeAccumulatorMs += deltaMs;
    while (this.incomeAccumulatorMs >= PASSIVE_INCOME_TICK_MS) {
      this.playerGold += this.playerIncomePerSecond;
      this.aiGold += this.aiIncomePerSecond;
      this.incomeAccumulatorMs -= PASSIVE_INCOME_TICK_MS;
    }

    if (aiVsAiMode) {
      this.playerAiSystem.update(deltaMs);
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

  private refreshIncomeRates(): void {
    const playerAge = getAgeDefinition(this.playerAgeIndex);
    const aiAge = getAgeDefinition(this.aiAgeIndex);

    this.playerIncomePerSecond =
      BASE_PASSIVE_INCOME_PER_SECOND +
      this.playerIncomeMetaBonus +
      playerAge.economy.playerIncomeBonus;

    this.aiIncomePerSecond = BASE_PASSIVE_INCOME_PER_SECOND + aiAge.economy.aiIncomeBonus;
  }

  private updateBaseAttacks(deltaMs: number): void {
    this.playerBase.weaponCooldownMs -= deltaMs;
    this.aiBase.weaponCooldownMs -= deltaMs;

    this.tryBaseAttack('player', deltaMs);
    this.tryBaseAttack('ai', deltaMs);
  }

  private tryBaseAttack(side: Side, deltaMs: number): void {
    const base = this.getHomeBase(side);
    const ageIndex = side === 'player' ? this.playerAgeIndex : this.aiAgeIndex;
    const weapon = getTurretLevelDefinition(ageIndex, base.turretLevel).weapon;

    const enemyTarget = this.unitSystem
      .getAll()
      .filter((unit) => unit.alive && unit.side !== side)
      .sort((left, right) => Math.abs(left.x - base.x) - Math.abs(right.x - base.x))
      .find((unit) => Math.abs(unit.x - base.x) <= weapon.range);

    if (!enemyTarget) {
      this.rotateTurretToIdle(base, deltaMs);
      return;
    }

    this.rotateTurretTowards(base, enemyTarget.x, enemyTarget.y, deltaMs);

    if (base.weaponCooldownMs > 0) {
      return;
    }

    const muzzle = this.getTurretMuzzlePosition(base);

    this.projectileSystem.spawn({
      side,
      sourceUnitId: 'base',
      x: muzzle.x,
      y: muzzle.y,
      targetX: enemyTarget.x,
      targetY: enemyTarget.y,
      damage: weapon.damage,
      speed: weapon.projectileSpeed,
      radius: 5,
      color: weapon.color,
      debuffDurationMs: weapon.debuffDurationMs,
      debuffAttackSpeedMultiplier: weapon.debuffAttackSpeedMultiplier,
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
      this.playerBase.turretLevel = 0;
      this.playerBase.weaponCooldownMs = 0;
      this.bridge.unlockAge(this.playerAgeIndex);
      this.battleMessage = `Advanced to ${getAgeDefinition(this.playerAgeIndex).label}.`;
      this.debugLog(`player advanced to ${getAgeDefinition(this.playerAgeIndex).label}`);
      this.updateBaseVisual('player');
      this.rotateTurretToIdle(this.playerBase, FIXED_STEP_MS);
    } else {
      this.aiGold -= advanceCost;
      this.aiAgeIndex += 1;
      this.aiBase.turretLevel = 0;
      this.aiBase.weaponCooldownMs = 0;
      this.updateBaseVisual('ai');
      this.rotateTurretToIdle(this.aiBase, FIXED_STEP_MS);
      this.debugLog(`AI advanced to ${getAgeDefinition(this.aiAgeIndex).label}`);
    }

    this.refreshIncomeRates();
    return true;
  }

  private tryUpgradeTurret(side: Side): boolean {
    const base = this.getHomeBase(side);
    const ageIndex = side === 'player' ? this.playerAgeIndex : this.aiAgeIndex;
    const upgradeCost = getTurretUpgradeCost(ageIndex, base.turretLevel);

    if (upgradeCost === null) {
      return false;
    }

    if (side === 'player') {
      if (this.playerGold < upgradeCost) {
        return false;
      }
      this.playerGold -= upgradeCost;
    } else {
      if (this.aiGold < upgradeCost) {
        return false;
      }
      this.aiGold -= upgradeCost;
    }

    base.turretLevel += 1;
    base.weaponCooldownMs = 0;
    this.updateBaseVisual(side);

    if (side === 'player') {
      const turretLevel = getTurretLevelDefinition(ageIndex, base.turretLevel);
      this.battleMessage = `Turret upgraded to ${turretLevel.label}.`;
      this.debugLog(`player upgraded turret to ${turretLevel.label}`);
      this.syncHudSnapshot(true);
    } else {
      const turretLevel = getTurretLevelDefinition(ageIndex, base.turretLevel);
      this.debugLog(`AI upgraded turret to ${turretLevel.label}`);
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

  private rotateTurretTowards(base: BaseState, targetX: number, targetY: number, deltaMs: number): void {
    const desiredAngle = Phaser.Math.Angle.Between(base.turretPivot.x, base.turretPivot.y, targetX, targetY);
    const angleDelta = Phaser.Math.Angle.Wrap(desiredAngle - base.turretPivot.rotation);
    const maxStep = TURRET_TURN_SPEED_RAD_PER_SECOND * (deltaMs / 1000);

    base.turretPivot.setRotation(
      base.turretPivot.rotation + Phaser.Math.Clamp(angleDelta, -maxStep, maxStep),
    );
  }

  private rotateTurretToIdle(base: BaseState, deltaMs: number): void {
    const direction = base.side === 'player' ? 1 : -1;
    this.rotateTurretTowards(base, base.turretPivot.x + direction * 220, base.turretPivot.y, deltaMs);
  }

  private getTurretMuzzlePosition(base: BaseState): { x: number; y: number } {
    const barrelLength = base.turretBarrel.width * base.turretBarrel.scaleX * 0.85;

    return {
      x: base.turretPivot.x + Math.cos(base.turretPivot.rotation) * barrelLength,
      y: base.turretPivot.y + Math.sin(base.turretPivot.rotation) * barrelLength,
    };
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

  private getLaneAdvantage(side: Side): number {
    const playerProgress = this.getFrontX('player') - this.playerBase.x;
    const aiProgress = this.aiBase.x - this.getFrontX('ai');

    return side === 'player' ? playerProgress - aiProgress : aiProgress - playerProgress;
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
      playerTurretLevel: this.playerBase.turretLevel,
      playerTurretMaxLevel: getTurretMaxLevel(this.playerAgeIndex),
      playerTurretUpgradeCost: getTurretUpgradeCost(this.playerAgeIndex, this.playerBase.turretLevel),
      aiTurretLevel: this.aiBase.turretLevel,
      aiTurretMaxLevel: getTurretMaxLevel(this.aiAgeIndex),
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
    core.setStrokeStyle(2, 0x0f172a, 0.55);
    core.setDepth(4);

    const tower = this.add.rectangle(x, LANE_Y - 95, 72, 130, 0xf59e0b, 1);
    tower.setStrokeStyle(2, 0x0f172a, 0.7);
    tower.setDepth(6);

    const turretMount = this.add.circle(0, 12, 14, 0x94a3b8, 1);
    turretMount.setStrokeStyle(1, 0x0f172a, 0.6);

    const turretHead = this.add.rectangle(0, 0, 34, 24, 0xcbd5e1, 1);
    turretHead.setStrokeStyle(1, 0x0f172a, 0.7);

    const turretBarrel = this.add.rectangle(24, 0, 40, 9, 0xe2e8f0, 1).setOrigin(0.15, 0.5);
    turretBarrel.setStrokeStyle(1, 0x0f172a, 0.6);

    const turretPivot = this.add.container(x, LANE_Y - 158, [turretMount, turretHead, turretBarrel]);
    turretPivot.setDepth(8);
    turretPivot.setRotation(side === 'player' ? 0 : Math.PI);

    return {
      side,
      x,
      hp: BASE_BASE_HP,
      maxHp: BASE_BASE_HP,
      weaponCooldownMs: 0,
      turretLevel: 0,
      tower,
      core,
      turretPivot,
      turretHead,
      turretBarrel,
      turretMount,
    };
  }

  private updateBaseVisual(side: Side): void {
    const base = this.getHomeBase(side);
    const age = getAgeDefinition(side === 'player' ? this.playerAgeIndex : this.aiAgeIndex);
    const turretLevel = getTurretLevelDefinition(
      side === 'player' ? this.playerAgeIndex : this.aiAgeIndex,
      base.turretLevel,
    );

    const accentTint = Number.parseInt(age.accentColor.replace('#', ''), 16);
    const alpha = side === 'player' ? 0.9 : 0.8;

    base.tower.setFillStyle(turretLevel.towerColor, alpha);
    base.tower.setStrokeStyle(2, accentTint, 0.7);
    base.core.setFillStyle(side === 'player' ? 0x1f2937 : 0x334155, 1);

    base.turretMount.setFillStyle(turretLevel.towerColor, 0.92);
    base.turretHead.setFillStyle(turretLevel.turretColor, 1);
    base.turretBarrel.setFillStyle(turretLevel.barrelColor, 1);

    const headScale = 1 + base.turretLevel * 0.06;
    const barrelScale = 1 + base.turretLevel * 0.08;
    base.turretHead.setScale(headScale, headScale);
    base.turretBarrel.setScale(barrelScale, 1);
  }

  private ensureBgmPlaying(): void {
    const state = this.bridge.getState();
    if (!state.soundOn || !this.cache.audio.exists(BGM_KEY)) {
      return;
    }

    if (!this.bgm) {
      this.bgm = this.sound.add(BGM_KEY, {
        loop: true,
        volume: state.soundVolume,
      });
    }

    this.sound.volume = state.soundVolume;

    if (!this.bgm.isPlaying) {
      this.sound.mute = false;
      this.bgm.play();
    }
  }

  private syncSoundState(): void {
    const { soundOn, soundVolume } = this.bridge.getState();
    this.sound.mute = !soundOn;

    this.sound.volume = soundVolume;

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

  private debugLog(message: string): void {
    if (!DEBUG_ENABLED) {
      return;
    }

    const timestampSec = (this.elapsedMs / 1000).toFixed(1);
    this.bridge.pushDebugLog(`[${timestampSec}s] ${message}`);
  }

  private isAiVsAiMode(): boolean {
    return DEBUG_ENABLED && this.bridge.getState().debugAiVsAi;
  }
}
