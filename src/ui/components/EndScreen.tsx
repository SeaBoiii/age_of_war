import { gameBridge } from '../../state/gameBridge';
import { emitUserGesture } from '../../state/interactionEvents';
import type { GameUiState } from '../../state/types';

interface EndScreenProps {
  state: GameUiState;
}

export function EndScreen({ state }: EndScreenProps) {
  const won = state.winner === 'player';

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/90 p-6 text-center text-slate-100 shadow-2xl">
        <h2 className={`text-3xl font-serif ${won ? 'text-emerald-200' : 'text-rose-200'}`}>
          {won ? 'Victory' : 'Defeat'}
        </h2>
        <p className="mt-2 text-sm text-slate-300">{state.battleMessage}</p>
        <p className="mt-2 text-xs text-slate-400">Current shards: {state.progress.shards}</p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-amber-300/45 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/30"
            onClick={() => {
              emitUserGesture();
              gameBridge.dispatch({ type: 'restart_match' });
            }}
          >
            Restart
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/30 bg-slate-700/60 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-600/70"
            onClick={() => gameBridge.dispatch({ type: 'return_to_menu' })}
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
