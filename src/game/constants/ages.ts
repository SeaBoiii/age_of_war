import type { AgeDefinition, AgeId, UnitId } from '../types';

const HEARTH_ROSTER: UnitId[] = ['swordsman', 'archer', 'spearman'];
const ARCANE_ROSTER: UnitId[] = ['shield_acolyte', 'battlemage', 'hexer'];
const BEAST_ROSTER: UnitId[] = ['wolf_rider', 'treant', 'wyvern'];
const RUNEFORGE_ROSTER: UnitId[] = ['golem', 'rune_gunner', 'turret_caster'];
const ASTRAL_ROSTER: UnitId[] = ['portal_knight', 'starcaller', 'void_reaper'];

export const AGE_DEFINITIONS: AgeDefinition[] = [
  {
    id: 'hearth',
    label: 'Hearth',
    advanceCost: 600,
    unitRoster: HEARTH_ROSTER,
    economy: {
      playerStartGoldBonus: 0,
      aiStartGoldBonus: 0,
      playerIncomeBonus: 0,
      aiIncomeBonus: 0,
      aiBaseHpBonus: 0,
    },
    turretLevels: [
      {
        label: 'Militia Turret',
        upgradeCost: 260,
        weapon: {
          damage: 12,
          cooldownMs: 1200,
          range: 330,
          projectileSpeed: 540,
          color: 0xfaa74d,
        },
        towerColor: 0xf59e0b,
        turretColor: 0xfbbf24,
        barrelColor: 0xfde68a,
      },
      {
        label: 'Guard Turret',
        upgradeCost: 390,
        weapon: {
          damage: 18,
          cooldownMs: 1080,
          range: 350,
          projectileSpeed: 590,
          color: 0xfdba74,
        },
        towerColor: 0xf97316,
        turretColor: 0xfb923c,
        barrelColor: 0xfed7aa,
      },
      {
        label: 'Citadel Turret',
        upgradeCost: null,
        weapon: {
          damage: 24,
          cooldownMs: 980,
          range: 370,
          projectileSpeed: 640,
          color: 0xffe2b8,
        },
        towerColor: 0xea580c,
        turretColor: 0xfb923c,
        barrelColor: 0xffedd5,
      },
    ],
    accentColor: '#f59e0b',
  },
  {
    id: 'arcane',
    label: 'Arcane',
    advanceCost: 980,
    unitRoster: ARCANE_ROSTER,
    economy: {
      playerStartGoldBonus: 80,
      aiStartGoldBonus: 90,
      playerIncomeBonus: 0.8,
      aiIncomeBonus: 1.6,
      aiBaseHpBonus: 35,
    },
    turretLevels: [
      {
        label: 'Sigil Turret',
        upgradeCost: 420,
        weapon: {
          damage: 30,
          cooldownMs: 930,
          range: 395,
          projectileSpeed: 700,
          color: 0xa5b4fc,
        },
        towerColor: 0x818cf8,
        turretColor: 0x6366f1,
        barrelColor: 0xc7d2fe,
      },
      {
        label: 'Prism Turret',
        upgradeCost: 620,
        weapon: {
          damage: 38,
          cooldownMs: 860,
          range: 420,
          projectileSpeed: 760,
          color: 0xddd6fe,
        },
        towerColor: 0x7c3aed,
        turretColor: 0x8b5cf6,
        barrelColor: 0xe9d5ff,
      },
      {
        label: 'Aether Turret',
        upgradeCost: null,
        weapon: {
          damage: 47,
          cooldownMs: 790,
          range: 440,
          projectileSpeed: 820,
          color: 0xf5f3ff,
        },
        towerColor: 0x6d28d9,
        turretColor: 0x8b5cf6,
        barrelColor: 0xede9fe,
      },
    ],
    accentColor: '#7c8cff',
  },
  {
    id: 'beast',
    label: 'Beast',
    advanceCost: 1500,
    unitRoster: BEAST_ROSTER,
    economy: {
      playerStartGoldBonus: 170,
      aiStartGoldBonus: 180,
      playerIncomeBonus: 1.5,
      aiIncomeBonus: 3,
      aiBaseHpBonus: 70,
    },
    turretLevels: [
      {
        label: 'Thorn Turret',
        upgradeCost: 700,
        weapon: {
          damage: 52,
          cooldownMs: 760,
          range: 455,
          projectileSpeed: 850,
          color: 0x86efac,
        },
        towerColor: 0x22c55e,
        turretColor: 0x4ade80,
        barrelColor: 0xbbf7d0,
      },
      {
        label: 'Fang Turret',
        upgradeCost: 980,
        weapon: {
          damage: 62,
          cooldownMs: 700,
          range: 475,
          projectileSpeed: 900,
          color: 0x6ee7b7,
        },
        towerColor: 0x16a34a,
        turretColor: 0x34d399,
        barrelColor: 0xa7f3d0,
      },
      {
        label: 'Elder Maw Turret',
        upgradeCost: null,
        weapon: {
          damage: 74,
          cooldownMs: 650,
          range: 495,
          projectileSpeed: 960,
          color: 0xd9f99d,
        },
        towerColor: 0x15803d,
        turretColor: 0x22c55e,
        barrelColor: 0xdcfce7,
      },
    ],
    accentColor: '#34d399',
  },
  {
    id: 'runeforge',
    label: 'Runeforge',
    advanceCost: 2300,
    unitRoster: RUNEFORGE_ROSTER,
    economy: {
      playerStartGoldBonus: 280,
      aiStartGoldBonus: 300,
      playerIncomeBonus: 2.2,
      aiIncomeBonus: 4.5,
      aiBaseHpBonus: 110,
    },
    turretLevels: [
      {
        label: 'Alloy Turret',
        upgradeCost: 1100,
        weapon: {
          damage: 80,
          cooldownMs: 620,
          range: 510,
          projectileSpeed: 1000,
          color: 0xbcd3ff,
        },
        towerColor: 0x64748b,
        turretColor: 0x94a3b8,
        barrelColor: 0xcbd5e1,
      },
      {
        label: 'Rail Turret',
        upgradeCost: 1500,
        weapon: {
          damage: 92,
          cooldownMs: 575,
          range: 530,
          projectileSpeed: 1060,
          color: 0xdbeafe,
        },
        towerColor: 0x475569,
        turretColor: 0x93c5fd,
        barrelColor: 0xe2e8f0,
      },
      {
        label: 'Dominion Turret',
        upgradeCost: null,
        weapon: {
          damage: 106,
          cooldownMs: 530,
          range: 550,
          projectileSpeed: 1120,
          color: 0xf8fafc,
        },
        towerColor: 0x334155,
        turretColor: 0xbfdbfe,
        barrelColor: 0xf1f5f9,
      },
    ],
    accentColor: '#93c5fd',
  },
  {
    id: 'astral',
    label: 'Astral',
    advanceCost: null,
    unitRoster: ASTRAL_ROSTER,
    economy: {
      playerStartGoldBonus: 420,
      aiStartGoldBonus: 440,
      playerIncomeBonus: 3,
      aiIncomeBonus: 6,
      aiBaseHpBonus: 150,
    },
    turretLevels: [
      {
        label: 'Nova Turret',
        upgradeCost: 1700,
        weapon: {
          damage: 116,
          cooldownMs: 500,
          range: 570,
          projectileSpeed: 1160,
          color: 0xf5f3ff,
        },
        towerColor: 0x818cf8,
        turretColor: 0xc4b5fd,
        barrelColor: 0xe0e7ff,
      },
      {
        label: 'Quasar Turret',
        upgradeCost: 2300,
        weapon: {
          damage: 132,
          cooldownMs: 460,
          range: 590,
          projectileSpeed: 1220,
          color: 0xffffff,
        },
        towerColor: 0x6366f1,
        turretColor: 0xddd6fe,
        barrelColor: 0xf5f3ff,
      },
      {
        label: 'Zenith Turret',
        upgradeCost: null,
        weapon: {
          damage: 150,
          cooldownMs: 430,
          range: 610,
          projectileSpeed: 1280,
          color: 0xffffff,
        },
        towerColor: 0x4f46e5,
        turretColor: 0xe9d5ff,
        barrelColor: 0xf8fafc,
      },
    ],
    accentColor: '#dbeafe',
  },
];

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

  for (let ageIndex = 1; ageIndex < definitions.length; ageIndex += 1) {
    const previousAge = definitions[ageIndex - 1]!;
    const currentAge = definitions[ageIndex]!;

    const previousMaxWeapon = previousAge.turretLevels[previousAge.turretLevels.length - 1]!.weapon;
    const currentBaseWeapon = currentAge.turretLevels[0]!.weapon;

    const beatsPreviousMax =
      currentBaseWeapon.damage > previousMaxWeapon.damage &&
      currentBaseWeapon.cooldownMs < previousMaxWeapon.cooldownMs &&
      currentBaseWeapon.range >= previousMaxWeapon.range &&
      currentBaseWeapon.projectileSpeed >= previousMaxWeapon.projectileSpeed;

    if (!beatsPreviousMax) {
      throw new Error(
        `Age ${currentAge.id} base turret must be stronger than ${previousAge.id} max turret.`,
      );
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
