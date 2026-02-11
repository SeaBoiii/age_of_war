import Phaser from 'phaser';
import type { ProjectileEntity, Side, UnitEntity, UnitId } from '../types';

export interface SpawnProjectileOptions {
  side: Side;
  sourceUnitId: UnitId | 'base';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  damage: number;
  speed: number;
  radius: number;
  color: number;
  splashRadius?: number;
  pierce?: number;
  ttlMs?: number;
  targetBase: boolean;
  executeThreshold?: number;
  executeBonusDamage?: number;
  debuffDurationMs?: number;
  debuffAttackSpeedMultiplier?: number;
}

interface ProjectileContext {
  scene: Phaser.Scene;
  getUnits: () => UnitEntity[];
  getEnemyBaseX: (attackerSide: Side) => number;
  damageBase: (attackerSide: Side, damage: number) => void;
  damageUnit: (
    unit: UnitEntity,
    damage: number,
    attackerSide: Side,
    sourceUnitId: UnitId | 'base',
    projectile: ProjectileEntity,
  ) => void;
}

export class ProjectileSystem {
  private readonly projectiles: ProjectileEntity[] = [];

  private nextProjectileId = 1;

  public constructor(private readonly context: ProjectileContext) {}

  public getAll(): ProjectileEntity[] {
    return this.projectiles;
  }

  public reset(): void {
    for (const projectile of this.projectiles) {
      projectile.visual.destroy();
    }

    this.projectiles.length = 0;
    this.nextProjectileId = 1;
  }

  public spawn(options: SpawnProjectileOptions): void {
    const direction = new Phaser.Math.Vector2(
      options.targetX - options.x,
      options.targetY - options.y,
    ).normalize();

    const projectileShape = this.context.scene.add.circle(
      options.x,
      options.y,
      options.radius,
      options.color,
      1,
    );
    projectileShape.setDepth(22);

    this.projectiles.push({
      uid: this.nextProjectileId++,
      side: options.side,
      sourceUnitId: options.sourceUnitId,
      x: options.x,
      y: options.y,
      vx: direction.x * options.speed,
      vy: direction.y * options.speed,
      ttlMs: options.ttlMs ?? 2600,
      damage: options.damage,
      radius: options.radius,
      color: options.color,
      splashRadius: options.splashRadius ?? 0,
      pierceRemaining: options.pierce ?? 0,
      executeThreshold: options.executeThreshold,
      executeBonusDamage: options.executeBonusDamage,
      debuffDurationMs: options.debuffDurationMs,
      debuffAttackSpeedMultiplier: options.debuffAttackSpeedMultiplier,
      targetBase: options.targetBase,
      visual: projectileShape,
    });
  }

  public update(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index]!;
      projectile.ttlMs -= deltaMs;
      projectile.x += projectile.vx * deltaSeconds;
      projectile.y += projectile.vy * deltaSeconds;
      projectile.visual.setPosition(projectile.x, projectile.y);

      if (projectile.ttlMs <= 0) {
        this.removeAt(index);
        continue;
      }

      if (this.tryBaseCollision(projectile)) {
        this.removeAt(index);
        continue;
      }

      const hitTarget = this.findHitTarget(projectile);
      if (!hitTarget) {
        continue;
      }

      this.applyProjectileHit(projectile, hitTarget);
      if (projectile.pierceRemaining <= 0) {
        this.removeAt(index);
      } else {
        projectile.pierceRemaining -= 1;
      }
    }
  }

  private removeAt(index: number): void {
    const projectile = this.projectiles[index]!;
    projectile.visual.destroy();
    this.projectiles.splice(index, 1);
  }

  private tryBaseCollision(projectile: ProjectileEntity): boolean {
    if (!projectile.targetBase) {
      return false;
    }

    const enemyBaseX = this.context.getEnemyBaseX(projectile.side);
    const reachedBase =
      projectile.side === 'player'
        ? projectile.x >= enemyBaseX - 44
        : projectile.x <= enemyBaseX + 44;

    if (!reachedBase) {
      return false;
    }

    this.context.damageBase(projectile.side, projectile.damage);
    return true;
  }

  private findHitTarget(projectile: ProjectileEntity): UnitEntity | undefined {
    return this.context
      .getUnits()
      .find(
        (unit) =>
          unit.alive &&
          unit.side !== projectile.side &&
          Phaser.Math.Distance.Between(projectile.x, projectile.y, unit.x, unit.y) <=
            projectile.radius + unit.def.size * 0.42,
      );
  }

  private applyProjectileHit(projectile: ProjectileEntity, primaryTarget: UnitEntity): void {
    if (projectile.splashRadius > 0) {
      const victims = this.context
        .getUnits()
        .filter(
          (unit) =>
            unit.alive &&
            unit.side !== projectile.side &&
            Phaser.Math.Distance.Between(projectile.x, projectile.y, unit.x, unit.y) <=
              projectile.splashRadius,
        );

      for (const victim of victims) {
        const splashFactor = victim.uid === primaryTarget.uid ? 1 : 0.65;
        this.context.damageUnit(
          victim,
          projectile.damage * splashFactor,
          projectile.side,
          projectile.sourceUnitId,
          projectile,
        );
      }
      return;
    }

    this.context.damageUnit(
      primaryTarget,
      projectile.damage,
      projectile.side,
      projectile.sourceUnitId,
      projectile,
    );
  }
}
