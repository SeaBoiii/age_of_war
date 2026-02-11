import { AI_DECISION_INTERVAL_MS } from '../constants/balance';
import type { UnitDefinition, UnitId } from '../types';

interface AiContext {
  getAiAgeIndex: () => number;
  getAiGold: () => number;
  getAiBaseX: () => number;
  getPlayerFrontX: () => number;
  getAiAdvanceCost: () => number | null;
  canAiAdvance: () => boolean;
  getRoster: () => UnitDefinition[];
  trySpawnUnit: (unitId: UnitId) => boolean;
  tryAdvanceAge: () => boolean;
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
    const aiBaseX = this.context.getAiBaseX();
    const playerFrontX = this.context.getPlayerFrontX();
    const underPressure = playerFrontX > aiBaseX - 255;

    if (underPressure && defensiveMelee) {
      if (this.context.trySpawnUnit(defensiveMelee.id)) {
        return;
      }
    }

    const advanceCost = this.context.getAiAdvanceCost();
    if (
      this.context.canAiAdvance() &&
      advanceCost !== null &&
      aiGold >= advanceCost &&
      (this.saveForAgeDecisions > 0 || aiGold >= advanceCost * 1.25 || this.decisionCount % 3 === 0)
    ) {
      if (this.context.tryAdvanceAge()) {
        return;
      }
    }

    if (
      this.saveForAgeDecisions > 0 &&
      this.context.canAiAdvance() &&
      advanceCost !== null &&
      aiGold < advanceCost
    ) {
      return;
    }

    const cheapestCost = Math.min(...roster.map((unit) => unit.cost));
    if (aiGold >= cheapestCost * 2.2 && strongRanged) {
      const spawnedRanged = this.context.trySpawnUnit(strongRanged.id);
      if (spawnedRanged && this.decisionCount % 2 === 0 && cheapMelee) {
        this.context.trySpawnUnit(cheapMelee.id);
      }
      if (spawnedRanged) {
        return;
      }
    }

    if (cheapMelee) {
      this.context.trySpawnUnit(cheapMelee.id);
    }
  }
}
