import process from 'node:process';
import { writeFileSync } from 'node:fs';
import {
  AI_GOLD_ON_START,
  BASE_BASE_HP,
  BASE_PASSIVE_INCOME_PER_SECOND,
  PLAYER_GOLD_ON_START,
} from '../src/game/constants/balance';
import {
  AGE_DEFINITIONS,
  canAdvanceAge,
  canUpgradeTurret,
  getAgeDefinition,
  getTurretLevelDefinition,
  getTurretUpgradeCost,
} from '../src/game/constants/ages';
import { getUnitsForAge } from '../src/game/constants/units';
import { AiSystem } from '../src/game/systems/AiSystem';
import type { Side, UnitDefinition, UnitId } from '../src/game/types';

type Winner = Side | 'draw';
type Role = 'frontline' | 'ranged';

interface BenchmarkOptions {
  matches: number;
  seed: number;
  durationSec: number;
  stepMs: number;
  startAgeIndex: number;
  economyScale: number;
  json: boolean;
  outPath: string | null;
  verbose: boolean;
}

interface SideMetrics {
  spawns: number;
  ageUps: number;
  turretUps: number;
  goldSpent: number;
  finalGold: number;
  finalAgeIndex: number;
  finalTurretLevel: number;
}

interface SideState {
  ageIndex: number;
  gold: number;
  incomePerSecond: number;
  baseHp: number;
  maxBaseHp: number;
  turretLevel: number;
  cooldowns: Map<UnitId, number>;
  metrics: SideMetrics;
}

interface ForceComposition {
  total: number;
  frontline: number;
  ranged: number;
  tank: number;
  support: number;
}

interface SimUnit {
  side: Side;
  unitId: UnitId;
  role: Role;
  isTank: boolean;
  isSupport: boolean;
  hp: number;
  maxHp: number;
  dps: number;
  push: number;
  bounty: number;
}

interface MatchResult {
  winner: Winner;
  durationMs: number;
  laneAdvantage: number;
  playerHp: number;
  aiHp: number;
  player: SideMetrics;
  ai: SideMetrics;
}

