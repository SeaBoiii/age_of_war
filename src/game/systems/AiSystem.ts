import { AI_DECISION_INTERVAL_MS } from '../constants/balance';
import type { UnitDefinition, UnitId } from '../types';

interface AiContext {
  getAiAgeIndex: () => number;
  getAiGold: () => number;
  isUnderPressure: () => boolean;
  getAiAdvanceCost: () => number | null;
  canAiAdvance: () => boolean;
  getAiTurretUpgradeCost: () => number | null;
  canAiUpgradeTurret: () => boolean;
  getRoster: () => UnitDefinition[];
  trySpawnUnit: (unitId: UnitId) => boolean;
  tryAdvanceAge: () => boolean;
  tryUpgradeTurret: () => boolean;
  debugLog?: (message: string) => void;
}

export class AiSystem {
  private decisionAccumulatorMs = 0;

  private decisionCount = 0;

  private saveForAgeDecisions = 0;

  public constructor(private readonly context: AiContext) {}

  public reset(): void {
    this.decisionAccumulatorMs = 0;
    this.decisionCount = 0;
    this.saveForAgeDecisions = 0;
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

  private makeDecision(): void {
    this.decisionCount += 1;
    if (this.decisionCount % 8 === 0) {
      this.saveForAgeDecisions = 4;
    } else {
      this.saveForAgeDecisions = Math.max(0, this.saveForAgeDecisions - 1);
    }

    const roster = this.context.getRoster();
    const meleeUnits = roster.filter((unit) => unit.tags.includes('melee'));
    const rangedUnits = roster.filter((unit) => unit.tags.includes('ranged'));

    const defensiveMelee = [...meleeUnits].sort((left, right) => right.maxHp - left.maxHp)[0];
    const cheapMelee = [...meleeUnits].sort((left, right) => left.cost - right.cost)[0];
    const strongRanged = [...rangedUnits].sort((left, right) => right.damage - left.damage)[0];

    const aiGold = this.context.getAiGold();
    const underPressure = this.context.isUnderPressure();

    this.debug(
      `decision#${this.decisionCount} gold=${Math.floor(aiGold)} pressure=${underPressure ? 'high' : 'low'} saveAge=${this.saveForAgeDecisions}`,
    );

    if (underPressure && defensiveMelee) {
      this.debug(`plan: defend base with ${defensiveMelee.name}`);
      if (this.context.trySpawnUnit(defensiveMelee.id)) {
        this.debug(`action: spawned ${defensiveMelee.name}`);
        return;
      }
      this.debug(`action-failed: could not spawn ${defensiveMelee.name}`);
    }

    const advanceCost = this.context.getAiAdvanceCost();
    if (
      this.context.canAiAdvance() &&
      advanceCost !== null &&
      aiGold >= advanceCost &&
      (this.saveForAgeDecisions > 0 || aiGold >= advanceCost * 1.25 || this.decisionCount % 3 === 0)
    ) {
      this.debug(`plan: advance age (cost ${Math.floor(advanceCost)})`);
      if (this.context.tryAdvanceAge()) {
        this.debug('action: advanced to next age');
        return;
      }
      this.debug('action-failed: age advance blocked');
    }

    const turretUpgradeCost = this.context.getAiTurretUpgradeCost();
    if (
      this.context.canAiUpgradeTurret() &&
      turretUpgradeCost !== null &&
      aiGold >= turretUpgradeCost &&
      (
        underPressure ||
        aiGold >= turretUpgradeCost * 1.7 ||
        (this.decisionCount % 4 === 0 && aiGold >= turretUpgradeCost * 1.1)
      )
    ) {
      this.debug(`plan: upgrade turret (cost ${Math.floor(turretUpgradeCost)})`);
      if (this.context.tryUpgradeTurret()) {
        this.debug('action: upgraded turret');
        return;
      }
      this.debug('action-failed: turret upgrade blocked');
    }

    if (
      this.saveForAgeDecisions > 0 &&
      this.context.canAiAdvance() &&
      advanceCost !== null &&
      aiGold < advanceCost
    ) {
      this.debug(`plan: hold gold for age advance (${Math.floor(aiGold)}/${Math.floor(advanceCost)})`);
      return;
    }

    const cheapestCost = Math.min(...roster.map((unit) => unit.cost));
    if (aiGold >= cheapestCost * 2.2 && strongRanged) {
      this.debug(`plan: pressure with ranged ${strongRanged.name}`);
      const spawnedRanged = this.context.trySpawnUnit(strongRanged.id);
      if (spawnedRanged && this.decisionCount % 2 === 0 && cheapMelee) {
        this.context.trySpawnUnit(cheapMelee.id);
        this.debug(`action: chained melee spawn ${cheapMelee.name}`);
      }
      if (spawnedRanged) {
        this.debug(`action: spawned ${strongRanged.name}`);
        return;
      }
      this.debug(`action-failed: could not spawn ${strongRanged.name}`);
    }

    if (cheapMelee) {
      this.debug(`plan: spawn cheapest melee ${cheapMelee.name}`);
      if (this.context.trySpawnUnit(cheapMelee.id)) {
        this.debug(`action: spawned ${cheapMelee.name}`);
      } else {
        this.debug(`action-failed: could not spawn ${cheapMelee.name}`);
      }
    }
  }
}
