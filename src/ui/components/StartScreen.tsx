import { AGE_DEFINITIONS } from '../../game/constants/ages';
import { gameBridge } from '../../state/gameBridge';
import { emitUserGesture } from '../../state/interactionEvents';
import { getMetaUpgradeCost } from '../../state/localPersistence';
import type { GameUiState } from '../../state/types';

interface StartScreenProps {
  state: GameUiState;
}

export function StartScreen({ state }: StartScreenProps) {
  const incomeUpgradeCost = getMetaUpgradeCost(state.progress, 'income');
  const baseUpgradeCost = getMetaUpgradeCost(state.progress, 'baseHp');

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-slate-900/88 p-5 text-slate-100 shadow-2xl sm:p-7">
        <h1 className="text-center font-serif text-3xl tracking-wide text-amber-200 sm:text-4xl">
          Age of War: Echoes
        </h1>
        <p className="mt-2 text-center text-sm text-slate-300 sm:text-base">
          1-lane tug-of-war. Build momentum, time age upgrades, and break the enemy citadel.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-white/15 bg-slate-800/70 p-3">
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-400">Meta Progress</div>
            <div className="mb-3 text-sm text-slate-200">Shards: {state.progress.shards}</div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="rounded-md border border-emerald-300/40 bg-emerald-400/20 px-3 py-2 text-left text-xs text-emerald-100 transition hover:bg-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={state.progress.shards < incomeUpgradeCost}
                onClick={() => gameBridge.dispatch({ type: 'buy_meta_upgrade', upgrade: 'income' })}
              >
                Income Upgrade Lv.{state.progress.meta.incomeLevel} ({incomeUpgradeCost} shards)
              </button>
              <button
                type="button"
                className="rounded-md border border-cyan-300/40 bg-cyan-400/20 px-3 py-2 text-left text-xs text-cyan-100 transition hover:bg-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={state.progress.shards < baseUpgradeCost}
                onClick={() => gameBridge.dispatch({ type: 'buy_meta_upgrade', upgrade: 'baseHp' })}
              >
                Base HP Upgrade Lv.{state.progress.meta.baseHpLevel} ({baseUpgradeCost} shards)
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-white/15 bg-slate-800/70 p-3">
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-400">Starting Age</div>
            <div className="mb-2 text-xs text-slate-300">
              Highest unlocked: {AGE_DEFINITIONS[state.progress.highestAgeUnlocked]?.label}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {AGE_DEFINITIONS.map((age, index) => {
                const unlocked = index <= state.progress.highestAgeUnlocked;
                const selected = index === state.progress.selectedStartAge;

                return (
                  <button
                    key={age.id}
                    type="button"
                    className={`rounded-md border px-2 py-1 text-xs transition ${
                      selected
                        ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                        : 'border-white/20 bg-slate-700/60 text-slate-200'
                    }`}
                    disabled={!unlocked}
                    onClick={() => gameBridge.dispatch({ type: 'set_start_age', ageIndex: index })}
                  >
                    {age.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
          <button
            type="button"
            className="rounded-lg border border-white/30 bg-slate-700/60 px-5 py-2 text-sm text-slate-100 transition hover:bg-slate-600/70"
            onClick={() => gameBridge.dispatch({ type: 'set_how_to', value: !state.showHowTo })}
          >
            {state.showHowTo ? 'Hide How to Play' : 'How to Play'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/30 bg-slate-700/60 px-5 py-2 text-sm text-slate-100 transition hover:bg-slate-600/70"
            onClick={() => {
              emitUserGesture();
              gameBridge.dispatch({ type: 'toggle_sound' });
            }}
          >
            Sound: {state.soundOn ? 'On' : 'Off'}
          </button>
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

