import rawGameConfig from './gameConfig.json';
import type { RawAgeConfig, RawBaseWeaponConfig, RawEffect, RawGameConfig, RawUnitConfig } from './schema';
import type {
  AgeDefinition,
  AgeId,
  BaseWeapon,
  TurretLevelDefinition,
  UnitDefinition,
  UnitId,
  UnitTag,
  UnitTraits,
} from '../types';

export interface ResolvedGameMeta {
  baseHp: number;
  goldPerSecond: number;
  killBountyRatio: number;
}

interface ResolvedGameConfig {
  meta: ResolvedGameMeta;
  ages: AgeDefinition[];
  units: Record<UnitId, UnitDefinition>;
}

const AGE_ORDER: AgeId[] = ['hearth', 'arcane', 'beast', 'runeforge', 'astral'];

const UNIT_ID_ORDER: UnitId[] = [
  'swordsman',
  'archer',
  'spearman',
  'shield_acolyte',
  'battlemage',
  'hexer',
  'wolf_rider',
  'treant',
  'wyvern',
  'golem',
  'rune_gunner',
  'turret_caster',
  'portal_knight',
  'starcaller',
  'void_reaper',
];

const UNIT_ICONS: Record<UnitId, string> = {
  swordsman: 'Sw',
  archer: 'Ar',
  spearman: 'Sp',
  shield_acolyte: 'Sh',
  battlemage: 'Bm',
  hexer: 'Hx',
  wolf_rider: 'Wr',
  treant: 'Tr',
  wyvern: 'Wy',
  golem: 'Go',
  rune_gunner: 'Rg',
  turret_caster: 'Tc',
  portal_knight: 'Pk',
  starcaller: 'Sc',
  void_reaper: 'Vr',
};

const UNIT_COLORS: Record<UnitId, number> = {
  swordsman: 0xf7b267,
  archer: 0x8bc5ff,
  spearman: 0xd9d9d9,
  shield_acolyte: 0xb9d6ff,
  battlemage: 0x9b8fff,
  hexer: 0xa78bfa,
  wolf_rider: 0x7dd3fc,
  treant: 0x4ade80,
  wyvern: 0x67e8f9,
  golem: 0x94a3b8,
  rune_gunner: 0x60a5fa,
  turret_caster: 0xfcd34d,
  portal_knight: 0xc084fc,
  starcaller: 0xf5f3ff,
  void_reaper: 0xe11d48,
};

const AGE_ACCENT_COLORS: Record<AgeId, string> = {
  hearth: '#f59e0b',
  arcane: '#7c8cff',
  beast: '#34d399',
  runeforge: '#93c5fd',
  astral: '#dbeafe',
};

const TURRET_TOWER_COLORS: Record<AgeId, [number, number, number]> = {
  hearth: [0xf59e0b, 0xf97316, 0xea580c],
  arcane: [0x818cf8, 0x7c3aed, 0x6d28d9],
  beast: [0x22c55e, 0x16a34a, 0x15803d],
  runeforge: [0x64748b, 0x475569, 0x334155],
  astral: [0x818cf8, 0x6366f1, 0x4f46e5],
};

const TURRET_HEAD_COLORS: Record<AgeId, [number, number, number]> = {
  hearth: [0xfbbf24, 0xfb923c, 0xfb923c],
  arcane: [0x6366f1, 0x8b5cf6, 0x8b5cf6],
  beast: [0x4ade80, 0x34d399, 0x22c55e],
  runeforge: [0x94a3b8, 0x93c5fd, 0xbfdbfe],
  astral: [0xc4b5fd, 0xddd6fe, 0xe9d5ff],
};

const TURRET_BARREL_COLORS: Record<AgeId, [number, number, number]> = {
  hearth: [0xfde68a, 0xfed7aa, 0xffedd5],
  arcane: [0xc7d2fe, 0xe9d5ff, 0xede9fe],
  beast: [0xbbf7d0, 0xa7f3d0, 0xdcfce7],
  runeforge: [0xcbd5e1, 0xe2e8f0, 0xf1f5f9],
  astral: [0xe0e7ff, 0xf5f3ff, 0xf8fafc],
};

const MAX_TURRET_RANGE_TO_CENTER = 670;
const RANGE_UNIT_STEP_PX = 24;
const MELEE_CONTACT_RANGE_PX = 40;

const TURRET_BASE_RANGE_BY_AGE: Record<AgeId, number> = {
  hearth: 320,
  arcane: 400,
  beast: 490,
  runeforge: 575,
  astral: 625,
};