interface AggregateResult {
  options: {
    matches: number;
    seed: number;
    durationSec: number;
    stepMs: number;
    startAge: string;
    economyScale: number;
  };
  summary: {
    playerWins: number;
    aiWins: number;
    draws: number;
    playerWinRate: number;
    aiWinRate: number;
    drawRate: number;
    avgDurationSec: number;
    avgLaneAdvantage: number;
  };
  averages: {
    player: SideMetrics;
    ai: SideMetrics;
    playerFinalHp: number;
    aiFinalHp: number;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function printHelp(): void {
  console.log(`Usage: npm run benchmark -- [options]

Options:
  --matches <n>         Number of matches (default: 100)
  --seed <n>            RNG seed (default: 12345)
  --duration-sec <n>    Max match duration in seconds (default: 240)
  --step-ms <n>         Simulation step in ms (default: 100)
  --start-age <n>       Start age (1-${AGE_DEFINITIONS.length}, default: 1)
  --economy-scale <n>   Multiplies start gold, income, and bounty (default: 2.0)
  --json                Print JSON only
  --out <path>          Write JSON output to file path
  --verbose             Print each match summary
  --help                Show this help
`);
}

function parseArgs(argv: string[]): BenchmarkOptions {
  let matches = 100;
  let seed = 12345;
  let durationSec = 240;
  let stepMs = 100;
  let startAge = 1;
  let economyScale = 2;
  let json = false;
  let outPath: string | null = null;
  let verbose = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    const [key, inlineValue] = arg.split('=');

    const readValue = () => inlineValue ?? argv[index + 1];

    switch (key) {
      case '--matches':
        matches = parseNumber(readValue(), matches);
        if (!inlineValue) {
          index += 1;
        }
        break;
      case '--seed':
        seed = parseNumber(readValue(), seed);
        if (!inlineValue) {
          index += 1;
        }
        break;
      case '--duration-sec':
        durationSec = parseNumber(readValue(), durationSec);
        if (!inlineValue) {
          index += 1;
        }
        break;
      case '--step-ms':
        stepMs = parseNumber(readValue(), stepMs);
        if (!inlineValue) {
          index += 1;
        }
        break;
      case '--start-age':
        startAge = parseNumber(readValue(), startAge);
        if (!inlineValue) {
          index += 1;
        }
        break;
      case '--economy-scale':
        economyScale = parseNumber(readValue(), economyScale);
        if (!inlineValue) {
          index += 1;
        }
        break;
      case '--out':
        outPath = readValue() ?? outPath;
        if (!inlineValue) {
          index += 1;
        }
        break;
      case '--json':
        json = true;
        break;
      case '--verbose':
        verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  const clampedMatches = Math.max(1, Math.floor(matches));
  const clampedStepMs = Math.max(25, Math.floor(stepMs));
  const clampedDurationSec = Math.max(30, Math.floor(durationSec));
  const clampedStartAge = clamp(Math.floor(startAge), 1, AGE_DEFINITIONS.length);
  const clampedEconomyScale = Math.max(0.25, economyScale);

  return {
    matches: clampedMatches,
    seed: Math.floor(seed),
    durationSec: clampedDurationSec,
    stepMs: clampedStepMs,
    startAgeIndex: clampedStartAge - 1,
    economyScale: clampedEconomyScale,
    json,
    outPath,
    verbose,
  };
}

function makeEmptyMetrics(): SideMetrics {
  return {
    spawns: 0,
    ageUps: 0,
    turretUps: 0,
    goldSpent: 0,
    finalGold: 0,
    finalAgeIndex: 0,
    finalTurretLevel: 0,
  };
}

function otherSide(side: Side): Side {
  return side === 'player' ? 'ai' : 'player';
}

class BenchmarkMatchSimulator {
  private readonly sideState: Record<Side, SideState>;

  private readonly aiSystems: Record<Side, AiSystem>;

  private readonly units: SimUnit[] = [];

  private elapsedMs = 0;

  private incomeAccumulatorMs = 0;

  private laneAdvantage = 0;

  public constructor(
    private readonly options: BenchmarkOptions,
    private readonly rng: () => number,
  ) {
    this.sideState = {
      player: this.createSideState('player'),
      ai: this.createSideState('ai'),
    };

    this.aiSystems = {
      player: this.createAiSystem('player'),
      ai: this.createAiSystem('ai'),
    };
  }

  public run(): MatchResult {
    const maxDurationMs = this.options.durationSec * 1000;

    while (this.elapsedMs < maxDurationMs) {
      if (this.sideState.player.baseHp <= 0 || this.sideState.ai.baseHp <= 0) {
        break;
      }

      this.step(this.options.stepMs);
    }

    const winner = this.resolveWinner();
    const player = this.sideState.player;
    const ai = this.sideState.ai;

    player.metrics.finalGold = Math.floor(player.gold);
    player.metrics.finalAgeIndex = player.ageIndex;
    player.metrics.finalTurretLevel = player.turretLevel;

    ai.metrics.finalGold = Math.floor(ai.gold);
    ai.metrics.finalAgeIndex = ai.ageIndex;
    ai.metrics.finalTurretLevel = ai.turretLevel;

    return {
      winner,
      durationMs: this.elapsedMs,
      laneAdvantage: this.laneAdvantage,
      playerHp: player.baseHp,
      aiHp: ai.baseHp,
      player: { ...player.metrics },
      ai: { ...ai.metrics },
    };
  }

  private createSideState(side: Side): SideState {
    const ageIndex = this.options.startAgeIndex;
    const age = getAgeDefinition(ageIndex);
    const maxBaseHp = side === 'ai' ? BASE_BASE_HP + age.economy.aiBaseHpBonus : BASE_BASE_HP;
    const startGold =
      side === 'ai'
        ? AI_GOLD_ON_START + age.economy.aiStartGoldBonus
        : PLAYER_GOLD_ON_START + age.economy.playerStartGoldBonus;

    const incomePerSecond =
      BASE_PASSIVE_INCOME_PER_SECOND +
      (side === 'ai' ? age.economy.aiIncomeBonus : age.economy.playerIncomeBonus);

    const cooldowns = new Map<UnitId, number>();
    for (const unit of getUnitsForAge(ageIndex)) {
      cooldowns.set(unit.id, 0);
    }

    return {
      ageIndex,
      gold: startGold * this.options.economyScale,
      incomePerSecond: incomePerSecond * this.options.economyScale,
      baseHp: maxBaseHp,
      maxBaseHp,
      turretLevel: 0,
      cooldowns,
      metrics: makeEmptyMetrics(),
    };
  }

  private createAiSystem(side: Side): AiSystem {
    const enemy = otherSide(side);

    return new AiSystem({
      getAiAgeIndex: () => this.sideState[side].ageIndex,
      getEnemyAgeIndex: () => this.sideState[enemy].ageIndex,
      getAiGold: () => this.sideState[side].gold,
      getAiIncomePerSecond: () => this.sideState[side].incomePerSecond,
      isUnderPressure: () =>
        side === 'player' ? this.laneAdvantage < -260 : this.laneAdvantage > 260,
      getLaneAdvantage: () => (side === 'player' ? this.laneAdvantage : -this.laneAdvantage),
      getAiBaseHpRatio: () =>
        this.sideState[side].baseHp / Math.max(1, this.sideState[side].maxBaseHp),
      getEnemyBaseHpRatio: () =>
        this.sideState[enemy].baseHp / Math.max(1, this.sideState[enemy].maxBaseHp),
      getAiTurretLevel: () => this.sideState[side].turretLevel,
      getEnemyTurretLevel: () => this.sideState[enemy].turretLevel,
      getCurrentTurretDps: () => this.getTurretDps(side, this.sideState[side].turretLevel),
      getNextTurretDps: () =>
        canUpgradeTurret(this.sideState[side].ageIndex, this.sideState[side].turretLevel)
          ? this.getTurretDps(side, this.sideState[side].turretLevel + 1)
          : null,
      getAiAdvanceCost: () => getAgeDefinition(this.sideState[side].ageIndex).advanceCost,
      canAiAdvance: () => canAdvanceAge(this.sideState[side].ageIndex),
      getAiTurretUpgradeCost: () =>
        getTurretUpgradeCost(this.sideState[side].ageIndex, this.sideState[side].turretLevel),
      canAiUpgradeTurret: () =>
        canUpgradeTurret(this.sideState[side].ageIndex, this.sideState[side].turretLevel),
      getRoster: () => getUnitsForAge(this.sideState[side].ageIndex),
      getNextAgeRoster: () =>
        canAdvanceAge(this.sideState[side].ageIndex)
          ? getUnitsForAge(this.sideState[side].ageIndex + 1)
          : null,
      getAllyComposition: () => this.getForceComposition(side),
      getEnemyComposition: () => this.getForceComposition(enemy),
      trySpawnUnit: (unitId) => this.trySpawnUnit(side, unitId),
      tryAdvanceAge: () => this.tryAdvanceAge(side),
      tryUpgradeTurret: () => this.tryUpgradeTurret(side),
    });
  }

  private step(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.tickCooldowns(deltaMs);
    this.tickIncome(deltaMs);

    this.aiSystems.player.update(deltaMs);
    this.aiSystems.ai.update(deltaMs);

    this.resolveEngagement(deltaMs);
    this.resolveLane(deltaMs);
    this.resolveBasePressure(deltaMs);
    this.cleanupUnits();
  }

  private tickCooldowns(deltaMs: number): void {
    for (const side of ['player', 'ai'] as const) {
      const cooldowns = this.sideState[side].cooldowns;
      for (const [unitId, remaining] of cooldowns.entries()) {
        cooldowns.set(unitId, Math.max(0, remaining - deltaMs));
      }
    }
  }

  private tickIncome(deltaMs: number): void {
    this.incomeAccumulatorMs += deltaMs;

    while (this.incomeAccumulatorMs >= 1000) {
      this.sideState.player.gold += this.sideState.player.incomePerSecond;
      this.sideState.ai.gold += this.sideState.ai.incomePerSecond;
      this.incomeAccumulatorMs -= 1000;
    }
  }

  private getTurretDps(side: Side, turretLevel: number): number {
    const ageIndex = this.sideState[side].ageIndex;
    const maxLevel = getAgeDefinition(ageIndex).turretLevels.length - 1;
    const clampedLevel = clamp(turretLevel, 0, maxLevel);
    const weapon = getTurretLevelDefinition(ageIndex, clampedLevel).weapon;
    return weapon.damage * (1000 / Math.max(1, weapon.cooldownMs));
  }

  private trySpawnUnit(side: Side, unitId: UnitId): boolean {
    const state = this.sideState[side];
    const roster = getUnitsForAge(state.ageIndex);
    const unit = roster.find((entry) => entry.id === unitId);
    if (!unit) {
      return false;
    }

    const activeUnits = this.units.filter((entry) => entry.side === side && entry.hp > 0).length;
    if (activeUnits >= 5) {
      return false;
    }

    if (state.gold < unit.cost) {
      return false;
    }

    const remainingCooldown = state.cooldowns.get(unit.id) ?? 0;
    if (remainingCooldown > 0) {
      return false;
    }

    state.gold -= unit.cost;
    state.metrics.goldSpent += unit.cost;
    state.metrics.spawns += 1;
    state.cooldowns.set(unit.id, unit.cooldownMs);

    this.units.push(this.createSimUnit(side, unit));
    return true;
  }

  private createSimUnit(side: Side, unit: UnitDefinition): SimUnit {
    const state = this.sideState[side];
    const role: Role = unit.tags.includes('ranged') ? 'ranged' : 'frontline';
    const isTank = unit.tags.includes('tank') || unit.tags.includes('defensive');
    const isSupport = unit.tags.includes('support');

    const variance = 0.9 + this.rng() * 0.2;
    const hp = Math.max(20, unit.maxHp * (isTank ? 1.2 : 1) * variance);
    const ageBonus = 1 + state.ageIndex * 0.08;
    const turretBonus = 1 + state.turretLevel * 0.02;
    const supportPenalty = isSupport ? 0.86 : 1;
    const dps =
      unit.damage *
      (1000 / Math.max(1, unit.attackCooldownMs)) *
      ageBonus *
      turretBonus *
      supportPenalty;

    const mobility = unit.moveSpeed <= 0 ? 2 : unit.moveSpeed * 0.12;
    const push = Math.max(2, mobility + unit.maxHp * 0.03 + (role === 'frontline' ? 10 : 4));

    return {
      side,
      unitId: unit.id,
      role,
      isTank,
      isSupport,
      hp,
      maxHp: hp,
      dps: Math.max(1, dps),
      push,
      bounty: unit.bounty * this.options.economyScale,
    };
  }

  private tryAdvanceAge(side: Side): boolean {
    const state = this.sideState[side];
    if (!canAdvanceAge(state.ageIndex)) {
      return false;
    }

    const cost = getAgeDefinition(state.ageIndex).advanceCost;
    if (cost === null || state.gold < cost) {
      return false;
    }

    state.gold -= cost;
    state.metrics.goldSpent += cost;
    state.metrics.ageUps += 1;
    state.ageIndex += 1;
    state.turretLevel = 0;

    this.refreshIncome(side);
    for (const unit of getUnitsForAge(state.ageIndex)) {
      if (!state.cooldowns.has(unit.id)) {
        state.cooldowns.set(unit.id, 0);
      }
    }

    this.laneAdvantage += side === 'player' ? 24 : -24;
    return true;
  }

  private tryUpgradeTurret(side: Side): boolean {
    const state = this.sideState[side];
    const cost = getTurretUpgradeCost(state.ageIndex, state.turretLevel);

    if (cost === null || state.gold < cost) {
      return false;
    }

    state.gold -= cost;
    state.metrics.goldSpent += cost;
    state.metrics.turretUps += 1;
    state.turretLevel += 1;
    return true;
  }

  private refreshIncome(side: Side): void {
    const state = this.sideState[side];
    const age = getAgeDefinition(state.ageIndex);

    state.incomePerSecond =
      (BASE_PASSIVE_INCOME_PER_SECOND +
        (side === 'ai' ? age.economy.aiIncomeBonus : age.economy.playerIncomeBonus)) *
      this.options.economyScale;
  }

  private getForceComposition(side: Side): ForceComposition {
    const summary: ForceComposition = {
      total: 0,
      frontline: 0,
      ranged: 0,
      tank: 0,
      support: 0,
    };

    for (const unit of this.units) {
      if (unit.side !== side || unit.hp <= 0) {
        continue;
      }

      summary.total += 1;
      if (unit.role === 'ranged') {
        summary.ranged += 1;
      }
      if (unit.role === 'frontline' || unit.isTank) {
        summary.frontline += 1;
      }
      if (unit.isTank) {
        summary.tank += 1;
      }
      if (unit.isSupport) {
        summary.support += 1;
      }
    }

    return summary;
  }

  private getTotalUnitDps(side: Side): number {
    return this.units
      .filter((unit) => unit.side === side && unit.hp > 0)
      .reduce((sum, unit) => sum + unit.dps, 0);
  }

  private getTotalPush(side: Side): number {
    return this.units
      .filter((unit) => unit.side === side && unit.hp > 0)
      .reduce((sum, unit) => sum + unit.push * (unit.role === 'frontline' ? 1.08 : 0.9), 0);
  }

  private resolveEngagement(deltaMs: number): void {
    const dtSec = deltaMs / 1000;
    const playerComp = this.getForceComposition('player');
    const aiComp = this.getForceComposition('ai');

    const playerSupportMultiplier = 1 + Math.min(0.2, playerComp.support * 0.04);
    const aiSupportMultiplier = 1 + Math.min(0.2, aiComp.support * 0.04);

    const playerUnitDamage = this.getTotalUnitDps('player') * playerSupportMultiplier * dtSec;
    const aiUnitDamage = this.getTotalUnitDps('ai') * aiSupportMultiplier * dtSec;

    const playerTurretFactor = clamp((-this.laneAdvantage - 120) / 320, 0, 1);
    const aiTurretFactor = clamp((this.laneAdvantage - 120) / 320, 0, 1);

    const damageToAi =
      playerUnitDamage + this.getTurretDps('player', this.sideState.player.turretLevel) * playerTurretFactor * dtSec;
    const damageToPlayer =
      aiUnitDamage + this.getTurretDps('ai', this.sideState.ai.turretLevel) * aiTurretFactor * dtSec;

    this.applyDamageToSide('ai', damageToAi, 'player');
    this.applyDamageToSide('player', damageToPlayer, 'ai');

    for (const unit of this.units) {
      if (unit.hp <= 0) {
        continue;
      }

      const attrition = (0.25 + unit.maxHp * 0.0015 + this.rng() * 0.25) * dtSec;
      unit.hp -= attrition;
    }
  }

  private applyDamageToSide(side: Side, totalDamage: number, attacker: Side): void {
    if (totalDamage <= 0) {
      return;
    }

    const alive = this.units.filter((unit) => unit.side === side && unit.hp > 0);
    if (alive.length === 0) {
      return;
    }

    const frontline = alive.filter((unit) => unit.role === 'frontline' || unit.isTank);
    const targets = frontline.length > 0 ? frontline : alive;
    const damagePerTarget = totalDamage / targets.length;

    for (const target of targets) {
      const mitigation = target.isTank ? 0.78 : 1;
      const hpBefore = target.hp;
      target.hp -= damagePerTarget * mitigation;
      if (hpBefore > 0 && target.hp <= 0) {
        this.sideState[attacker].gold += target.bounty;
      }
    }
  }

  private resolveLane(deltaMs: number): void {
    const dtSec = deltaMs / 1000;
    const playerPush = this.getTotalPush('player');
    const aiPush = this.getTotalPush('ai');

    const ageDelta = (this.sideState.player.ageIndex - this.sideState.ai.ageIndex) * 18;
    const turretDelta =
      (this.getTurretDps('player', this.sideState.player.turretLevel) -
        this.getTurretDps('ai', this.sideState.ai.turretLevel)) *
      0.11;

    const momentum = playerPush - aiPush + ageDelta + turretDelta;
    this.laneAdvantage += momentum * dtSec * 0.22;
    this.laneAdvantage *= 0.9965;
    this.laneAdvantage = clamp(this.laneAdvantage, -640, 640);
  }

  private resolveBasePressure(deltaMs: number): void {
    const dtSec = deltaMs / 1000;
    const threshold = 320;

    if (this.laneAdvantage > threshold) {
      const pressure = (this.laneAdvantage - threshold) / 220;
      const playerAssault = this.getTotalUnitDps('player');
      const damage = (2 + playerAssault * 0.008 + pressure * 6) * dtSec;
      this.sideState.ai.baseHp = Math.max(0, this.sideState.ai.baseHp - damage);
    }

    if (this.laneAdvantage < -threshold) {
      const pressure = (-this.laneAdvantage - threshold) / 220;
      const aiAssault = this.getTotalUnitDps('ai');
      const damage = (2 + aiAssault * 0.008 + pressure * 6) * dtSec;
      this.sideState.player.baseHp = Math.max(0, this.sideState.player.baseHp - damage);
    }
  }

  private cleanupUnits(): void {
    for (let index = this.units.length - 1; index >= 0; index -= 1) {
      if (this.units[index]!.hp <= 0) {
        this.units.splice(index, 1);
      }
    }
  }

  private resolveWinner(): Winner {
    const playerDead = this.sideState.player.baseHp <= 0;
    const aiDead = this.sideState.ai.baseHp <= 0;

    if (playerDead && aiDead) {
      return 'draw';
    }
    if (aiDead) {
      return 'player';
    }
    if (playerDead) {
      return 'ai';
    }

    const playerScore =
      this.sideState.player.baseHp / this.sideState.player.maxBaseHp + this.laneAdvantage / 1200;
    const aiScore =
      this.sideState.ai.baseHp / this.sideState.ai.maxBaseHp - this.laneAdvantage / 1200;

    const scoreDelta = playerScore - aiScore;
    if (Math.abs(scoreDelta) < 0.03) {
      return 'draw';
    }

    return scoreDelta > 0 ? 'player' : 'ai';
  }
}

function accumulateSideMetrics(side: 'player' | 'ai', results: MatchResult[]): SideMetrics {
  const totals = makeEmptyMetrics();

  for (const result of results) {
    const source = side === 'player' ? result.player : result.ai;
    totals.spawns += source.spawns;
    totals.ageUps += source.ageUps;
    totals.turretUps += source.turretUps;
    totals.goldSpent += source.goldSpent;
    totals.finalGold += source.finalGold;
    totals.finalAgeIndex += source.finalAgeIndex;
    totals.finalTurretLevel += source.finalTurretLevel;
  }

  const count = Math.max(1, results.length);
  totals.spawns /= count;
  totals.ageUps /= count;
  totals.turretUps /= count;
  totals.goldSpent /= count;
  totals.finalGold /= count;
  totals.finalAgeIndex /= count;
  totals.finalTurretLevel /= count;

  return totals;
}

function buildAggregate(options: BenchmarkOptions, results: MatchResult[]): AggregateResult {
  const playerWins = results.filter((result) => result.winner === 'player').length;
  const aiWins = results.filter((result) => result.winner === 'ai').length;
  const draws = results.length - playerWins - aiWins;

  const avgDurationSec =
    results.reduce((sum, result) => sum + result.durationMs, 0) / Math.max(1, results.length) / 1000;
  const avgLaneAdvantage =
    results.reduce((sum, result) => sum + result.laneAdvantage, 0) / Math.max(1, results.length);
  const avgPlayerHp =
    results.reduce((sum, result) => sum + result.playerHp, 0) / Math.max(1, results.length);
  const avgAiHp =
    results.reduce((sum, result) => sum + result.aiHp, 0) / Math.max(1, results.length);

  return {
    options: {
      matches: options.matches,
      seed: options.seed,
      durationSec: options.durationSec,
      stepMs: options.stepMs,
      startAge: AGE_DEFINITIONS[options.startAgeIndex]!.label,
      economyScale: options.economyScale,
    },
    summary: {
      playerWins,
      aiWins,
      draws,
      playerWinRate: playerWins / Math.max(1, results.length),
      aiWinRate: aiWins / Math.max(1, results.length),
      drawRate: draws / Math.max(1, results.length),
      avgDurationSec,
      avgLaneAdvantage,
    },
    averages: {
      player: accumulateSideMetrics('player', results),
      ai: accumulateSideMetrics('ai', results),
      playerFinalHp: avgPlayerHp,
      aiFinalHp: avgAiHp,
    },
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMetric(metric: number): string {
  return metric.toFixed(2);
}

function renderTextSummary(aggregate: AggregateResult): void {
  console.log(
    `Benchmark complete (${aggregate.options.matches} matches, seed=${aggregate.options.seed}, startAge=${aggregate.options.startAge}, economyScale=${aggregate.options.economyScale})`,
  );
  console.log('');
  console.log('Outcomes');
  console.log(
    `  player wins: ${aggregate.summary.playerWins} (${formatPercent(aggregate.summary.playerWinRate)})`,
  );
  console.log(`  ai wins:     ${aggregate.summary.aiWins} (${formatPercent(aggregate.summary.aiWinRate)})`);
  console.log(`  draws:       ${aggregate.summary.draws} (${formatPercent(aggregate.summary.drawRate)})`);
  console.log(`  avg duration: ${formatMetric(aggregate.summary.avgDurationSec)}s`);
  console.log(`  avg lane advantage (player-perspective): ${formatMetric(aggregate.summary.avgLaneAdvantage)}`);
  console.log('');
  console.log('Player averages');
  console.log(`  spawns: ${formatMetric(aggregate.averages.player.spawns)}`);
  console.log(`  age ups: ${formatMetric(aggregate.averages.player.ageUps)}`);
  console.log(`  turret ups: ${formatMetric(aggregate.averages.player.turretUps)}`);
  console.log(`  gold spent: ${formatMetric(aggregate.averages.player.goldSpent)}`);
  console.log(`  final gold: ${formatMetric(aggregate.averages.player.finalGold)}`);
  console.log(`  final age index: ${formatMetric(aggregate.averages.player.finalAgeIndex)}`);
  console.log(`  final turret level: ${formatMetric(aggregate.averages.player.finalTurretLevel)}`);
  console.log(`  final base HP: ${formatMetric(aggregate.averages.playerFinalHp)}`);
  console.log('');
  console.log('AI averages');
  console.log(`  spawns: ${formatMetric(aggregate.averages.ai.spawns)}`);
  console.log(`  age ups: ${formatMetric(aggregate.averages.ai.ageUps)}`);
  console.log(`  turret ups: ${formatMetric(aggregate.averages.ai.turretUps)}`);
  console.log(`  gold spent: ${formatMetric(aggregate.averages.ai.goldSpent)}`);
  console.log(`  final gold: ${formatMetric(aggregate.averages.ai.finalGold)}`);
  console.log(`  final age index: ${formatMetric(aggregate.averages.ai.finalAgeIndex)}`);
  console.log(`  final turret level: ${formatMetric(aggregate.averages.ai.finalTurretLevel)}`);
  console.log(`  final base HP: ${formatMetric(aggregate.averages.aiFinalHp)}`);
}

function run(): void {
  const options = parseArgs(process.argv.slice(2));
  const results: MatchResult[] = [];

  for (let index = 0; index < options.matches; index += 1) {
    const matchSeed = (options.seed + index * 9973) >>> 0;
    const simulator = new BenchmarkMatchSimulator(options, createRng(matchSeed));
    const result = simulator.run();
    results.push(result);

    if (options.verbose) {
      const durationSec = (result.durationMs / 1000).toFixed(1);
      console.log(
        `[${index + 1}/${options.matches}] winner=${result.winner} duration=${durationSec}s lane=${result.laneAdvantage.toFixed(1)} playerHp=${result.playerHp.toFixed(1)} aiHp=${result.aiHp.toFixed(1)}`,
      );
    }
  }

  const aggregate = buildAggregate(options, results);

  if (options.outPath) {
    writeFileSync(options.outPath, JSON.stringify(aggregate, null, 2), 'utf8');
  }

  if (options.json) {
    console.log(JSON.stringify(aggregate, null, 2));
    return;
  }

  renderTextSummary(aggregate);
}

run();
