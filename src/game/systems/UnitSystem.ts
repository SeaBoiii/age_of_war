import Phaser from 'phaser';
import { BASE_TOUCH_RANGE, LANE_Y, UNIT_MIN_SPACING } from '../constants/balance';
import type { AgeId, UnitDefinition, UnitEntity, UnitId, Side } from '../types';
import { CombatSystem } from './CombatSystem';
import type { SpawnProjectileOptions } from './ProjectileSystem';

interface DamageUnitModifiers {
  debuffDurationMs?: number;
  debuffAttackSpeedMultiplier?: number;
}

const RANGED_ENGAGE_DISTANCE_BY_AGE: Record<AgeId, number> = {
  hearth: UNIT_MIN_SPACING * 2,
  arcane: UNIT_MIN_SPACING * 2.7,
  beast: UNIT_MIN_SPACING * 3.4,
  runeforge: UNIT_MIN_SPACING * 4.1,
  astral: UNIT_MIN_SPACING * 4.8,
};

interface UnitSystemContext {
  scene: Phaser.Scene;
  nowMs: () => number;
  getHomeBaseX: (side: Side) => number;
  getEnemyBaseX: (side: Side) => number;
  damageBase: (attackerSide: Side, damage: number) => void;
  damageUnit: (
    unit: UnitEntity,
    damage: number,
    attackerSide: Side,
    sourceUnitId: UnitId,
    modifiers?: DamageUnitModifiers,
  ) => void;
  spawnProjectile: (options: SpawnProjectileOptions) => void;
}

export class UnitSystem {
  private readonly units: UnitEntity[] = [];

  private nextUnitUid = 1;

  public constructor(
    private readonly context: UnitSystemContext,
    private readonly combat: CombatSystem,
  ) {}

  public getAll(): UnitEntity[] {
    return this.units;
  }

  public reset(): void {
    for (const unit of this.units) {
      unit.body.destroy();
    }

    this.units.length = 0;
    this.nextUnitUid = 1;
  }

  public spawn(side: Side, def: UnitDefinition): UnitEntity {
    const direction = side === 'player' ? 1 : -1;
    const spawnX = this.context.getHomeBaseX(side) + direction * 132;
    const laneOffset = [0, -10, 10][this.nextUnitUid % 3] ?? 0;

    const bodyShape =
      def.attackType === 'projectile'
        ? this.context.scene.add.circle(0, 0, def.size * 0.45, def.color, 1)
        : this.context.scene.add.rectangle(0, 0, def.size, def.size * 0.74, def.color, 1);

    if (def.tags.includes('tank')) {
      bodyShape.setScale(1.16, 1.08);
    }

    bodyShape.setStrokeStyle(2, side === 'player' ? 0xffffff : 0x0f172a, 0.7);

    const icon = this.context.scene.add
      .text(0, 0, def.icon, {
        fontFamily: 'Trebuchet MS',
        fontStyle: 'bold',
        fontSize: `${Math.max(12, def.size * 0.32)}px`,
        color: '#0f172a',
      })
      .setOrigin(0.5);

    const hpBg = this.context.scene.add.rectangle(0, -def.size * 0.72, def.size, 4, 0x0f172a, 0.72);
    const hpFill = this.context.scene.add
      .rectangle(-def.size / 2, -def.size * 0.72, def.size, 4, 0x22c55e, 1)
      .setOrigin(0, 0.5);

    const container = this.context.scene.add.container(spawnX, LANE_Y + laneOffset, [
      bodyShape,
      icon,
      hpBg,
      hpFill,
    ]);
    container.setDepth(12);

    if (side === 'ai') {
      container.setScale(-1, 1);
    }

    const now = this.context.nowMs();
    const unit: UnitEntity = {
      uid: this.nextUnitUid++,
      side,
      def,
      x: spawnX,
      y: LANE_Y + laneOffset,
      hp: def.maxHp,
      shield: 0,
      alive: true,
      spawnedAtMs: now,
      spawnX,
      laneOffset,
      attackCooldownRemainingMs: 200,
      abilityCooldownMs: def.traits?.barrierPulseEveryMs ?? def.traits?.blinkEveryMs ?? 1200,
      auxiliaryCooldownMs: 0,
      debuffedUntilMs: 0,
      debuffAttackSpeedMultiplier: 1,
      anchored: false,
      body: container,
      hpFill,
    };

    this.units.push(unit);
    return unit;
  }

