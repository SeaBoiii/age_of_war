import { AI_DECISION_INTERVAL_MS } from '../constants/balance';
import type { UnitDefinition, UnitId } from '../types';

interface ForceComposition {
  total: number;
  frontline: number;
  ranged: number;
  tank: number;
  support: number;
}

interface AiContext {
  getAiAgeIndex: () => number;
  getEnemyAgeIndex: () => number;
  getAiGold: () => number;
  getAiIncomePerSecond: () => number;
  isUnderPressure: () => boolean;
  getLaneAdvantage: () => number;
  getAiBaseHpRatio: () => number;
  getEnemyBaseHpRatio: () => number;
  getAiTurretLevel: () => number;
  getEnemyTurretLevel: () => number;
  getCurrentTurretDps: () => number;
  getNextTurretDps: () => number | null;
  getAiAdvanceCost: () => number | null;
  canAiAdvance: () => boolean;
  getAiTurretUpgradeCost: () => number | null;
  canAiUpgradeTurret: () => boolean;
  getRoster: () => UnitDefinition[];
  getNextAgeRoster: () => UnitDefinition[] | null;
  getAllyComposition: () => ForceComposition;
  getEnemyComposition: () => ForceComposition;
  trySpawnUnit: (unitId: UnitId) => boolean;
  tryAdvanceAge: () => boolean;
  tryUpgradeTurret: () => boolean;
  debugLog?: (message: string) => void;
}

type SpawnRole = 'frontline' | 'ranged';
type StrategyMode = 'defend' | 'stabilize' | 'tech' | 'pressure';
type AiActionKind =
  | 'advance_age'
  | 'upgrade_turret'
  | 'spawn_frontline'
  | 'spawn_ranged'
  | 'spawn_duo'
  | 'spawn_cheapest'
  | 'hold';

interface TacticalSnapshot {
  aiAgeIndex: number;
  enemyAgeIndex: number;
  aiGold: number;
  aiIncomePerSecond: number;
  laneAdvantage: number;
  underPressure: boolean;
  aiBaseHpRatio: number;
  enemyBaseHpRatio: number;
  aiTurretLevel: number;
  enemyTurretLevel: number;
  currentTurretDps: number;
  nextTurretDps: number | null;
  canAdvance: boolean;
  advanceCost: number | null;
  canUpgradeTurret: boolean;
  turretUpgradeCost: number | null;
  ally: ForceComposition;
  enemy: ForceComposition;
  currentRosterPower: number;
  nextAgeRosterPower: number | null;
}

interface ActionCandidate {
  kind: AiActionKind;
  label: string;
  reason: string;
  cost: number;
  primaryUnit?: UnitDefinition;
  secondaryUnit?: UnitDefinition;
  baseScore: number;
  lookaheadScore: number;
  totalScore: number;
}

interface AiBehaviorProfile {
  aggression: number;
  techFocus: number;
  defenseFocus: number;
  holdPreference: number;
  pressureModeThreshold: number;
}

const MODE_ACTION_WEIGHTS: Record<StrategyMode, Record<AiActionKind, number>> = {
  defend: {
    advance_age: 65,
    upgrade_turret: 210,
    spawn_frontline: 190,
    spawn_ranged: 90,
    spawn_duo: 170,
    spawn_cheapest: 85,
    hold: 25,
  },
  stabilize: {
    advance_age: 145,
    upgrade_turret: 130,
    spawn_frontline: 140,
    spawn_ranged: 125,
    spawn_duo: 150,
    spawn_cheapest: 100,
    hold: 60,
  },
  tech: {
    advance_age: 245,
    upgrade_turret: 95,
    spawn_frontline: 105,
    spawn_ranged: 110,
    spawn_duo: 120,
    spawn_cheapest: 80,
    hold: 135,
  },
  pressure: {
    advance_age: 165,
    upgrade_turret: 85,
    spawn_frontline: 130,
    spawn_ranged: 155,
    spawn_duo: 185,
    spawn_cheapest: 85,
    hold: 45,
  },
};

const DEFAULT_AI_BEHAVIOR_PROFILE: AiBehaviorProfile = {
  aggression: 1,
  techFocus: 1,
  defenseFocus: 1,
  holdPreference: 1,
  pressureModeThreshold: 160,
};

export class AiSystem {
  private decisionAccumulatorMs = 0;

  private decisionCount = 0;

  private activeMode: StrategyMode = 'stabilize';

  private modeLockDecisions = 0;

