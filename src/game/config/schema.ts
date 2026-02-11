export interface RawGameConfigMeta {
  version?: string;
  goldPerSecond: number;
  killBountyRatio: number;
  baseHP: number;
  laneLengthPx?: number;
  notes?: string[];
}

export interface RawProjectileConfig {
  speed: number;
  radius: number;
  pierce?: number;
  splashRadius?: number;
}

export interface RawEffect {
  type: string;
  [key: string]: unknown;
}

export interface RawBaseWeaponConfig {
  id: string;
  displayName: string;
  upgradeCost: number;
  damage: number;
  attackRate: number;
  range: number;
  projectileSpeed: number;
  tags?: string[];
  onHitEffects?: RawEffect[];
}

export interface RawUnitConfig {
  id: string;
  displayName: string;
  role?: string;
  cost: number;
  cooldownSec: number;
  hp: number;
  damage: number;
  attackRate: number;
  range: number;
  speed: number;
  projectile?: RawProjectileConfig;
  tags?: string[];
  onHitEffects?: RawEffect[];
  onSpawnEffects?: RawEffect[];
}

export interface RawAgeConfig {
  id: string;
  index: number;
  displayName: string;
  advanceCost: number;
  baseWeapon: RawBaseWeaponConfig;
  units: RawUnitConfig[];
}

export interface RawGameConfig {
  meta: RawGameConfigMeta;
  ages: RawAgeConfig[];
}