const EXTERNAL_UNIT_ID_ALIASES: Record<string, UnitId> = {
  militia_swordsman: 'swordsman',
  hedge_archer: 'archer',
  pike_guard: 'spearman',
  ward_acolyte: 'shield_acolyte',
  wyvern_skirmisher: 'wyvern',
  runic_golem: 'golem',
  siege_artificer: 'turret_caster',
};

function asNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}

function toCooldownMsFromAttackRate(attackRate: number, fallback: number): number {
  const rate = Math.max(0.1, attackRate);
  return Math.max(160, Math.round(1000 / rate)) || fallback;
}

function resolveInternalUnitId(rawId: string): UnitId | undefined {
  if (UNIT_ID_ORDER.includes(rawId as UnitId)) {
    return rawId as UnitId;
  }

  return EXTERNAL_UNIT_ID_ALIASES[rawId];
}

function resolveTags(rawTags: string[] | undefined, attackType: 'melee' | 'projectile'): UnitTag[] {
  const tags = new Set<UnitTag>();

  if (attackType === 'melee') {
    tags.add('melee');
  } else {
    tags.add('ranged');
  }

  for (const tag of rawTags ?? []) {
    switch (tag) {
      case 'melee':
        tags.add('melee');
        break;
      case 'ranged':
      case 'artillery':
        tags.add('ranged');
        break;
      case 'tank':
      case 'heavy':
        tags.add('tank');
        break;
      case 'support':
      case 'control':
        tags.add('support');
        break;
      case 'light':
      case 'deployable':
      case 'turret':
      case 'stationary':
        tags.add('defensive');
        break;
      case 'construct':
      case 'armored':
        tags.add('armored');
        break;
      default:
        break;
    }
  }

  return [...tags];
}

function resolveDebuffFromStatusEffect(effect: RawEffect): {
  durationMs: number;
  attackSpeedMultiplier: number;
} | null {
  if (effect.type !== 'applyStatus') {
    return null;
  }

  const statusId = typeof effect.statusId === 'string' ? effect.statusId : '';
  const durationMs = Math.max(300, Math.round(asNumber(effect.durationSec, 2) * 1000));
  const params = (effect.params as Record<string, unknown> | undefined) ?? {};

  if (statusId === 'slow') {
    return {
      durationMs,
      attackSpeedMultiplier: Math.max(0.45, Math.min(1, asNumber(params.speedMultiplier, 0.85))),
    };
  }

  if (statusId === 'weaken') {
    return {
      durationMs,
      attackSpeedMultiplier: Math.max(0.5, Math.min(1, asNumber(params.damageMultiplier, 0.9))),
    };
  }

  return null;
}

function resolveTraits(rawUnit: RawUnitConfig, internalId: UnitId): UnitTraits | undefined {
  const traits: UnitTraits = {};

  for (const effect of rawUnit.onHitEffects ?? []) {
    const debuff = resolveDebuffFromStatusEffect(effect);
    if (debuff) {
      traits.debuffDurationMs = Math.max(traits.debuffDurationMs ?? 0, debuff.durationMs);
      traits.debuffAttackSpeedMultiplier = Math.min(
        traits.debuffAttackSpeedMultiplier ?? 1,
        debuff.attackSpeedMultiplier,
      );
      continue;
    }

    if (effect.type === 'conditionalDamageMultiplier') {
      const condition = (effect.condition as Record<string, unknown> | undefined) ?? {};
      if (condition.type === 'targetHpBelowPercent') {
        const thresholdPct = Math.max(1, Math.min(95, asNumber(condition.percent, 35)));
        const multiplier = Math.max(1, asNumber(effect.multiplier, 1.2));
        traits.executeThreshold = thresholdPct / 100;
        traits.executeBonusDamage = Math.max(1, Math.round(rawUnit.damage * (multiplier - 1)));
      }
      continue;
    }

    if (effect.type === 'conditionalFirstHitAfter') {
      const condition = (effect.condition as Record<string, unknown> | undefined) ?? {};
      const nested = (effect.effect as Record<string, unknown> | undefined) ?? {};
      const waitSec = Math.max(0.5, asNumber(condition.sec, 2));
      const bonusFlatDamage = Math.max(0, asNumber(nested.amount, 0));

      if (bonusFlatDamage > 0) {
        traits.chargeDurationMs = Math.round(waitSec * 1000);
        traits.chargeSpeedMultiplier = Math.max(traits.chargeSpeedMultiplier ?? 1, 1.25);
        traits.chargeDamageMultiplier = Math.max(
          traits.chargeDamageMultiplier ?? 1,
          Math.min(3.2, 1 + bonusFlatDamage / Math.max(1, rawUnit.damage)),
        );
      }
      continue;
    }
  }

  for (const effect of rawUnit.onSpawnEffects ?? []) {
    if (effect.type === 'grantShield') {
      traits.barrierPulseAmount = Math.max(1, Math.round(asNumber(effect.amount, 24)));
      traits.barrierPulseRadius = 150;
      traits.barrierPulseEveryMs = 2800;
      continue;
    }

    if (effect.type === 'oncePerLifeTrigger') {
      const chain = Array.isArray(effect.effect) ? effect.effect : [effect.effect];
      const blinkEffect = chain.find(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === 'object' &&
          candidate !== null &&
          (candidate as { type?: string }).type === 'blinkForward',
      );

      if (blinkEffect) {
        traits.blinkDistance = Math.max(40, Math.round(asNumber(blinkEffect.distancePx, 120)));
        traits.blinkEveryMs = 3200;
      }
      continue;
    }

    if (effect.type === 'spawnUnit' && internalId === 'turret_caster') {
      traits.deployDistance = 210;
      traits.deployAttackRangeBonus = 140;
    }
  }

  if (internalId === 'spearman' && traits.antiArmorMultiplier === undefined) {
    traits.antiArmorMultiplier = 1.35;
  }

  if (internalId === 'turret_caster') {
    traits.deployDistance = traits.deployDistance ?? 210;
    traits.deployAttackRangeBonus = traits.deployAttackRangeBonus ?? 140;
  }

  return Object.keys(traits).length > 0 ? traits : undefined;
}