  private lastSpawnRole: SpawnRole | null = null;

  private readonly recentActions: AiActionKind[] = [];

  private readonly behavior: AiBehaviorProfile;

  public constructor(
    private readonly context: AiContext,
    behavior?: Partial<AiBehaviorProfile>,
  ) {
    this.behavior = {
      ...DEFAULT_AI_BEHAVIOR_PROFILE,
      ...behavior,
    };
  }

  public reset(): void {
    this.decisionAccumulatorMs = 0;
    this.decisionCount = 0;
    this.activeMode = 'stabilize';
    this.modeLockDecisions = 0;
    this.lastSpawnRole = null;
    this.recentActions.length = 0;
  }

  public update(deltaMs: number): void {
    this.decisionAccumulatorMs += deltaMs;

    while (this.decisionAccumulatorMs >= AI_DECISION_INTERVAL_MS) {
      this.decisionAccumulatorMs -= AI_DECISION_INTERVAL_MS;
      this.makeDecision();
    }
  }

  private debug(message: string): void {
    this.context.debugLog?.(message);
  }

  private rememberAction(action: AiActionKind): void {
    this.recentActions.unshift(action);
    if (this.recentActions.length > 5) {
      this.recentActions.length = 5;
    }
  }

  private actionRepeatPenalty(action: AiActionKind): number {
    const repeatCount = this.recentActions.filter((entry) => entry === action).length;
    const mostRecentPenalty = this.recentActions[0] === action ? 14 : 0;
    return mostRecentPenalty + repeatCount * 6;
  }

  private getUnitDps(unit: UnitDefinition): number {
    return unit.damage * (1000 / Math.max(1, unit.attackCooldownMs));
  }

  private estimateUnitPower(unit: UnitDefinition): number {
    const dps = this.getUnitDps(unit);
    const tankBonus = unit.tags.includes('tank') || unit.tags.includes('defensive') ? 26 : 0;
    const supportBonus = unit.tags.includes('support') ? 12 : 0;
    const rangeBonus = unit.tags.includes('ranged') ? Math.min(28, unit.attackRange * 0.08) : 0;

    return unit.maxHp * 0.24 + dps * 7.4 + unit.moveSpeed * 0.06 + tankBonus + supportBonus + rangeBonus;
  }

  private getAverageRosterPower(roster: UnitDefinition[]): number {
    if (roster.length === 0) {
      return 0;
    }

    const total = roster.reduce((sum, unit) => sum + this.estimateUnitPower(unit), 0);
    return total / roster.length;
  }

  private resolveRole(unit: UnitDefinition): SpawnRole {
    return unit.tags.includes('ranged') ? 'ranged' : 'frontline';
  }

  private trySpawnWithTrace(unit: UnitDefinition, role: SpawnRole): boolean {
    if (this.context.trySpawnUnit(unit.id)) {
      this.lastSpawnRole = role;
      this.debug(`action: spawned ${unit.name}`);
      return true;
    }

    this.debug(`action-failed: could not spawn ${unit.name}`);
    return false;
  }

  private pickMode(snapshot: TacticalSnapshot): StrategyMode {
    let proposed: StrategyMode = 'stabilize';

    const defendLaneThreshold = -160 - (this.behavior.aggression - 1) * 80;
    const pressureLaneThreshold = this.behavior.pressureModeThreshold;
    const canIgnoreLightPressure =
      this.behavior.aggression > 1.15 &&
      snapshot.aiBaseHpRatio > 0.58 &&
      snapshot.laneAdvantage > -200;

    if (
      (!canIgnoreLightPressure && snapshot.underPressure) ||
      snapshot.aiBaseHpRatio <= 0.44 ||
      snapshot.laneAdvantage <= defendLaneThreshold ||
      snapshot.enemy.frontline > snapshot.ally.frontline + 1
    ) {
      proposed = 'defend';
    } else if (
      snapshot.canAdvance &&
      snapshot.advanceCost !== null &&
      snapshot.aiGold >= snapshot.advanceCost * 0.58 &&
      snapshot.laneAdvantage > -110
    ) {
      proposed = 'tech';
    } else if (
      snapshot.laneAdvantage >= pressureLaneThreshold ||
      (snapshot.enemyBaseHpRatio <= 0.6 && snapshot.laneAdvantage >= 60)
    ) {
      proposed = 'pressure';
    }

    if (proposed !== this.activeMode) {
      if (this.modeLockDecisions > 0) {
        this.modeLockDecisions -= 1;
        return this.activeMode;
      }

      this.debug(`mode-switch: ${this.activeMode} -> ${proposed}`);
      this.activeMode = proposed;
      this.modeLockDecisions = 1;
      return this.activeMode;
    }

    if (this.modeLockDecisions > 0) {
      this.modeLockDecisions -= 1;
    }

    return this.activeMode;
  }

