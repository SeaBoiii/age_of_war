import { RESOLVED_AGE_DEFINITIONS } from '../config/resolveConfig';
import type { AgeDefinition, AgeId } from '../types';

export const AGE_DEFINITIONS: AgeDefinition[] = RESOLVED_AGE_DEFINITIONS;

function clampAgeIndex(ageIndex: number): number {
  return Math.max(0, Math.min(ageIndex, AGE_DEFINITIONS.length - 1));
}

function clampTurretLevel(ageIndex: number, turretLevel: number): number {
  const maxLevel = getTurretMaxLevel(ageIndex);
  return Math.max(0, Math.min(turretLevel, maxLevel));
}

function validateAgeDefinitions(definitions: AgeDefinition[]): void {
  for (const age of definitions) {
    if (age.turretLevels.length === 0) {
      throw new Error(`Age ${age.id} must define at least one turret level.`);
    }

    for (let index = 0; index < age.turretLevels.length; index += 1) {
      const level = age.turretLevels[index]!;
      const isLast = index === age.turretLevels.length - 1;
      if (isLast && level.upgradeCost !== null) {
        throw new Error(`Age ${age.id} max turret level must have null upgradeCost.`);
      }
      if (!isLast && (level.upgradeCost === null || level.upgradeCost <= 0)) {
        throw new Error(`Age ${age.id} turret level ${index} must have a positive upgradeCost.`);
      }
    }
  }
}

validateAgeDefinitions(AGE_DEFINITIONS);

export function ageIndexToId(ageIndex: number): AgeId {
  return AGE_DEFINITIONS[clampAgeIndex(ageIndex)]!.id;
}

export function getAgeDefinition(ageIndex: number): AgeDefinition {
  return AGE_DEFINITIONS[clampAgeIndex(ageIndex)]!;
}

export function getAgeLabel(ageIndex: number): string {
  return getAgeDefinition(ageIndex).label;
}

export function canAdvanceAge(ageIndex: number): boolean {
  return ageIndex < AGE_DEFINITIONS.length - 1;
}

export function getTurretMaxLevel(ageIndex: number): number {
  return getAgeDefinition(ageIndex).turretLevels.length - 1;
}

export function getTurretLevelDefinition(ageIndex: number, turretLevel: number) {
  const age = getAgeDefinition(ageIndex);
  return age.turretLevels[clampTurretLevel(ageIndex, turretLevel)]!;
}

export function getTurretUpgradeCost(ageIndex: number, turretLevel: number): number | null {
  return getTurretLevelDefinition(ageIndex, turretLevel).upgradeCost;
}

export function canUpgradeTurret(ageIndex: number, turretLevel: number): boolean {
  return getTurretUpgradeCost(ageIndex, turretLevel) !== null;
}
