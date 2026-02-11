import { gameBridge } from '../../state/gameBridge';
import { emitUserGesture } from '../../state/interactionEvents';
import type { GameUiState } from '../../state/types';
import {
  BookIcon,
  BotIcon,
  ChipIcon,
  PlayIcon,
  SparkIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from './UiIcons';

interface StartScreenProps {
  state: GameUiState;
}

export function StartScreen({ state }: StartScreenProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-sm">
      <div className="ui-glass-panel ui-pop relative w-full max-w-2xl overflow-hidden rounded-2xl p-5 text-slate-100 sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-200/6 to-transparent" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-amber-300/14 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <span className="ui-action-chip inline-flex items-center gap-1.5">
              <SparkIcon className="h-3.5 w-3.5" />
              Tactical Lane Battle
            </span>
            <span className="ui-subtle-text text-[11px]">Build: Preview</span>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              className="ui-pressable ui-shadow-warm group flex items-center justify-center gap-2 rounded-lg border border-amber-200/45 bg-amber-300/20 px-5 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-200/30 sm:text-base"
              onClick={() => {
                emitUserGesture();
                gameBridge.dispatch({ type: 'start_match' });
              }}
            >
              <PlayIcon className="h-4 w-4 transition group-hover:translate-x-0.5 sm:h-5 sm:w-5" />
              Play
            </button>

            <div className="ui-soft-panel rounded-lg px-3 py-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-300">
                <SparkIcon className="h-3.5 w-3.5" />
                Difficulty
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled
                  className="rounded-md border border-white/20 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-300 opacity-70"
                >
                  Easy
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-md border border-sky-200/35 bg-sky-500/20 px-2 py-1.5 text-xs font-semibold text-sky-100 opacity-80"
                >
                  Normal
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-md border border-white/20 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-300 opacity-70"
                >
                  Hard
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">Placeholder for future difficulty tuning.</div>
            </div>

            {import.meta.env.DEV && (
              <div className="rounded-lg border border-cyan-300/25 bg-cyan-950/30 px-3 py-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-cyan-300">
                  <BotIcon className="h-3.5 w-3.5" />
                  Dev Mode
                </div>
                <button
                  type="button"
                  className={`ui-pressable w-full rounded-md border px-3 py-2 text-left text-xs ${
                    state.debugAiVsAi
                      ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100 ui-shadow-cool'
                      : 'border-cyan-300/35 bg-slate-700/65 text-cyan-100 hover:bg-slate-600/75'
                  }`}
                  onClick={() =>
                    gameBridge.dispatch({
                      type: 'set_debug_ai_vs_ai',
                      value: !state.debugAiVsAi,
                    })
                  }
                >
                  AI vs AI: {state.debugAiVsAi ? 'On' : 'Off'}
                </button>
              </div>
            )}

            <button
              type="button"
              className="ui-pressable flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-slate-700/60 px-5 py-2 text-sm text-slate-100 hover:bg-slate-600/70"
              onClick={() => gameBridge.dispatch({ type: 'set_how_to', value: true })}
            >
              <BookIcon className="h-4 w-4" />
              How to Play
            </button>

            <div className="ui-soft-panel rounded-lg px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-300">
                  <ChipIcon className="h-3.5 w-3.5" />
                  Audio
                </span>
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
                <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                  <span>Volume</span>
                  <span>{Math.round(state.soundVolume * 100)}%</span>
                </div>
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

              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                <button
                  type="button"
                  className="ui-pressable rounded border border-white/20 bg-slate-800/60 px-2 py-0.5 hover:bg-slate-700/70"
                  onClick={() => {
                    emitUserGesture();
                    gameBridge.dispatch({ type: 'set_sound_volume', value: 0.2 });
                  }}
                >
                  20%
                </button>
                <button
                  type="button"
                  className="ui-pressable rounded border border-white/20 bg-slate-800/60 px-2 py-0.5 hover:bg-slate-700/70"
                  onClick={() => {
                    emitUserGesture();
                    gameBridge.dispatch({ type: 'set_sound_volume', value: 0.5 });
                  }}
                >
                  50%
                </button>
                <button
                  type="button"
                  className="ui-pressable rounded border border-white/20 bg-slate-800/60 px-2 py-0.5 hover:bg-slate-700/70"
                  onClick={() => {
                    emitUserGesture();
                    gameBridge.dispatch({ type: 'set_sound_volume', value: 0.8 });
                  }}
                >
                  80%
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {state.showHowTo && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onClick={() => gameBridge.dispatch({ type: 'set_how_to', value: false })}
        >
          <div
            className="ui-glass-panel ui-pop w-full max-w-lg rounded-xl p-4 text-slate-100 sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2 text-amber-200">
              <BookIcon className="h-4 w-4" />
              <h3 className="ui-title text-lg">How to Play</h3>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-slate-200 sm:text-sm">
              <p>1. Player gold comes only from kills: bounty is 1.3x enemy unit cost (rounded up).</p>
              <p>2. Queue up to 5 units from the action bar. Spawn timing follows each unit&apos;s spawn rate.</p>
              <p>3. Keep melee/tanks in front and ranged units protected behind them.</p>
              <p>4. Advance ages and upgrade turret when lane pressure allows.</p>
              <p>5. Destroy the enemy base before yours is destroyed.</p>
            </div>

            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center rounded-md border border-white/30 bg-slate-700/60 px-3 py-1.5 text-xs text-slate-100 transition hover:bg-slate-600/75 sm:text-sm"
              onClick={() => gameBridge.dispatch({ type: 'set_how_to', value: false })}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
