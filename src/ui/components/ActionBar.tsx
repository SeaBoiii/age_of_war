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
  const nextQueuedUnit = state.playerQueuePreview[0] ? unitById.get(state.playerQueuePreview[0]) : undefined;
  const nextSpawnProgress =
    nextQueuedUnit && nextQueuedUnit.spawnEtaMs !== null ? nextQueuedUnit.spawnProgress : 0;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 p-1 sm:translate-y-2 sm:p-2">
      <div className="ui-glass-panel pointer-events-auto rounded-xl p-2 sm:p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-pressable ui-shadow-warm inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300/45 bg-amber-400/22 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
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
            className="ui-pressable ui-shadow-cool inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-300/45 bg-sky-400/20 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-sky-300/30 disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
            disabled={state.paused || state.playerTurretUpgradeCost === null || !canPayTurretUpgrade}
            onClick={() => gameBridge.dispatch({ type: 'upgrade_turret', side: 'player' })}
          >
            <TurretIcon className="h-4 w-4" />
            Turret {turretButtonLabel}
          </button>

          <span className="ui-subtle-text ml-auto max-w-[60%] truncate text-[11px] sm:text-xs">{state.battleMessage}</span>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-indigo-300/35 bg-indigo-400/15 px-2 py-1 text-[10px] text-indigo-100 sm:text-xs">
            <QueueIcon className="h-3.5 w-3.5" />
            Spawn Queue
          </span>
          <span className="ui-action-chip">{state.playerQueueCount}/{state.playerQueueLimit}</span>

          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: state.playerQueueLimit }).map((_, index) => {
              const queuedUnitId = state.playerQueuePreview[index];
              const queuedUnit = queuedUnitId ? unitById.get(queuedUnitId) : undefined;

              if (!queuedUnit) {
                return (
                  <div
                    key={`queue-slot-${index}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300/20 bg-slate-800/50 text-[10px] text-slate-500 sm:h-9 sm:w-9"
                  >
                    {index + 1}
                  </div>
                );
              }

              return (
                <div
                  key={`queue-slot-${index}`}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-bold text-slate-100 sm:h-9 sm:w-9 ${
                    index === 0 ? 'ui-queue-slot-head' : ''
                  }`}
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

        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-300">
            <span>
              {nextQueuedUnit && nextQueuedUnit.spawnEtaMs !== null
                ? `Next: ${nextQueuedUnit.name}`
                : 'Next: Queue empty'}
            </span>
            <span>
              {nextQueuedUnit && nextQueuedUnit.spawnEtaMs !== null
                ? `${(nextQueuedUnit.spawnEtaMs / 1000).toFixed(1)}s`
                : '--'}
            </span>
          </div>
          <div
            className="ui-meter h-2"
            title={
              nextQueuedUnit && nextQueuedUnit.spawnEtaMs !== null
                ? `${nextQueuedUnit.name} spawns in ${(nextQueuedUnit.spawnEtaMs / 1000).toFixed(1)}s`
                : 'Queue empty'
            }
          >
            <div
              className="ui-meter-fill bg-gradient-to-r from-cyan-400 to-sky-300 transition-[width] duration-120"
              style={{ width: `${Math.round(nextSpawnProgress * 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {state.unitButtons.map((unit) => {
            const missingGold = state.gold < unit.cost;
            const disabled = state.paused || missingGold || queueFull;

            return (
              <button
                key={unit.unitId}
                type="button"
                className={`ui-pressable group relative overflow-hidden rounded-lg border p-2 text-left ${
                  disabled
                    ? 'cursor-not-allowed border-white/15 bg-slate-800/50 opacity-50'
                    : 'border-white/20 bg-slate-800/70 hover:bg-slate-700/80'
                }`}
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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
