import { ActionBar } from './ActionBar';
import { EndScreen } from './EndScreen';
import { GameHud } from './GameHud';
import { PhaserViewport } from './PhaserViewport';
import { StartScreen } from './StartScreen';
import { useGameState } from '../hooks/useGameState';

export function GameShell() {
  const state = useGameState();

  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900/80 shadow-2xl">
      <div className="aspect-[16/9] w-full">
        <PhaserViewport />
      </div>

      {state.mode === 'playing' && <GameHud state={state} />}
      {state.mode === 'playing' && <ActionBar state={state} />}
      {state.mode === 'start' && <StartScreen state={state} />}
      {state.mode === 'ended' && <EndScreen state={state} />}

      {state.mode === 'playing' && state.paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/55 text-2xl font-bold tracking-wide text-slate-100">
          Paused
        </div>
      )}
    </div>
  );
}
