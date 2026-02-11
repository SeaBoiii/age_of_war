import type Phaser from 'phaser';

export const AGE_IDS = ['hearth', 'arcane', 'beast', 'runeforge', 'astral'] as const;

export type AgeId = (typeof AGE_IDS)[number];
export type Side = 'player' | 'ai';
export type AttackType = 'melee' | 'projectile';

export type UnitTag =
  | 'melee'
  | 'ranged'
  | 'tank'
  | 'defensive'
  | 'armored'
  | 'support';

export type MetaUpgradeId = 'income' | 'baseHp';

export interface BaseWeapon {
  damage: number;
  cooldownMs: number;
  range: number;
  projectileSpeed: number;
  color: number;
}

export interface TurretLevelDefinition {
  label: string;
  upgradeCost: number | null;
  weapon: BaseWeapon;
  towerColor: number;
  turretColor: number;
  barrelColor: number;
}

export interface AgeEconomyDefinition {
  playerStartGoldBonus: number;
  aiStartGoldBonus: number;
  playerIncomeBonus: number;
  aiIncomeBonus: number;
  aiBaseHpBonus: number;
}

export interface AgeDefinition {
  id: AgeId;
  label: string;
  advanceCost: number | null;
  unitRoster: UnitId[];
  economy: AgeEconomyDefinition;
  turretLevels: TurretLevelDefinition[];
  accentColor: string;
}

export interface UnitTraits {
  antiArmorMultiplier?: number;
  debuffAttackSpeedMultiplier?: number;
  debuffDurationMs?: number;
  chargeDurationMs?: number;
  chargeSpeedMultiplier?: number;
  chargeDamageMultiplier?: number;
  barrierPulseAmount?: number;
  barrierPulseRadius?: number;
  barrierPulseEveryMs?: number;
  blinkDistance?: number;
  blinkEveryMs?: number;
  executeThreshold?: number;
  executeBonusDamage?: number;
  deployDistance?: number;
  deployAttackRangeBonus?: number;
}

export interface UnitProjectileConfig {
  speed: number;
  radius: number;
  color: number;
  pierce?: number;
  splashRadius?: number;
}

export interface UnitDefinition {
  id: UnitId;
  name: string;
  icon: string;
  age: AgeId;
  cost: number;
  cooldownMs: number;
  maxHp: number;
  damage: number;
  attackRange: number;
  attackCooldownMs: number;
  moveSpeed: number;
  size: number;
  bounty: number;
  attackType: AttackType;
  color: number;
  tags: UnitTag[];
  projectile?: UnitProjectileConfig;
  traits?: UnitTraits;
}

export interface UnitEntity {
  uid: number;
  side: Side;
  def: UnitDefinition;
  x: number;
  y: number;
  hp: number;
  shield: number;
  alive: boolean;
  spawnedAtMs: number;
  spawnX: number;
  laneOffset: number;
  attackCooldownRemainingMs: number;
  abilityCooldownMs: number;
  auxiliaryCooldownMs: number;
  debuffedUntilMs: number;
  debuffAttackSpeedMultiplier: number;
  anchored: boolean;
  body: Phaser.GameObjects.Container;
  hpFill: Phaser.GameObjects.Rectangle;
}

export interface ProjectileEntity {
  uid: number;
  side: Side;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttlMs: number;
  damage: number;
  radius: number;
  color: number;
  splashRadius: number;
  pierceRemaining: number;
  sourceUnitId: UnitId | 'base';
  executeThreshold?: number;
  executeBonusDamage?: number;
  debuffDurationMs?: number;
  debuffAttackSpeedMultiplier?: number;
  targetBase: boolean;
  visual: Phaser.GameObjects.Arc;
}

export interface BaseState {
  side: Side;
  x: number;
  hp: number;
  maxHp: number;
  weaponCooldownMs: number;
  turretLevel: number;
  tower: Phaser.GameObjects.Rectangle;
  core: Phaser.GameObjects.Rectangle;
  turretPivot: Phaser.GameObjects.Container;
  turretHead: Phaser.GameObjects.Rectangle;
  turretBarrel: Phaser.GameObjects.Rectangle;
  turretMount: Phaser.GameObjects.Arc;
}

export interface UnitButtonState {
  unitId: UnitId;
  name: string;
  icon: string;
  cost: number;
  cooldownMs: number;
  cooldownRemainingMs: number;
}

export type UnitId =
  | 'swordsman'
  | 'archer'
  | 'spearman'
  | 'shield_acolyte'
  | 'battlemage'
  | 'hexer'
  | 'wolf_rider'
  | 'treant'
  | 'wyvern'
  | 'golem'
  | 'rune_gunner'
  | 'turret_caster'
  | 'portal_knight'
  | 'starcaller'
  | 'void_reaper';
