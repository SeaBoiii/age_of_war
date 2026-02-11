import { useEffect } from 'react';
import { gameBridge } from '../../state/gameBridge';
import { useGameState } from '../hooks/useGameState';
import { ActionBar } from './ActionBar';
import { DebugConsole } from './DebugConsole';
import { EndScreen } from './EndScreen';
import { GameHud } from './GameHud';
import { PauseMenu } from './PauseMenu';
import { PhaserViewport } from './PhaserViewport';
import { StartScreen } from './StartScreen';

export function GameShell() {
  const state = useGameState();

  useEffect(() => {
    if (state.mode !== 'playing') {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) {
        return;
      }

      event.preventDefault();
      gameBridge.dispatch({ type: 'toggle_pause' });
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [state.mode]);

  return (
    <div className="mx-auto w-full max-w-6xl ui-fade-up">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/20 bg-slate-900/55 shadow-[0_30px_60px_rgba(1,5,14,0.55)]">
        <div className="pointer-events-none absolute -left-14 top-1/4 h-40 w-40 rounded-full bg-cyan-400/8 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative aspect-[16/9] w-full">
          <PhaserViewport />
        </div>

        {state.mode === 'playing' && <GameHud state={state} />}
        {state.mode === 'playing' && !state.debugAiVsAi && <ActionBar state={state} />}
        {state.mode === 'start' && <StartScreen state={state} />}
        {state.mode === 'ended' && <EndScreen state={state} />}

        {state.mode === 'playing' && state.paused && <PauseMenu state={state} />}
      </div>

      {import.meta.env.DEV && state.mode === 'playing' && <DebugConsole state={state} />}
    </div>
  );
}
