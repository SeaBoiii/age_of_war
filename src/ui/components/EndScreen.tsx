import { gameBridge } from '../../state/gameBridge';
import { emitUserGesture } from '../../state/interactionEvents';
import type { GameUiState } from '../../state/types';
import { DefeatIcon, HomeIcon, RestartIcon, TrophyIcon } from './UiIcons';

interface EndScreenProps {
  state: GameUiState;
}

export function EndScreen({ state }: EndScreenProps) {
  const won = state.winner === 'player';

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="ui-glass-panel ui-pop relative w-full max-w-md overflow-hidden rounded-2xl p-6 text-center text-slate-100">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/6 to-transparent" />
        <div className="pointer-events-none absolute -right-7 top-0 h-24 w-24 rounded-full bg-sky-300/12 blur-3xl" />
        <div className="pointer-events-none absolute -left-7 bottom-0 h-24 w-24 rounded-full bg-amber-300/12 blur-3xl" />

        <div className="relative">
          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl border ${
              won
                ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100 ui-shadow-cool'
                : 'border-rose-300/40 bg-rose-400/15 text-rose-100'
            }`}
          >
            {won ? <TrophyIcon className="h-7 w-7" /> : <DefeatIcon className="h-7 w-7" />}
          </div>

          <h2 className={`ui-title text-3xl ${won ? 'text-emerald-200' : 'text-rose-200'}`}>
            {won ? 'Victory' : 'Defeat'}
          </h2>
          <p className="mt-2 text-sm text-slate-300">{state.battleMessage}</p>
          <p className="mt-2 text-xs text-slate-400">Current shards: {state.progress.shards}</p>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              className="ui-pressable ui-shadow-warm inline-flex items-center gap-2 rounded-lg border border-amber-300/45 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/30"
              onClick={() => {
                emitUserGesture();
                gameBridge.dispatch({ type: 'restart_match' });
              }}
            >
              <RestartIcon className="h-4 w-4" />
              Restart
            </button>
            <button
              type="button"
              className="ui-pressable inline-flex items-center gap-2 rounded-lg border border-white/30 bg-slate-700/60 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600/70"
              onClick={() => gameBridge.dispatch({ type: 'return_to_menu' })}
            >
              <HomeIcon className="h-4 w-4" />
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
