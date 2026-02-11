import { AI_DECISION_INTERVAL_MS } from '../constants/balance';
import type { UnitDefinition, UnitId } from '../types';

interface AiContext {
  getAiAgeIndex: () => number;
  getAiGold: () => number;
  isUnderPressure: () => boolean;
  getLaneAdvantage: () => number;
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

  private lastSpawnRole: 'frontline' | 'ranged' | null = null;

  public constructor(private readonly context: AiContext) {}

  public reset(): void {
    this.decisionAccumulatorMs = 0;
    this.decisionCount = 0;
    this.saveForAgeDecisions = 0;
    this.lastSpawnRole = null;
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

  private trySpawnWithTrace(unit: UnitDefinition, role: 'frontline' | 'ranged'): boolean {
    if (this.context.trySpawnUnit(unit.id)) {
      this.lastSpawnRole = role;
      this.debug(`action: spawned ${unit.name}`);
      return true;
    }

    this.debug(`action-failed: could not spawn ${unit.name}`);
    return false;
  }

  private makeDecision(): void {
    this.decisionCount += 1;
    if (this.decisionCount % 7 === 0) {
      this.saveForAgeDecisions = 4;
    } else {
      this.saveForAgeDecisions = Math.max(0, this.saveForAgeDecisions - 1);
    }

    const roster = this.context.getRoster();
    const meleeUnits = roster.filter((unit) => unit.tags.includes('melee'));
    const rangedUnits = roster.filter((unit) => unit.tags.includes('ranged'));

    const tankFrontliner = [...meleeUnits]
      .filter((unit) => unit.tags.includes('tank') || unit.tags.includes('defensive'))
      .sort((left, right) => right.maxHp - left.maxHp)[0];

    const strongestMelee = [...meleeUnits].sort((left, right) => right.maxHp - left.maxHp)[0];
    const frontliner = tankFrontliner ?? strongestMelee;

    const cheapMelee = [...meleeUnits].sort((left, right) => left.cost - right.cost)[0];
    const strongRanged = [...rangedUnits].sort((left, right) => right.damage - left.damage)[0];
    const cheapRanged = [...rangedUnits].sort((left, right) => left.cost - right.cost)[0];

    const aiGold = this.context.getAiGold();
    const laneAdvantage = this.context.getLaneAdvantage();
    const underPressure = this.context.isUnderPressure();

    const winning = laneAdvantage > 110;
    const dominant = laneAdvantage > 240;
    const losing = laneAdvantage < -110;
    const collapsing = underPressure || laneAdvantage < -240;

    this.debug(
      `decision#${this.decisionCount} age=${this.context.getAiAgeIndex() + 1} gold=${Math.floor(
        aiGold,
      )} laneAdv=${Math.floor(laneAdvantage)} pressure=${underPressure ? 'high' : 'low'}`,
    );

    // Emergency defense: if we may lose lane, drop frontline immediately.
    if (collapsing && frontliner) {
      this.debug(`plan: emergency frontline ${frontliner.name}`);
      if (this.trySpawnWithTrace(frontliner, 'frontline')) {
        return;
      }
    }

    const advanceCost = this.context.getAiAdvanceCost();
    const canAdvance = this.context.canAiAdvance() && advanceCost !== null;

    // Prioritize age progression because newer units are stronger.
    if (canAdvance && advanceCost !== null && aiGold >= advanceCost) {
      const shouldAdvanceNow =
        !collapsing &&
        (
          dominant ||
          winning ||
          this.saveForAgeDecisions > 0 ||
          this.decisionCount % 2 === 0 ||
          aiGold >= advanceCost * 1.18
        );

      if (shouldAdvanceNow) {
        this.debug(`plan: advance age (cost ${Math.floor(advanceCost)})`);
        if (this.context.tryAdvanceAge()) {
          this.debug('action: advanced to next age');
          return;
        }
        this.debug('action-failed: age advance blocked');
      }
    }

    // If winning and close to age-up, spend less on units and save.
    if (
      canAdvance &&
      advanceCost !== null &&
      aiGold < advanceCost &&
      winning &&
      aiGold >= advanceCost * 0.65 &&
      !collapsing
    ) {
      this.debug(`plan: hold gold for age (${Math.floor(aiGold)}/${Math.floor(advanceCost)})`);
      return;
    }

    const turretUpgradeCost = this.context.getAiTurretUpgradeCost();

    // When not winning, focus tower progression for defensive stability.
    if (
      this.context.canAiUpgradeTurret() &&
      turretUpgradeCost !== null &&
      aiGold >= turretUpgradeCost &&
      (!winning || collapsing || this.decisionCount % 3 === 0)
    ) {
      this.debug(`plan: upgrade turret (cost ${Math.floor(turretUpgradeCost)})`);
      if (this.context.tryUpgradeTurret()) {
        this.debug('action: upgraded turret');
        return;
      }
      this.debug('action-failed: turret upgrade blocked');
    }

    // Build formations: frontline first, then ranged support behind it.
    if (frontliner && strongRanged) {
      const shouldLeadWithFrontline =
        this.lastSpawnRole !== 'frontline' || collapsing || losing || this.decisionCount % 4 === 0;

      if (shouldLeadWithFrontline) {
        this.debug(`plan: frontline ${frontliner.name} then ranged ${strongRanged.name}`);
        if (this.trySpawnWithTrace(frontliner, 'frontline')) {
          const refreshedGold = this.context.getAiGold();
          if (!collapsing && refreshedGold >= strongRanged.cost * 1.1) {
            this.debug(`plan: follow-up ranged ${strongRanged.name}`);
            this.trySpawnWithTrace(strongRanged, 'ranged');
          }
          return;
        }
      }

      this.debug(`plan: support with ranged ${strongRanged.name}`);
      if (this.trySpawnWithTrace(strongRanged, 'ranged')) {
        return;
      }
    }

    if (cheapMelee && this.context.getAiGold() >= cheapMelee.cost) {
      this.debug(`plan: fallback melee ${cheapMelee.name}`);
      if (this.trySpawnWithTrace(cheapMelee, 'frontline')) {
        return;
      }
    }

    if (cheapRanged && this.context.getAiGold() >= cheapRanged.cost) {
      this.debug(`plan: fallback ranged ${cheapRanged.name}`);
      this.trySpawnWithTrace(cheapRanged, 'ranged');
    }
  }
}
