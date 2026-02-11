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
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {state.unitButtons.map((unit) => {
            const coolingDown = unit.cooldownRemainingMs > 0;
            const missingGold = state.gold < unit.cost;
            const disabled = state.paused || coolingDown || missingGold;
            const cooldownPct = unit.cooldownMs
              ? unit.cooldownRemainingMs / unit.cooldownMs
              : 0;

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

                {coolingDown && (
                  <div className="pointer-events-none absolute inset-0 bg-slate-950/70">
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-cyan-300"
                      style={{ width: `${Math.max(0, Math.min((1 - cooldownPct) * 100, 100))}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