function resolveProjectile(
  rawProjectile: RawUnitConfig['projectile'],
  fallbackColor: number,
): UnitDefinition['projectile'] {
  if (!rawProjectile) {
    return undefined;
  }

  return {
    speed: Math.max(220, Math.round(asNumber(rawProjectile.speed, 620))),
    radius: Math.max(2, Math.round(asNumber(rawProjectile.radius, 4))),
    color: fallbackColor,
    pierce: Math.max(0, Math.round(asNumber(rawProjectile.pierce, 0))),
    splashRadius: Math.max(0, Math.round(asNumber(rawProjectile.splashRadius, 0))),
  };
}

function resolveAttackRangePx(rawRange: number): number {
  const rangeUnits = Math.max(0, asNumber(rawRange, 0));
  return Math.max(MELEE_CONTACT_RANGE_PX, Math.round(MELEE_CONTACT_RANGE_PX + rangeUnits * RANGE_UNIT_STEP_PX));
}

function resolveUnitDefinition(
  ageId: AgeId,
  rawUnit: RawUnitConfig,
  internalId: UnitId,
  killBountyRatio: number,
): UnitDefinition {
  const hasProjectile = rawUnit.projectile !== undefined;
  const attackType = hasProjectile ? 'projectile' : 'melee';
  const cost = Math.max(0, Math.round(asNumber(rawUnit.cost, 100)));
  const tags = resolveTags(rawUnit.tags, attackType);
  const role = typeof rawUnit.role === 'string' ? rawUnit.role : '';

  const projectile = resolveProjectile(rawUnit.projectile, UNIT_COLORS[internalId]);
  const traits = resolveTraits(rawUnit, internalId);

  const sizeBase = tags.includes('tank') ? 34 : attackType === 'projectile' ? 25 : 27;
  const size = Math.max(22, Math.min(42, sizeBase + Math.round(Math.max(0, rawUnit.hp - 220) / 280)));

  return {
    id: internalId,
    name: rawUnit.displayName,
    icon: UNIT_ICONS[internalId],
    age: ageId,
    cost,
    cooldownMs: Math.max(250, Math.round(asNumber(rawUnit.cooldownSec, 3.5) * 1000)),
    maxHp: Math.max(30, Math.round(asNumber(rawUnit.hp, 120))),
    damage: Math.max(1, Math.round(asNumber(rawUnit.damage, 12))),
    attackRange: resolveAttackRangePx(rawUnit.range),
    attackCooldownMs: toCooldownMsFromAttackRate(asNumber(rawUnit.attackRate, 1), 1000),
    moveSpeed:
      role.includes('stationary') || (rawUnit.tags ?? []).includes('stationary')
        ? 0
        : Math.max(0, Math.round(asNumber(rawUnit.speed, 60))),
    size,
    bounty: Math.max(1, Math.round(cost * killBountyRatio)),
    attackType,
    color: UNIT_COLORS[internalId],
    tags,
    projectile,
    traits,
  };
}