  private buildSnapshot(): TacticalSnapshot {
    const currentRoster = this.context.getRoster();
    const nextRoster = this.context.getNextAgeRoster();

    return {
      aiAgeIndex: this.context.getAiAgeIndex(),
      enemyAgeIndex: this.context.getEnemyAgeIndex(),
      aiGold: this.context.getAiGold(),
      aiIncomePerSecond: this.context.getAiIncomePerSecond(),
      laneAdvantage: this.context.getLaneAdvantage(),
      underPressure: this.context.isUnderPressure(),
      aiBaseHpRatio: this.context.getAiBaseHpRatio(),
      enemyBaseHpRatio: this.context.getEnemyBaseHpRatio(),
      aiTurretLevel: this.context.getAiTurretLevel(),
      enemyTurretLevel: this.context.getEnemyTurretLevel(),
      currentTurretDps: this.context.getCurrentTurretDps(),
      nextTurretDps: this.context.getNextTurretDps(),
      canAdvance: this.context.canAiAdvance(),
      advanceCost: this.context.getAiAdvanceCost(),
      canUpgradeTurret: this.context.canAiUpgradeTurret(),
      turretUpgradeCost: this.context.getAiTurretUpgradeCost(),
      ally: this.context.getAllyComposition(),
      enemy: this.context.getEnemyComposition(),
      currentRosterPower: this.getAverageRosterPower(currentRoster),
      nextAgeRosterPower: nextRoster ? this.getAverageRosterPower(nextRoster) : null,
    };
  }

  private selectFrontliner(roster: UnitDefinition[], mode: StrategyMode): UnitDefinition | undefined {
    const frontlinePool = roster.filter(
      (unit) => unit.tags.includes('melee') || unit.tags.includes('tank') || unit.tags.includes('defensive'),
    );

    if (frontlinePool.length === 0) {
      return undefined;
    }

    const sorted = [...frontlinePool].sort((left, right) => {
      const leftTankiness = left.maxHp + (left.tags.includes('tank') || left.tags.includes('defensive') ? 120 : 0);
      const rightTankiness =
        right.maxHp + (right.tags.includes('tank') || right.tags.includes('defensive') ? 120 : 0);

      const leftModeBonus = mode === 'defend' ? leftTankiness * 0.32 : leftTankiness * 0.14;
      const rightModeBonus = mode === 'defend' ? rightTankiness * 0.32 : rightTankiness * 0.14;

      const leftScore = this.estimateUnitPower(left) + leftModeBonus - left.cost * 0.42;
      const rightScore = this.estimateUnitPower(right) + rightModeBonus - right.cost * 0.42;
      return rightScore - leftScore;
    });

    return sorted[0];
  }

  private selectRanged(roster: UnitDefinition[], mode: StrategyMode): UnitDefinition | undefined {
    const rangedPool = roster.filter((unit) => unit.tags.includes('ranged'));
    if (rangedPool.length === 0) {
      return undefined;
    }

    const sorted = [...rangedPool].sort((left, right) => {
      const leftScore =
        this.getUnitDps(left) * 8 +
        left.attackRange * 0.26 +
        (mode === 'pressure' || mode === 'tech' ? 20 : 6) -
        left.cost * 0.36;

      const rightScore =
        this.getUnitDps(right) * 8 +
        right.attackRange * 0.26 +
        (mode === 'pressure' || mode === 'tech' ? 20 : 6) -
        right.cost * 0.36;

      return rightScore - leftScore;
    });

    return sorted[0];
  }

