import type { AgeDefinition, AgeId } from '../types';

export const AGE_DEFINITIONS: AgeDefinition[] = [
  {
    id: 'hearth',
    label: 'Hearth',
    advanceCost: 600,
    baseWeapon: {
      damage: 12,
      cooldownMs: 1200,
      range: 330,
      projectileSpeed: 540,
      color: 0xfaa74d,
    },
    accentColor: '#f59e0b',
  },
  {
    id: 'arcane',
    label: 'Arcane',
    advanceCost: 980,
    baseWeapon: {
      damage: 20,
      cooldownMs: 1100,
      range: 360,
      projectileSpeed: 600,
      color: 0x7b9fff,
    },
    accentColor: '#7c8cff',
  },
  {
    id: 'beast',
    label: 'Beast',
    advanceCost: 1500,
    baseWeapon: {
      damage: 32,
      cooldownMs: 980,
      range: 380,
      projectileSpeed: 680,
      color: 0x6cc17e,
    },
    accentColor: '#34d399',
  },
  {
    id: 'runeforge',
    label: 'Runeforge',
    advanceCost: 2300,
    baseWeapon: {
      damage: 46,
      cooldownMs: 900,
      range: 410,
      projectileSpeed: 740,
      color: 0x8ca0bc,
    },
    accentColor: '#93c5fd',
  },
  {
    id: 'astral',
    label: 'Astral',
    advanceCost: null,
    baseWeapon: {
      damage: 64,
      cooldownMs: 800,
      range: 430,
      projectileSpeed: 820,
      color: 0xf8fafc,
    },
    accentColor: '#dbeafe',
  },
];

export function ageIndexToId(ageIndex: number): AgeId {
  return AGE_DEFINITIONS[Math.max(0, Math.min(ageIndex, AGE_DEFINITIONS.length - 1))]!.id;
}

export function getAgeDefinition(ageIndex: number): AgeDefinition {
  return AGE_DEFINITIONS[Math.max(0, Math.min(ageIndex, AGE_DEFINITIONS.length - 1))]!;
}

export function getAgeLabel(ageIndex: number): string {
  return getAgeDefinition(ageIndex).label;
}

export function canAdvanceAge(ageIndex: number): boolean {
  return ageIndex < AGE_DEFINITIONS.length - 1;
}