  public update(deltaMs: number): void {
    const now = this.context.nowMs();

    for (const unit of this.units) {
      if (!unit.alive) {
        continue;
      }

      unit.attackCooldownRemainingMs = Math.max(
        0,
        unit.attackCooldownRemainingMs -
          deltaMs * this.combat.getAttackSpeedMultiplier(unit, now),
      );

      unit.abilityCooldownMs -= deltaMs;

      this.processTraits(unit, deltaMs);

      const effectiveRange = this.getEffectiveRange(unit);
      const engageRange = this.getEngageRange(unit, effectiveRange);
      const allyBlocked = this.isBlockedByAlly(unit);

      let target = this.findBestEnemyInRange(unit, engageRange);
      let enemyBaseInRange = this.isEnemyBaseInRange(unit, engageRange);

      // Allow ranged units to fire over frontline allies when movement is blocked.
      if (!target && allyBlocked && unit.def.attackType === 'projectile' && !unit.anchored) {
        target = this.findBestEnemyInRange(unit, effectiveRange);
        if (!enemyBaseInRange) {
          enemyBaseInRange = this.isEnemyBaseInRange(unit, effectiveRange);
        }
      }

      if (target) {
        this.tryAttackUnit(unit, target, now);
      } else if (enemyBaseInRange) {
        this.tryAttackBase(unit, now);
      }

      const rangedMoveAndFire = unit.def.attackType === 'projectile' && !unit.anchored;
      const shouldAdvanceWhileFiring =
        rangedMoveAndFire && this.shouldAdvanceWhileFiring(unit, target, engageRange);

      if (shouldAdvanceWhileFiring) {
        const moveScale = target || enemyBaseInRange ? 0.52 : 1;
        this.advance(unit, deltaMs, now, moveScale);
      } else if (!target && !enemyBaseInRange) {
        this.advance(unit, deltaMs, now);
      }

      this.syncVisual(unit);
    }

    for (let index = this.units.length - 1; index >= 0; index -= 1) {
      const unit = this.units[index]!;
      if (!unit.alive) {
        unit.body.destroy();
        this.units.splice(index, 1);
      }
    }
  }

  private processTraits(unit: UnitEntity, deltaMs: number): void {
    const traits = unit.def.traits;
    if (!traits) {
      return;
    }

    if (
      traits.deployDistance &&
      !unit.anchored &&
      Math.abs(unit.x - unit.spawnX) >= traits.deployDistance
    ) {
      unit.anchored = true;
      unit.body.setAlpha(0.88);
    }

    if (traits.blinkDistance && traits.blinkEveryMs && unit.abilityCooldownMs <= 0) {
      const direction = unit.side === 'player' ? 1 : -1;
      const enemyBaseX = this.context.getEnemyBaseX(unit.side);
      const rawTargetX = unit.x + direction * traits.blinkDistance;
      unit.x =
        direction > 0
          ? Math.min(rawTargetX, enemyBaseX - BASE_TOUCH_RANGE)
          : Math.max(rawTargetX, enemyBaseX + BASE_TOUCH_RANGE);
      unit.abilityCooldownMs = traits.blinkEveryMs;
      return;
    }

    if (
      traits.barrierPulseAmount &&
      traits.barrierPulseRadius &&
      traits.barrierPulseEveryMs &&
      unit.abilityCooldownMs <= 0
    ) {
      const targetAlly = this.units
        .filter((ally) => ally.alive && ally.side === unit.side)
        .sort(
          (left, right) =>
            Phaser.Math.Distance.Between(unit.x, unit.y, left.x, left.y) -
            Phaser.Math.Distance.Between(unit.x, unit.y, right.x, right.y),
        )
        .find(
          (ally) =>
            ally.uid !== unit.uid &&
            Phaser.Math.Distance.Between(unit.x, unit.y, ally.x, ally.y) <=
              traits.barrierPulseRadius!,
        );

      if (targetAlly) {
        targetAlly.shield = Math.min(targetAlly.shield + traits.barrierPulseAmount, 140);
      }

      unit.abilityCooldownMs = traits.barrierPulseEveryMs;
      return;
    }

    unit.auxiliaryCooldownMs = Math.max(0, unit.auxiliaryCooldownMs - deltaMs);
    if (unit.abilityCooldownMs <= 0) {
      unit.abilityCooldownMs = 1000;
    }

    if (unit.def.id === 'turret_caster' && unit.anchored && unit.auxiliaryCooldownMs <= 0) {
      const direction = unit.side === 'player' ? 1 : -1;
      this.context.spawnProjectile({
        side: unit.side,
        sourceUnitId: unit.def.id,
        x: unit.x,
        y: unit.y - 6,
        targetX: unit.x + direction * 180,
        targetY: unit.y,
        damage: 14,
        speed: 540,
        radius: 4,
        color: 0xfef08a,
        targetBase: false,
        ttlMs: 1700,
      });
      unit.auxiliaryCooldownMs = 1100;
    }
  }

