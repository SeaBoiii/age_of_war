import type { UnitEntity } from '../types';

export class CombatSystem {
  public calculateUnitDamage(attacker: UnitEntity, target: UnitEntity, nowMs: number): number {
    let damage = attacker.def.damage;

    if (attacker.def.traits?.antiArmorMultiplier && target.def.tags.includes('armored')) {
      damage *= attacker.def.traits.antiArmorMultiplier;
    }

    if (
      attacker.def.traits?.chargeDamageMultiplier &&
      attacker.def.traits.chargeDurationMs &&
      nowMs - attacker.spawnedAtMs <= attacker.def.traits.chargeDurationMs
    ) {
      damage *= attacker.def.traits.chargeDamageMultiplier;
    }

    if (
      attacker.def.traits?.executeThreshold !== undefined &&
      attacker.def.traits.executeBonusDamage &&
      target.hp / target.def.maxHp <= attacker.def.traits.executeThreshold
    ) {
      damage += attacker.def.traits.executeBonusDamage;
    }

    return damage;
  }

  public calculateBaseDamage(attacker: UnitEntity, nowMs: number): number {
    let damage = attacker.def.damage;

    if (
      attacker.def.traits?.chargeDamageMultiplier &&
      attacker.def.traits.chargeDurationMs &&
      nowMs - attacker.spawnedAtMs <= attacker.def.traits.chargeDurationMs
    ) {
      damage *= attacker.def.traits.chargeDamageMultiplier;
    }

    return damage;
  }

  public applyDamageToUnit(target: UnitEntity, rawDamage: number): boolean {
    let remainingDamage = rawDamage;

    if (target.shield > 0) {
      const shieldAbsorb = Math.min(target.shield, remainingDamage);
      target.shield -= shieldAbsorb;
      remainingDamage -= shieldAbsorb;
    }

    if (remainingDamage > 0) {
      target.hp = Math.max(0, target.hp - remainingDamage);
    }

    return target.hp <= 0;
  }

  public applyDebuffIfAvailable(attacker: UnitEntity, target: UnitEntity, nowMs: number): void {
    if (attacker.def.traits?.debuffDurationMs) {
      target.debuffedUntilMs = Math.max(target.debuffedUntilMs, nowMs + attacker.def.traits.debuffDurationMs);
      target.debuffAttackSpeedMultiplier = Math.min(
        target.debuffAttackSpeedMultiplier,
        attacker.def.traits.debuffAttackSpeedMultiplier ?? 0.75,
      );
    }
  }

  public getAttackSpeedMultiplier(unit: UnitEntity, nowMs: number): number {
    if (unit.debuffedUntilMs > nowMs) {
      return unit.debuffAttackSpeedMultiplier;
    }

    unit.debuffAttackSpeedMultiplier = 1;
    return 1;
  }

  public getMoveSpeed(unit: UnitEntity, nowMs: number): number {
    if (
      unit.def.traits?.chargeSpeedMultiplier &&
      unit.def.traits.chargeDurationMs &&
      nowMs - unit.spawnedAtMs <= unit.def.traits.chargeDurationMs
    ) {
      return unit.def.moveSpeed * unit.def.traits.chargeSpeedMultiplier;
    }

    return unit.def.moveSpeed;
  }
}