  private computeBaseScore(candidate: ActionCandidate, snapshot: TacticalSnapshot, mode: StrategyMode): number {
    const frontlineNeed = Math.max(0, snapshot.enemy.frontline - snapshot.ally.frontline);
    const rangedNeed = Math.max(0, snapshot.ally.frontline - snapshot.ally.ranged);
    const lane = snapshot.laneAdvantage;
    const hpRisk = (1 - snapshot.aiBaseHpRatio) * 130;

    let score = MODE_ACTION_WEIGHTS[mode][candidate.kind];
    score -= this.actionRepeatPenalty(candidate.kind);

    switch (candidate.kind) {
      case 'advance_age': {
        const ageGap = snapshot.enemyAgeIndex - snapshot.aiAgeIndex;
        if (snapshot.advanceCost !== null) {
          score += snapshot.aiGold >= snapshot.advanceCost ? 48 : -70;
          score += snapshot.aiGold >= snapshot.advanceCost * 0.7 ? 18 : 0;
        }

        score += ageGap > 0 ? 35 : 0;
        score += lane > 120 ? 24 : lane < -120 ? -32 : 6;
        score -= snapshot.underPressure ? 65 : 0;
        score -= snapshot.aiBaseHpRatio < 0.45 ? 45 : 0;
        break;
      }
      case 'upgrade_turret': {
        const turretGain =
          snapshot.nextTurretDps !== null ? Math.max(0, snapshot.nextTurretDps - snapshot.currentTurretDps) : 0;
        score += turretGain * 0.55;
        score += frontlineNeed * 22 + hpRisk;
        score += snapshot.enemyTurretLevel > snapshot.aiTurretLevel ? 14 : 0;

        if (mode === 'tech' && snapshot.advanceCost !== null && snapshot.aiGold >= snapshot.advanceCost * 0.85) {
          score -= 44;
        }
        break;
      }
      case 'spawn_frontline': {
        if (!candidate.primaryUnit) {
          break;
        }

        score += this.estimateUnitPower(candidate.primaryUnit) * 0.2;
        score += frontlineNeed * 30;
        score += snapshot.underPressure ? 34 : 0;
        score += lane < -80 ? 22 : 0;
        score += this.lastSpawnRole === 'ranged' ? 10 : 0;
        break;
      }
      case 'spawn_ranged': {
        if (!candidate.primaryUnit) {
          break;
        }

        score += this.estimateUnitPower(candidate.primaryUnit) * 0.22;
        score += rangedNeed * 24;
        score += lane > 80 ? 18 : 0;
        score -= snapshot.underPressure && snapshot.ally.frontline < snapshot.enemy.frontline ? 40 : 0;
        score += this.lastSpawnRole === 'frontline' ? 10 : 0;
        break;
      }
      case 'spawn_duo': {
        if (!candidate.primaryUnit || !candidate.secondaryUnit) {
          break;
        }

        const pairPower =
          this.estimateUnitPower(candidate.primaryUnit) + this.estimateUnitPower(candidate.secondaryUnit);
        score += pairPower * 0.18;
        score += frontlineNeed > 0 || rangedNeed > 0 ? 30 : 10;
        score += snapshot.underPressure ? 16 : 0;
        break;
      }
      case 'spawn_cheapest': {
        if (!candidate.primaryUnit) {
          break;
        }

        score += this.estimateUnitPower(candidate.primaryUnit) * 0.12;
        score += snapshot.underPressure ? 12 : 0;
        break;
      }
      case 'hold': {
        if (snapshot.advanceCost !== null) {
          const remaining = snapshot.advanceCost - snapshot.aiGold;
          if (remaining > 0 && remaining <= snapshot.advanceCost * 0.36) {
            score += mode === 'tech' ? 56 : 24;
          } else if (remaining <= 0) {
            score -= 34;
          }
        }

        score += lane > 90 ? 8 : 0;
        score -= snapshot.underPressure ? 62 : 0;
        break;
      }
      default:
        break;
    }

    if (candidate.cost > 0) {
      if (snapshot.aiGold < candidate.cost) {
        score -= 150;
      } else {
        score += 12;
      }

      const spendRatio = candidate.cost / Math.max(1, snapshot.aiGold);
      if (spendRatio > 0.92 && candidate.kind !== 'advance_age') {
        score -= 16;
      }

      score -= candidate.cost * 0.04;
    }

    if (
      candidate.kind === 'spawn_frontline' ||
      candidate.kind === 'spawn_ranged' ||
      candidate.kind === 'spawn_duo' ||
      candidate.kind === 'spawn_cheapest'
    ) {
      score *= this.behavior.aggression;
      if (snapshot.laneAdvantage > 20) {
        score += (this.behavior.aggression - 1) * 20;
      }
    } else if (candidate.kind === 'advance_age') {
      score *= this.behavior.techFocus;
    } else if (candidate.kind === 'upgrade_turret') {
      score *= this.behavior.defenseFocus;
    } else if (candidate.kind === 'hold') {
      score *= this.behavior.holdPreference;
    }

    return score;
  }

