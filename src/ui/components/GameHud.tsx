import { gameBridge } from '../../state/gameBridge';
import { emitUserGesture } from '../../state/interactionEvents';
import type { GameUiState } from '../../state/types';
import { GoldIcon, PauseIcon, PlayIcon, VolumeOffIcon, VolumeOnIcon } from './UiIcons';

interface GameHudProps {
  state: GameUiState;
}

export function GameHud({ state }: GameHudProps) {
  const playerHpPct = (state.playerBaseHp / Math.max(state.playerBaseMaxHp, 1)) * 100;
  const aiHpPct = (state.aiBaseHp / Math.max(state.aiBaseMaxHp, 1)) * 100;
  const playerDanger = playerHpPct <= 30;
  const aiDanger = aiHpPct <= 30;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 p-2 sm:p-3">
      <div className="ui-glass-panel pointer-events-auto grid gap-2 rounded-xl p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="ui-shadow-warm inline-flex items-center gap-1 rounded-lg border border-amber-300/40 bg-amber-400/18 px-2.5 py-1 font-bold text-amber-100">
            <GoldIcon className="h-3.5 w-3.5" />
            {Math.floor(state.gold)}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ui-icon-btn ui-pressable h-8 w-8"
              onClick={() => gameBridge.dispatch({ type: 'toggle_pause' })}
              aria-label={state.paused ? 'Resume game' : 'Pause game'}
              title={state.paused ? 'Resume game' : 'Pause game'}
            >
              {state.paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="ui-icon-btn ui-pressable h-8 w-8"
              onClick={() => {
                emitUserGesture();
                gameBridge.dispatch({ type: 'toggle_sound' });
              }}
              aria-label={state.soundOn ? 'Mute sound' : 'Unmute sound'}
              title={state.soundOn ? 'Mute sound' : 'Unmute sound'}
            >
              {state.soundOn ? <VolumeOnIcon className="h-4 w-4" /> : <VolumeOffIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="grid gap-2 text-[11px] sm:grid-cols-2 sm:text-xs">
          <div className="ui-stat-card p-2">
            <div className="mb-1 flex items-center justify-between text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Your Base
              </span>
              <span>
                {Math.ceil(state.playerBaseHp)} / {state.playerBaseMaxHp}
              </span>
            </div>
            <div className="ui-meter h-2.5">
              <div
                className={`ui-meter-fill transition-[width] duration-150 ${
                  playerDanger
                    ? 'bg-gradient-to-r from-rose-500 to-orange-300'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                }`}
                style={{ width: `${Math.max(0, Math.min(playerHpPct, 100))}%` }}
              />
            </div>
          </div>

          <div className="ui-stat-card p-2">
            <div className="mb-1 flex items-center justify-between text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                Enemy Base
              </span>
              <span>
                {Math.ceil(state.aiBaseHp)} / {state.aiBaseMaxHp}
              </span>
            </div>
            <div className="ui-meter h-2.5">
              <div
                className={`ui-meter-fill transition-[width] duration-150 ${
                  aiDanger
                    ? 'bg-gradient-to-r from-orange-400 to-amber-300'
                    : 'bg-gradient-to-r from-rose-600 to-rose-300'
                }`}
                style={{ width: `${Math.max(0, Math.min(aiHpPct, 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
