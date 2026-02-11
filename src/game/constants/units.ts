import { RESOLVED_UNIT_DEFINITIONS } from '../config/resolveConfig';
import { AGE_DEFINITIONS, getAgeDefinition } from './ages';
import type { UnitDefinition, UnitId, UnitTag } from '../types';

export const UNIT_DEFINITIONS: Record<UnitId, UnitDefinition> = RESOLVED_UNIT_DEFINITIONS;

export function getUnitsForAge(ageIndex: number): UnitDefinition[] {
  const age = getAgeDefinition(ageIndex);
  return age.unitRoster.map((unitId) => UNIT_DEFINITIONS[unitId]);
}

export function getUnitDefinition(unitId: UnitId): UnitDefinition {
  return UNIT_DEFINITIONS[unitId];
}

export function getUnitsUpToAge(ageIndex: number): UnitDefinition[] {
  return AGE_DEFINITIONS.slice(0, Math.max(0, ageIndex) + 1).flatMap((age) =>
    age.unitRoster.map((unitId) => UNIT_DEFINITIONS[unitId]),
  );
}

export function pickUnitByTag(
  ageIndex: number,
  tag: UnitTag,
  sortOrder: 'cheap' | 'expensive' = 'cheap',
): UnitDefinition | undefined {
  const pool = getUnitsForAge(ageIndex).filter((unit) => unit.tags.includes(tag));
  if (pool.length === 0) {
    return undefined;
  }

  const sorted = [...pool].sort((a, b) =>
    sortOrder === 'cheap' ? a.cost - b.cost : b.cost - a.cost,
  );

  return sorted[0];
}

export function getCheapestUnitCost(ageIndex: number): number {
  return Math.min(...getUnitsForAge(ageIndex).map((unit) => unit.cost));
}
