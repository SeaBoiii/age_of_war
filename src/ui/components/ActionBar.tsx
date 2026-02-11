import { AGE_DEFINITIONS } from '../../game/constants/ages';
import { gameBridge } from '../../state/gameBridge';
import type { GameUiState } from '../../state/types';
import { AgeIcon, GoldIcon, QueueIcon, TurretIcon } from './UiIcons';

interface ActionBarProps {
  state: GameUiState;
}

function unitColorToRgba(color: number, alpha: number): string {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ActionBar({ state }: ActionBarProps) {
  const nextAgeLabel = AGE_DEFINITIONS[state.playerAgeIndex + 1]?.label;
  const canPayAdvance = state.advanceAgeCost !== null && state.gold >= state.advanceAgeCost;

  const canPayTurretUpgrade =
    state.playerTurretUpgradeCost !== null && state.gold >= state.playerTurretUpgradeCost;
  const queueFull = state.playerQueueCount >= state.playerQueueLimit;

  const turretButtonLabel =
    state.playerTurretUpgradeCost !== null
      ? `L${state.playerTurretLevel + 1} -> L${state.playerTurretLevel + 2} (${state.playerTurretUpgradeCost})`
      : `Max (${state.playerTurretLevel + 1}/${state.playerTurretMaxLevel + 1})`;

  const unitById = new Map(state.unitButtons.map((unit) => [unit.unitId, unit]));

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 p-1 sm:translate-y-2 sm:p-2">
      <div className="ui-glass-panel pointer-events-auto rounded-xl p-2 sm:p-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300/45 bg-amber-400/22 px-3 py-2 text-xs font-bold text-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
            disabled={!state.canAdvanceAge || state.advanceAgeCost === null || !canPayAdvance || state.paused}
            onClick={() => gameBridge.dispatch({ type: 'advance_age', side: 'player' })}
          >
            <AgeIcon className="h-4 w-4" />
            {state.canAdvanceAge && state.advanceAgeCost !== null
              ? `Advance ${nextAgeLabel ? `-> ${nextAgeLabel}` : ''} (${state.advanceAgeCost})`
              : 'Max Age'}
          </button>

          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-300/45 bg-sky-400/20 px-3 py-2 text-xs font-bold text-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-300/30 disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
            disabled={state.paused || state.playerTurretUpgradeCost === null || !canPayTurretUpgrade}
            onClick={() => gameBridge.dispatch({ type: 'upgrade_turret', side: 'player' })}
          >
            <TurretIcon className="h-4 w-4" />
            Turret {turretButtonLabel}
          </button>

          <span className="ml-auto text-[11px] text-slate-300 sm:text-xs">{state.battleMessage}</span>
        </div>

        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-indigo-300/35 bg-indigo-400/15 px-2 py-1 text-[10px] text-indigo-100 sm:text-xs">
            <QueueIcon className="h-3.5 w-3.5" />
            Spawn Queue
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: state.playerQueueLimit }).map((_, index) => {
              const queuedUnitId = state.playerQueuePreview[index];
              const queuedUnit = queuedUnitId ? unitById.get(queuedUnitId) : undefined;

              if (!queuedUnit) {
                return (
                  <div
                    key={`queue-slot-${index}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300/20 bg-slate-800/50 text-[10px] text-slate-500"
                  >
                    {index + 1}
                  </div>
                );
              }

              return (
                <div
                  key={`queue-slot-${index}`}
                  className="relative flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-bold text-slate-100"
                  style={{
                    borderColor: unitColorToRgba(queuedUnit.color, 0.68),
                    backgroundColor: unitColorToRgba(queuedUnit.color, 0.28),
                    boxShadow: `inset 0 0 0 1px ${unitColorToRgba(queuedUnit.color, 0.32)}`,
                  }}
                  title={queuedUnit.name}
                >
                  {queuedUnit.icon}
                </div>
              );
            })}
          </div>

          {queueFull && <span className="text-[10px] text-rose-200/90">Queue full</span>}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {state.unitButtons.map((unit) => {
            const missingGold = state.gold < unit.cost;
            const disabled = state.paused || missingGold || queueFull;

            return (
              <button
                key={unit.unitId}
                type="button"
                className="group relative overflow-hidden rounded-lg border border-white/20 bg-slate-800/70 p-2 text-left transition hover:-translate-y-0.5 hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                onClick={() => gameBridge.dispatch({ type: 'spawn_unit', unitId: unit.unitId })}
              >
                <div className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-sky-300/10 blur-2xl transition group-hover:bg-sky-200/16" />

                <div className="mb-1 flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/20 bg-slate-700/70 font-semibold text-slate-100">
                    {unit.icon}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/35 bg-amber-400/14 px-1.5 py-0.5 text-amber-200">
                    <GoldIcon className="h-3 w-3" />
                    {unit.cost}
                  </span>
                </div>

                <div className="truncate text-[11px] font-semibold text-slate-100 sm:text-xs">{unit.name}</div>
                <div className="mt-1 text-[10px] text-cyan-200/90">Spawn: {(unit.spawnRateMs / 1000).toFixed(1)}s</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