function resolveWeaponDebuff(baseWeapon: RawBaseWeaponConfig): {
  debuffDurationMs?: number;
  debuffAttackSpeedMultiplier?: number;
} {
  const result: { debuffDurationMs?: number; debuffAttackSpeedMultiplier?: number } = {};

  for (const effect of baseWeapon.onHitEffects ?? []) {
    const debuff = resolveDebuffFromStatusEffect(effect);
    if (!debuff) {
      continue;
    }

    result.debuffDurationMs = Math.max(result.debuffDurationMs ?? 0, debuff.durationMs);
    result.debuffAttackSpeedMultiplier = Math.min(
      result.debuffAttackSpeedMultiplier ?? 1,
      debuff.attackSpeedMultiplier,
    );
  }

  return result;
}

function resolveBaseWeapon(rawWeapon: RawBaseWeaponConfig): BaseWeapon {
  const debuff = resolveWeaponDebuff(rawWeapon);

  return {
    damage: Math.max(1, Math.round(asNumber(rawWeapon.damage, 10))),
    cooldownMs: toCooldownMsFromAttackRate(asNumber(rawWeapon.attackRate, 1), 1000),
    range: Math.max(120, Math.round(asNumber(rawWeapon.range, 360))),
    projectileSpeed: Math.max(200, Math.round(asNumber(rawWeapon.projectileSpeed, 620))),
    color: 0xffffff,
    debuffDurationMs: debuff.debuffDurationMs,
    debuffAttackSpeedMultiplier: debuff.debuffAttackSpeedMultiplier,
  };
}

function scaleWeapon(baseWeapon: BaseWeapon, tier: 1 | 2): BaseWeapon {
  const damageScale = tier === 1 ? 1.16 : 1.32;
  const cooldownScale = tier === 1 ? 0.93 : 0.87;
  const rangeBonus = tier === 1 ? 22 : 44;
  const speedBonus = tier === 1 ? 40 : 85;

  return {
    ...baseWeapon,
    damage: Math.max(1, Math.round(baseWeapon.damage * damageScale)),
    cooldownMs: Math.max(180, Math.round(baseWeapon.cooldownMs * cooldownScale)),
    range: baseWeapon.range + rangeBonus,
    projectileSpeed: baseWeapon.projectileSpeed + speedBonus,
  };
}

function createTurretLevels(ageId: AgeId, rawWeapon: RawBaseWeaponConfig): TurretLevelDefinition[] {
  const baseWeapon = resolveBaseWeapon(rawWeapon);
  const mk2Weapon = scaleWeapon(baseWeapon, 1);
  const mk3Weapon = scaleWeapon(baseWeapon, 2);

  const baseRange = TURRET_BASE_RANGE_BY_AGE[ageId];
  const mk2Range = Math.min(MAX_TURRET_RANGE_TO_CENTER, baseRange + 30);
  const mk3Range = Math.min(MAX_TURRET_RANGE_TO_CENTER, baseRange + 55);

  baseWeapon.range = baseRange;
  mk2Weapon.range = mk2Range;
  mk3Weapon.range = mk3Range;

  const upgradeCost = Math.max(100, Math.round(asNumber(rawWeapon.upgradeCost, 350)));
  const mk2Cost = Math.max(upgradeCost + 120, Math.round(upgradeCost * 1.55));
  const displayName = rawWeapon.displayName || 'Base Turret';

  return [
    {
      label: `${displayName} Mk I`,
      upgradeCost,
      weapon: {
        ...baseWeapon,
        color: TURRET_BARREL_COLORS[ageId][0],
      },
      towerColor: TURRET_TOWER_COLORS[ageId][0],
      turretColor: TURRET_HEAD_COLORS[ageId][0],
      barrelColor: TURRET_BARREL_COLORS[ageId][0],
    },
    {
      label: `${displayName} Mk II`,
      upgradeCost: mk2Cost,
      weapon: {
        ...mk2Weapon,
        color: TURRET_BARREL_COLORS[ageId][1],
      },
      towerColor: TURRET_TOWER_COLORS[ageId][1],
      turretColor: TURRET_HEAD_COLORS[ageId][1],
      barrelColor: TURRET_BARREL_COLORS[ageId][1],
    },
    {
      label: `${displayName} Mk III`,
      upgradeCost: null,
      weapon: {
        ...mk3Weapon,
        color: TURRET_BARREL_COLORS[ageId][2],
      },
      towerColor: TURRET_TOWER_COLORS[ageId][2],
      turretColor: TURRET_HEAD_COLORS[ageId][2],
      barrelColor: TURRET_BARREL_COLORS[ageId][2],
    },
  ];
}

function getWeaponDps(weapon: BaseWeapon): number {
  return weapon.damage * (1000 / Math.max(1, weapon.cooldownMs));
}