  private computeLookaheadScore(candidate: ActionCandidate, snapshot: TacticalSnapshot, mode: StrategyMode): number {
    const horizonSec = 3.2;
    const laneMomentumFromForces =
      (snapshot.ally.frontline - snapshot.enemy.frontline) * 14 +
      (snapshot.ally.ranged - snapshot.enemy.ranged) * 9 +
      (snapshot.ally.tank - snapshot.enemy.tank) * 7;

    const unitPowerContribution =
      (candidate.primaryUnit ? this.estimateUnitPower(candidate.primaryUnit) : 0) +
      (candidate.secondaryUnit ? this.estimateUnitPower(candidate.secondaryUnit) : 0);

    const turretContribution =
      candidate.kind === 'upgrade_turret' && snapshot.nextTurretDps !== null
        ? Math.max(0, snapshot.nextTurretDps - snapshot.currentTurretDps) * 1.8
        : 0;

    const ageContribution =
      candidate.kind === 'advance_age' && snapshot.nextAgeRosterPower !== null
        ? Math.max(0, snapshot.nextAgeRosterPower - snapshot.currentRosterPower) * 0.25
        : 0;

    const actionLaneImpact = unitPowerContribution * 0.32 + turretContribution + ageContribution;
    const projectedLane =
      snapshot.laneAdvantage + laneMomentumFromForces * 0.22 + actionLaneImpact + (snapshot.underPressure ? -18 : 8);

    const projectedGold =
      snapshot.aiGold -
      (snapshot.aiGold >= candidate.cost ? candidate.cost : 0) +
      snapshot.aiIncomePerSecond * horizonSec;

    let score = (projectedLane - snapshot.laneAdvantage) * 0.55;
    score += Math.max(0, projectedLane) * 0.08;
    score -= Math.max(0, -projectedLane) * 0.1;

    const survivalDelta = snapshot.aiBaseHpRatio - snapshot.enemyBaseHpRatio;
    score += survivalDelta * 24;

    if (mode === 'tech' && snapshot.advanceCost !== null && projectedGold >= snapshot.advanceCost) {
      score += 26;
    }

    if (mode === 'defend') {
      score += Math.max(0, projectedLane + 120) * 0.04;
    }

    if (candidate.kind === 'hold' && snapshot.underPressure) {
      score -= 38;
    }

    if (candidate.kind === 'advance_age' && snapshot.underPressure && projectedLane < 40) {
      score -= 30;
    }

    return score;
  }

  private evaluateCandidate(
    candidate: Omit<ActionCandidate, 'baseScore' | 'lookaheadScore' | 'totalScore'>,
    snapshot: TacticalSnapshot,
    mode: StrategyMode,
  ): ActionCandidate {
    const emptyScores = {
      ...candidate,
      baseScore: 0,
      lookaheadScore: 0,
      totalScore: 0,
    };

    const baseScore = this.computeBaseScore(emptyScores, snapshot, mode);
    const lookaheadScore = this.computeLookaheadScore(emptyScores, snapshot, mode);

    return {
      ...candidate,
      baseScore,
      lookaheadScore,
      totalScore: baseScore + lookaheadScore,
    };
  }

  private tryExecuteCandidate(candidate: ActionCandidate): boolean {
    switch (candidate.kind) {
      case 'advance_age': {
        if (this.context.tryAdvanceAge()) {
          this.debug('action: advanced to next age');
          return true;
        }

        this.debug('action-failed: age advance blocked');
        return false;
      }
      case 'upgrade_turret': {
        if (this.context.tryUpgradeTurret()) {
          this.debug('action: upgraded turret');
          return true;
        }

        this.debug('action-failed: turret upgrade blocked');
        return false;
      }
      case 'spawn_frontline':
      case 'spawn_ranged':
      case 'spawn_cheapest': {
        if (!candidate.primaryUnit) {
          return false;
        }

        return this.trySpawnWithTrace(candidate.primaryUnit, this.resolveRole(candidate.primaryUnit));
      }
      case 'spawn_duo': {
        if (!candidate.primaryUnit || !candidate.secondaryUnit) {
          return false;
        }

        const firstRole = this.resolveRole(candidate.primaryUnit);
        if (!this.trySpawnWithTrace(candidate.primaryUnit, firstRole)) {
          return false;
        }

        if (this.context.getAiGold() >= candidate.secondaryUnit.cost) {
          this.trySpawnWithTrace(candidate.secondaryUnit, this.resolveRole(candidate.secondaryUnit));
        }
        return true;
      }
      case 'hold': {
        this.debug('action: hold and bank resources');
        return true;
      }
      default:
        return false;
    }
  }