  private tryAttackUnit(attacker: UnitEntity, target: UnitEntity, nowMs: number): void {
    if (attacker.attackCooldownRemainingMs > 0) {
      return;
    }

    if (attacker.def.attackType === 'melee') {
      const damage = this.combat.calculateUnitDamage(attacker, target, nowMs);
      this.context.damageUnit(target, damage, attacker.side, attacker.def.id, {
        debuffDurationMs: attacker.def.traits?.debuffDurationMs,
        debuffAttackSpeedMultiplier: attacker.def.traits?.debuffAttackSpeedMultiplier,
      });
      this.combat.applyDebuffIfAvailable(attacker, target, nowMs);
    } else {
      const projectile = attacker.def.projectile;
      if (!projectile) {
        return;
      }

      this.context.spawnProjectile({
        side: attacker.side,
        sourceUnitId: attacker.def.id,
        x: attacker.x,
        y: attacker.y,
        targetX: target.x,
        targetY: target.y,
        damage: attacker.def.damage,
        speed: projectile.speed,
        radius: projectile.radius,
        color: projectile.color,
        pierce: projectile.pierce,
        splashRadius: projectile.splashRadius,
        targetBase: false,
        debuffDurationMs: attacker.def.traits?.debuffDurationMs,
        debuffAttackSpeedMultiplier: attacker.def.traits?.debuffAttackSpeedMultiplier,
      });
    }

    attacker.attackCooldownRemainingMs = attacker.def.attackCooldownMs;
  }

  private tryAttackBase(attacker: UnitEntity, nowMs: number): void {
    if (attacker.attackCooldownRemainingMs > 0) {
      return;
    }

    if (attacker.def.attackType === 'projectile') {
      const projectile = attacker.def.projectile;
      if (!projectile) {
        return;
      }

      const enemyBaseX = this.context.getEnemyBaseX(attacker.side);
      this.context.spawnProjectile({
        side: attacker.side,
        sourceUnitId: attacker.def.id,
        x: attacker.x,
        y: attacker.y,
        targetX: enemyBaseX,
        targetY: LANE_Y,
        damage: attacker.def.damage,
        speed: projectile.speed,
        radius: projectile.radius,
        color: projectile.color,
        pierce: 0,
        targetBase: true,
      });
    } else {
      this.context.damageBase(attacker.side, this.combat.calculateBaseDamage(attacker, nowMs));
    }

    attacker.attackCooldownRemainingMs = attacker.def.attackCooldownMs;
  }