function ensureCrossAgeTurretProgression(ages: AgeDefinition[]): void {
  for (let index = 1; index < ages.length; index += 1) {
    const previousAge = ages[index - 1]!;
    const currentAge = ages[index]!;
    const previousMax = previousAge.turretLevels[previousAge.turretLevels.length - 1]!.weapon;
    const currentBase = currentAge.turretLevels[0]!.weapon;

    const strongerThanPrevious =
      currentBase.damage >= previousMax.damage &&
      getWeaponDps(currentBase) > getWeaponDps(previousMax) &&
      currentBase.range >= previousMax.range &&
      currentBase.projectileSpeed >= previousMax.projectileSpeed;

    if (strongerThanPrevious) {
      continue;
    }

    const minDamageForDpsLead =
      Math.ceil((getWeaponDps(previousMax) + 0.1) * (currentBase.cooldownMs / 1000)) + 1;

    currentBase.damage = Math.max(currentBase.damage, previousMax.damage, minDamageForDpsLead);
    currentBase.range = Math.max(currentBase.range, previousMax.range);
    currentBase.projectileSpeed = Math.max(currentBase.projectileSpeed, previousMax.projectileSpeed);
  }
}

function resolveGameConfig(raw: RawGameConfig): ResolvedGameConfig {
  const ageById = new Map<string, RawAgeConfig>();
  for (const age of raw.ages) {
    ageById.set(age.id, age);
  }

  const ages: AgeDefinition[] = [];
  const unitsById = new Map<UnitId, UnitDefinition>();
  const bountyRatio = Math.max(0.05, Math.min(1.2, asNumber(raw.meta.killBountyRatio, 0.35)));

  for (let ageIndex = 0; ageIndex < AGE_ORDER.length; ageIndex += 1) {
    const ageId = AGE_ORDER[ageIndex]!;
    const rawAge = ageById.get(ageId);

    if (!rawAge) {
      throw new Error(`Missing age definition in game config: ${ageId}`);
    }

    const nextAge = ageIndex < AGE_ORDER.length - 1 ? ageById.get(AGE_ORDER[ageIndex + 1]!) : undefined;
    const advanceCost = nextAge ? Math.max(0, Math.round(asNumber(nextAge.advanceCost, 0))) : null;

    const ageUnits: UnitId[] = [];
    for (const rawUnit of rawAge.units) {
      const internalId = resolveInternalUnitId(rawUnit.id);
      if (!internalId) {
        continue;
      }

      const resolvedUnit = resolveUnitDefinition(ageId, rawUnit, internalId, bountyRatio);
      unitsById.set(internalId, resolvedUnit);

      const rawTags = rawUnit.tags ?? [];
      const deployable = rawTags.includes('deployable') || rawTags.includes('turret');
      if (!deployable && resolvedUnit.cost > 0) {
        ageUnits.push(internalId);
      }
    }

    if (ageUnits.length === 0) {
      throw new Error(`Age ${ageId} has no deployable unit roster in game config.`);
    }

    ages.push({
      id: ageId,
      label: rawAge.displayName.replace(/\s+Age$/i, '') || rawAge.displayName,
      advanceCost,
      unitRoster: ageUnits,
      economy: {
        playerStartGoldBonus: ageIndex * 70,
        aiStartGoldBonus: ageIndex * 90,
        playerIncomeBonus: ageIndex * 0.5,
        aiIncomeBonus: ageIndex * 1.2,
        aiBaseHpBonus: ageIndex * 75,
      },
      turretLevels: createTurretLevels(ageId, rawAge.baseWeapon),
      accentColor: AGE_ACCENT_COLORS[ageId],
    });
  }

  for (const unitId of UNIT_ID_ORDER) {
    if (!unitsById.has(unitId)) {
      throw new Error(`Missing unit definition in game config for ${unitId}`);
    }
  }

  ensureCrossAgeTurretProgression(ages);

  return {
    meta: {
      baseHp: Math.max(300, Math.round(asNumber(raw.meta.baseHP, 1000))),
      goldPerSecond: Math.max(1, asNumber(raw.meta.goldPerSecond, 12)),
      killBountyRatio: bountyRatio,
    },
    ages,
    units: Object.fromEntries(unitsById.entries()) as Record<UnitId, UnitDefinition>,
  };
}

export const RESOLVED_GAME_CONFIG = resolveGameConfig(rawGameConfig as RawGameConfig);
export const GAME_CONFIG_META = RESOLVED_GAME_CONFIG.meta;
export const RESOLVED_AGE_DEFINITIONS = RESOLVED_GAME_CONFIG.ages;
export const RESOLVED_UNIT_DEFINITIONS = RESOLVED_GAME_CONFIG.units;
