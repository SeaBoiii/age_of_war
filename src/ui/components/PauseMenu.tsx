import { gameBridge } from '../../state/gameBridge';
import { emitUserGesture } from '../../state/interactionEvents';
import type { GameUiState } from '../../state/types';
import { HomeIcon, PlayIcon, VolumeOffIcon, VolumeOnIcon } from './UiIcons';

interface PauseMenuProps {
  state: GameUiState;
}

function resumeMatch(): void {
  gameBridge.dispatch({ type: 'toggle_pause' });
}

export function PauseMenu({ state }: PauseMenuProps) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onClick={resumeMatch}
    >
      <div
        className="ui-glass-panel ui-pop w-full max-w-sm rounded-xl p-4 sm:p-5"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 className="ui-title text-lg font-bold text-slate-100 sm:text-xl">Game Paused</h2>
        <p className="mt-1 text-xs text-slate-300">Press Esc or click outside this panel to resume.</p>

        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-300/40 bg-emerald-400/20 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-300/30"
            onClick={resumeMatch}
          >
            <PlayIcon className="h-4 w-4" />
            Resume
          </button>

          <div className="ui-soft-panel rounded-md px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-300">Audio</span>
              <button
                type="button"
                className="ui-icon-btn h-8 w-8"
                aria-label={state.soundOn ? 'Mute sound' : 'Unmute sound'}
                title={state.soundOn ? 'Mute sound' : 'Unmute sound'}
                onClick={() => {
                  emitUserGesture();
                  gameBridge.dispatch({ type: 'toggle_sound' });
                }}
              >
                {state.soundOn ? <VolumeOnIcon className="h-4 w-4" /> : <VolumeOffIcon className="h-4 w-4" />}
              </button>
            </div>

            <label className="mt-2 block">
              <div className="mb-1 text-xs text-slate-300">Volume: {Math.round(state.soundVolume * 100)}%</div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(state.soundVolume * 100)}
                className="ui-audio-slider"
                onChange={(event) => {
                  emitUserGesture();
                  gameBridge.dispatch({
                    type: 'set_sound_volume',
                    value: Number(event.currentTarget.value) / 100,
                  });
                }}
              />
            </label>
          </div>

          <button
            type="button"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-md border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-400/30"
            onClick={() => gameBridge.dispatch({ type: 'return_to_menu' })}
          >
            <HomeIcon className="h-4 w-4" />
            Quit Game
          </button>
        </div>
      </div>
    </div>
  );
}