  private makeDecision(): void {
    this.decisionCount += 1;

    const snapshot = this.buildSnapshot();
    const mode = this.pickMode(snapshot);
    const roster = this.context.getRoster();
    const frontliner = this.selectFrontliner(roster, mode);
    const ranged = this.selectRanged(roster, mode);
    const cheapest = [...roster].sort((left, right) => left.cost - right.cost)[0];

    this.debug(
      `decision#${this.decisionCount} mode=${mode} age=${snapshot.aiAgeIndex + 1} enemyAge=${snapshot.enemyAgeIndex + 1} gold=${Math.floor(snapshot.aiGold)} laneAdv=${Math.floor(snapshot.laneAdvantage)} pressure=${snapshot.underPressure ? 'high' : 'low'}`,
    );

    const candidates: ActionCandidate[] = [];

    candidates.push(
      this.evaluateCandidate(
        {
          kind: 'hold',
          label: 'Hold',
          reason: 'Banking for better timing',
          cost: 0,
        },
        snapshot,
        mode,
      ),
    );

    if (snapshot.canAdvance && snapshot.advanceCost !== null) {
      candidates.push(
        this.evaluateCandidate(
          {
            kind: 'advance_age',
            label: 'Advance Age',
            reason: 'Unlock stronger roster',
            cost: snapshot.advanceCost,
          },
          snapshot,
          mode,
        ),
      );
    }

    if (snapshot.canUpgradeTurret && snapshot.turretUpgradeCost !== null) {
      candidates.push(
        this.evaluateCandidate(
          {
            kind: 'upgrade_turret',
            label: 'Upgrade Turret',
            reason: 'Raise defensive DPS',
            cost: snapshot.turretUpgradeCost,
          },
          snapshot,
          mode,
        ),
      );
    }

    if (frontliner) {
      candidates.push(
        this.evaluateCandidate(
          {
            kind: 'spawn_frontline',
            label: `Spawn ${frontliner.name}`,
            reason: 'Frontline control',
            cost: frontliner.cost,
            primaryUnit: frontliner,
          },
          snapshot,
          mode,
        ),
      );
    }

    if (ranged) {
      candidates.push(
        this.evaluateCandidate(
          {
            kind: 'spawn_ranged',
            label: `Spawn ${ranged.name}`,
            reason: 'Backline damage support',
            cost: ranged.cost,
            primaryUnit: ranged,
          },
          snapshot,
          mode,
        ),
      );
    }

    if (frontliner && ranged) {
      const duoCost = frontliner.cost + ranged.cost;
      candidates.push(
        this.evaluateCandidate(
          {
            kind: 'spawn_duo',
            label: `${frontliner.name} + ${ranged.name}`,
            reason: 'Frontline and ranged formation',
            cost: duoCost,
            primaryUnit: frontliner,
            secondaryUnit: ranged,
          },
          snapshot,
          mode,
        ),
      );
    }

    if (cheapest) {
      candidates.push(
        this.evaluateCandidate(
          {
            kind: 'spawn_cheapest',
            label: `Spawn ${cheapest.name}`,
            reason: 'Cheap tempo',
            cost: cheapest.cost,
            primaryUnit: cheapest,
          },
          snapshot,
          mode,
        ),
      );
    }

    const rankedCandidates = [...candidates].sort((left, right) => right.totalScore - left.totalScore);

    const topPreview = rankedCandidates
      .slice(0, 3)
      .map((candidate) => `${candidate.label}=${candidate.totalScore.toFixed(1)}`)
      .join(' | ');
    this.debug(`plans: ${topPreview}`);

    for (const candidate of rankedCandidates) {
      if (candidate.cost > 0 && this.context.getAiGold() < candidate.cost && candidate.kind !== 'hold') {
        continue;
      }

      if (this.tryExecuteCandidate(candidate)) {
        this.rememberAction(candidate.kind);
        this.debug(
          `selected: ${candidate.label} score=${candidate.totalScore.toFixed(1)} reason=${candidate.reason} (base=${candidate.baseScore.toFixed(1)}, lookahead=${candidate.lookaheadScore.toFixed(1)})`,
        );
        return;
      }
    }

    this.debug('action: no viable move');
  }
}