  private advance(unit: UnitEntity, deltaMs: number, nowMs: number, speedScale = 1): void {
    if (unit.anchored) {
      return;
    }

    if (this.isBlockedByAlly(unit)) {
      return;
    }

    const direction = unit.side === 'player' ? 1 : -1;
    const enemyBaseX = this.context.getEnemyBaseX(unit.side);
    const nextX =
      unit.x + this.combat.getMoveSpeed(unit, nowMs) * speedScale * direction * (deltaMs / 1000);

    unit.x =
      direction > 0
        ? Math.min(nextX, enemyBaseX - BASE_TOUCH_RANGE)
        : Math.max(nextX, enemyBaseX + BASE_TOUCH_RANGE);
  }

  private isBlockedByAlly(unit: UnitEntity): boolean {
    const direction = unit.side === 'player' ? 1 : -1;
    const allyAhead = this.units
      .filter((ally) => ally.alive && ally.side === unit.side && ally.uid !== unit.uid)
      .find((ally) => {
        const distance = (ally.x - unit.x) * direction;
        return distance > 0 && distance < UNIT_MIN_SPACING + (unit.def.size + ally.def.size) * 0.46;
      });

    return allyAhead !== undefined;
  }

  private findBestEnemyInRange(unit: UnitEntity, range: number): UnitEntity | undefined {
    const direction = unit.side === 'player' ? 1 : -1;
    const homeBaseX = this.context.getHomeBaseX(unit.side);
    const baseDefenseRadius = BASE_TOUCH_RANGE + 160;

    return this.units
      .filter((enemy) => enemy.alive && enemy.side !== unit.side)
      .filter((enemy) => {
        const directionalDistance = (enemy.x - unit.x) * direction;
        if (directionalDistance >= -8) {
          return true;
        }

        // If an enemy is pressuring our base, allow units to turn and defend it.
        return Math.abs(enemy.x - homeBaseX) <= baseDefenseRadius;
      })
      .sort((left, right) => Math.abs(left.x - unit.x) - Math.abs(right.x - unit.x))
      .find((enemy) => Math.abs(enemy.x - unit.x) <= range + enemy.def.size * 0.45);
  }

  private shouldAdvanceWhileFiring(
    unit: UnitEntity,
    target: UnitEntity | undefined,
    engageRange: number,
  ): boolean {
    if (!target) {
      return true;
    }

    const direction = unit.side === 'player' ? 1 : -1;
    const directionalDistance = (target.x - unit.x) * direction;
    const absoluteDistance = Math.abs(target.x - unit.x);
    const holdDistance = Math.max(UNIT_MIN_SPACING * 1.8, engageRange * 0.72);

    // Keep push pressure for ranged units, but prevent stepping through nearby targets.
    if (directionalDistance <= UNIT_MIN_SPACING * 1.4) {
      return false;
    }

    if (absoluteDistance <= holdDistance) {
      return false;
    }

    return true;
  }

  private getEngageRange(unit: UnitEntity, effectiveRange: number): number {
    if (unit.def.attackType !== 'projectile' || unit.anchored) {
      return effectiveRange;
    }

    const ageRange = RANGED_ENGAGE_DISTANCE_BY_AGE[unit.def.age];
    return Math.min(effectiveRange, ageRange);
  }

  private getEffectiveRange(unit: UnitEntity): number {
    if (unit.anchored && unit.def.traits?.deployAttackRangeBonus) {
      return unit.def.attackRange + unit.def.traits.deployAttackRangeBonus;
    }

    return unit.def.attackRange;
  }

  private isEnemyBaseInRange(unit: UnitEntity, range: number): boolean {
    const baseRange =
      unit.def.attackType === 'projectile'
        ? Math.min(range * 0.58, 175)
        : range;

    return Math.abs(this.context.getEnemyBaseX(unit.side) - unit.x) <= baseRange + BASE_TOUCH_RANGE;
  }

  private syncVisual(unit: UnitEntity): void {
    unit.body.setPosition(unit.x, unit.y);

    const healthRatio = Phaser.Math.Clamp(unit.hp / unit.def.maxHp, 0, 1);
    unit.hpFill.setScale(healthRatio, 1);
    unit.hpFill.setFillStyle(healthRatio > 0.42 ? 0x22c55e : 0xef4444, 1);

    if (unit.shield > 0) {
      unit.body.setAlpha(1);
    }
  }
}
