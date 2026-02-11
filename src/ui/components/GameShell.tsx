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
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900/80 shadow-2xl">
      <div className="aspect-[16/9] w-full">
        <PhaserViewport />
      </div>

      {state.mode === 'playing' && <GameHud state={state} />}
      {state.mode === 'playing' && !state.debugAiVsAi && <ActionBar state={state} />}
      {import.meta.env.DEV && state.mode === 'playing' && <DebugConsole state={state} />}
      {state.mode === 'start' && <StartScreen state={state} />}
      {state.mode === 'ended' && <EndScreen state={state} />}

      {state.mode === 'playing' && state.paused && <PauseMenu state={state} />}
    </div>
  );
}
