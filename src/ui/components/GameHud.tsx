import { AGE_DEFINITIONS } from '../../game/constants/ages';
import { gameBridge } from '../../state/gameBridge';
import type { GameUiState } from '../../state/types';

interface GameHudProps {
  state: GameUiState;
}

export function GameHud({ state }: GameHudProps) {
  const playerHpPct = (state.playerBaseHp / Math.max(state.playerBaseMaxHp, 1)) * 100;
  const aiHpPct = (state.aiBaseHp / Math.max(state.aiBaseMaxHp, 1)) * 100;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 p-2 sm:p-3">
      <div className="pointer-events-auto grid gap-2 rounded-xl border border-white/20 bg-slate-900/70 p-2 backdrop-blur sm:p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="rounded-md bg-amber-400/20 px-2 py-1 font-bold text-amber-200">
              Gold: {Math.floor(state.gold)}
            </span>
            <span className="rounded-md bg-indigo-400/20 px-2 py-1 text-indigo-100">
              Age: {AGE_DEFINITIONS[state.playerAgeIndex]?.label}
            </span>
            <span className="hidden rounded-md bg-cyan-400/20 px-2 py-1 text-cyan-100 sm:inline">
              Enemy Age: {AGE_DEFINITIONS[state.aiAgeIndex]?.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-white/25 bg-slate-800/75 px-2 py-1 text-[11px] text-slate-100 transition hover:bg-slate-700 sm:text-xs"
              onClick={() => gameBridge.dispatch({ type: 'toggle_pause' })}
            >
              {state.paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="rounded-md border border-white/25 bg-slate-800/75 px-2 py-1 text-[11px] text-slate-100 transition hover:bg-slate-700 sm:text-xs"
              onClick={() => gameBridge.dispatch({ type: 'toggle_sound' })}
            >
              Sound: {state.soundOn ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="grid gap-2 text-[11px] sm:grid-cols-2 sm:text-xs">
          <div>
            <div className="mb-1 flex items-center justify-between text-slate-200">
              <span>Your Base</span>
              <span>
                {Math.ceil(state.playerBaseHp)} / {state.playerBaseMaxHp}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-150"
                style={{ width: `${Math.max(0, Math.min(playerHpPct, 100))}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-slate-200">
              <span>Enemy Base</span>
              <span>
                {Math.ceil(state.aiBaseHp)} / {state.aiBaseMaxHp}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-rose-400 transition-[width] duration-150"
                style={{ width: `${Math.max(0, Math.min(aiHpPct, 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
