import { gameBridge } from '../../state/gameBridge';
import { emitUserGesture } from '../../state/interactionEvents';
import type { GameUiState } from '../../state/types';

interface StartScreenProps {
  state: GameUiState;
}

export function StartScreen({ state }: StartScreenProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-slate-900/88 p-5 text-slate-100 shadow-2xl sm:p-7">
        <h1 className="text-center font-serif text-3xl tracking-wide text-amber-200 sm:text-4xl">
          Age of War: Echoes
        </h1>
        <p className="mt-2 text-center text-sm text-slate-300 sm:text-base">
          1-lane tug-of-war. Build momentum, time age upgrades, and break the enemy citadel.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className="rounded-lg border border-amber-300/45 bg-amber-400/20 px-5 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/30"
            onClick={() => {
              emitUserGesture();
              gameBridge.dispatch({ type: 'start_match' });
            }}
          >
            Play
          </button>

          <div className="rounded-lg border border-white/15 bg-slate-800/70 px-3 py-2">
            <div className="mb-1 text-xs uppercase tracking-wider text-slate-400">Difficulty</div>
            <select
              disabled
              className="w-full cursor-not-allowed rounded-md border border-white/20 bg-slate-700/70 px-2 py-1 text-sm text-slate-300 opacity-70"
              defaultValue="normal"
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
            <div className="mt-1 text-[11px] text-slate-400">Coming soon (placeholder)</div>
          </div>

          {import.meta.env.DEV && (
            <div className="rounded-lg border border-cyan-300/25 bg-cyan-950/30 px-3 py-2">
              <div className="mb-1 text-xs uppercase tracking-wider text-cyan-300">Dev Mode</div>
              <button
                type="button"
                className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                  state.debugAiVsAi
                    ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100'
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
            className="rounded-lg border border-white/30 bg-slate-700/60 px-5 py-2 text-sm text-slate-100 transition hover:bg-slate-600/70"
            onClick={() => gameBridge.dispatch({ type: 'set_how_to', value: !state.showHowTo })}
          >
            {state.showHowTo ? 'Hide How to Play' : 'How to Play'}
          </button>

          <div className="rounded-lg border border-white/15 bg-slate-800/70 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400">Audio</span>
              <button
                type="button"
                className="rounded-md border border-white/30 bg-slate-700/60 px-3 py-1 text-xs text-slate-100 transition hover:bg-slate-600/70"
                aria-label={state.soundOn ? 'Mute sound' : 'Unmute sound'}
                title={state.soundOn ? 'Mute sound' : 'Unmute sound'}
                onClick={() => {
                  emitUserGesture();
                  gameBridge.dispatch({ type: 'toggle_sound' });
                }}
              >
                {state.soundOn ? '🔊' : '🔇'}
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
                className="w-full accent-cyan-400"
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
        </div>

        {state.showHowTo && (
          <div className="mt-4 rounded-lg border border-white/15 bg-slate-800/70 p-3 text-xs leading-relaxed text-slate-200 sm:text-sm">
            <p>Earn gold over time and from kills.</p>
            <p>Spawn units from the bottom bar. Melee blocks lanes; ranged fires projectiles.</p>
            <p>Advance ages and buy turret upgrades to unlock stronger rosters and base firepower.</p>
            <p>Destroy the enemy base before your base falls.</p>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-slate-400 sm:text-xs">
          Music credit: &quot;Glorious Morning&quot; by Waterflame.
        </p>
      </div>
    </div>
  );
}
