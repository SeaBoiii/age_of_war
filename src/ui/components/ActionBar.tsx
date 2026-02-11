import { AGE_DEFINITIONS } from '../../game/constants/ages';
import { gameBridge } from '../../state/gameBridge';
import type { GameUiState } from '../../state/types';

interface ActionBarProps {
  state: GameUiState;
}

export function ActionBar({ state }: ActionBarProps) {
  const nextAgeLabel = AGE_DEFINITIONS[state.playerAgeIndex + 1]?.label;
  const canPayAdvance = state.advanceAgeCost !== null && state.gold >= state.advanceAgeCost;

  const canPayTurretUpgrade =
    state.playerTurretUpgradeCost !== null && state.gold >= state.playerTurretUpgradeCost;
  const queueFull = state.playerQueueCount >= state.playerQueueLimit;

  const turretButtonLabel =
    state.playerTurretUpgradeCost !== null
      ? `Turret ${state.playerTurretLevel + 1}->${state.playerTurretLevel + 2} (${state.playerTurretUpgradeCost})`
      : `Turret Max (${state.playerTurretLevel + 1}/${state.playerTurretMaxLevel + 1})`;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-3">
      <div className="pointer-events-auto rounded-xl border border-white/20 bg-slate-900/78 p-2 backdrop-blur sm:p-3">
        <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className="shrink-0 rounded-lg border border-amber-300/40 bg-amber-400/20 px-3 py-2 text-xs font-bold text-amber-100 transition disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
            disabled={
              !state.canAdvanceAge ||
              state.advanceAgeCost === null ||
              !canPayAdvance ||
              state.paused
            }
            onClick={() => gameBridge.dispatch({ type: 'advance_age', side: 'player' })}
          >
            {state.canAdvanceAge && state.advanceAgeCost !== null
              ? `Advance (${state.advanceAgeCost}) ${nextAgeLabel ? `-> ${nextAgeLabel}` : ''}`
              : 'Max Age'}
          </button>

          <button
            type="button"
            className="shrink-0 rounded-lg border border-sky-300/40 bg-sky-400/20 px-3 py-2 text-xs font-bold text-sky-100 transition disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
            disabled={state.paused || state.playerTurretUpgradeCost === null || !canPayTurretUpgrade}
            onClick={() => gameBridge.dispatch({ type: 'upgrade_turret', side: 'player' })}
          >
            {turretButtonLabel}
          </button>

          <span className="text-[11px] text-slate-300 sm:text-xs">{state.battleMessage}</span>
          <span className="rounded-md bg-indigo-500/20 px-2 py-1 text-[11px] text-indigo-100 sm:text-xs">
            Queue: {state.playerQueueCount}/{state.playerQueueLimit}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {state.unitButtons.map((unit) => {
            const missingGold = state.gold < unit.cost;
            const disabled = state.paused || missingGold || queueFull;

            return (
              <button
                key={unit.unitId}
                type="button"
                className="relative overflow-hidden rounded-lg border border-white/20 bg-slate-800/75 p-2 text-left transition hover:bg-slate-700/80 disabled:cursor-not-allowed"
                disabled={disabled}
                onClick={() => gameBridge.dispatch({ type: 'spawn_unit', unitId: unit.unitId })}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-100 sm:text-xs">
                  <span className="font-semibold">{unit.icon}</span>
                  <span className="text-amber-200">{unit.cost}</span>
                </div>
                <div className="truncate text-[11px] text-slate-200 sm:text-xs">{unit.name}</div>
                <div className="mt-1 text-[10px] text-cyan-200/90">
                  Rate: {(unit.spawnRateMs / 1000).toFixed(1)}s
                </div>
                {unit.queuedCount > 0 && (
                  <div className="mt-0.5 text-[10px] text-indigo-200/90">Queued: {unit.queuedCount}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
